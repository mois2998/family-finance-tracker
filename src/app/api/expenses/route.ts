import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { calculateNextDueDate } from '@/lib/forecasting';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'household'; // 'household' | 'personal'
    const memberId = searchParams.get('memberId');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {
      householdId: session.householdId,
    };

    const isAdmin = session.role === 'ADMIN';

    // Filter by personal view or member filter (Members are strictly forced to their own userId)
    if (!isAdmin || view === 'personal') {
      where.userId = session.userId;
    } else if (isAdmin && memberId) {
      where.userId = memberId;
    }

    // Category filter
    if (category && category !== 'ALL') {
      where.category = category;
    }

    // Text search in description
    if (search && search.trim().length > 0) {
      where.description = {
        contains: search.trim(),
      };
    }

    // Date range
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
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

    return NextResponse.json({ expenses });
  } catch (err: any) {
    console.error('Error fetching expenses:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      amount,
      category,
      description,
      date,
      userId,
      isRecurring,
      recurringFrequency, // 'DAYS_INTERVAL', 'MONTHLY', etc.
      recurringDurationDays, // e.g., 28
    } = body;

    if (!amount || !category || !description) {
      return NextResponse.json(
        { error: 'Amount, category, and description are required' },
        { status: 400 }
      );
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    // Determine target userId (Only Admin can log on behalf of other family members)
    let targetUserId = session.userId;
    if (session.role === 'ADMIN' && userId && userId !== session.userId) {
      // Validate that the target user belongs to the same household
      const targetUser = await prisma.user.findFirst({
        where: { id: userId, householdId: session.householdId },
      });
      if (targetUser) {
        targetUserId = targetUser.id;
      }
    }

    const expenseDate = date ? new Date(date) : new Date();

    let recurringExpenseId: string | null = null;

    // If marked recurring, create or link a RecurringExpense entity
    if (isRecurring) {
      const frequency = recurringFrequency || (recurringDurationDays ? 'DAYS_INTERVAL' : 'MONTHLY');
      const duration = recurringDurationDays ? parseInt(recurringDurationDays, 10) : null;
      const nextDue = calculateNextDueDate(expenseDate, frequency, duration, expenseDate);

      const recurring = await prisma.recurringExpense.create({
        data: {
          householdId: session.householdId,
          userId: targetUserId,
          name: description.trim(),
          category: category.trim(),
          amount: numAmount,
          frequency,
          durationInDays: duration,
          startDate: expenseDate,
          nextDueDate: nextDue,
          confidence: 1.0, // Explicitly declared by user
          isActive: true,
        },
      });

      recurringExpenseId = recurring.id;
    }

    const expense = await prisma.expense.create({
      data: {
        householdId: session.householdId,
        userId: targetUserId,
        category: category.trim(),
        amount: numAmount,
        date: expenseDate,
        description: description.trim(),
        isRecurring: Boolean(isRecurring),
        recurringExpenseId,
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

    return NextResponse.json({ success: true, expense });
  } catch (err: any) {
    console.error('Error creating expense:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
