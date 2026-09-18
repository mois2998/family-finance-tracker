import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { amount, category, description, date, userId } = body;

    // Verify expense belongs to user's household
    const existing = await prisma.expense.findFirst({
      where: { id, householdId: session.householdId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Members can only edit their own expenses, admins can edit any
    if (session.role !== 'ADMIN' && existing.userId !== session.userId) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        ...(amount !== undefined ? { amount: parseFloat(amount) } : {}),
        ...(category ? { category: category.trim() } : {}),
        ...(description ? { description: description.trim() } : {}),
        ...(date ? { date: new Date(date) } : {}),
        ...(userId && session.role === 'ADMIN' ? { userId } : {}),
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

    return NextResponse.json({ success: true, expense: updated });
  } catch (err: any) {
    console.error('Error updating expense:', err);
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

    const existing = await prisma.expense.findFirst({
      where: { id, householdId: session.householdId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    if (session.role !== 'ADMIN' && existing.userId !== session.userId) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    await prisma.expense.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting expense:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
