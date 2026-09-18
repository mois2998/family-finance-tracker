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
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';

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
}

export default function ExpensesPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading, viewMode: view, setViewMode: setView } = useAuth();
  const { showFeedback } = useFeedback();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [rawExpenses, setRawExpenses] = useState<any[]>([]);
  const [rawIncomes, setRawIncomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'DEDUCTED' | 'ADDED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedMember, setSelectedMember] = useState('ALL');

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

      const incParams = new URLSearchParams();
      incParams.set('view', targetView);
      if (isAdmin && selectedMember !== 'ALL') incParams.set('memberId', selectedMember);

      const [expRes, incRes] = await Promise.all([
        fetch(`/api/expenses?${expParams.toString()}`),
        fetch(`/api/incomes?${incParams.toString()}`),
      ]);

      if (expRes.ok) {
        const data = await expRes.json();
        setRawExpenses(data.expenses || []);
      }
      if (incRes.ok) {
        const data = await incRes.json();
        setRawIncomes(data.incomes || []);
      }
    } catch (e) {
      console.error('Error fetching transactions:', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin, view, selectedMember]);

  useEffect(() => {
    if (currentUser) {
      fetchTransactions();
    }
  }, [currentUser, fetchTransactions]);

  // Combine both sources into unified transaction items
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

    return [...expensesMapped, ...incomesMapped].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [rawExpenses, rawIncomes]);

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

  // Totals for filtered view
  const totalAdded = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const totalDeducted = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const netCashFlow = totalAdded - totalDeducted;

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

  return (
    <AppShell
      user={currentUser}
      currentView={view}
      onViewChange={isAdmin ? setView : undefined}
      onRefreshData={fetchTransactions}
    >
      <div className="space-y-6 pb-6">
        {/* Header with Title & Net Flow Totals */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Receipt className="w-6 h-6 text-indigo-400" />
              <span>{isAdmin && view === 'household' ? 'Household Transactions & Ledger' : 'My Personal Transactions'}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              {isAdmin && view === 'household'
                ? 'Consolidated transaction audit trail of all added inflows and deducted expenses across family members'
                : `Strictly showing all transactions logged by ${currentUser.name}`}
            </p>
          </div>

          {/* Cash Flow Summary Cards */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Total Added */}
            <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded-xl text-xs">
              <span className="text-emerald-300">Added:</span>
              <span className="font-bold text-emerald-400">
                +{currency}{totalAdded.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Total Deducted */}
            <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-800/60 px-3 py-1.5 rounded-xl text-xs">
              <span className="text-rose-300">Deducted:</span>
              <span className="font-bold text-rose-400">
                -{currency}{totalDeducted.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Net Flow */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs">
              <span className="text-slate-400">Net Flow:</span>
              <span className={`font-bold ${netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netCashFlow >= 0 ? '+' : ''}{currency}{netCashFlow.toLocaleString('en-IN')}
              </span>
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
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/40 ring-1 ring-indigo-400/50 active-switcher-pill'
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
                    ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-600/40 ring-1 ring-rose-400/50 active-switcher-pill'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Deductions (-)</span>
                <span className="ml-1 text-[10px] bg-rose-950/90 border border-rose-800/60 px-1.5 py-0.5 rounded-full text-rose-300 font-semibold">
                  {rawExpenses.length}
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
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-600/40 ring-1 ring-emerald-400/50 active-switcher-pill'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Additions (+)</span>
                <span className="ml-1 text-[10px] bg-emerald-950/90 border border-emerald-800/60 px-1.5 py-0.5 rounded-full text-emerald-300 font-semibold">
                  {rawIncomes.length}
                </span>
                {typeFilter === 'ADDED' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse ml-0.5" />
                )}
              </button>
            </div>

            {/* Quick Count Info */}
            <span className="text-xs text-slate-400">
              Showing <strong className="text-white">{filteredTransactions.length}</strong> of {allTransactions.length} records
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
              <p className="text-sm font-semibold text-slate-300">No matching transactions found</p>
              <p className="text-xs text-slate-500 mt-1">
                Try switching filters to &quot;All Transactions&quot; or clear your search keyword.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {filteredTransactions.map((t) => {
                const isIncome = t.type === 'INCOME';

                return (
                  <div
                    key={`${t.type}-${t.id}`}
                    className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-900/50 transition-colors"
                  >
                    {/* Left Details */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* Icon Circle */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                          isIncome
                            ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-400'
                            : 'bg-rose-950/60 border-rose-800/80 text-rose-400'
                        }`}
                      >
                        {isIncome ? (
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

                          {/* Recurring Indicator */}
                          {t.isRecurring && (
                            <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800/60 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Recurring
                            </span>
                          )}

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

                        {/* Date & Optional Notes */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span>{format(new Date(t.date), 'MMMM d, yyyy')}</span>
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
                          isIncome ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isIncome ? '+' : '-'}{currency}
                        {t.amount.toLocaleString('en-IN')}
                      </span>

                      {(currentUser.role === 'ADMIN' || t.userId === currentUser.id) && (
                        <button
                          onClick={() => handleDelete(t)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
