import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  endOfMonth,
  format,
  getDaysInMonth,
  isAfter,
  isBefore,
  isSameMonth,
  startOfMonth,
} from 'date-fns';

export interface IncomeItem {
  id: string;
  source: string;
  amount: number;
  frequency: string; // "ONE_TIME" | "MONTHLY" | "BI_WEEKLY" | "WEEKLY"
  dateReceived: Date | string;
  userId: string;
}

export interface ExpenseItem {
  id: string;
  category: string;
  amount: number;
  date: Date | string;
  description: string;
  isRecurring: boolean;
  userId: string;
  recurringExpenseId?: string | null;
}

export interface RecurringExpenseItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  frequency: string; // "DAYS_INTERVAL" | "MONTHLY" | "QUARTERLY" | "YEARLY"
  startDate: Date | string;
  durationInDays?: number | null; // e.g. 28 days for prepaid packs
  nextDueDate: Date | string;
  confidence: number;
  isActive: boolean;
  userId: string;
}

export interface ForecastSummary {
  coldStartStatus: 'COLD_START_MANUAL' | 'EMERGING_HISTORY' | 'MATURE_TREND';
  coldStartMessage: string;
  currentMonth: {
    name: string;
    daysInMonth: number;
    daysElapsed: number;
    daysRemaining: number;
    actualIncomeSoFar: number;
    projectedTotalIncome: number;
    actualSpendSoFar: number;
    remainingRecurringSpend: number;
    estimatedDiscretionarySpend: number;
    projectedTotalSpend: number;
    projectedNetSavings: number;
    savingsRatePercentage: number;
  };
  burnRate: {
    averageDailySpend: number;
    projectedMonthlyBurn: number;
    isDeficit: boolean;
    deficitAmount: number;
    warningTriggered: boolean;
    warningMessage: string | null;
    estimatedDaysRemainingInMonth: number;
  };
  upcomingExpenses: UpcomingExpenseProjection[];
  monthlyProjections: MonthlyTrendPoint[];
  detectedRecurringSuggestions: SuggestedRecurringPattern[];
}

export interface UpcomingExpenseProjection {
  id: string;
  recurringExpenseId?: string;
  name: string;
  category: string;
  amount: number;
  dueDate: string; // ISO date string
  daysUntilDue: number;
  isConfirmed: boolean;
  frequency: string;
  userId: string;
}

export interface MonthlyTrendPoint {
  monthKey: string; // e.g., "2026-09"
  monthLabel: string; // e.g., "Sep 2026"
  isHistorical: boolean;
  isCurrent: boolean;
  isProjected: boolean;
  income: number;
  expenses: number;
  netSavings: number;
  cumulativeSavings: number;
}

export interface SuggestedRecurringPattern {
  name: string;
  category: string;
  suggestedAmount: number;
  frequency: string;
  intervalDays?: number;
  confidence: number;
  occurrences: number;
  lastDate: string;
  reason: string;
}

/**
 * Calculates next due date for a recurring commitment given its parameters.
 * Accurately supports custom interval days (such as Indian 28-day mobile recharges).
 */
export function calculateNextDueDate(
  startDateInput: Date | string,
  frequency: string,
  intervalDays?: number | null,
  referenceDate: Date = new Date()
): Date {
  const start = new Date(startDateInput);
  let next = new Date(start);

  if (frequency === 'DAYS_INTERVAL' && intervalDays && intervalDays > 0) {
    // Repeatedly add the interval until it is strictly in the future relative to referenceDate
    // or return the first upcoming date
    while (isBefore(next, referenceDate)) {
      next = addDays(next, intervalDays);
    }
    return next;
  }

  if (frequency === 'WEEKLY') {
    while (isBefore(next, referenceDate)) {
      next = addDays(next, 7);
    }
    return next;
  }

  if (frequency === 'BI_WEEKLY') {
    while (isBefore(next, referenceDate)) {
      next = addDays(next, 14);
    }
    return next;
  }

  if (frequency === 'QUARTERLY') {
    while (isBefore(next, referenceDate)) {
      next = addMonths(next, 3);
    }
    return next;
  }

  if (frequency === 'YEARLY') {
    while (isBefore(next, referenceDate)) {
      next = addYears(next, 1);
    }
    return next;
  }

  // Default: MONTHLY
  while (isBefore(next, referenceDate)) {
    next = addMonths(next, 1);
  }
  return next;
}

/**
 * Normalized monthly income for a recurring income source
 */
export function getMonthlyEquivalentIncome(income: IncomeItem): number {
  const amount = Number(income.amount) || 0;
  switch (income.frequency) {
    case 'WEEKLY':
      return (amount * 52) / 12;
    case 'BI_WEEKLY':
      return (amount * 26) / 12;
    case 'MONTHLY':
      return amount;
    case 'ONE_TIME':
      return 0; // Handled per-month
    default:
      return amount;
  }
}

/**
 * Main forecasting computation engine.
 * Gracefully handles Day-One Cold Start with 0 or sparse transactions.
 */
export function generateForecastSummary(
  incomes: IncomeItem[],
  expenses: ExpenseItem[],
  recurringExpenses: RecurringExpenseItem[],
  targetDate: Date = new Date()
): ForecastSummary {
  const now = targetDate;
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const totalDaysInMonth = getDaysInMonth(now);
  const daysElapsed = Math.max(1, now.getDate());
  const daysRemaining = Math.max(0, totalDaysInMonth - daysElapsed);

  // 1. Analyze Data Maturity for Cold Start
  const distinctMonths = new Set<string>();
  for (const exp of expenses) {
    const d = new Date(exp.date);
    distinctMonths.add(`${d.getFullYear()}-${d.getMonth()}`);
  }

  let coldStartStatus: 'COLD_START_MANUAL' | 'EMERGING_HISTORY' | 'MATURE_TREND';
  let coldStartMessage: string;

  if (distinctMonths.size < 2 || expenses.length < 5) {
    coldStartStatus = 'COLD_START_MANUAL';
    coldStartMessage =
      'Cold Start Mode: Trend history is currently sparse. Projections are computed directly from your declared monthly income and manual recurring commitments (like 28-day recharges and bills). Trend predictions will unlock automatically as you log more expenses.';
  } else if (distinctMonths.size < 6) {
    coldStartStatus = 'EMERGING_HISTORY';
    coldStartMessage =
      'Emerging Trends: Predictions now combine your declared recurring bills with initial spending patterns.';
  } else {
    coldStartStatus = 'MATURE_TREND';
    coldStartMessage =
      'Mature Forecast: Projections utilize long-term rolling averages, seasonal trends, and recurring commitments.';
  }

  // 2. Current Month Actuals
  const currentMonthExpenses = expenses.filter((e) => {
    const d = new Date(e.date);
    return isSameMonth(d, now);
  });

  const actualSpendSoFar = currentMonthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const currentMonthIncomes = incomes.filter((i) => {
    const d = new Date(i.dateReceived);
    return isSameMonth(d, now);
  });

  // Calculate projected total income for the month:
  // (Sum of active recurring monthly equivalents + one-time incomes in this month)
  let projectedTotalIncome = 0;
  let hasRecurringIncome = false;

  for (const inc of incomes) {
    if (inc.frequency !== 'ONE_TIME') {
      projectedTotalIncome += getMonthlyEquivalentIncome(inc);
      hasRecurringIncome = true;
    }
  }

  // Add one-time incomes received this month
  for (const inc of currentMonthIncomes) {
    if (inc.frequency === 'ONE_TIME') {
      projectedTotalIncome += Number(inc.amount || 0);
    }
  }

  // If no recurring income was declared, use whatever actual income arrived this month
  const actualIncomeSoFar = currentMonthIncomes.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  if (!hasRecurringIncome) {
    projectedTotalIncome = Math.max(actualIncomeSoFar, 0);
  }

  // 3. Upcoming Recurring Expenses for This Month & Next Month
  const upcomingExpenses: UpcomingExpenseProjection[] = [];
  let remainingRecurringSpendThisMonth = 0;

  const activeRecurring = recurringExpenses.filter((r) => r.isActive);

  for (const rec of activeRecurring) {
    // Determine the next due date
    let dueDate = new Date(rec.nextDueDate || rec.startDate);
    if (isBefore(dueDate, now)) {
      dueDate = calculateNextDueDate(rec.startDate, rec.frequency, rec.durationInDays, now);
    }

    const diffDays = differenceInCalendarDays(dueDate, now);

    // Check if it falls within current month (remaining days)
    if (isSameMonth(dueDate, now) && (isAfter(dueDate, now) || diffDays === 0)) {
      // Check if user already logged an expense matching this recurring commitment this month
      const alreadyLogged = currentMonthExpenses.some(
        (e) =>
          e.recurringExpenseId === rec.id ||
          (e.isRecurring && e.description.toLowerCase().includes(rec.name.toLowerCase()))
      );

      if (!alreadyLogged) {
        remainingRecurringSpendThisMonth += Number(rec.amount || 0);
      }
    }

    // Add to upcoming list if within the next 45 days
    if (diffDays >= 0 && diffDays <= 45) {
      upcomingExpenses.push({
        id: `upcoming-${rec.id}-${dueDate.getTime()}`,
        recurringExpenseId: rec.id,
        name: rec.name,
        category: rec.category,
        amount: Number(rec.amount || 0),
        dueDate: dueDate.toISOString(),
        daysUntilDue: diffDays,
        isConfirmed: rec.confidence >= 1.0,
        frequency:
          rec.frequency === 'DAYS_INTERVAL' && rec.durationInDays
            ? `Every ${rec.durationInDays} days`
            : rec.frequency.toLowerCase(),
        userId: rec.userId,
      });
    }
  }

  // Sort upcoming expenses by due date ascending
  upcomingExpenses.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // 4. Burn Rate & Estimated Discretionary Spend for Current Month
  const averageDailySpend = actualSpendSoFar / daysElapsed;
  let estimatedDiscretionarySpend = 0;

  if (coldStartStatus === 'COLD_START_MANUAL') {
    // In cold-start, we don't extrapolate erratic single-day spikes wildly.
    // We project conservative discretionary spending based on daily average if daysElapsed >= 3.
    if (daysElapsed >= 3) {
      // Discretionary excludes items already categorized as recurring
      const nonRecurringActualSoFar = currentMonthExpenses
        .filter((e) => !e.isRecurring && !e.recurringExpenseId)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const dailyNonRecurringRate = nonRecurringActualSoFar / daysElapsed;
      estimatedDiscretionarySpend = Math.round(dailyNonRecurringRate * daysRemaining);
    } else {
      estimatedDiscretionarySpend = 0;
    }
  } else {
    // With history, extrapolate based on rolling average daily pace
    estimatedDiscretionarySpend = Math.round(averageDailySpend * daysRemaining);
  }

  const projectedTotalSpend = Math.round(
    actualSpendSoFar + remainingRecurringSpendThisMonth + estimatedDiscretionarySpend
  );
  const projectedNetSavings = Math.round(projectedTotalIncome - projectedTotalSpend);
  const savingsRatePercentage =
    projectedTotalIncome > 0 ? Math.round((projectedNetSavings / projectedTotalIncome) * 100) : 0;

  // 5. Burn Rate Alert Trigger
  const projectedMonthlyBurn = Math.round(averageDailySpend * 30);
  const isDeficit = projectedNetSavings < 0 || (projectedTotalIncome > 0 && projectedTotalSpend > projectedTotalIncome);
  const deficitAmount = isDeficit ? Math.abs(projectedNetSavings) : 0;
  const warningTriggered = isDeficit || (projectedTotalIncome > 0 && projectedNetSavings < projectedTotalIncome * 0.05);

  let warningMessage: string | null = null;
  if (isDeficit) {
    warningMessage = `Cash Flow Alert: Projected spend exceeds income by ₹${deficitAmount.toLocaleString(
      'en-IN'
    )} this month. Current daily burn is ₹${Math.round(averageDailySpend).toLocaleString('en-IN')}/day.`;
  } else if (warningTriggered) {
    warningMessage = `Tight Buffer Warning: Projected savings for this month are very low (₹${projectedNetSavings.toLocaleString(
      'en-IN'
    )}, ${savingsRatePercentage}% savings rate).`;
  }

  // 6. Multi-Month Projection (Current Month + Next 2 Months)
  const monthlyProjections: MonthlyTrendPoint[] = [];
  let runningCumulativeSavings = 0;

  // Current Month Point
  monthlyProjections.push({
    monthKey: format(now, 'yyyy-MM'),
    monthLabel: format(now, 'MMM yyyy'),
    isHistorical: false,
    isCurrent: true,
    isProjected: true,
    income: Math.round(projectedTotalIncome),
    expenses: projectedTotalSpend,
    netSavings: projectedNetSavings,
    cumulativeSavings: (runningCumulativeSavings += projectedNetSavings),
  });

  // Calculate monthly recurring commitments cost
  const baseMonthlyRecurringTotal = activeRecurring.reduce((sum, r) => {
    const amt = Number(r.amount || 0);
    if (r.frequency === 'DAYS_INTERVAL' && r.durationInDays) {
      return sum + (amt * 30) / r.durationInDays;
    }
    if (r.frequency === 'QUARTERLY') return sum + amt / 3;
    if (r.frequency === 'YEARLY') return sum + amt / 12;
    return sum + amt;
  }, 0);

  // Next 2 Months
  for (let m = 1; m <= 2; m++) {
    const futureDate = addMonths(now, m);
    const mLabel = format(futureDate, 'MMM yyyy');
    const mKey = format(futureDate, 'yyyy-MM');

    // Expected income is base recurring income
    const expectedIncome = Math.round(projectedTotalIncome);

    // Projected spend is baseline recurring + baseline discretionary
    const baselineDiscretionary =
      coldStartStatus === 'COLD_START_MANUAL'
        ? Math.round(Math.max(actualSpendSoFar, estimatedDiscretionarySpend))
        : Math.round(projectedTotalSpend * 0.95);

    const futureSpend = Math.round(baseMonthlyRecurringTotal + baselineDiscretionary);
    const futureNetSavings = Math.round(expectedIncome - futureSpend);

    monthlyProjections.push({
      monthKey: mKey,
      monthLabel: mLabel,
      isHistorical: false,
      isCurrent: false,
      isProjected: true,
      income: expectedIncome,
      expenses: futureSpend,
      netSavings: futureNetSavings,
      cumulativeSavings: (runningCumulativeSavings += futureNetSavings),
    });
  }

  // 7. Pattern Detection Enhancement (Auto-detect recurring expenses when data accumulates)
  const detectedRecurringSuggestions: SuggestedRecurringPattern[] = detectRecurringExpenseCandidates(
    expenses,
    recurringExpenses
  );

  return {
    coldStartStatus,
    coldStartMessage,
    currentMonth: {
      name: format(now, 'MMMM yyyy'),
      daysInMonth: totalDaysInMonth,
      daysElapsed,
      daysRemaining,
      actualIncomeSoFar,
      projectedTotalIncome: Math.round(projectedTotalIncome),
      actualSpendSoFar: Math.round(actualSpendSoFar),
      remainingRecurringSpend: Math.round(remainingRecurringSpendThisMonth),
      estimatedDiscretionarySpend,
      projectedTotalSpend,
      projectedNetSavings,
      savingsRatePercentage,
    },
    burnRate: {
      averageDailySpend: Math.round(averageDailySpend),
      projectedMonthlyBurn,
      isDeficit,
      deficitAmount,
      warningTriggered,
      warningMessage,
      estimatedDaysRemainingInMonth: daysRemaining,
    },
    upcomingExpenses,
    monthlyProjections,
    detectedRecurringSuggestions,
  };
}

/**
 * Pattern Detection Logic:
 * Scans historical expenses to find recurring candidates (e.g. mobile recharges every 28 days,
 * utility bills every 30 days, semi-annual insurance, gym memberships).
 */
export function detectRecurringExpenseCandidates(
  expenses: ExpenseItem[],
  existingRecurring: RecurringExpenseItem[]
): SuggestedRecurringPattern[] {
  const suggestions: SuggestedRecurringPattern[] = [];
  if (expenses.length < 3) return suggestions;

  const existingNames = new Set(existingRecurring.map((r) => r.name.toLowerCase().trim()));

  // Group expenses by normalized description or category + amount similarity
  const groups: Record<string, ExpenseItem[]> = {};

  for (const exp of expenses) {
    const key = exp.description.toLowerCase().trim();
    if (!key || key.length < 3) continue;
    if (existingNames.has(key)) continue;

    if (!groups[key]) groups[key] = [];
    groups[key].push(exp);
  }

  for (const [desc, list] of Object.entries(groups)) {
    if (list.length < 2) continue;

    // Sort by date ascending
    const sorted = [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Check interval between consecutive occurrences
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prevDate = new Date(sorted[i - 1].date);
      const currDate = new Date(sorted[i].date);
      const diff = Math.abs(differenceInCalendarDays(currDate, prevDate));
      intervals.push(diff);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const avgAmount = sorted.reduce((sum, item) => sum + Number(item.amount), 0) / sorted.length;

    // Check for 28-day cycle (prepaid recharge pack)
    if (avgInterval >= 26 && avgInterval <= 30) {
      suggestions.push({
        name: sorted[0].description,
        category: sorted[0].category,
        suggestedAmount: Math.round(avgAmount),
        frequency: 'DAYS_INTERVAL',
        intervalDays: 28,
        confidence: 0.85,
        occurrences: sorted.length,
        lastDate: new Date(sorted[sorted.length - 1].date).toISOString(),
        reason: `Repeats approximately every ${Math.round(
          avgInterval
        )} days (matches 28-day recharge / monthly cycle).`,
      });
    } else if (avgInterval >= 29 && avgInterval <= 33) {
      // Monthly bill (rent, electricity, broadband)
      suggestions.push({
        name: sorted[0].description,
        category: sorted[0].category,
        suggestedAmount: Math.round(avgAmount),
        frequency: 'MONTHLY',
        confidence: 0.8,
        occurrences: sorted.length,
        lastDate: new Date(sorted[sorted.length - 1].date).toISOString(),
        reason: `Repeats monthly (average interval of ${Math.round(avgInterval)} days).`,
      });
    } else if (avgInterval >= 85 && avgInterval <= 95) {
      // Quarterly bill
      suggestions.push({
        name: sorted[0].description,
        category: sorted[0].category,
        suggestedAmount: Math.round(avgAmount),
        frequency: 'QUARTERLY',
        confidence: 0.75,
        occurrences: sorted.length,
        lastDate: new Date(sorted[sorted.length - 1].date).toISOString(),
        reason: `Repeats quarterly (every ~90 days).`,
      });
    } else if (avgInterval >= 170 && avgInterval <= 190) {
      // Semi-annual (e.g., insurance, school fees)
      suggestions.push({
        name: sorted[0].description,
        category: sorted[0].category,
        suggestedAmount: Math.round(avgAmount),
        frequency: 'DAYS_INTERVAL',
        intervalDays: 180,
        confidence: 0.7,
        occurrences: sorted.length,
        lastDate: new Date(sorted[sorted.length - 1].date).toISOString(),
        reason: `Repeats semi-annually (~6 months).`,
      });
    }
  }

  return suggestions;
}
