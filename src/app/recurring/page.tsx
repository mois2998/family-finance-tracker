'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import {
  CalendarClock,
  Plus,
  Trash2,
  CheckCircle,
  Sparkles,
  Clock,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';

export default function RecurringPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';
  const [view, setView] = useState<'household' | 'personal'>('household');
  const [recurringExpenses, setRecurringExpenses] = useState<any[]>([]);
  const [detectedSuggestions, setDetectedSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New recurring modal / form
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Mobile & Internet Recharge');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('DAYS_INTERVAL');
  const [durationInDays, setDurationInDays] = useState('28');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // Mark Paid dialog
  const [payTarget, setPayTarget] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Members are strictly restricted to personal view
  useEffect(() => {
    if (currentUser && !isAdmin) {
      setView('personal');
    }
  }, [currentUser, isAdmin]);

  // Redirect unauthenticated user to /login
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [authLoading, currentUser, router]);

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const targetView = isAdmin ? view : 'personal';
      const resRec = await fetch(`/api/recurring?view=${targetView}`);

      if (resRec.ok) {
        const data = await resRec.json();
        setRecurringExpenses(data.recurringExpenses);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }

    // Load AI suggestions in background without blocking the UI
    try {
      const targetView = isAdmin ? view : 'personal';
      const resDash = await fetch(`/api/dashboard?view=${targetView}`);
      if (resDash.ok) {
        const dData = await resDash.json();
        if (dData.forecast?.detectedRecurringSuggestions) {
          setDetectedSuggestions(dData.forecast.detectedRecurringSuggestions);
        }
      }
    } catch {
      // background fetch error ignored
    }
  }, [currentUser, isAdmin, view]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, fetchData]);

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          amount: parseFloat(amount),
          frequency,
          durationInDays: frequency === 'DAYS_INTERVAL' ? parseInt(durationInDays, 10) : undefined,
          startDate,
        }),
      });

      if (res.ok) {
        setName('');
        setAmount('');
        setShowAddForm(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPaid = async () => {
    if (!payTarget) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/recurring/${payTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_paid',
          actualAmount: payAmount ? parseFloat(payAmount) : payTarget.amount,
        }),
      });

      if (res.ok) {
        setPayTarget(null);
        setPayAmount('');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setConfirming(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to stop tracking this recurring bill?')) return;
    try {
      const res = await fetch(`/api/recurring/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRecurringExpenses((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Convert auto-detected suggestion into active recurring
  const handleAcceptSuggestion = async (sugg: any) => {
    try {
      const res = await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sugg.name,
          category: sugg.category,
          amount: sugg.suggestedAmount,
          frequency: sugg.frequency,
          durationInDays: sugg.intervalDays,
          startDate: sugg.lastDate,
        }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (authLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium text-slate-400">Loading recurring bills...</p>
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
      onRefreshData={fetchData}
    >
      <div className="space-y-6 pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <CalendarClock className="w-6 h-6 text-indigo-400" />
              <span>Recurring Bills & Recharge Schedules</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Fixed commitments, 28-day mobile packs, broadband, rent, and subscriptions
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Recurring Bill</span>
          </button>
        </div>

        {/* Add Recurring Form / Drawer */}
        {showAddForm && (
          <div className="bg-[#0f172a] border border-indigo-500/40 p-5 rounded-2xl shadow-2xl animate-fadeIn space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" /> Add New Recurring Commitment
              </h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateRecurring} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Commitment Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jio Prepaid 28-day"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Amount ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="599"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Frequency Cycle
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="DAYS_INTERVAL">Days Interval (e.g. 28 days)</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>

                {frequency === 'DAYS_INTERVAL' && (
                  <div>
                    <label className="block text-xs font-semibold text-indigo-300 uppercase mb-1">
                      Interval Days (e.g. 28)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="365"
                      value={durationInDays}
                      onChange={(e) => setDurationInDays(e.target.value)}
                      className="w-full bg-slate-900 border border-indigo-500/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Start Date / Last Paid
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Commitment'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Auto-detected Recurring Suggestions (Enhancement layer for real data) */}
        {detectedSuggestions.length > 0 && (
          <div className="p-4 sm:p-5 bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-slate-900/60 border border-cyan-500/30 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                Auto-Detected Recurring Patterns ({detectedSuggestions.length})
              </h3>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-semibold">
                Pattern AI
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Based on your repeated expense history, the system identified these recurring patterns:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {detectedSuggestions.map((sugg, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-bold text-white">{sugg.name}</p>
                    <p className="text-[11px] text-cyan-400 mt-0.5">{sugg.reason}</p>
                    <p className="text-[10px] text-slate-400">
                      Amount: {currency}
                      {sugg.suggestedAmount} ({sugg.frequency})
                    </p>
                  </div>
                  <button
                    onClick={() => handleAcceptSuggestion(sugg)}
                    className="px-3 py-1.5 text-xs font-semibold bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-lg flex items-center gap-1 transition-colors shrink-0"
                  >
                    <span>Track</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Commitments Table / Cards */}
        <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Active Recurring Commitments</h3>
            <span className="text-xs text-slate-400">{recurringExpenses.length} tracked</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading recurring bills...</p>
            </div>
          ) : recurringExpenses.length === 0 ? (
            <div className="py-16 text-center text-slate-400 border border-dashed border-slate-800/80 m-4 rounded-xl">
              <CalendarClock className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">No recurring commitments added yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Add mobile recharges (like ₹599 every 28 days), rent, or Wi-Fi to forecast cash flow accurately.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {recurringExpenses.map((rec) => {
                const nextDueDate = new Date(rec.nextDueDate);
                return (
                  <div
                    key={rec.id}
                    className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm sm:text-base font-semibold text-white truncate">
                          {rec.name}
                        </p>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                          {rec.frequency === 'DAYS_INTERVAL' && rec.durationInDays
                            ? `Every ${rec.durationInDays} days`
                            : rec.frequency}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span>{rec.category}</span>
                        <span>•</span>
                        <span className="text-amber-400 font-medium">
                          Next Due: {format(nextDueDate, 'MMMM d, yyyy')}
                        </span>
                        {view === 'household' && rec.user && (
                          <>
                            <span>•</span>
                            <span className="text-slate-300">{rec.user.name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-base sm:text-lg font-black text-white">
                        {currency}
                        {rec.amount.toLocaleString('en-IN')}
                      </span>

                      <button
                        onClick={() => {
                          setPayTarget(rec);
                          setPayAmount(rec.amount.toString());
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Mark Paid</span>
                      </button>

                      {(currentUser.role === 'ADMIN' || rec.userId === currentUser.id) && (
                        <button
                          onClick={() => handleDelete(rec.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                          title="Delete"
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

        {/* Mark Paid Confirm Dialog */}
        {payTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-sm bg-[#0f172a] border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
                <h4 className="text-base font-bold text-white">Confirm Bill Payment</h4>
              </div>

              <p className="text-xs text-slate-300">
                Confirm payment for <strong className="text-white">{payTarget.name}</strong>. This creates
                an expense entry for today and advances the next due date by {payTarget.frequency === 'DAYS_INTERVAL' ? `${payTarget.durationInDays} days` : payTarget.frequency.toLowerCase()}.
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

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPayTarget(null)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={confirming}
                    className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-md disabled:opacity-50"
                  >
                    {confirming ? 'Saving...' : 'Confirm & Log'}
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
