'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import {
  Receipt,
  Search,
  Filter,
  Plus,
  Trash2,
  Calendar,
  Tag,
  Clock,
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  BadgePercent,
  CheckCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  parseISO,
  isSameMonth,
} from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { getOccurrencesForMonth } from '@/lib/forecasting';

export interface UnifiedTransaction {
  id: string;
  type: 'EXPENSE' | 'INCOME';
  amount: number;
  category: string;
  description: string;
  notes?: string | null;
  date: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    avatarColor?: string;
  };
  isRecurring?: boolean;
  frequency?: string;
  isScheduled?: boolean;
  isSkipped?: boolean;
  recurringId?: string;
}

export default function ExpensesPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading, viewMode: view, setViewMode: setView } = useAuth();
  const { showFeedback } = useFeedback();
  const isAdmin = currentUser?.role === 'ADMIN';

  const today = new Date();
  const currentMonthStr = format(today, 'yyyy-MM');
  const nextMonthStr = format(addMonths(today, 1), 'yyyy-MM');
  const lastMonthStr = format(subMonths(today, 1), 'yyyy-MM');

  // Month & Period state
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [isAllTime, setIsAllTime] = useState<boolean>(false);

  // Data states
  const [rawExpenses, setRawExpenses] = useState<any[]>([]);
  const [rawIncomes, setRawIncomes] = useState<any[]>([]);
  const [rawRecurring, setRawRecurring] = useState<any[]>([]);
  const [allTemplateIncomes, setAllTemplateIncomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'DEDUCTED' | 'ADDED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedMember, setSelectedMember] = useState('ALL');

  // Quick Pay Modal for Scheduled Recurring Commitments
  const [payTarget, setPayTarget] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [isFinalInstallment, setIsFinalInstallment] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleTypeFilter = (type: 'ALL' | 'DEDUCTED' | 'ADDED') => {
    setTypeFilter(type);
    const label =
      type === 'ALL'
        ? 'All Transactions'
        : type === 'DEDUCTED'
        ? 'Deductions (Expenses)'
        : 'Additions (Incomes)';
    showFeedback(`Filter: ${label}`, 'info');
  };

  const handlePrevMonth = () => {
    setIsAllTime(false);
    const baseDate = parseISO(`${selectedMonth}-01`);
    const newMonth = format(subMonths(baseDate, 1), 'yyyy-MM');
    setSelectedMonth(newMonth);
    showFeedback(`Viewing ${format(parseISO(`${newMonth}-01`), 'MMMM yyyy')}`, 'info');
  };

  const handleNextMonth = () => {
    setIsAllTime(false);
    const baseDate = parseISO(`${selectedMonth}-01`);
    const newMonth = format(addMonths(baseDate, 1), 'yyyy-MM');
    setSelectedMonth(newMonth);
    showFeedback(`Viewing ${format(parseISO(`${newMonth}-01`), 'MMMM yyyy')}`, 'info');
  };

  // Redirect unauthenticated user to /login
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [authLoading, currentUser, router]);

  const fetchTransactions = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const targetView = isAdmin ? view : 'personal';

      const expParams = new URLSearchParams();
      expParams.set('view', targetView);
      if (isAdmin && selectedMember !== 'ALL') expParams.set('memberId', selectedMember);
      if (!isAllTime && selectedMonth) expParams.set('month', selectedMonth);

      const incParams = new URLSearchParams();
      incParams.set('view', targetView);
      if (isAdmin && selectedMember !== 'ALL') incParams.set('memberId', selectedMember);
      if (!isAllTime && selectedMonth) incParams.set('month', selectedMonth);

      const [expRes, incRes, recRes, allIncRes] = await Promise.all([
        fetch(`/api/expenses?${expParams.toString()}`),
        fetch(`/api/incomes?${incParams.toString()}`),
        fetch(`/api/recurring?view=${targetView}`),
        fetch(`/api/incomes?view=${targetView}`),
      ]);

      if (expRes.ok) {
        const data = await expRes.json();
        setRawExpenses(data.expenses || []);
      }
      if (incRes.ok) {
        const data = await incRes.json();
        setRawIncomes(data.incomes || []);
      }
      if (recRes.ok) {
        const data = await recRes.json();
        setRawRecurring(data.recurringExpenses || []);
      }
      if (allIncRes.ok) {
        const data = await allIncRes.json();
        setAllTemplateIncomes(data.incomes || []);
      }
    } catch (e) {
      console.error('Error fetching transactions:', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin, view, selectedMember, isAllTime, selectedMonth]);

  useEffect(() => {
    if (currentUser) {
      fetchTransactions();
    }
  }, [currentUser, fetchTransactions]);

  // Combine both sources and project scheduled future items into unified transaction list
  const allTransactions = useMemo<UnifiedTransaction[]>(() => {
    const expensesMapped: UnifiedTransaction[] = rawExpenses.map((e) => ({
      id: e.id,
      type: 'EXPENSE',
      amount: e.amount,
      category: e.category,
      description: e.description,
      notes: null,
      date: e.date,
      userId: e.userId,
      user: e.user,
      isRecurring: e.isRecurring,
    }));

    const incomesMapped: UnifiedTransaction[] = rawIncomes.map((i) => ({
      id: i.id,
      type: 'INCOME',
      amount: i.amount,
      category: i.source,
      description: i.source,
      notes: i.notes,
      date: i.dateReceived,
      userId: i.userId,
      user: i.user,
      frequency: i.frequency,
    }));

    const combined: UnifiedTransaction[] = [...expensesMapped, ...incomesMapped];

    // If viewing a specific month (not all time), project active recurring commitments & expected salaries!
    if (!isAllTime && selectedMonth) {
      // Parse target year and target month index (0-indexed: 0 = Jan, 1 = Feb, ..., 11 = Dec)
      const [targetYearStr, targetMonthStr] = selectedMonth.split('-');
      const targetYear = parseInt(targetYearStr, 10);
      const targetMonthIdx = parseInt(targetMonthStr, 10) - 1;

      // 1. Project Active Recurring Commitments starting from their actual startDate!
      // Completed commitments (isActive === false) are strictly excluded.
      const activeCommitments = rawRecurring.filter((r) => r.isActive !== false);

      for (const rec of activeCommitments) {
        const start = rec.startDate || rec.nextDueDate || rec.createdAt;
        if (!start) continue;

        // Calculate all occurrences for this commitment in selectedMonth based on startDate
        const occurrences = getOccurrencesForMonth(
          {
            startDate: start,
            frequency: rec.frequency,
            durationInDays: rec.durationInDays,
            skippedDates: rec.skippedDates,
          },
          targetYear,
          targetMonthIdx
        );

        for (const occ of occurrences) {
          // Check if already paid/logged in this month
          const alreadyLogged = rawExpenses.some(
            (e) =>
              e.recurringExpenseId === rec.id ||
              (e.description?.toLowerCase().includes(rec.name.toLowerCase()) &&
                isSameMonth(new Date(e.date), new Date(Date.UTC(targetYear, targetMonthIdx, 1))))
          );

          if (!alreadyLogged) {
            const isEmi =
              rec.category?.toLowerCase().includes('emi') ||
              rec.category?.toLowerCase().includes('loan') ||
              rec.name?.toLowerCase().includes('emi');

            combined.push({
              id: `scheduled-rec-${rec.id}-${occ.dateStr}`,
              type: 'EXPENSE',
              amount: rec.amount,
              category: rec.category,
              description: rec.name,
              notes: occ.isSkipped
                ? `Skipped for this period (${isEmi ? 'EMI' : 'Recurring bill'})`
                : `Scheduled ${isEmi ? 'EMI' : 'commitment'} (${
                    rec.frequency === 'YEARLY'
                      ? 'Annual bill'
                      : rec.frequency === 'QUARTERLY'
                      ? 'Quarterly bill'
                      : rec.frequency === 'DAYS_INTERVAL'
                      ? `Every ${rec.durationInDays || 28} days`
                      : 'Monthly bill'
                  })`,
              date: `${occ.dateStr}T12:00:00.000Z`,
              userId: rec.userId,
              user: rec.user,
              isRecurring: true,
              isScheduled: true,
              isSkipped: occ.isSkipped,
              recurringId: rec.id,
            });
          }
        }
      }

        // 2. Project Expected Monthly Recurring Incomes for future months (e.g. Next Month)
        if (selectedMonth > currentMonthStr) {
          const monthlyIncomes = allTemplateIncomes.filter((i) => i.frequency === 'MONTHLY');
          const seenIncomeKeys = new Set<string>();

          for (const inc of monthlyIncomes) {
            const key = `${inc.userId}-${inc.source}`;
            if (!seenIncomeKeys.has(key)) {
              seenIncomeKeys.add(key);
              combined.push({
                id: `scheduled-inc-${inc.id}-${selectedMonth}`,
                type: 'INCOME',
                amount: inc.amount,
                category: inc.source,
                description: `${inc.source} (Expected Salary/Income)`,
                notes: 'Projected monthly recurring income',
                date: `${selectedMonth}-01T10:00:00.000Z`,
                userId: inc.userId,
                user: inc.user,
                frequency: 'MONTHLY',
                isScheduled: true,
              });
            }
          }
        }
      }

    return combined.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [rawExpenses, rawIncomes, rawRecurring, allTemplateIncomes, isAllTime, selectedMonth, currentMonthStr]);

  // Dynamic list of all categories / sources for dropdown
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    allTransactions.forEach((t) => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats).sort();
  }, [allTransactions]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((t) => {
      // Type filter (ALL, DEDUCTED / Expense, ADDED / Income)
      if (typeFilter === 'DEDUCTED' && t.type !== 'EXPENSE') return false;
      if (typeFilter === 'ADDED' && t.type !== 'INCOME') return false;

      // Category filter
      if (selectedCategory !== 'ALL' && t.category !== selectedCategory) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesDesc = t.description?.toLowerCase().includes(query);
        const matchesCat = t.category?.toLowerCase().includes(query);
        const matchesNotes = t.notes?.toLowerCase().includes(query);
        const matchesUser = t.user?.name?.toLowerCase().includes(query);
        if (!matchesDesc && !matchesCat && !matchesNotes && !matchesUser) return false;
      }

      return true;
    });
  }, [allTransactions, typeFilter, selectedCategory, searchTerm]);

  // =========================================================================
  // Calculations for Financial KPI Cards
  // =========================================================================

  // 1. Total Income (Credit): All incomes in the current filtered view
  const totalIncome = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const actualIncome = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'INCOME' && !t.isScheduled)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const scheduledIncome = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'INCOME' && t.isScheduled)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  // 2. Scheduled Payments Total (Debit): All upcoming scheduled commitments in this month (excluding skipped)
  const scheduledPaymentsTotal = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'EXPENSE' && t.isScheduled && !t.isSkipped)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const scheduledPaymentsCount = useMemo(() => {
    return filteredTransactions.filter((t) => t.type === 'EXPENSE' && t.isScheduled && !t.isSkipped).length;
  }, [filteredTransactions]);

  const skippedPaymentsCount = useMemo(() => {
    return filteredTransactions.filter((t) => t.type === 'EXPENSE' && t.isScheduled && t.isSkipped).length;
  }, [filteredTransactions]);

  // 3. Actual Spent (Debit): Expenses already logged/paid
  const actualSpentTotal = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'EXPENSE' && !t.isScheduled)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const actualSpentCount = useMemo(() => {
    return filteredTransactions.filter((t) => t.type === 'EXPENSE' && !t.isScheduled).length;
  }, [filteredTransactions]);

  // 4. Combined Total Debit = Scheduled + Actual Spent
  const totalDebit = scheduledPaymentsTotal + actualSpentTotal;

  // 5. Projected Net Balance = Total Income - Total Debit
  const projectedNetBalance = totalIncome - totalDebit;

  // Handle Pay / Record Scheduled item
  const handlePayScheduled = async (t: UnifiedTransaction) => {
    if (t.type === 'EXPENSE' && t.recurringId) {
      const rec = rawRecurring.find((r) => r.id === t.recurringId);
      if (rec) {
        setPayTarget(rec);
        setPayAmount(rec.amount.toString());
        setIsFinalInstallment(false);
      }
    } else if (t.type === 'INCOME') {
      try {
        const res = await fetch('/api/incomes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: t.category,
            amount: t.amount,
            frequency: 'MONTHLY',
            dateReceived: t.date,
            userId: t.userId,
            notes: 'Recorded from monthly schedule',
          }),
        });
        if (res.ok) {
          showFeedback(`Recorded income: ₹${t.amount.toLocaleString('en-IN')}`, 'success');
          fetchTransactions();
        }
      } catch (e) {
        console.error(e);
        showFeedback('Failed to record income', 'warning');
      }
    }
  };

  // Skip a scheduled occurrence (day or month)
  const handleSkipOccurrence = async (t: UnifiedTransaction) => {
    if (!t.recurringId) return;
    const dateToSkip = t.date ? t.date.split('T')[0] : selectedMonth;
    const formattedDate = format(new Date(t.date), 'MMMM yyyy');

    if (!confirm(`Skip this scheduled payment for "${t.description}" (${formattedDate})?\n\nThis will exclude it from this month's debit totals.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/recurring/${t.recurringId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'skip_date',
          date: dateToSkip,
        }),
      });

      if (res.ok) {
        showFeedback(`Skipped "${t.description}" for ${format(new Date(t.date), 'MMM yyyy')}`, 'info');
        fetchTransactions();
      } else {
        showFeedback('Failed to skip commitment', 'warning');
      }
    } catch (err) {
      console.error(err);
      showFeedback('Error skipping commitment', 'warning');
    }
  };

  // Restore / unskip a previously skipped occurrence
  const handleUnskipOccurrence = async (t: UnifiedTransaction) => {
    if (!t.recurringId) return;
    const dateToUnskip = t.date ? t.date.split('T')[0] : selectedMonth;

    try {
      const res = await fetch(`/api/recurring/${t.recurringId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unskip_date',
          date: dateToUnskip,
        }),
      });

      if (res.ok) {
        showFeedback(`Restored "${t.description}" for ${format(new Date(t.date), 'MMM yyyy')}`, 'success');
        fetchTransactions();
      } else {
        showFeedback('Failed to restore commitment', 'warning');
      }
    } catch (err) {
      console.error(err);
      showFeedback('Error restoring commitment', 'warning');
    }
  };

  // Confirm payment in modal dialog
  const handleConfirmPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/recurring/${payTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_paid',
          actualAmount: payAmount ? parseFloat(payAmount) : payTarget.amount,
          markCompleted: isFinalInstallment,
        }),
      });

      if (res.ok) {
        showFeedback(
          isFinalInstallment
            ? `Final payment recorded! "${payTarget.name}" marked as completed.`
            : `Payment of ₹${payAmount || payTarget.amount} logged for "${payTarget.name}"`,
          'success'
        );
        setPayTarget(null);
        setPayAmount('');
        setIsFinalInstallment(false);
        fetchTransactions();
      }
    } catch (e) {
      console.error(e);
      showFeedback('Failed to log payment', 'warning');
    } finally {
      setConfirming(false);
    }
  };

  // Delete transaction handler
  const handleDelete = async (t: UnifiedTransaction) => {
    const isIncome = t.type === 'INCOME';
    const label = isIncome ? 'income entry' : 'expense entry';
    if (!confirm(`Are you sure you want to delete this ${label}?`)) return;

    try {
      const endpoint = isIncome ? `/api/incomes/${t.id}` : `/api/expenses/${t.id}`;
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (res.ok) {
        if (isIncome) {
          setRawIncomes((prev) => prev.filter((i) => i.id !== t.id));
        } else {
          setRawExpenses((prev) => prev.filter((e) => e.id !== t.id));
        }
        showFeedback(`${isIncome ? 'Income' : 'Expense'} entry deleted`, 'warning');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (authLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium text-slate-400">Loading transactions...</p>
      </div>
    );
  }

  if (!currentUser) return null;

  const currency = currentUser.currency || '₹';
  const isFutureMonth = !isAllTime && selectedMonth > currentMonthStr;

  return (
    <AppShell
      user={currentUser}
      currentView={view}
      onViewChange={isAdmin ? setView : undefined}
      onRefreshData={fetchTransactions}
    >
      <div className="space-y-6 pb-6">
        {/* Header with Title & Context */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Receipt className="w-6 h-6 text-indigo-400" />
              <span>{isAdmin && view === 'household' ? 'Household Transactions & Ledger' : 'My Personal Transactions'}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              {isAdmin && view === 'household'
                ? 'Complete monthly transaction ledger, scheduled recurring obligations, and cash flow across family members'
                : `Strictly showing transaction ledger and scheduled obligations for ${currentUser.name}`}
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Month & Period Navigator Bar */}
        {/* ========================================================================= */}
        <div className="bg-[#0f172a]/95 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left: Previous / Next Month Navigation */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition-all shadow"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <span className="text-base sm:text-lg font-black text-white tracking-tight">
                {isAllTime
                  ? 'All Time (Full Ledger)'
                  : format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}
              </span>

              {!isAllTime && selectedMonth === currentMonthStr && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  This Month
                </span>
              )}

              {!isAllTime && selectedMonth === nextMonthStr && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>Next Month</span>
                </span>
              )}
            </div>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition-all shadow"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Right: Quick Jump Chips & Month/Year Picker */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-center md:justify-end">
            <button
              onClick={() => {
                setSelectedMonth(lastMonthStr);
                setIsAllTime(false);
                showFeedback(`Switched to Last Month (${format(parseISO(`${lastMonthStr}-01`), 'MMM yyyy')})`, 'info');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                !isAllTime && selectedMonth === lastMonthStr
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/40'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              Last Month
            </button>

            <button
              onClick={() => {
                setSelectedMonth(currentMonthStr);
                setIsAllTime(false);
                showFeedback('Switched to This Month', 'info');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                !isAllTime && selectedMonth === currentMonthStr
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/40'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              This Month
            </button>

            <button
              onClick={() => {
                setSelectedMonth(nextMonthStr);
                setIsAllTime(false);
                showFeedback(`Switched to Next Month (${format(parseISO(`${nextMonthStr}-01`), 'MMM yyyy')})`, 'info');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                !isAllTime && selectedMonth === nextMonthStr
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 ring-1 ring-cyan-400/50'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              Next Month
            </button>

            <button
              onClick={() => {
                setIsAllTime(true);
                showFeedback('Viewing All Time transactions', 'info');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                isAllTime
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              All Time
            </button>

            {/* Direct Month Picker Input */}
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedMonth(e.target.value);
                  setIsAllTime(false);
                  showFeedback(`Jumped to ${format(parseISO(`${e.target.value}-01`), 'MMMM yyyy')}`, 'info');
                }
              }}
              className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer shadow"
              title="Pick any month or year"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Financial KPI Summary Cards (Requested by User) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Total Income (Credit) */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950/50 via-slate-900/90 to-[#0b1329] border border-emerald-500/30 p-4 rounded-2xl shadow-xl hover:border-emerald-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                <span>Total Income (Credit)</span>
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/40">
                Inflow
              </span>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                +{currency}{totalIncome.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                {actualIncome > 0 && <span>Received: {currency}{actualIncome.toLocaleString('en-IN')}</span>}
                {actualIncome > 0 && scheduledIncome > 0 && <span>•</span>}
                {scheduledIncome > 0 && (
                  <span className="text-cyan-400 font-medium">Expected: {currency}{scheduledIncome.toLocaleString('en-IN')}</span>
                )}
                {actualIncome === 0 && scheduledIncome === 0 && <span>No income for this period</span>}
              </p>
            </div>
          </div>

          {/* Card 2: Scheduled Payments Total (Debit) */}
          <div className="relative overflow-hidden bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-[#0b1329] border border-amber-500/30 p-4 rounded-2xl shadow-xl hover:border-amber-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 text-amber-400" />
                <span>Scheduled Payments (Debit)</span>
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/40">
                Upcoming
              </span>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                -{currency}{scheduledPaymentsTotal.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {scheduledPaymentsCount} recurring commitment{scheduledPaymentsCount === 1 ? '' : 's'} / EMIs scheduled
                {skippedPaymentsCount > 0 && (
                  <span className="text-amber-400/90 ml-1.5 font-medium">({skippedPaymentsCount} skipped)</span>
                )}
              </p>
            </div>
          </div>

          {/* Card 3: Actual Spent (Debit) */}
          <div className="relative overflow-hidden bg-gradient-to-br from-rose-950/40 via-slate-900/90 to-[#0b1329] border border-rose-500/30 p-4 rounded-2xl shadow-xl hover:border-rose-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <ArrowDownLeft className="w-4 h-4 text-rose-400" />
                <span>Actual Spent (Debit)</span>
              </span>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 font-bold px-2 py-0.5 rounded-full border border-rose-500/40">
                Logged Outflow
              </span>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-black text-rose-400 tracking-tight">
                -{currency}{actualSpentTotal.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {actualSpentCount} expense transaction{actualSpentCount === 1 ? '' : 's'} logged
              </p>
            </div>
          </div>

          {/* Card 4: Projected Net Savings */}
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950/50 via-slate-900/90 to-[#0b1329] border border-indigo-500/30 p-4 rounded-2xl shadow-xl hover:border-indigo-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-indigo-400" />
                <span>Projected Net Balance</span>
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                projectedNetBalance >= 0
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}>
                {projectedNetBalance >= 0 ? 'Surplus' : 'Deficit'}
              </span>
            </div>
            <div className="mt-2.5">
              <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
                projectedNetBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {projectedNetBalance >= 0 ? '+' : ''}{currency}{projectedNetBalance.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Income − (Spent + Scheduled)
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="space-y-3 bg-[#0f172a]/90 p-4 rounded-2xl border border-slate-800 shadow-lg">
          {/* Top Filter Row: Added vs Deducted Switcher Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-700/60 text-xs">
              <button
                type="button"
                onClick={() => handleTypeFilter('ALL')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all duration-150 active:scale-95 ${
                  typeFilter === 'ALL'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/40 ring-1 ring-indigo-400/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>All Transactions</span>
                <span className="ml-1 text-[10px] bg-slate-800/90 px-1.5 py-0.5 rounded-full text-slate-300 font-semibold">
                  {allTransactions.length}
                </span>
                {typeFilter === 'ALL' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleTypeFilter('DEDUCTED')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all duration-150 active:scale-95 ${
                  typeFilter === 'DEDUCTED'
                    ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-600/40 ring-1 ring-rose-400/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Deductions (-)</span>
                <span className="ml-1 text-[10px] bg-rose-950/90 border border-rose-800/60 px-1.5 py-0.5 rounded-full text-rose-300 font-semibold">
                  {filteredTransactions.filter((t) => t.type === 'EXPENSE').length}
                </span>
                {typeFilter === 'DEDUCTED' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-300 animate-pulse ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleTypeFilter('ADDED')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all duration-150 active:scale-95 ${
                  typeFilter === 'ADDED'
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-600/40 ring-1 ring-emerald-400/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Additions (+)</span>
                <span className="ml-1 text-[10px] bg-emerald-950/90 border border-emerald-800/60 px-1.5 py-0.5 rounded-full text-emerald-300 font-semibold">
                  {filteredTransactions.filter((t) => t.type === 'INCOME').length}
                </span>
                {typeFilter === 'ADDED' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse ml-0.5" />
                )}
              </button>
            </div>

            {/* Quick Count Info */}
            <span className="text-xs text-slate-400">
              Showing <strong className="text-white">{filteredTransactions.length}</strong> of {allTransactions.length} entries
            </span>
          </div>

          {/* Bottom Filter Row: Search, Category, Member Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search by title, notes, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Category / Source Filter */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Categories & Sources</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Member Filter (Admin only, in household view) */}
            {isAdmin && view === 'household' && (
              <div>
                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Family Members</option>
                  {currentUser.members?.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.id === currentUser.id ? '(You)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Unified Transaction List Card */}
        <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading ledger transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-16 text-center text-slate-400 border border-dashed border-slate-800/80 m-4 rounded-xl">
              <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">No transactions found for this period</p>
              <p className="text-xs text-slate-500 mt-1">
                {isFutureMonth
                  ? 'No recurring obligations or scheduled income projected for this future month.'
                  : 'Try selecting a different month or switching filters to "All Transactions".'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {filteredTransactions.map((t) => {
                const isIncome = t.type === 'INCOME';
                const isScheduled = Boolean(t.isScheduled);
                const isSkipped = Boolean(t.isSkipped);
                const isEmi =
                  t.category?.toLowerCase().includes('emi') ||
                  t.category?.toLowerCase().includes('loan') ||
                  t.description?.toLowerCase().includes('emi');

                return (
                  <div
                    key={`${t.type}-${t.id}`}
                    className={`p-4 sm:p-5 flex items-center justify-between gap-4 transition-colors ${
                      isSkipped
                        ? 'bg-amber-950/10 hover:bg-amber-950/20 border-l-2 border-l-amber-500/70 opacity-80'
                        : isScheduled
                        ? 'bg-cyan-950/15 hover:bg-cyan-950/25 border-l-2 border-l-cyan-500'
                        : 'hover:bg-slate-900/50'
                    }`}
                  >
                    {/* Left Details */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* Icon Circle */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                          isSkipped
                            ? 'bg-amber-950/60 border-amber-800/80 text-amber-400'
                            : isScheduled
                            ? 'bg-cyan-950/80 border-cyan-700/80 text-cyan-400'
                            : isIncome
                            ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-400'
                            : 'bg-rose-950/60 border-rose-800/80 text-rose-400'
                        }`}
                      >
                        {isSkipped ? (
                          <RotateCcw className="w-5 h-5 text-amber-400" />
                        ) : isScheduled ? (
                          <CalendarClock className="w-5 h-5 text-cyan-400" />
                        ) : isIncome ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : (
                          <ArrowDownLeft className="w-5 h-5" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm sm:text-base font-semibold text-white truncate">
                            {t.description}
                          </p>

                          {/* Skipped Badge */}
                          {isSkipped && (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                              <RotateCcw className="w-3 h-3" />
                              <span>Skipped (Excluded from total)</span>
                            </span>
                          )}

                          {/* Scheduled Badge */}
                          {isScheduled && !isSkipped && (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                              <CalendarClock className="w-3 h-3" />
                              <span>Scheduled / Due</span>
                            </span>
                          )}

                          {/* EMI Badge */}
                          {isEmi && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                              <BadgePercent className="w-3 h-3" />
                              <span>EMI</span>
                            </span>
                          )}

                          {/* Type Pill */}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 border ${
                              isIncome
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800/60'
                                : 'bg-rose-950 text-rose-300 border-rose-800/60'
                            }`}
                          >
                            {isIncome ? 'Added (+)' : 'Deducted (-)'}
                          </span>

                          {/* Category Tag */}
                          <span className="text-[11px] bg-slate-800/90 text-slate-300 border border-slate-700/60 px-2 py-0.5 rounded-full shrink-0">
                            {t.category}
                          </span>

                          {/* Member Badge in Household View */}
                          {view === 'household' && t.user && (
                            <span className="flex items-center gap-1.5 text-[11px] font-medium bg-slate-800/90 text-slate-300 border border-slate-700/60 px-2 py-0.5 rounded-full shrink-0">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: t.user.avatarColor || '#6366f1' }}
                              />
                              {t.user.name} {t.userId === currentUser.id ? '(You)' : ''}
                            </span>
                          )}
                        </div>

                        {/* Date & Notes */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span className={isScheduled ? (isSkipped ? 'text-amber-400 font-semibold line-through' : 'text-cyan-300 font-semibold') : ''}>
                            {format(new Date(t.date), 'MMMM d, yyyy')}
                          </span>
                          {t.notes && (
                            <>
                              <span>•</span>
                              <span className="text-slate-300 italic">{t.notes}</span>
                            </>
                          )}
                          {t.frequency && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-400/90 font-medium capitalize">
                                {t.frequency.toLowerCase().replace('_', ' ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Amount & Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-base sm:text-lg font-black tracking-tight ${
                          isSkipped
                            ? 'line-through text-slate-500'
                            : isIncome
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {isIncome ? '+' : '-'}{currency}
                        {t.amount.toLocaleString('en-IN')}
                      </span>

                      {/* Action buttons: Record Now / Skip / Restore for scheduled vs Delete for logged */}
                      {isScheduled ? (
                        isSkipped ? (
                          <button
                            onClick={() => handleUnskipOccurrence(t)}
                            className="px-3 py-1.5 text-xs font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                            title="Restore this skipped payment"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handlePayScheduled(t)}
                              className="px-3 py-1.5 text-xs font-semibold bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                              title="Record this scheduled transaction"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Record Now</span>
                            </button>
                            {t.type === 'EXPENSE' && t.recurringId && (
                              <button
                                onClick={() => handleSkipOccurrence(t)}
                                className="px-2.5 py-1.5 text-xs font-semibold bg-slate-800/80 hover:bg-amber-950/40 text-slate-400 hover:text-amber-300 border border-slate-700 hover:border-amber-600/40 rounded-xl flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                                title="Skip this payment for this month"
                              >
                                <span>Skip</span>
                              </button>
                            )}
                          </div>
                        )
                      ) : (
                        (currentUser.role === 'ADMIN' || t.userId === currentUser.id) && (
                          <button
                            onClick={() => handleDelete(t)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors active:scale-90"
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Confirm Payment Modal for Scheduled Commitments */}
        {payTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-sm bg-[#0f172a] border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
                <h4 className="text-base font-bold text-white">Record Commitment Payment</h4>
              </div>

              <p className="text-xs text-slate-300">
                Record payment for <strong className="text-white">{payTarget.name}</strong>. This creates
                an expense entry and advances the scheduled due date.
              </p>

              <form onSubmit={handleConfirmPaid} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Amount Paid ({currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-base focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Final Installment Checkbox */}
                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="finalInstallment"
                    checked={isFinalInstallment}
                    onChange={(e) => setIsFinalInstallment(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-600 cursor-pointer"
                  />
                  <label htmlFor="finalInstallment" className="text-xs text-slate-300 select-none cursor-pointer leading-tight">
                    <span className="font-bold text-white block">Final installment?</span>
                    Mark this EMI as <strong>Completed / Paid Off</strong> after this payment.
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPayTarget(null);
                      setIsFinalInstallment(false);
                    }}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={confirming}
                    className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg shadow-md disabled:opacity-50 active:scale-95 transition-all ${
                      isFinalInstallment
                        ? 'bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500'
                        : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                  >
                    {confirming
                      ? 'Saving...'
                      : isFinalInstallment
                      ? 'Pay & Complete EMI'
                      : 'Confirm & Log'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
