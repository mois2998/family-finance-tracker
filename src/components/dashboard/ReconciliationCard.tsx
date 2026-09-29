'use client';

import React, { useState } from 'react';
import {
  PiggyBank,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Edit3,
  Plus,
  ArrowRight,
  HelpCircle,
  Users,
  ChevronDown,
  ChevronUp,
  Receipt,
  Wallet,
  Building2,
  Clock,
  ShieldAlert,
} from 'lucide-react';

interface MemberReconciliation {
  userId: string;
  userName: string;
  role?: string;
  avatarColor?: string;
  trackedIncome: number;
  trackedExpense: number;
  expectedSavings: number;
  hasActualSavings: boolean;
  actualAmount: number | null;
  untrackedAmount: number | null;
  untrackedType: 'SPENDING_LEAKAGE' | 'SURPLUS' | 'EXACT_MATCH' | 'NOT_SET';
  accountName?: string | null;
  notes?: string | null;
}

interface ReconciliationData {
  monthKey: string;
  monthName: string;
  hasActualSavings: boolean;
  actualSavingsAmount: number;
  expectedSavings: number;
  untrackedAmount: number;
  untrackedType: 'SPENDING_LEAKAGE' | 'SURPLUS' | 'EXACT_MATCH' | 'NOT_SET';
  accountName?: string | null;
  notes?: string | null;
  updatedAt?: string | null;
  memberReconciliations?: MemberReconciliation[];
}

interface ReconciliationCardProps {
  reconciliation?: ReconciliationData | null;
  currency?: string;
  viewMode?: 'household' | 'personal';
  isAdmin?: boolean;
  onOpenSetModal: (monthKey?: string) => void;
  onQuickLogUntrackedExpense?: (amount: number) => void;
  onQuickLogUntrackedIncome?: (amount: number) => void;
  trackedIncome?: number;
  trackedExpense?: number;
}

export default function ReconciliationCard({
  reconciliation,
  currency = '₹',
  viewMode = 'personal',
  isAdmin = false,
  onOpenSetModal,
  onQuickLogUntrackedExpense,
  onQuickLogUntrackedIncome,
  trackedIncome = 0,
  trackedExpense = 0,
}: ReconciliationCardProps) {
  const [showMemberDetails, setShowMemberDetails] = useState(false);

  if (!reconciliation) return null;

  const {
    monthName,
    hasActualSavings,
    actualSavingsAmount,
    expectedSavings,
    untrackedAmount,
    untrackedType,
    accountName,
    notes,
    memberReconciliations = [],
  } = reconciliation;

  const isHouseholdView = viewMode === 'household' && isAdmin;
  const absUntracked = Math.abs(untrackedAmount || 0);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-xl backdrop-blur-xl p-5 sm:p-6 transition-all">
      {/* Background ambient glow based on state */}
      <div
        className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none ${
          untrackedType === 'SPENDING_LEAKAGE'
            ? 'bg-rose-500'
            : untrackedType === 'SURPLUS'
            ? 'bg-emerald-500'
            : untrackedType === 'EXACT_MATCH'
            ? 'bg-indigo-500'
            : 'bg-amber-500'
        }`}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border ${
              untrackedType === 'SPENDING_LEAKAGE'
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : untrackedType === 'SURPLUS'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : untrackedType === 'EXACT_MATCH'
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
          >
            <PiggyBank className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">
                Savings Reconciliation & Untracked Cash
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                {monthName}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isHouseholdView
                ? 'Consolidated family savings audit vs tracked income and expenses'
                : 'Compare your real bank & cash savings against logged transactions'}
            </p>
          </div>
        </div>

        {/* Top Action Button */}
        <button
          onClick={() => onOpenSetModal(reconciliation.monthKey)}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all self-start sm:self-auto shadow-sm"
        >
          {hasActualSavings ? (
            <>
              <Edit3 className="w-3.5 h-3.5" />
              Edit Actual Savings
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              Insert Actual Savings
            </>
          )}
        </button>
      </div>

      {/* 4 Connected KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 my-4">
        {/* 1. Tracked Income */}
        <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Tracked Income</span>
            <span className="text-emerald-400 font-bold">1</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-400">
            +{currency}{trackedIncome.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500 mt-1">Logged this month</span>
        </div>

        {/* 2. Tracked Expense */}
        <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Tracked Spend</span>
            <span className="text-rose-400 font-bold">2</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-rose-400">
            -{currency}{trackedExpense.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500 mt-1">Logged expenses</span>
        </div>

        {/* 3. Expected Net Savings */}
        <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Expected Savings</span>
            <span className="text-indigo-400 font-bold">1 - 2</span>
          </div>
          <div
            className={`text-lg sm:text-xl font-bold ${
              expectedSavings >= 0 ? 'text-indigo-300' : 'text-rose-400'
            }`}
          >
            {expectedSavings < 0 ? '-' : ''}
            {currency}{Math.abs(expectedSavings).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500 mt-1">Income minus expenses</span>
        </div>

        {/* 4. Actual Savings */}
        <div
          onClick={() => onOpenSetModal(reconciliation.monthKey)}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
            hasActualSavings
              ? 'bg-indigo-950/30 border-indigo-500/40 hover:border-indigo-400'
              : 'bg-amber-950/20 border-amber-500/30 hover:border-amber-400 border-dashed'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Actual Savings</span>
            <span className="text-xs text-indigo-400 flex items-center gap-0.5">
              <Edit3 className="w-3 h-3" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-white flex items-center gap-1.5">
            {hasActualSavings ? (
              `${currency}${actualSavingsAmount.toLocaleString('en-IN')}`
            ) : (
              <span className="text-sm font-semibold text-amber-400/90 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Not Inserted
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 truncate mt-1">
            {accountName ? accountName : hasActualSavings ? 'In bank & cash' : 'Click to insert'}
          </span>
        </div>
      </div>

      {/* Untracked Cash Detector Hero Alert */}
      {hasActualSavings ? (
        <div
          className={`p-4 sm:p-5 rounded-xl border transition-all ${
            untrackedType === 'SPENDING_LEAKAGE'
              ? 'bg-rose-950/30 border-rose-500/40 text-rose-100'
              : untrackedType === 'SURPLUS'
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-100'
              : 'bg-indigo-950/30 border-indigo-500/40 text-indigo-100'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              {untrackedType === 'SPENDING_LEAKAGE' && (
                <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 shrink-0 mt-0.5 border border-rose-500/30">
                  <TrendingDown className="w-6 h-6" />
                </div>
              )}
              {untrackedType === 'SURPLUS' && (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5 border border-emerald-500/30">
                  <TrendingUp className="w-6 h-6" />
                </div>
              )}
              {untrackedType === 'EXACT_MATCH' && (
                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0 mt-0.5 border border-indigo-500/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h4 className="text-sm sm:text-base font-bold text-white">
                    {untrackedType === 'SPENDING_LEAKAGE' && 'Untracked Spending (Cash Leakage)'}
                    {untrackedType === 'SURPLUS' && 'Untracked Surplus (Unrecorded Income)'}
                    {untrackedType === 'EXACT_MATCH' && '100% Balanced & Reconciled'}
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-extrabold uppercase tracking-wide ${
                      untrackedType === 'SPENDING_LEAKAGE'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : untrackedType === 'SURPLUS'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}
                  >
                    {untrackedType === 'SPENDING_LEAKAGE' && `-${currency}${absUntracked.toLocaleString('en-IN')} Untracked`}
                    {untrackedType === 'SURPLUS' && `+${currency}${absUntracked.toLocaleString('en-IN')} Surplus`}
                    {untrackedType === 'EXACT_MATCH' && 'Zero Discrepancy'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  {untrackedType === 'SPENDING_LEAKAGE' && (
                    <>
                      Your actual savings are <strong>{currency}{absUntracked.toLocaleString('en-IN')}</strong> lower than calculated. This means money left your account or wallet on unlogged daily expenses or cash payments.
                    </>
                  )}
                  {untrackedType === 'SURPLUS' && (
                    <>
                      Your actual savings are <strong>{currency}{absUntracked.toLocaleString('en-IN')}</strong> higher than logged income minus expenses. You have received unrecorded income, cash gifts, or cashbacks.
                    </>
                  )}
                  {untrackedType === 'EXACT_MATCH' && (
                    <>
                      Every single rupee logged in income & expenses precisely matches your real bank & cash savings. Perfect financial tracking!
                    </>
                  )}
                </p>

                {notes && (
                  <p className="text-[11px] text-slate-400 mt-1 italic">
                    Note: &ldquo;{notes}&rdquo;
                  </p>
                )}
              </div>
            </div>

            {/* Quick 1-Click Action Button */}
            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
              {untrackedType === 'SPENDING_LEAKAGE' && onQuickLogUntrackedExpense && (
                <button
                  onClick={() => onQuickLogUntrackedExpense(absUntracked)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/25 transition-all flex items-center gap-1.5"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Log as Untracked Expense
                </button>
              )}

              {untrackedType === 'SURPLUS' && onQuickLogUntrackedIncome && (
                <button
                  onClick={() => onQuickLogUntrackedIncome(absUntracked)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-1.5"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  Log as Untracked Income
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Not Inserted Callout */
        <div className="p-4 sm:p-5 rounded-xl bg-amber-950/20 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-200 mb-0.5">
                Insert your actual savings to uncover untracked cash leakages
              </h4>
              <p className="text-xs text-amber-300/80 max-w-xl">
                Entering your real bank balance & cash in hand allows the tracker to compare expected vs actual savings and highlight unlogged purchases.
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenSetModal(reconciliation.monthKey)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all shrink-0 self-start sm:self-auto"
          >
            Insert Actual Savings ({currency})
          </button>
        </div>
      )}

      {/* Household Member Breakdown Section (Admin in Household View) */}
      {isHouseholdView && memberReconciliations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <button
            onClick={() => setShowMemberDetails(!showMemberDetails)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              Family Members Savings Audit & Leakage Breakdown ({memberReconciliations.length})
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              {showMemberDetails ? 'Hide Details' : 'Show Details'}
              {showMemberDetails ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </span>
          </button>

          {showMemberDetails && (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Member</th>
                    <th className="py-2.5 px-3 font-semibold">Tracked Inc</th>
                    <th className="py-2.5 px-3 font-semibold">Tracked Exp</th>
                    <th className="py-2.5 px-3 font-semibold">Expected</th>
                    <th className="py-2.5 px-3 font-semibold">Actual Saved</th>
                    <th className="py-2.5 px-3 font-semibold">Untracked Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {memberReconciliations.map((m) => (
                    <tr key={m.userId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 flex items-center gap-2 font-medium text-white">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ backgroundColor: m.avatarColor || '#6366f1' }}
                        >
                          {m.userName.charAt(0).toUpperCase()}
                        </div>
                        <span>{m.userName}</span>
                        {m.role === 'ADMIN' && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Admin
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-400 font-mono">
                        +{currency}{m.trackedIncome.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-rose-400 font-mono">
                        -{currency}{m.trackedExpense.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-indigo-300 font-mono font-semibold">
                        {currency}{m.expectedSavings.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {m.hasActualSavings ? (
                          <span className="text-white font-semibold">
                            {currency}{(m.actualAmount || 0).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Not set</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {m.untrackedType === 'SPENDING_LEAKAGE' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            -{currency}{Math.abs(m.untrackedAmount || 0).toLocaleString('en-IN')} Leakage
                          </span>
                        )}
                        {m.untrackedType === 'SURPLUS' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            +{currency}{Math.abs(m.untrackedAmount || 0).toLocaleString('en-IN')} Surplus
                          </span>
                        )}
                        {m.untrackedType === 'EXACT_MATCH' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            100% Balanced
                          </span>
                        )}
                        {m.untrackedType === 'NOT_SET' && (
                          <span className="text-slate-500 text-[11px] italic">
                            Awaiting input
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
