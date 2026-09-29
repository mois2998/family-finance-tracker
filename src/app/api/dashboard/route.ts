import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { generateForecastSummary } from '@/lib/forecasting';
import { isSameMonth, format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedView = searchParams.get('view') || 'household';
    const now = new Date();

    const isAdmin = session.role === 'ADMIN';
    // Members are strictly restricted to their personal view
    const view = isAdmin ? (requestedView === 'personal' ? 'personal' : 'household') : 'personal';
    const isPersonal = view === 'personal';

    // Scoped query filters
    const incomeWhere: any = { householdId: session.householdId };
    const expenseWhere: any = { householdId: session.householdId };
    const recurringWhere: any = { householdId: session.householdId, isActive: true };

    if (isPersonal) {
      incomeWhere.userId = session.userId;
      expenseWhere.userId = session.userId;
      recurringWhere.userId = session.userId;
    }

    const currentMonthKey = format(now, 'yyyy-MM');
    const actualSavingsWhere: any = { householdId: session.householdId, monthKey: currentMonthKey };
    if (isPersonal) {
      actualSavingsWhere.userId = session.userId;
    }

    // Parallel execution of all database queries
    const [household, activeIncomes, activeExpenses, activeRecurring, actualSavingsRecords] = await Promise.all([
      prisma.household.findUnique({
        where: { id: session.householdId },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatarColor: true,
            },
          },
        },
      }),
      prisma.income.findMany({
        where: incomeWhere,
        orderBy: { dateReceived: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, avatarColor: true },
          },
        },
      }),
      prisma.expense.findMany({
        where: expenseWhere,
        orderBy: { date: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, avatarColor: true },
          },
        },
      }),
      prisma.recurringExpense.findMany({
        where: recurringWhere,
        orderBy: { nextDueDate: 'asc' },
        include: {
          user: {
            select: { id: true, name: true, avatarColor: true },
          },
        },
      }),
      prisma.actualSaving.findMany({
        where: actualSavingsWhere,
        include: {
          user: {
            select: { id: true, name: true, avatarColor: true },
          },
        },
      }),
    ]);

    if (!household) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    // Run forecasting engine strictly on the scoped data
    const forecast = generateForecastSummary(
      activeIncomes.map((i) => ({
        id: i.id,
        source: i.source,
        amount: i.amount,
        frequency: i.frequency,
        dateReceived: i.dateReceived,
        userId: i.userId,
      })),
      activeExpenses.map((e) => ({
        id: e.id,
        category: e.category,
        amount: e.amount,
        date: e.date,
        description: e.description,
        isRecurring: e.isRecurring,
        userId: e.userId,
        recurringExpenseId: e.recurringExpenseId,
      })),
      activeRecurring.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        amount: r.amount,
        frequency: r.frequency,
        startDate: r.startDate,
        durationInDays: r.durationInDays,
        nextDueDate: r.nextDueDate,
        confidence: r.confidence,
        isActive: r.isActive,
        userId: r.userId,
        skippedDates: r.skippedDates,
      })),
      now
    );

    // Current month actual totals
    const currentMonthExpenses = activeExpenses.filter((e) => isSameMonth(new Date(e.date), now));
    const currentMonthActualSpend = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

    const currentMonthIncomes = activeIncomes.filter((i) => isSameMonth(new Date(i.dateReceived), now));
    const currentMonthActualIncome = currentMonthIncomes.reduce((sum, i) => sum + i.amount, 0);

    // Category breakdown for current month expenses
    const categoryMap: Record<string, { category: string; amount: number; count: number }> = {};
    for (const exp of currentMonthExpenses) {
      if (!categoryMap[exp.category]) {
        categoryMap[exp.category] = { category: exp.category, amount: 0, count: 0 };
      }
      categoryMap[exp.category].amount += exp.amount;
      categoryMap[exp.category].count += 1;
    }
    const categoryBreakdown = Object.values(categoryMap).sort((a, b) => b.amount - a.amount);

    // Member breakdown: Only computed for Admin in Household view
    let memberBreakdown: Array<{ id: string; name: string; avatarColor: string; income: number; expense: number }> = [];
    if (isAdmin && view === 'household') {
      const memberMap: Record<
        string,
        { id: string; name: string; avatarColor: string; income: number; expense: number }
      > = {};
      for (const u of household.users) {
        memberMap[u.id] = {
          id: u.id,
          name: u.name,
          avatarColor: u.avatarColor,
          income: 0,
          expense: 0,
        };
      }

      for (const inc of activeIncomes) {
        if (isSameMonth(new Date(inc.dateReceived), now) && memberMap[inc.userId]) {
          memberMap[inc.userId].income += inc.amount;
        }
      }

      for (const exp of activeExpenses) {
        if (isSameMonth(new Date(exp.date), now) && memberMap[exp.userId]) {
          memberMap[exp.userId].expense += exp.amount;
        }
      }

      memberBreakdown = Object.values(memberMap);
    }

    // Reconciliation calculation (Actual vs Expected Savings & Untracked Cash Detector)
    const expectedSavings = currentMonthActualIncome - currentMonthActualSpend;
    let hasActualSavings = false;
    let actualSavingsAmount = 0;
    let primaryActualRecord: any = null;

    if (isPersonal) {
      primaryActualRecord = actualSavingsRecords.find((r) => r.userId === session.userId) || null;
      if (primaryActualRecord) {
        hasActualSavings = true;
        actualSavingsAmount = primaryActualRecord.actualAmount;
      }
    } else {
      if (actualSavingsRecords.length > 0) {
        hasActualSavings = true;
        actualSavingsAmount = actualSavingsRecords.reduce((sum, r) => sum + r.actualAmount, 0);
        primaryActualRecord = actualSavingsRecords[0];
      }
    }

    const untrackedAmount = hasActualSavings ? expectedSavings - actualSavingsAmount : 0;
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

    // Member reconciliation breakdown for household view
    let memberReconciliations: any[] = [];
    if (isAdmin && view === 'household') {
      memberReconciliations = household.users.map((member) => {
        const mIncomes = activeIncomes.filter(
          (i) => i.userId === member.id && isSameMonth(new Date(i.dateReceived), now)
        );
        const mExpenses = activeExpenses.filter(
          (e) => e.userId === member.id && isSameMonth(new Date(e.date), now)
        );
        const mActual = actualSavingsRecords.find((r) => r.userId === member.id);

        const mInc = mIncomes.reduce((s, i) => s + i.amount, 0);
        const mExp = mExpenses.reduce((s, e) => s + e.amount, 0);
        const mExpSavings = mInc - mExp;

        const mHas = !!mActual;
        const mActualAmt = mActual ? mActual.actualAmount : null;
        const mUntracked = mHas ? mExpSavings - (mActualAmt || 0) : null;

        let mType: 'SPENDING_LEAKAGE' | 'SURPLUS' | 'EXACT_MATCH' | 'NOT_SET' = 'NOT_SET';
        if (!mHas) {
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
          avatarColor: member.avatarColor,
          role: member.role,
          trackedIncome: mInc,
          trackedExpense: mExp,
          expectedSavings: mExpSavings,
          hasActualSavings: mHas,
          actualAmount: mActualAmt,
          untrackedAmount: mUntracked,
          untrackedType: mType,
          accountName: mActual?.accountName || null,
          notes: mActual?.notes || null,
        };
      });
    }

    // Recent transactions (last 10)
    const recentExpenses = activeExpenses.slice(0, 10);

    return NextResponse.json({
      view,
      userRole: session.role,
      household: {
        id: household.id,
        name: household.name,
        currency: household.currency,
        inviteCode: household.inviteCode,
        membersCount: household.users.length,
        members: isAdmin ? household.users : household.users.filter((u) => u.id === session.userId),
      },
      stats: {
        currentMonthActualIncome,
        currentMonthActualSpend,
        currentMonthNet: currentMonthActualIncome - currentMonthActualSpend,
        projectedMonthlyIncome: forecast.currentMonth.projectedTotalIncome,
        projectedMonthlySpend: forecast.currentMonth.projectedTotalSpend,
        projectedNetSavings: forecast.currentMonth.projectedNetSavings,
        savingsRatePercentage: forecast.currentMonth.savingsRatePercentage,
        totalExpensesCount: activeExpenses.length,
        totalIncomesCount: activeIncomes.length,
        activeRecurringCount: activeRecurring.filter((r) => r.isActive).length,
      },
      reconciliation: {
        monthKey: currentMonthKey,
        monthName: format(now, 'MMMM yyyy'),
        hasActualSavings,
        actualSavingsAmount,
        expectedSavings,
        untrackedAmount,
        untrackedType,
        accountName: primaryActualRecord?.accountName || null,
        notes: primaryActualRecord?.notes || null,
        updatedAt: primaryActualRecord?.updatedAt ? primaryActualRecord.updatedAt.toISOString() : null,
        memberReconciliations,
      },
      forecast,
      categoryBreakdown,
      memberBreakdown,
      recentExpenses,
    });
  } catch (err: any) {
    console.error('Error fetching dashboard summary:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
