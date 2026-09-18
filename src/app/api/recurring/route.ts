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
    const view = searchParams.get('view') || 'household';

    const where: any = {
      householdId: session.householdId,
    };

    const isAdmin = session.role === 'ADMIN';
    if (!isAdmin || view === 'personal') {
      where.userId = session.userId;
    }

    const recurringExpenses = await prisma.recurringExpense.findMany({
      where,
      orderBy: { nextDueDate: 'asc' },
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

    return NextResponse.json({ recurringExpenses });
  } catch (err: any) {
    console.error('Error fetching recurring expenses:', err);
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
    const { name, category, amount, frequency, durationInDays, startDate, userId } = body;

    if (!name || !category || !amount) {
      return NextResponse.json({ error: 'Name, category, and amount are required' }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const finalFreq = frequency || (durationInDays ? 'DAYS_INTERVAL' : 'MONTHLY');
    const parsedDuration = durationInDays ? parseInt(durationInDays, 10) : null;
    const nextDue = calculateNextDueDate(start, finalFreq, parsedDuration, start);

    let targetUserId = session.userId;
    if (userId && userId !== session.userId && session.role === 'ADMIN') {
      targetUserId = userId;
    }

    const recurring = await prisma.recurringExpense.create({
      data: {
        householdId: session.householdId,
        userId: targetUserId,
        name: name.trim(),
        category: category.trim(),
        amount: numAmount,
        frequency: finalFreq,
        durationInDays: parsedDuration,
        startDate: start,
        nextDueDate: nextDue,
        confidence: 1.0,
        isActive: true,
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

    return NextResponse.json({ success: true, recurringExpense: recurring });
  } catch (err: any) {
    console.error('Error creating recurring expense:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
