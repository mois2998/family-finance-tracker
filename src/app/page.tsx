'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import SavingsWarningBanner from '@/components/dashboard/SavingsWarningBanner';
import ColdStartIndicator from '@/components/dashboard/ColdStartIndicator';
import ForecastChart from '@/components/dashboard/ForecastChart';
import UpcomingExpensesPanel from '@/components/dashboard/UpcomingExpensesPanel';
import CategoryBreakdownChart from '@/components/dashboard/CategoryBreakdownChart';
import {
  Wallet,
  Receipt,
  PiggyBank,
  Flame,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Plus,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading, viewMode: view, setViewMode: setView } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Redirect unauthenticated user to /login
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [authLoading, currentUser, router]);

  // Load dashboard data based on current view
  const fetchDashboard = useCallback(async () => {
    if (!currentUser) return;
    try {
      setRefreshing(true);
      const targetView = currentUser.role === 'ADMIN' ? view : 'personal';
      const res = await fetch(`/api/dashboard?view=${targetView}`);
      if (!res.ok) throw new Error('Failed to load dashboard');
      const data = await res.json();
      setDashboardData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser, view]);

  useEffect(() => {
    if (currentUser) {
      fetchDashboard();
    }
  }, [currentUser, view, fetchDashboard]);

  // Handler for quick-adding recurring presets from ColdStartIndicator
  const handleQuickAddRecurring = async (preset: any) => {
    try {
      const res = await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: preset.name,
          category: preset.category,
          amount: preset.amount,
          durationInDays: preset.durationDays,
          frequency: preset.frequency,
        }),
      });
      if (res.ok) {
        fetchDashboard();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handler for marking an upcoming bill as paid
  const handleConfirmPaid = async (recurringId: string, actualAmount: number) => {
    const res = await fetch(`/api/recurring/${recurringId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm_paid',
        actualAmount,
      }),
    });
    if (res.ok) {
      fetchDashboard();
    }
  };

  if (authLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium text-slate-400">Loading household finances...</p>
      </div>
    );
  }

  const currency = dashboardData?.household?.currency || '₹';
  const stats = dashboardData?.stats;
  const forecast = dashboardData?.forecast;

  return (
    <AppShell
      user={currentUser}
      currentView={view}
      onViewChange={setView}
      onRefreshData={fetchDashboard}
    >
      <div className="space-y-6 pb-6">
        {/* Page Sub-header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {view === 'household' ? 'Household Financial Overview' : 'My Personal Finances'}
              </h2>
              {refreshing && <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />}
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              {view === 'household'
                ? `Consolidated figures for all ${dashboardData?.household?.membersCount || 1} family members`
                : `Filtered strictly for entries logged by ${currentUser.name}`}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 self-end sm:self-auto">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Cycle: {forecast?.currentMonth?.name || format(new Date(), 'MMMM yyyy')}</span>
          </div>
        </div>

        {/* Savings Alert Banner (Triggers if deficit or tight margin) */}
        {forecast?.burnRate && (
          <SavingsWarningBanner
            isDeficit={forecast.burnRate.isDeficit}
            warningTriggered={forecast.burnRate.warningTriggered}
            deficitAmount={forecast.burnRate.deficitAmount}
            averageDailySpend={forecast.burnRate.averageDailySpend}
            projectedMonthlyBurn={forecast.burnRate.projectedMonthlyBurn}
            projectedNetSavings={forecast.currentMonth.projectedNetSavings}
            savingsRatePercentage={forecast.currentMonth.savingsRatePercentage}
            daysRemainingInMonth={forecast.burnRate.estimatedDaysRemainingInMonth}
            currency={currency}
          />
        )}

        {/* Cold Start Indicator Card (Day-One friendly with 1-click commitment setups) */}
        {forecast && (
          <ColdStartIndicator
            status={forecast.coldStartStatus}
            message={forecast.coldStartMessage}
            onQuickAddRecurring={handleQuickAddRecurring}
            currency={currency}
          />
        )}

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Income Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0f172a]/80 border border-slate-800 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {view === 'household' ? 'Household Combined Income' : 'My Personal Income'}
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {currency}
              {stats?.currentMonthActualIncome.toLocaleString('en-IN') || 0}
            </div>

            {/* In Household View, show breakdown chips right on the card */}
            {view === 'household' && dashboardData?.memberBreakdown?.length > 0 ? (
              <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                  {dashboardData.memberBreakdown.map((m: any) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-800/90 text-slate-300 font-medium"
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.avatarColor || '#6366f1' }} />
                      {m.name}{m.id === currentUser.id ? ' (You)' : ''}: <strong className="text-emerald-400">{currency}{m.income.toLocaleString('en-IN')}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                <span>Projected Total:</span>
                <span className="font-semibold text-emerald-400">
                  {currency}
                  {stats?.projectedMonthlyIncome.toLocaleString('en-IN') || 0}
                </span>
              </div>
            )}
          </div>

          {/* 2. Expenses Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0f172a]/80 border border-slate-800 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Spent
              </span>
              <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/20">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {currency}
              {stats?.currentMonthActualSpend.toLocaleString('en-IN') || 0}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
              <span>Projected Month End:</span>
              <span className="font-semibold text-rose-400">
                {currency}
                {stats?.projectedMonthlySpend.toLocaleString('en-IN') || 0}
              </span>
            </div>
          </div>

          {/* 3. Projected Net Savings */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0f172a]/80 border border-slate-800 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Projected Savings
              </span>
              <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                <PiggyBank className="w-4 h-4" />
              </div>
            </div>
            <div
              className={`text-2xl sm:text-3xl font-black tracking-tight ${
                (stats?.projectedNetSavings || 0) < 0 ? 'text-rose-400' : 'text-indigo-300'
              }`}
            >
              {currency}
              {stats?.projectedNetSavings?.toLocaleString('en-IN') || 0}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
              <span>Savings Rate:</span>
              <span
                className={`font-semibold ${
                  (stats?.savingsRatePercentage || 0) <= 5 ? 'text-rose-400' : 'text-indigo-400'
                }`}
              >
                {stats?.savingsRatePercentage || 0}%
              </span>
            </div>
          </div>

          {/* 4. Daily Burn Rate Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0f172a]/80 border border-slate-800 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Daily Burn Rate
              </span>
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {currency}
              {forecast?.burnRate?.averageDailySpend.toLocaleString('en-IN') || 0}
              <span className="text-xs font-normal text-slate-400 ml-1">/day</span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
              <span>Days Remaining:</span>
              <span className="font-semibold text-amber-400">
                {forecast?.burnRate?.estimatedDaysRemainingInMonth || 0} days
              </span>
            </div>
          </div>
        </div>

        {/* Multi-Column Grid: Left (Forecast Chart + Recent) & Right (Upcoming Bills + Category Donut) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Forecast Area Chart */}
            <ForecastChart
              projections={forecast?.monthlyProjections || []}
              currency={currency}
            />

            {/* Recent Expenses Card */}
            <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      Recent Expenses
                    </h3>
                    <p className="text-xs text-slate-400">Latest recorded transactions</p>
                  </div>
                </div>
                <a
                  href="/expenses"
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  View All →
                </a>
              </div>

              {(!dashboardData?.recentExpenses || dashboardData.recentExpenses.length === 0) ? (
                <div className="py-8 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-400">No transactions recorded yet.</p>
                  <p className="text-xs text-slate-500 mt-1">Tap &quot;Add Transaction&quot; to log your first expense.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {dashboardData.recentExpenses.map((exp: any) => (
                    <div key={exp.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-semibold text-white truncate">
                            {exp.description}
                          </p>
                          {exp.isRecurring && (
                            <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800/60 px-1.5 py-0.2 rounded shrink-0">
                              Recurring
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{exp.category}</span>
                          <span>•</span>
                          <span>{format(new Date(exp.date), 'MMM d, yyyy')}</span>
                          {view === 'household' && exp.user && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-400 font-medium">{exp.user.name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <span className="text-xs sm:text-sm font-bold text-rose-400 shrink-0">
                        -{currency}
                        {exp.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Per-Member Contribution Breakdown (Visible in household view) */}
            {view === 'household' && dashboardData?.memberBreakdown?.length > 1 && (
              <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Family Member Contributions (Current Month)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dashboardData.memberBreakdown.map((m: any) => (
                    <div
                      key={m.id}
                      className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white"
                          style={{ backgroundColor: m.avatarColor || '#6366f1' }}
                        >
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{m.name}</p>
                          <p className="text-[10px] text-emerald-400">
                            Income: {currency}
                            {m.income.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-rose-400">
                          Spent: {currency}
                          {m.expense.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Upcoming Due Bills / Recharges Panel */}
            <UpcomingExpensesPanel
              upcoming={forecast?.upcomingExpenses || []}
              onConfirmPaid={handleConfirmPaid}
              currency={currency}
            />

            {/* Category Donut Breakdown */}
            <CategoryBreakdownChart
              categories={dashboardData?.categoryBreakdown || []}
              currency={currency}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
