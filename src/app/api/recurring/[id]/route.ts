import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { calculateNextDueDate } from '@/lib/forecasting';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { action, name, category, amount, frequency, durationInDays, isActive, actualAmount } = body;

    const existing = await prisma.recurringExpense.findFirst({
      where: { id, householdId: session.householdId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Recurring commitment not found' }, { status: 404 });
    }

    if (session.role !== 'ADMIN' && existing.userId !== session.userId) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Action: Mark as Completed / Paid Off (e.g. final installment of EMI or completed loan)
    if (action === 'mark_completed') {
      const updatedRecurring = await prisma.recurringExpense.update({
        where: { id },
        data: {
          isActive: false,
        },
        include: {
          user: {
            select: { id: true, name: true, avatarColor: true },
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Commitment marked as completed/paid off',
        recurringExpense: updatedRecurring,
      });
    }

    // Action: Reopen / Reactivate commitment
    if (action === 'reactivate') {
      const updatedRecurring = await prisma.recurringExpense.update({
        where: { id },
        data: {
          isActive: true,
        },
        include: {
          user: {
            select: { id: true, name: true, avatarColor: true },
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Commitment reactivated',
        recurringExpense: updatedRecurring,
      });
    }

    // Action: Mark Paid / Confirm occurrence
    // Creates an expense record, links it, and calculates the next due date
    if (action === 'confirm_paid') {
      const { markCompleted } = body;
      const paidAmount = actualAmount !== undefined ? parseFloat(actualAmount) : existing.amount;
      const paymentDate = new Date();

      // Next due date from the current nextDueDate
      const duration = existing.durationInDays;
      const freq = existing.frequency;
      const nextDue = calculateNextDueDate(existing.nextDueDate, freq, duration, paymentDate);

      // Create the real expense record
      const newExpense = await prisma.expense.create({
        data: {
          householdId: session.householdId,
          userId: existing.userId,
          category: existing.category,
          amount: paidAmount,
          date: paymentDate,
          description: `${existing.name} (Recurring Payment)`,
          isRecurring: true,
          recurringExpenseId: existing.id,
        },
      });

      // Update the recurring commitment's nextDueDate and amount if adjusted,
      // or mark as completed if final installment
      const updatedRecurring = await prisma.recurringExpense.update({
        where: { id },
        data: {
          amount: paidAmount, // simple learning from adjusted amount
          nextDueDate: nextDue,
          isActive: markCompleted ? false : existing.isActive,
        },
        include: {
          user: {
            select: { id: true, name: true, avatarColor: true },
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: markCompleted
          ? 'Final payment recorded and EMI marked as completed!'
          : 'Marked as paid and next due date updated',
        expense: newExpense,
        recurringExpense: updatedRecurring,
      });
    }

    // General update
    const updated = await prisma.recurringExpense.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(category ? { category: category.trim() } : {}),
        ...(amount !== undefined ? { amount: parseFloat(amount) } : {}),
        ...(frequency ? { frequency } : {}),
        ...(durationInDays !== undefined ? { durationInDays: parseInt(durationInDays, 10) } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarColor: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, recurringExpense: updated });
  } catch (err: any) {
    console.error('Error updating recurring expense:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const existing = await prisma.recurringExpense.findFirst({
      where: { id, householdId: session.householdId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Recurring expense not found' }, { status: 404 });
    }

    if (session.role !== 'ADMIN' && existing.userId !== session.userId) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    await prisma.recurringExpense.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting recurring expense:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
