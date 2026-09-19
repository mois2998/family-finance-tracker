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
  CheckCircle2,
  RotateCcw,
  BadgePercent,
  CheckCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { parseSkippedDates } from '@/lib/forecasting';

export default function RecurringPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const { showFeedback } = useFeedback();
  const isAdmin = currentUser?.role === 'ADMIN';
  const [view, setView] = useState<'household' | 'personal'>('household');
  const [statusTab, setStatusTab] = useState<'active' | 'completed'>('active');
  const [recurringExpenses, setRecurringExpenses] = useState<any[]>([]);
  const [detectedSuggestions, setDetectedSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New recurring modal / form
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('EMI & Loans');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('MONTHLY');
  const [durationInDays, setDurationInDays] = useState('28');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // Mark Paid dialog
  const [payTarget, setPayTarget] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [isFinalInstallment, setIsFinalInstallment] = useState(false);
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
          markCompleted: isFinalInstallment,
        }),
      });

      if (res.ok) {
        showFeedback(
          isFinalInstallment
            ? `Final payment recorded! "${payTarget.name}" marked as completed.`
            : `Recorded payment of ₹${payAmount || payTarget.amount} for "${payTarget.name}"`,
          'success'
        );
        setPayTarget(null);
        setPayAmount('');
        setIsFinalInstallment(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
      showFeedback('Failed to log payment', 'warning');
    } finally {
      setConfirming(false);
    }
  };

  const handleMarkCompleted = async (rec: any) => {
    if (!confirm(`Mark "${rec.name}" as Completed / Paid Off?\n\nThis will archive the EMI and stop projecting future dues.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/recurring/${rec.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_completed' }),
      });
      if (res.ok) {
        showFeedback(`🎉 "${rec.name}" marked as Completed / Paid Off!`, 'success');
        fetchData();
      }
    } catch (e) {
      console.error(e);
      showFeedback('Error marking as completed', 'warning');
    }
  };

  const handleReactivate = async (rec: any) => {
    try {
      const res = await fetch(`/api/recurring/${rec.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reactivate' }),
      });
      if (res.ok) {
        showFeedback(`"${rec.name}" reopened and reactivated!`, 'info');
        fetchData();
      }
    } catch (e) {
      console.error(e);
      showFeedback('Error reactivating', 'warning');
    }
  };

  const handleUnskipDate = async (recId: string, dateStr: string) => {
    try {
      const res = await fetch(`/api/recurring/${recId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unskip_date', date: dateStr }),
      });
      if (res.ok) {
        showFeedback(`Restored ${dateStr}`, 'success');
        fetchData();
      } else {
        showFeedback('Failed to restore date', 'warning');
      }
    } catch {
      showFeedback('Failed to restore date', 'warning');
    }
  };

  const handleSkipNextDue = async (rec: any) => {
    const nextDueStr = format(new Date(rec.nextDueDate), 'yyyy-MM-dd');
    if (!confirm(`Skip the upcoming payment on ${nextDueStr} for "${rec.name}"?\n\nIt will not count into upcoming totals.`)) return;
    try {
      const res = await fetch(`/api/recurring/${rec.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'skip_date', date: nextDueStr }),
      });
      if (res.ok) {
        showFeedback(`Skipped payment for ${nextDueStr}`, 'info');
        fetchData();
      } else {
        showFeedback('Failed to skip payment', 'warning');
      }
    } catch {
      showFeedback('Failed to skip payment', 'warning');
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
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="EMI & Loans">EMI & Loans (Installments)</option>
                    <option value="Housing & Rent">Housing & Rent</option>
                    <option value="Mobile & Internet Recharge">Mobile & Internet Recharge</option>
                    <option value="Electricity & Utilities">Electricity & Utilities</option>
                    <option value="Subscriptions & Streaming">Subscriptions & Streaming</option>
                    <option value="Insurance & Health">Insurance & Health</option>
                    <option value="Other">Other</option>
                  </select>
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
                    <option value="MONTHLY">Monthly</option>
                    <option value="DAYS_INTERVAL">Days Interval (e.g. 28 days)</option>
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
                  className="px-5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md disabled:opacity-50 active:scale-95 transition-transform"
                >
                  {submitting ? 'Saving...' : 'Save Commitment'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Auto-detected Recurring Suggestions */}
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
                    className="px-3 py-1.5 text-xs font-semibold bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-lg flex items-center gap-1 transition-colors shrink-0 active:scale-95"
                  >
                    <span>Track</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Switcher: Active Commitments vs Completed / Paid Off EMIs */}
        {(() => {
          const activeList = recurringExpenses.filter((r) => r.isActive !== false);
          const completedList = recurringExpenses.filter((r) => r.isActive === false);
          const displayList = statusTab === 'active' ? activeList : completedList;

          return (
            <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              {/* Header with Status Tabs */}
              <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStatusTab('active')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                      statusTab === 'active'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/40'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Active Commitments & EMIs</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      statusTab === 'active' ? 'bg-indigo-700/80 text-white' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {activeList.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setStatusTab('completed')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                      statusTab === 'completed'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400/40'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Completed / Paid Off</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      statusTab === 'completed' ? 'bg-emerald-700/80 text-white' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {completedList.length}
                    </span>
                  </button>
                </div>

                <span className="text-xs text-slate-400 hidden sm:inline">
                  {statusTab === 'active' ? `${activeList.length} currently active` : `${completedList.length} completed loans & EMIs`}
                </span>
              </div>

              {loading ? (
                <div className="py-16 text-center text-slate-400">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs">Loading recurring bills...</p>
                </div>
              ) : displayList.length === 0 ? (
                <div className="py-16 text-center text-slate-400 border border-dashed border-slate-800/80 m-4 rounded-xl">
                  {statusTab === 'active' ? (
                    <>
                      <CalendarClock className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                      <p className="text-sm font-semibold text-slate-300">No active recurring commitments</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Add mobile recharges, rent, Wi-Fi, or EMIs to forecast cash flow accurately.
                      </p>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-600" />
                      <p className="text-sm font-semibold text-slate-300">No completed EMIs or commitments yet</p>
                      <p className="text-xs text-slate-500 mt-1">
                        When you pay off an EMI or loan installment, click &quot;Mark as Completed&quot; to archive it here!
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {displayList.map((rec) => {
                    const nextDueDate = new Date(rec.nextDueDate);
                    const isEmi =
                      rec.category?.toLowerCase().includes('emi') ||
                      rec.category?.toLowerCase().includes('loan') ||
                      rec.name?.toLowerCase().includes('emi');

                    return (
                      <div
                        key={rec.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors"
                      >
                        <div className="min-w-0 space-y-1 w-full sm:w-auto">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm sm:text-base font-semibold text-white truncate">
                              {rec.name}
                            </p>
                            {isEmi && (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                <BadgePercent className="w-3 h-3" />
                                <span>EMI / Loan</span>
                              </span>
                            )}
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                              {rec.frequency === 'DAYS_INTERVAL' && rec.durationInDays
                                ? `Every ${rec.durationInDays} days`
                                : rec.frequency}
                            </span>
                            {rec.isActive === false && (
                              <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                                <CheckCheck className="w-3 h-3" />
                                <span>Completed / Paid Off</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span>{rec.category}</span>
                            <span>•</span>
                            {rec.startDate && (
                              <>
                                <span className="text-slate-300 font-medium">
                                  Started: {format(new Date(rec.startDate), 'MMM d, yyyy')}
                                </span>
                                <span>•</span>
                              </>
                            )}
                            {rec.isActive !== false ? (
                              <span className="text-amber-400 font-medium">
                                Next Due: {format(nextDueDate, 'MMMM d, yyyy')}
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-medium">
                                Fully Paid Off
                              </span>
                            )}
                            {view === 'household' && rec.user && (
                              <>
                                <span>•</span>
                                <span className="text-slate-300">{rec.user.name}</span>
                              </>
                            )}
                          </div>

                          {/* Skipped dates badges if any */}
                          {rec.skippedDates && parseSkippedDates(rec.skippedDates).length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-[11px] text-amber-400/90 font-medium">Skipped:</span>
                              {parseSkippedDates(rec.skippedDates).map((sDate: string) => (
                                <span
                                  key={sDate}
                                  className="text-[10px] bg-amber-950/60 border border-amber-800/60 text-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1"
                                >
                                  <span>{sDate}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUnskipDate(rec.id, sDate)}
                                    className="hover:text-white font-bold ml-0.5 text-xs text-amber-400"
                                    title={`Restore ${sDate}`}
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                          <span className="text-base sm:text-lg font-black text-white">
                            {currency}
                            {rec.amount.toLocaleString('en-IN')}
                          </span>

                          <div className="flex items-center gap-2">
                            {rec.isActive !== false ? (
                              <>
                                {/* Mark Paid Button */}
                                <button
                                  onClick={() => {
                                    setPayTarget(rec);
                                    setPayAmount(rec.amount.toString());
                                    setIsFinalInstallment(false);
                                  }}
                                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl flex items-center gap-1 transition-all active:scale-95"
                                  title="Log payment for this cycle"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Mark Paid</span>
                                </button>

                                {/* Skip Next Due Button */}
                                <button
                                  onClick={() => handleSkipNextDue(rec)}
                                  className="px-2.5 py-1.5 text-xs font-semibold bg-slate-800/80 hover:bg-amber-950/40 text-slate-400 hover:text-amber-300 border border-slate-700 hover:border-amber-600/40 rounded-xl flex items-center gap-1 transition-all active:scale-95"
                                  title="Skip the upcoming due date"
                                >
                                  <span>Skip Due</span>
                                </button>

                                {/* Direct Mark Completed Button */}
                                <button
                                  onClick={() => handleMarkCompleted(rec)}
                                  className="px-3 py-1.5 text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl flex items-center gap-1 transition-all active:scale-95"
                                  title="Mark EMI as finished/paid off"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                                  <span>Mark Completed</span>
                                </button>
                              </>
                            ) : (
                              /* Reactivate Button for Completed EMIs */
                              <button
                                onClick={() => handleReactivate(rec)}
                                className="px-3 py-1.5 text-xs font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-xl flex items-center gap-1 transition-all active:scale-95"
                                title="Reopen this commitment"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reactivate</span>
                              </button>
                            )}

                            {(currentUser.role === 'ADMIN' || rec.userId === currentUser.id) && (
                              <button
                                onClick={() => handleDelete(rec.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors active:scale-90"
                                title="Delete permanently"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Mark Paid Confirm Dialog with Final Installment Checkbox */}
        {payTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-sm bg-[#0f172a] border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
                <h4 className="text-base font-bold text-white">Confirm Bill / EMI Payment</h4>
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
