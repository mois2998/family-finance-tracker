'use client';

import React, { useState, useEffect } from 'react';
import { X, PlusCircle, ArrowUpRight, ArrowDownLeft, Calendar, Tag, User as UserIcon, Clock, Check } from 'lucide-react';
import { useFeedback } from '@/context/FeedbackContext';

interface Member {
  id: string;
  name: string;
  avatarColor?: string;
}

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  members: Member[];
  currentUserId: string;
  currency?: string;
  defaultType?: 'EXPENSE' | 'INCOME';
}

const EXPENSE_CATEGORIES = [
  'Groceries & Food',
  'Mobile & Internet Recharge',
  'Housing & Rent',
  'Electricity & Utilities',
  'Healthcare & Medicine',
  'Transportation & Fuel',
  'Education & Fees',
  'Entertainment & Dining',
  'Shopping',
  'Personal Care',
  'Insurance',
  'EMI & Loans',
  'Other',
];

const INCOME_SOURCES = [
  'Salary / Job',
  'Freelance / Consulting',
  'Business / Trade',
  'Rental Income',
  'Investments & Dividends',
  'Gift / Allowance',
  'Other',
];

export default function AddTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  members,
  currentUserId,
  currency = '₹',
  defaultType = 'EXPENSE',
}: AddTransactionModalProps) {
  const { showFeedback } = useFeedback();
  const [tab, setTab] = useState<'EXPENSE' | 'INCOME'>(defaultType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Expense form state
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignedUserId, setAssignedUserId] = useState(currentUserId);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDurationDays, setRecurringDurationDays] = useState('28'); // Default 28 days for recharges
  const [recurringFrequency, setRecurringFrequency] = useState('DAYS_INTERVAL');

  // Income form state
  const [incomeSource, setIncomeSource] = useState(INCOME_SOURCES[0]);
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeFrequency, setIncomeFrequency] = useState('MONTHLY');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [incomeNotes, setIncomeNotes] = useState('');

  // Synchronize assignedUserId whenever currentUserId changes or when modal opens
  useEffect(() => {
    setAssignedUserId(currentUserId);
    setError('');
  }, [currentUserId, isOpen]);

  if (!isOpen) return null;

  // Regular members can only log transactions for themselves
  const isMemberOnly = members.length <= 1;
  const effectiveUserId = isMemberOnly ? currentUserId : (assignedUserId || currentUserId);

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          category,
          description: description.trim(),
          date,
          userId: effectiveUserId,
          isRecurring,
          recurringFrequency: isRecurring ? recurringFrequency : undefined,
          recurringDurationDays: isRecurring && recurringFrequency === 'DAYS_INTERVAL' ? recurringDurationDays : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add expense');

      showFeedback(`Recorded expense: ${currency}${parseFloat(amount).toLocaleString('en-IN')}`, 'success');

      // Reset
      setAmount('');
      setDescription('');
      setIsRecurring(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/incomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: incomeSource,
          amount: parseFloat(incomeAmount),
          frequency: incomeFrequency,
          dateReceived: incomeDate,
          notes: incomeNotes,
          userId: effectiveUserId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add income');

      showFeedback(`Recorded income: ${currency}${parseFloat(incomeAmount).toLocaleString('en-IN')}`, 'success');

      // Reset
      setIncomeAmount('');
      setIncomeNotes('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with Type Selector */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex bg-slate-800/90 p-1 rounded-xl border border-slate-700/50">
            <button
              type="button"
              onClick={() => setTab('EXPENSE')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-150 active:scale-95 ${
                tab === 'EXPENSE'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 border border-rose-500/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              Add Expense
            </button>
            <button
              type="button"
              onClick={() => setTab('INCOME')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-150 active:scale-95 ${
                tab === 'INCOME'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 border border-emerald-500/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Add Income
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 text-sm rounded-xl">
              {error}
            </div>
          )}

          {tab === 'EXPENSE' ? (
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Amount ({currency}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-bold">
                    {currency}
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xl font-bold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Description / Note *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jio 28-day recharge, Weekly vegetables"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>

              {/* Category & Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" /> Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              {/* Family Member Assigned */}
              {members.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <UserIcon className="w-3.5 h-3.5" /> Logged For Family Member
                  </label>
                  <select
                    value={assignedUserId}
                    onChange={(e) => setAssignedUserId(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.id === currentUserId ? '(You)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Recurring / Predictable Expense Box */}
              <div className="p-3.5 bg-indigo-950/30 border border-indigo-500/30 rounded-xl space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-4 h-4 rounded border-indigo-600 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                  />
                  <span className="text-sm font-semibold text-indigo-200">
                    Recurring commitment / Predictable expense?
                  </span>
                </label>

                {isRecurring && (
                  <div className="pt-2 border-t border-indigo-900/50 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn">
                    <div>
                      <label className="block text-xs text-indigo-300 mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Interval Type
                      </label>
                      <select
                        value={recurringFrequency}
                        onChange={(e) => setRecurringFrequency(e.target.value)}
                        className="w-full bg-slate-900 border border-indigo-700/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-400"
                      >
                        <option value="DAYS_INTERVAL">Specific Day Interval (e.g. 28 days)</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="QUARTERLY">Quarterly</option>
                        <option value="YEARLY">Yearly</option>
                      </select>
                    </div>

                    {recurringFrequency === 'DAYS_INTERVAL' && (
                      <div>
                        <label className="block text-xs text-indigo-300 mb-1">
                          Duration (in days)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={recurringDurationDays}
                          onChange={(e) => setRecurringDurationDays(e.target.value)}
                          placeholder="e.g. 28 for mobile packs"
                          className="w-full bg-slate-900 border border-indigo-700/50 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-600/30 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Saving...' : 'Record Expense'}
                </button>
              </div>
            </form>
          ) : (
            /* Income Form */
            <form onSubmit={handleIncomeSubmit} className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Income Amount ({currency}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-bold">
                    {currency}
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={incomeAmount}
                    onChange={(e) => setIncomeAmount(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xl font-bold text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Source & Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Source / Title *
                  </label>
                  <select
                    value={incomeSource}
                    onChange={(e) => setIncomeSource(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                  >
                    {INCOME_SOURCES.map((src) => (
                      <option key={src} value={src}>
                        {src}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Frequency
                  </label>
                  <select
                    value={incomeFrequency}
                    onChange={(e) => setIncomeFrequency(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                  >
                    <option value="MONTHLY">Monthly Regular (Salary)</option>
                    <option value="ONE_TIME">One-Time Bonus / Payout</option>
                    <option value="BI_WEEKLY">Bi-Weekly (Every 2 weeks)</option>
                    <option value="WEEKLY">Weekly</option>
                  </select>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Date Received
                </label>
                <input
                  type="date"
                  required
                  value={incomeDate}
                  onChange={(e) => setIncomeDate(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              {/* Family Member */}
              {members.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Earned By Member
                  </label>
                  <select
                    value={assignedUserId}
                    onChange={(e) => setAssignedUserId(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.id === currentUserId ? '(You)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Optional Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. September payout after tax"
                  value={incomeNotes}
                  onChange={(e) => setIncomeNotes(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-600/30 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Saving...' : 'Record Income'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
