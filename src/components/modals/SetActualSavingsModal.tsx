'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  PiggyBank,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Building2,
  FileText,
  Calendar,
  User,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { useFeedback } from '@/context/FeedbackContext';

interface Member {
  id: string;
  name: string;
  avatarColor?: string;
  role?: string;
}

interface SetActualSavingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  currency?: string;
  initialMonthKey?: string;
  members?: Member[];
  isAdmin?: boolean;
  currentUserId?: string;
}

export default function SetActualSavingsModal({
  isOpen,
  onClose,
  onSaved,
  currency = '₹',
  initialMonthKey,
  members = [],
  isAdmin = false,
  currentUserId,
}: SetActualSavingsModalProps) {
  const { showFeedback } = useFeedback();

  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const [monthKey, setMonthKey] = useState<string>(initialMonthKey || currentMonthStr);
  const [targetUserId, setTargetUserId] = useState<string>(currentUserId || '');
  const [actualAmount, setActualAmount] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Loaded reconciliation preview for selected month & user
  const [trackedIncome, setTrackedIncome] = useState<number>(0);
  const [trackedExpense, setTrackedExpense] = useState<number>(0);
  const [expectedSavings, setExpectedSavings] = useState<number>(0);
  const [hasExistingRecord, setHasExistingRecord] = useState(false);

  // Month options: current month + past 5 months
  const monthOptions = Array.from({ length: 6 }).map((_, idx) => {
    const d = subMonths(new Date(), idx);
    return {
      key: format(d, 'yyyy-MM'),
      label: format(d, 'MMMM yyyy'),
    };
  });

  // Fetch existing month data whenever monthKey or targetUserId changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadMonthData() {
      setLoadingData(true);
      try {
        const queryParams = new URLSearchParams({
          monthKey,
          view: 'personal',
        });
        const res = await fetch(`/api/savings/actual?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setTrackedIncome(data.trackedIncome || 0);
            setTrackedExpense(data.trackedExpense || 0);
            setExpectedSavings(data.expectedSavings || 0);

            // Find record for target user
            const existingRecord = data.records?.find(
              (r: any) => r.userId === (targetUserId || currentUserId)
            );

            if (existingRecord) {
              setHasExistingRecord(true);
              setActualAmount(existingRecord.actualAmount.toString());
              setAccountName(existingRecord.accountName || '');
              setNotes(existingRecord.notes || '');
            } else {
              setHasExistingRecord(false);
              setActualAmount('');
              setAccountName('');
              setNotes('');
            }
          }
        }
      } catch (err) {
        console.error('Failed to load month savings info:', err);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }

    loadMonthData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, monthKey, targetUserId, currentUserId]);

  if (!isOpen) return null;

  // Live real-time math calculation
  const parsedActualAmount = parseFloat(actualAmount);
  const isValidNumber = !isNaN(parsedActualAmount) && parsedActualAmount >= 0;

  let liveUntracked = 0;
  let liveType: 'LEAKAGE' | 'SURPLUS' | 'EXACT' | 'EMPTY' = 'EMPTY';

  if (isValidNumber) {
    liveUntracked = expectedSavings - parsedActualAmount;
    if (liveUntracked > 0.01) {
      liveType = 'LEAKAGE';
    } else if (liveUntracked < -0.01) {
      liveType = 'SURPLUS';
    } else {
      liveType = 'EXACT';
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidNumber) {
      showFeedback('Please enter a valid actual savings amount', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/savings/actual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthKey,
          actualAmount: parsedActualAmount,
          accountName: accountName.trim() || undefined,
          notes: notes.trim() || undefined,
          targetUserId: isAdmin && targetUserId ? targetUserId : undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save actual savings');
      }

      showFeedback('Actual savings updated and untracked amount recalculated!', 'success');
      onSaved();
      onClose();
    } catch (err: any) {
      showFeedback(err.message || 'Error saving actual savings', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove this actual savings entry?')) return;
    setDeleting(true);
    try {
      const queryParams = new URLSearchParams({
        monthKey,
        ...(isAdmin && targetUserId ? { userId: targetUserId } : {}),
      });
      const res = await fetch(`/api/savings/actual?${queryParams.toString()}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showFeedback('Actual savings entry removed', 'info');
        setActualAmount('');
        setAccountName('');
        setNotes('');
        setHasExistingRecord(false);
        onSaved();
        onClose();
      }
    } catch (err) {
      showFeedback('Failed to reset savings entry', 'warning');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-6 text-slate-100 flex flex-col gap-5 custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <PiggyBank className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Set Actual Savings
              </h2>
              <p className="text-xs text-slate-400">
                Detect untracked spending, cash leakages, and reconcile your real balance.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Month & Member Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              Reconciliation Month
            </label>
            <select
              value={monthKey}
              onChange={(e) => setMonthKey(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              {monthOptions.map((opt) => (
                <option key={opt.key} value={opt.key} className="bg-slate-900">
                  {opt.label} {opt.key === currentMonthStr ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {isAdmin && members.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                Family Member
              </label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id} className="bg-slate-900">
                    {m.name} {m.id === currentUserId ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Current Tracked Summary Box */}
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Logged Data Summary for Selected Month</span>
            {loadingData && (
              <span className="flex items-center gap-1 text-indigo-400 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" /> Recalculating...
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[11px] text-emerald-400 block">Tracked Income</span>
              <span className="text-sm sm:text-base font-bold text-emerald-300">
                +{currency}{trackedIncome.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <span className="text-[11px] text-rose-400 block">Tracked Expenses</span>
              <span className="text-sm sm:text-base font-bold text-rose-300">
                -{currency}{trackedExpense.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <span className="text-[11px] text-indigo-400 block">Expected Savings</span>
              <span className="text-sm sm:text-base font-bold text-indigo-300">
                {currency}{expectedSavings.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <PiggyBank className="w-3.5 h-3.5 text-indigo-400" />
                Actual Saving Amount ({currency}) <span className="text-rose-400">*</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                Real saved balance in bank & cash
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-base">
                {currency}
              </span>
              <input
                type="number"
                step="any"
                min="0"
                required
                placeholder="e.g. 25000"
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-lg font-bold text-white placeholder:text-slate-500 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Real-time Untracked Math Preview Banner */}
          {isValidNumber && (
            <div
              className={`p-4 rounded-xl border transition-all animate-in fade-in duration-200 ${
                liveType === 'LEAKAGE'
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  : liveType === 'SURPLUS'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {liveType === 'LEAKAGE' && (
                  <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                )}
                {liveType === 'SURPLUS' && (
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                )}
                {liveType === 'EXACT' && (
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}

                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between font-bold text-sm mb-1">
                    <span>
                      {liveType === 'LEAKAGE' && 'Untracked Spending (Cash Leakage)'}
                      {liveType === 'SURPLUS' && 'Untracked Surplus (Unrecorded Income)'}
                      {liveType === 'EXACT' && '100% Balanced & Reconciled'}
                    </span>
                    <span className="text-base font-extrabold font-mono">
                      {liveType === 'LEAKAGE' && `-${currency}${liveUntracked.toLocaleString('en-IN')}`}
                      {liveType === 'SURPLUS' && `+${currency}${Math.abs(liveUntracked).toLocaleString('en-IN')}`}
                      {liveType === 'EXACT' && `${currency}0.00`}
                    </span>
                  </div>

                  <p className="opacity-90 leading-relaxed">
                    {liveType === 'LEAKAGE' && (
                      <>
                        Your actual savings are <strong>{currency}{liveUntracked.toLocaleString('en-IN')}</strong> lower than your tracked finances indicate. This money was spent on cash or unlogged purchases.
                      </>
                    )}
                    {liveType === 'SURPLUS' && (
                      <>
                        Your actual savings are <strong>{currency}{Math.abs(liveUntracked).toLocaleString('en-IN')}</strong> higher than calculated. You received unrecorded income, gifts, or cashbacks.
                      </>
                    )}
                    {liveType === 'EXACT' && (
                      <>
                        Perfect match! Every single rupee logged in income & expenses exactly matches your actual remaining balance.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Account Tag & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Account / Storage Label (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC Bank + Physical Cash"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Audit Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Checked ATM slip on 29th"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
            {hasExistingRecord ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || submitting}
                className="px-3.5 py-2.5 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleting ? 'Removing...' : 'Reset Entry'}
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !isValidNumber}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Save & Reconcile
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
