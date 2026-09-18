import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { generateForecastSummary } from '@/lib/forecasting';
import { isSameMonth } from 'date-fns';

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

    // Parallel execution of all database queries
    const [household, activeIncomes, activeExpenses, activeRecurring] = await Promise.all([
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
