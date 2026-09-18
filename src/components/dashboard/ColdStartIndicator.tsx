'use client';

import React from 'react';
import { Sparkles, CalendarPlus, Smartphone, Wifi, Home, Zap } from 'lucide-react';

interface ColdStartIndicatorProps {
  status: 'COLD_START_MANUAL' | 'EMERGING_HISTORY' | 'MATURE_TREND';
  message: string;
  onQuickAddRecurring: (preset: { name: string; category: string; amount: number; durationDays?: number; frequency: string }) => void;
  currency?: string;
}

export default function ColdStartIndicator({
  status,
  message,
  onQuickAddRecurring,
  currency = '₹',
}: ColdStartIndicatorProps) {
  // Only render prominent onboarding box during cold start or early emerging stages
  if (status === 'MATURE_TREND') return null;

  const quickPresets = [
    {
      icon: Smartphone,
      name: 'Mobile Recharge',
      category: 'Mobile & Internet Recharge',
      amount: 599,
      durationDays: 28,
      frequency: 'DAYS_INTERVAL',
      badge: '28 Days',
    },
    {
      icon: Wifi,
      name: 'Broadband / Wi-Fi',
      category: 'Mobile & Internet Recharge',
      amount: 825,
      frequency: 'MONTHLY',
      badge: 'Monthly',
    },
    {
      icon: Home,
      name: 'House Rent',
      category: 'Housing & Rent',
      amount: 15000,
      frequency: 'MONTHLY',
      badge: 'Monthly',
    },
    {
      icon: Zap,
      name: 'Electricity Bill',
      category: 'Electricity & Utilities',
      amount: 1800,
      frequency: 'MONTHLY',
      badge: 'Monthly',
    },
  ];

  return (
    <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-indigo-950/20 border border-indigo-500/30 rounded-2xl relative overflow-hidden">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-indigo-500/20 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <h4 className="text-sm font-bold text-white tracking-tight">
              {status === 'COLD_START_MANUAL' ? 'Cold-Start Forecast Active' : 'Emerging Pattern Detection'}
            </h4>
            <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
              Day-One Ready
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{message}</p>
        </div>

        {/* Quick Setup Presets */}
        <div className="w-full lg:w-auto">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300 mb-2 flex items-center gap-1">
            <CalendarPlus className="w-3.5 h-3.5" /> Quick-Add Known Recurring Commitments:
          </p>
          <div className="flex flex-wrap gap-2">
            {quickPresets.map((preset) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.name}
                  onClick={() => onQuickAddRecurring(preset)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/80 hover:bg-indigo-900/40 border border-slate-700/80 hover:border-indigo-500/50 rounded-xl text-xs text-slate-200 transition-all hover:scale-[1.02] shadow-sm"
                >
                  <Icon className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-medium">{preset.name}</span>
                  <span className="text-slate-400">({preset.badge})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
