import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const currentMonthKey = format(now, 'yyyy-MM');
    const monthKey = searchParams.get('monthKey') || currentMonthKey;
    const requestedView = searchParams.get('view') || 'household';

    const isAdmin = session.role === 'ADMIN';
    const view = isAdmin ? (requestedView === 'personal' ? 'personal' : 'household') : 'personal';
    const isPersonal = view === 'personal';

    // Calculate month date range
    let monthStart: Date;
    let monthEnd: Date;
    try {
      const parsed = parseISO(`${monthKey}-01`);
      monthStart = startOfMonth(parsed);
      monthEnd = endOfMonth(parsed);
    } catch {
      monthStart = startOfMonth(now);
      monthEnd = endOfMonth(now);
    }

    // Scoped filters
    const incomeWhere: any = {
      householdId: session.householdId,
      dateReceived: { gte: monthStart, lte: monthEnd },
    };
    const expenseWhere: any = {
      householdId: session.householdId,
      date: { gte: monthStart, lte: monthEnd },
    };
    const actualSavingsWhere: any = {
      householdId: session.householdId,
      monthKey,
    };

    if (isPersonal) {
      incomeWhere.userId = session.userId;
      expenseWhere.userId = session.userId;
      actualSavingsWhere.userId = session.userId;
    }

    const [household, incomes, expenses, actualSavingsRecords] = await Promise.all([
      prisma.household.findUnique({
        where: { id: session.householdId },
        include: {
          users: {
            select: { id: true, name: true, email: true, role: true, avatarColor: true },
          },
        },
      }),
      prisma.income.findMany({
        where: incomeWhere,
        include: { user: { select: { id: true, name: true, avatarColor: true } } },
      }),
      prisma.expense.findMany({
        where: expenseWhere,
        include: { user: { select: { id: true, name: true, avatarColor: true } } },
      }),
      prisma.actualSaving.findMany({
        where: actualSavingsWhere,
        include: { user: { select: { id: true, name: true, avatarColor: true } } },
      }),
    ]);

    if (!household) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    const trackedIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
    const trackedExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
    const expectedSavings = trackedIncome - trackedExpense;

    let hasActualSavings = false;
    let actualAmount = 0;
    let primaryRecord: any = null;

    if (isPersonal) {
      primaryRecord = actualSavingsRecords.find((r) => r.userId === session.userId) || null;
      if (primaryRecord) {
        hasActualSavings = true;
        actualAmount = primaryRecord.actualAmount;
      }
    } else {
      // Household View
      if (actualSavingsRecords.length > 0) {
        hasActualSavings = true;
        actualAmount = actualSavingsRecords.reduce((sum, r) => sum + r.actualAmount, 0);
        primaryRecord = actualSavingsRecords[0];
      }
    }

    // Untracked discrepancy = Expected Net Savings - Actual Savings
    // If Expected > Actual => Untracked Spending (Leakage)
    // If Expected < Actual => Untracked Surplus (Unrecorded Income)
    const untrackedAmount = hasActualSavings ? expectedSavings - actualAmount : 0;
    let untrackedType: 'SPENDING_LEAKAGE' | 'SURPLUS' | 'EXACT_MATCH' | 'NOT_SET' = 'NOT_SET';

    if (!hasActualSavings) {
      untrackedType = 'NOT_SET';
    } else if (untrackedAmount > 0.01) {
      untrackedType = 'SPENDING_LEAKAGE';
    } else if (untrackedAmount < -0.01) {
      untrackedType = 'SURPLUS';
    } else {
      untrackedType = 'EXACT_MATCH';
    }

    // Member-wise breakdown for admin household view
    const memberReconciliations = household.users.map((member) => {
      const memberIncomes = incomes.filter((i) => i.userId === member.id);
      const memberExpenses = expenses.filter((e) => e.userId === member.id);
      const memberActual = actualSavingsRecords.find((r) => r.userId === member.id);

      const mTrackedInc = memberIncomes.reduce((s, i) => s + i.amount, 0);
      const mTrackedExp = memberExpenses.reduce((s, e) => s + e.amount, 0);
      const mExpected = mTrackedInc - mTrackedExp;

      const mHasActual = !!memberActual;
      const mActualAmt = memberActual ? memberActual.actualAmount : null;
      const mUntracked = mHasActual ? mExpected - (mActualAmt || 0) : null;

      let mType: 'SPENDING_LEAKAGE' | 'SURPLUS' | 'EXACT_MATCH' | 'NOT_SET' = 'NOT_SET';
      if (!mHasActual) {
        mType = 'NOT_SET';
      } else if ((mUntracked || 0) > 0.01) {
        mType = 'SPENDING_LEAKAGE';
      } else if ((mUntracked || 0) < -0.01) {
        mType = 'SURPLUS';
      } else {
        mType = 'EXACT_MATCH';
      }

      return {
        userId: member.id,
        userName: member.name,
        role: member.role,
        avatarColor: member.avatarColor,
        trackedIncome: mTrackedInc,
        trackedExpense: mTrackedExp,
        expectedSavings: mExpected,
        hasActualSavings: mHasActual,
        actualAmount: mActualAmt,
        untrackedAmount: mUntracked,
        untrackedType: mType,
        accountName: memberActual?.accountName || null,
        notes: memberActual?.notes || null,
        updatedAt: memberActual?.updatedAt ? memberActual.updatedAt.toISOString() : null,
      };
    });

    return NextResponse.json({
      monthKey,
      monthLabel: format(monthStart, 'MMMM yyyy'),
      view,
      currency: household.currency || '₹',
      trackedIncome,
      trackedExpense,
      expectedSavings,
      hasActualSavings,
      actualAmount,
      untrackedAmount,
      untrackedType,
      record: primaryRecord
        ? {
            id: primaryRecord.id,
            accountName: primaryRecord.accountName,
            notes: primaryRecord.notes,
            updatedAt: primaryRecord.updatedAt,
          }
        : null,
      memberReconciliations: !isPersonal && isAdmin ? memberReconciliations : [],
      records: actualSavingsRecords,
    });
  } catch (err: any) {
    console.error('Error fetching actual savings:', err);
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
    const { monthKey, actualAmount, accountName, notes, targetUserId } = body;

    if (!monthKey || typeof monthKey !== 'string') {
      return NextResponse.json({ error: 'Valid monthKey (YYYY-MM) is required' }, { status: 400 });
    }

    if (actualAmount === undefined || isNaN(Number(actualAmount))) {
      return NextResponse.json({ error: 'Valid actualAmount number is required' }, { status: 400 });
    }

    const isAdmin = session.role === 'ADMIN';
    const effectiveUserId = isAdmin && targetUserId ? targetUserId : session.userId;

    const savedRecord = await prisma.actualSaving.upsert({
      where: {
        householdId_userId_monthKey: {
          householdId: session.householdId,
          userId: effectiveUserId,
          monthKey,
        },
      },
      update: {
        actualAmount: Math.round(Number(actualAmount) * 100) / 100,
        accountName: accountName && typeof accountName === 'string' ? accountName.trim() : null,
        notes: notes && typeof notes === 'string' ? notes.trim() : null,
      },
      create: {
        householdId: session.householdId,
        userId: effectiveUserId,
        monthKey,
        actualAmount: Math.round(Number(actualAmount) * 100) / 100,
        accountName: accountName && typeof accountName === 'string' ? accountName.trim() : null,
        notes: notes && typeof notes === 'string' ? notes.trim() : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Actual savings saved successfully',
      record: savedRecord,
    });
  } catch (err: any) {
    console.error('Error saving actual savings:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const monthKey = searchParams.get('monthKey');
    const targetUserId = searchParams.get('userId');

    if (!monthKey) {
      return NextResponse.json({ error: 'monthKey is required' }, { status: 400 });
    }

    const isAdmin = session.role === 'ADMIN';
    const effectiveUserId = isAdmin && targetUserId ? targetUserId : session.userId;

    await prisma.actualSaving.deleteMany({
      where: {
        householdId: session.householdId,
        userId: effectiveUserId,
        monthKey,
      },
    });

    return NextResponse.json({ success: true, message: 'Actual savings reset successfully' });
  } catch (err: any) {
    console.error('Error deleting actual savings:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
