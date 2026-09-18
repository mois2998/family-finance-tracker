'use client';

import React from 'react';
import { AlertTriangle, TrendingDown, Flame, AlertCircle } from 'lucide-react';

interface SavingsWarningBannerProps {
  isDeficit: boolean;
  warningTriggered: boolean;
  deficitAmount: number;
  averageDailySpend: number;
  projectedMonthlyBurn: number;
  projectedNetSavings: number;
  savingsRatePercentage: number;
  daysRemainingInMonth: number;
  currency?: string;
}

export default function SavingsWarningBanner({
  isDeficit,
  warningTriggered,
  deficitAmount,
  averageDailySpend,
  projectedMonthlyBurn,
  projectedNetSavings,
  savingsRatePercentage,
  daysRemainingInMonth,
  currency = '₹',
}: SavingsWarningBannerProps) {
  if (!warningTriggered) return null;

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        isDeficit
          ? 'bg-gradient-to-r from-rose-950/60 via-rose-900/30 to-amber-950/40 border-rose-500/50 text-rose-200 shadow-xl shadow-rose-950/30'
          : 'bg-gradient-to-r from-amber-950/60 via-amber-900/30 to-slate-900/50 border-amber-500/50 text-amber-200 shadow-xl shadow-amber-950/20'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              isDeficit ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            {isDeficit ? <AlertTriangle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                {isDeficit ? 'Critical Cash Flow Deficit Warning' : 'Low Savings Buffer Alert'}
              </h3>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isDeficit ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950'
                }`}
              >
                {isDeficit ? 'Negative Savings' : 'Under 5% Margin'}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {isDeficit ? (
                <>
                  At your current pace, spending will exceed total household income by{' '}
                  <strong className="text-rose-400 font-bold">
                    {currency}
                    {deficitAmount.toLocaleString('en-IN')}
                  </strong>{' '}
                  by month-end. You have {daysRemainingInMonth} days remaining in this billing period.
                </>
              ) : (
                <>
                  Projected savings for this month are very thin at{' '}
                  <strong className="text-amber-300 font-bold">
                    {currency}
                    {projectedNetSavings.toLocaleString('en-IN')}
                  </strong>{' '}
                  ({savingsRatePercentage}% savings rate). Look for unessential discretionary expenses to trim.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Burn Rate Metrics Badge */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-700/40 shrink-0 gap-1.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Daily Burn Rate:</span>
          </div>
          <span className="text-sm sm:text-base font-bold text-white">
            {currency}
            {averageDailySpend.toLocaleString('en-IN')}/day
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            (~{currency}
            {projectedMonthlyBurn.toLocaleString('en-IN')}/mo)
          </span>
        </div>
      </div>
    </div>
  );
}
