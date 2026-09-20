'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import {
  BookOpen,
  Users,
  Shield,
  CreditCard,
  Calendar,
  Repeat,
  PieChart,
  HelpCircle,
  MessageSquarePlus,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Search,
  ChevronRight,
  Info,
  CalendarDays,
  FileSpreadsheet,
  Zap,
  Lock,
  Home,
  Loader2,
} from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  icon: any;
  badge?: string;
  summary: string;
}

const SECTIONS: GuideSection[] = [
  {
    id: 'overview',
    title: 'Platform Overview & Architecture',
    icon: Zap,
    summary: 'Multi-tenant household isolation, real-time balance aggregation, and family collaboration.',
  },
  {
    id: 'roles',
    title: 'Roles & Household Permissions',
    icon: Shield,
    summary: 'The distinction between Household Admin vs. Family Member permissions.',
  },
  {
    id: 'expenses',
    title: 'Expenses & Income Management',
    icon: CreditCard,
    summary: 'Daily logging, category breakdowns, payer assignment, and month-by-month filters.',
  },
  {
    id: 'recurring',
    title: 'Recurring Bills, EMIs & Skip Engine',
    icon: Repeat,
    badge: 'Enhanced',
    summary: 'Start-date recurrence engine, loan moratorium / skipping months, and cascading deletion.',
  },
  {
    id: 'budgets',
    title: 'Budgets & Cash Flow Forecasting',
    icon: PieChart,
    summary: 'Monthly budget caps, real-time burn-rate projection, and automated alerts.',
  },
  {
    id: 'feedback',
    title: 'In-App Feedback & Bug Reports',
    icon: MessageSquarePlus,
    badge: 'New',
    summary: 'How to report issues, attach or paste screenshots (Ctrl+V), and track resolutions.',
  },
  {
    id: 'faq',
    title: 'Frequently Asked Questions (FAQ)',
    icon: HelpCircle,
    summary: 'Common questions, troubleshooting, and tips for seamless household bookkeeping.',
  },
];

export default function UserGuidePage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [authLoading, currentUser, router]);

  const filteredSections = SECTIONS.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <AppShell user={currentUser}>
      <div className="max-w-6xl mx-auto space-y-8 pb-16">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 border border-indigo-800/40 p-6 sm:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" /> Complete End-User Manual
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              Family Finance Tracker Guide
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Master collaborative budgeting, loan EMIs, automated recurrence calculations, and
              tenant-isolated privacy for your entire household.
            </p>
          </div>

          {/* Search bar inside header */}
          <div className="mt-6 max-w-md relative z-10">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics (e.g., 'EMI', 'skip month', 'roles')..."
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Two column layout: Navigation Sidebar & Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Table of Contents Column */}
          <div className="lg:col-span-4 sticky top-20 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 mb-2 flex items-center justify-between">
              <span>Guide Modules</span>
              <span className="text-[11px] font-mono text-slate-500">{filteredSections.length} topics</span>
            </div>

            <div className="space-y-1.5">
              {filteredSections.map((sec) => {
                const IconComponent = sec.icon;
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSection(sec.id)}
                    className={`w-full text-left p-3 rounded-2xl transition-all flex items-start gap-3 cursor-pointer group border ${
                      isActive
                        ? 'bg-indigo-600/15 border-indigo-500/40 text-white shadow-sm'
                        : 'bg-slate-900/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl shrink-0 transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-slate-800/80 text-slate-400 group-hover:text-slate-200'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm tracking-tight truncate">
                          {sec.title}
                        </span>
                        {sec.badge && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {sec.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5 line-clamp-1">
                        {sec.summary}
                      </p>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 mt-2 shrink-0 transition-transform ${
                        isActive ? 'text-indigo-400 translate-x-0.5' : 'text-slate-600'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Quick action card in sidebar */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 to-slate-900/60 border border-purple-800/30 space-y-2 mt-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
                <MessageSquarePlus className="w-4 h-4" />
                <span>Found an Issue or Have an Idea?</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                You can report bugs, request features, or send screenshots directly to our development team.
              </p>
              <button
                onClick={() => {
                  const btn = document.getElementById('app-shell-feedback-btn');
                  if (btn) btn.click();
                }}
                className="w-full mt-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow"
              >
                <span>Open Feedback Modal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Section Detail Content Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. OVERVIEW */}
            {activeSection === 'overview' && (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="p-3 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Platform Overview & Architecture</h2>
                    <p className="text-xs text-slate-400">How Family Finance Tracker organizes data</p>
                  </div>
                </div>

                <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
                  <p>
                    <strong>Family Finance Tracker</strong> is engineered around strict multi-tenant
                    household isolation. Every household operates as a private, secure perimeter with
                    its own currency, members, expense categories, recurring commitments, and budgets.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
                        <Home className="w-4 h-4" /> Multi-Tenant Boundaries
                      </div>
                      <p className="text-xs text-slate-400">
                        Data from one household is completely isolated. Even if multiple families use
                        the app, transactions and budgets never cross boundaries.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs uppercase tracking-wider">
                        <Users className="w-4 h-4" /> Real-Time Family Sync
                      </div>
                      <p className="text-xs text-slate-400">
                        When any member logs groceries or rent, the dashboard instantly updates the total
                        household burn rate, budget thresholds, and member splits.
                      </p>
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-white pt-2">Typical User Journey</h3>
                  <ol className="space-y-2.5 text-xs text-slate-300 list-decimal list-inside pl-1">
                    <li>
                      <strong>Create or Join:</strong> Register your account, then either create a new
                      Household or enter your family's 6-character Invite Code.
                    </li>
                    <li>
                      <strong>Invite Members:</strong> Share the unique invite code with your spouse,
                      siblings, or housemates from the <em>Household</em> tab.
                    </li>
                    <li>
                      <strong>Configure EMIs & Bills:</strong> Add recurring obligations (home loan,
                      car EMI, WiFi, Netflix) with start dates.
                    </li>
                    <li>
                      <strong>Daily Tracking:</strong> Quickly record daily expenses and incomes to see
                      net savings and cash flow projections.
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {/* 2. ROLES & PERMISSIONS */}
            {activeSection === 'roles' && (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="p-3 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Roles & Household Permissions</h2>
                    <p className="text-xs text-slate-400">Administrative authority vs. Member access</p>
                  </div>
                </div>

                <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
                  <p>
                    Every member in a household is assigned either the <strong>ADMIN</strong> or{' '}
                    <strong>MEMBER</strong> role.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-2">
                    {/* Admin card */}
                    <div className="p-5 rounded-2xl bg-slate-950/80 border border-indigo-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          ADMIN
                        </span>
                        <Lock className="w-4 h-4 text-indigo-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-white">Household Administrator</h3>
                      <ul className="space-y-1.5 text-xs text-slate-400">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          Update Household Name & Currency
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          Regenerate or share the Invite Code
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          Manage, promote, or remove members
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          Create and delete category budgets
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          Edit or delete any transaction/recurring bill
                        </li>
                      </ul>
                    </div>

                    {/* Member card */}
                    <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          MEMBER
                        </span>
                        <Users className="w-4 h-4 text-slate-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-white">Family Contributor</h3>
                      <ul className="space-y-1.5 text-xs text-slate-400">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          Log daily expenses and income entries
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          View real-time household dashboard
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          Edit entries they personally created
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          Submit bug reports & feature requests
                        </li>
                        <li className="flex items-center gap-2 text-slate-500">
                          <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          Cannot remove other members or delete household
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. EXPENSES & INCOMES */}
            {activeSection === 'expenses' && (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="p-3 rounded-2xl bg-amber-600/20 text-amber-400 border border-amber-500/30">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Expenses & Income Management</h2>
                    <p className="text-xs text-slate-400">Maintaining an accurate household ledger</p>
                  </div>
                </div>

                <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
                  <h3 className="text-base font-semibold text-white">Logging Expenses</h3>
                  <p>
                    Navigate to the <strong>Expenses</strong> page to view the current month's transactions
                    or record a new entry.
                  </p>

                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                      Key Transaction Fields
                    </div>
                    <ul className="space-y-2 text-xs text-slate-300">
                      <li>
                        <strong>Amount & Category:</strong> Categorize spending (e.g. Groceries, Dining,
                        Utilities, Healthcare). Each category connects directly to your Monthly Budget.
                      </li>
                      <li>
                        <strong>Payer Assignment:</strong> Choose who paid for the expense. This allows
                        couples or roommates to see exact spending balances.
                      </li>
                      <li>
                        <strong>Date Selector:</strong> You can backdate transactions to previous days or
                        months; all reports automatically recalculate historical totals.
                      </li>
                      <li>
                        <strong>Notes & Receipt Details:</strong> Add memos (e.g., &quot;Costco bulk order&quot;) for easy searchability later.
                      </li>
                    </ul>
                  </div>

                  <h3 className="text-base font-semibold text-white pt-2">Income Streams</h3>
                  <p>
                    Log salaries, freelance earnings, dividends, or gifts in the <strong>Incomes</strong>{' '}
                    tab. The dashboard compares total income vs. total expenditures to give you an exact{' '}
                    <span className="text-emerald-400 font-semibold">Net Savings</span> metric.
                  </p>
                </div>
              </div>
            )}

            {/* 4. RECURRING BILLS, EMIS & SKIP ENGINE */}
            {activeSection === 'recurring' && (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="p-3 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <Repeat className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white">
                        Recurring Bills, EMIs & Skip Engine
                      </h2>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Upgraded
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Accurate start-date calculation, moratorium skipping, and clean deletion
                    </p>
                  </div>
                </div>

                <div className="space-y-5 text-sm text-slate-300 leading-relaxed">
                  {/* Highlight box 1: Start Date Calculation */}
                  <div className="p-5 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 space-y-2.5">
                    <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
                      <CalendarDays className="w-4 h-4 text-indigo-400" />
                      <span>1. Start Date Based Calculation (Not Just Day-of-Month)</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Previously, recurring systems would blindly match day numbers. In our upgraded
                      engine, recurring transactions calculate occurrences from the exact{' '}
                      <strong>Start Date</strong> when the bill or loan originated:
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-400 pl-4 list-disc">
                      <li>
                        Months prior to the bill's start date are never erroneously charged or projected.
                      </li>
                      <li>
                        If a loan starts on March 15, February will correctly show 0 EMI occurrences,
                        while March, April, and onward will project the scheduled installments.
                      </li>
                      <li>
                        If an optional <strong>End Date</strong> is configured, projections cleanly halt
                        once the final loan installment has elapsed.
                      </li>
                    </ul>
                  </div>

                  {/* Highlight box 2: Skipping Specific Months */}
                  <div className="p-5 rounded-2xl bg-purple-950/40 border border-purple-800/40 space-y-2.5">
                    <div className="flex items-center gap-2 text-purple-300 font-semibold text-sm">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>2. Skipping Specific Occurrences & Months (e.g. Loan Moratorium)</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Need to pause a gym subscription for one month, or received an EMI moratorium for
                      September? You don&apos;t have to delete the recurring bill!
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-400 pl-4 list-disc">
                      <li>
                        Under the <strong>Recurring</strong> tab, click the{' '}
                        <span className="text-purple-300 font-semibold">&quot;Skip Month / Date&quot;</span>{' '}
                        action on any recurring bill.
                      </li>
                      <li>
                        Pick the specific month (e.g. <code>2026-09</code>) to skip.
                      </li>
                      <li>
                        The engine immediately flags this occurrence as skipped. The bill will not appear
                        in that month&apos;s expenses, will not inflate that month&apos;s budget, and will resume
                        automatically the next month.
                      </li>
                      <li>You can unskip at any time with a single click.</li>
                    </ul>
                  </div>

                  {/* Highlight box 3: Cascading Deletion */}
                  <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-800/40 space-y-2.5">
                    <div className="flex items-center gap-2 text-rose-300 font-semibold text-sm">
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      <span>3. Clean Cascading Bill Deletion</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      When you delete a recurring bill entry, the system automatically purges all
                      generated transaction records associated with that bill across your historical and
                      future ledger. No phantom orphan transactions will remain!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 5. BUDGETS & FORECASTING */}
            {activeSection === 'budgets' && (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="p-3 rounded-2xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
                    <PieChart className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Budgets & Cash Flow Forecasting</h2>
                    <p className="text-xs text-slate-400">Preventing overspending before month end</p>
                  </div>
                </div>

                <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
                  <p>
                    Set maximum monthly expenditure limits per category (e.g., $600 for Groceries, $200
                    for Entertainment).
                  </p>

                  <div className="space-y-3 my-2">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="font-semibold text-emerald-400">Under 80% Spent:</span>
                      <span className="text-slate-400">Healthy status. You are safely under budget.</span>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <span className="font-semibold text-amber-400">80% – 100% Spent:</span>
                      <span className="text-slate-400">
                        Warning threshold. Advised to slow down discretionary spending.
                      </span>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <div className="w-3 h-3 rounded-full bg-rose-500" />
                      <span className="font-semibold text-rose-400">Over 100% Spent:</span>
                      <span className="text-slate-400">
                        Budget exceeded. Highlighted with prominent warning banners.
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-white pt-2">Forecasting Algorithm</h3>
                  <p className="text-xs text-slate-300">
                    Our forecasting engine calculates your daily velocity:
                    <code className="block bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-xs my-2 text-indigo-300">
                      Projected Spend = Current Spent + (Average Daily Non-Recurring Spend × Remaining
                      Days) + Scheduled Recurring Bills
                    </code>
                    This gives you a realistic view of where your household balance will finish by the
                    last day of the month.
                  </p>
                </div>
              </div>
            )}

            {/* 6. FEEDBACK & BUG REPORTS */}
            {activeSection === 'feedback' && (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="p-3 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                    <MessageSquarePlus className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white">In-App Feedback & Bug Reports</h2>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        New
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Direct line to the platform development & support team
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
                  <p>
                    Whenever you encounter an unexpected glitch, have an idea for a new feature, or want
                    to request an improvement, use the built-in <strong>Feedback & Issues</strong>{' '}
                    module.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-2">
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                        Screenshot Attachment
                      </div>
                      <p className="text-xs text-slate-400">
                        Upload an image or simply press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">Ctrl + V</kbd> to paste a clipboard screenshot directly into the form.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                        Automatic Context
                      </div>
                      <p className="text-xs text-slate-400">
                        The module automatically logs the current page URL and device viewport to help
                        our engineers reproduce and resolve issues rapidly.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="text-xs font-semibold text-slate-200">How to Open the Feedback Form:</div>
                    <ul className="space-y-1 text-xs text-slate-400 list-disc list-inside">
                      <li>Click <strong>&quot;Feedback &amp; Issues&quot;</strong> at the bottom of the left navigation sidebar.</li>
                      <li>Or click the <strong>&quot;Feedback&quot;</strong> button in the top-right header bar.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* 7. FAQ */}
            {activeSection === 'faq' && (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="p-3 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Frequently Asked Questions</h2>
                    <p className="text-xs text-slate-400">Quick answers to common situations</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      q: 'Can family members see each other’s expenses?',
                      a: 'Yes! All members registered in the same household share a unified ledger. Everyone can see who paid for what, promoting complete financial transparency.',
                    },
                    {
                      q: 'What happens if I skip an EMI month by accident?',
                      a: 'You can easily undo it. Go to Recurring Expenses, click on the bill, view the skipped dates list, and click "Unskip" to restore the occurrence.',
                    },
                    {
                      q: 'Can I export our household ledger to Excel or CSV?',
                      a: 'Yes! On the Expenses page, there is an Export CSV button that downloads your entire filtered date range for spreadsheet backups or tax filings.',
                    },
                    {
                      q: 'How do I change the household currency?',
                      a: 'Only Household Admins can modify the currency. Navigate to the Household Settings tab, pick your preferred currency (USD, EUR, INR, GBP, CAD, etc.), and save.',
                    },
                    {
                      q: 'Is my data secure?',
                      a: 'Yes. All passwords are encrypted with bcrypt, sessions are signed with HMAC JWTs, and database queries are strictly scoped by householdId to prevent cross-tenant data leakage.',
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40 transition-colors"
                    >
                      <button
                        onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                        className="w-full text-left p-4 flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-slate-200 hover:text-white cursor-pointer"
                      >
                        <span>{item.q}</span>
                        <ChevronRight
                          className={`w-4 h-4 text-slate-500 transition-transform ${
                            expandedFaq === idx ? 'rotate-90 text-indigo-400' : ''
                          }`}
                        />
                      </button>
                      {expandedFaq === idx && (
                        <div className="px-4 pb-4 text-xs text-slate-400 leading-relaxed border-t border-slate-800/40 pt-3">
                          {item.a}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
