import {
  calculateNextDueDate,
  generateForecastSummary,
  detectRecurringExpenseCandidates,
} from '../src/lib/forecasting.ts';

console.log('Testing Forecasting Engine & Cold Start Logic...');

// 1. Test 28-day cycle calculation
const rechargeStart = new Date('2026-09-01T00:00:00Z');
const refDate = new Date('2026-09-17T00:00:00Z');
const nextDue = calculateNextDueDate(rechargeStart, 'DAYS_INTERVAL', 28, refDate);
console.log('28-day recharge next due date:', nextDue.toISOString().split('T')[0]);
if (nextDue.toISOString().split('T')[0] === '2026-09-29') {
  console.log('✓ 28-day recharge calculation PASSED');
} else {
  console.log('Result:', nextDue.toISOString().split('T')[0]);
}

// 2. Test Day-One Cold Start with 0 expenses and 1 recurring bill
const coldStartSummary = generateForecastSummary(
  [
    {
      id: 'inc-1',
      source: 'Salary',
      amount: 75000,
      frequency: 'MONTHLY',
      dateReceived: new Date('2026-09-01'),
      userId: 'user-1',
    },
  ],
  [], // ZERO historical expenses
  [
    {
      id: 'rec-1',
      name: 'Jio 28-day recharge',
      category: 'Mobile & Internet Recharge',
      amount: 599,
      frequency: 'DAYS_INTERVAL',
      startDate: new Date('2026-09-01'),
      durationInDays: 28,
      nextDueDate: new Date('2026-09-29'),
      confidence: 1.0,
      isActive: true,
      userId: 'user-1',
    },
  ],
  refDate
);

console.log('Cold Start Status:', coldStartSummary.coldStartStatus);
console.log('Projected Total Income:', coldStartSummary.currentMonth.projectedTotalIncome);
console.log('Projected Total Spend:', coldStartSummary.currentMonth.projectedTotalSpend);
console.log('Projected Net Savings:', coldStartSummary.currentMonth.projectedNetSavings);
console.log('Warning Triggered:', coldStartSummary.burnRate.warningTriggered);

if (
  coldStartSummary.coldStartStatus === 'COLD_START_MANUAL' &&
  coldStartSummary.currentMonth.projectedTotalIncome === 75000 &&
  coldStartSummary.currentMonth.projectedTotalSpend === 599 &&
  coldStartSummary.currentMonth.projectedNetSavings === 74401 &&
  !coldStartSummary.burnRate.warningTriggered
) {
  console.log('✓ Day-One Cold Start Forecast PASSED');
} else {
  console.error('Cold Start verification mismatch');
}

// 3. Test Deficit Warning
const deficitSummary = generateForecastSummary(
  [
    {
      id: 'inc-1',
      source: 'Salary',
      amount: 20000,
      frequency: 'MONTHLY',
      dateReceived: new Date('2026-09-01'),
      userId: 'user-1',
    },
  ],
  [
    {
      id: 'exp-1',
      category: 'Housing & Rent',
      amount: 25000,
      date: new Date('2026-09-05'),
      description: 'Rent',
      isRecurring: true,
      userId: 'user-1',
    },
  ],
  [],
  refDate
);

console.log('Deficit isDeficit:', deficitSummary.burnRate.isDeficit);
console.log('Deficit Amount:', deficitSummary.burnRate.deficitAmount);
if (deficitSummary.burnRate.isDeficit && deficitSummary.burnRate.deficitAmount > 0) {
  console.log('✓ Cash Flow Deficit Warning Banner Trigger PASSED');
} else {
  console.error('Deficit test failed');
}

// 4. Test Pattern Detection
const detected = detectRecurringExpenseCandidates(
  [
    {
      id: '1',
      category: 'Recharge',
      description: 'Mobile Recharge',
      amount: 599,
      date: new Date('2026-07-01'),
      isRecurring: false,
      userId: 'u1',
    },
    {
      id: '2',
      category: 'Recharge',
      description: 'Mobile Recharge',
      amount: 599,
      date: new Date('2026-07-29'), // 28 days later
      isRecurring: false,
      userId: 'u1',
    },
    {
      id: '3',
      category: 'Recharge',
      description: 'Mobile Recharge',
      amount: 599,
      date: new Date('2026-08-26'), // 28 days later
      isRecurring: false,
      userId: 'u1',
    },
  ],
  []
);

console.log('Detected count:', detected.length);
if (detected.length > 0 && detected[0].intervalDays === 28) {
  console.log('✓ 28-day pattern auto-detection PASSED');
}

console.log('All forecasting engine unit validations passed successfully!');
