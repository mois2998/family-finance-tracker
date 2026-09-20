'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  CalendarClock,
  Users,
  LogOut,
  Plus,
  ShieldCheck,
  UserCheck,
  Sparkles,
  BookOpen,
  MessageSquarePlus,
} from 'lucide-react';
import AddTransactionModal from '../modals/AddTransactionModal';
import FeedbackModal from '../modals/FeedbackModal';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';

interface Member {
  id: string;
  name: string;
  avatarColor?: string;
  role?: string;
}

interface AppShellProps {
  children: React.ReactNode;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'MEMBER';
    avatarColor?: string;
    householdId: string;
    householdName?: string;
    inviteCode?: string;
    currency?: string;
    members?: Member[];
  };
  currentView?: 'household' | 'personal';
  onViewChange?: (view: 'household' | 'personal') => void;
  onRefreshData?: () => void;
}

export default function AppShell({
  children,
  user,
  currentView,
  onViewChange,
  onRefreshData,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout: contextLogout, viewMode, setViewMode } = useAuth();
  const { showFeedback } = useFeedback();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isAdmin = user.role === 'ADMIN';
  const effectiveView = currentView || viewMode || 'personal';
  const handleChangeView = onViewChange || setViewMode;

  const handleSwitchView = (newView: 'household' | 'personal') => {
    handleChangeView(newView);
    showFeedback(
      newView === 'household'
        ? 'Switched to Household Combined View'
        : 'Switched to My Personal View',
      'info'
    );
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      if (contextLogout) {
        await contextLogout();
      } else {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
      }
    } catch {
      setLoggingOut(false);
    }
  };

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Transactions', href: '/expenses', icon: Receipt },
    { label: 'Income', href: '/incomes', icon: Wallet },
    { label: 'Recurring & Bills', href: '/recurring', icon: CalendarClock },
    { label: 'Household', href: '/household', icon: Users },
    { label: 'User Guide', href: '/guide', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-[#0d1322] border-r border-slate-800/80 p-5 shrink-0 justify-between">
        <div className="space-y-6">
          {/* Logo & Household Brand */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-600/30">
              {user.currency || '₹'}
            </div>
            <div className="overflow-hidden">
              <h1 className="text-base font-bold tracking-tight text-white truncate">
                {user.householdName || 'Family Finance'}
              </h1>
              <p className="text-xs text-indigo-400 flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3" /> Shared Household
              </p>
            </div>
          </div>

          {/* Quick Add Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>

          {/* Nav Items with Next.js Link for instant SPA navigation */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Sidebar Logout */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-inner"
              style={{ backgroundColor: user.avatarColor || '#6366f1' }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold text-slate-200 truncate">{user.name}</p>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                {isAdmin ? (
                  <span className="text-indigo-400 font-medium flex items-center gap-0.5">
                    <ShieldCheck className="w-3 h-3" /> Admin / Parent
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-0.5">
                    <UserCheck className="w-3 h-3" /> Member
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Feedback & Report Issue Button */}
          <button
            onClick={() => setIsFeedbackModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/40 rounded-xl transition-all shadow-sm hover:scale-[1.01]"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Feedback & Issues</span>
          </button>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors border border-transparent hover:border-rose-900/40"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar with Household vs Personal Switcher & Universal Logout */}
        <header className="sticky top-0 z-30 bg-[#0d1322]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* Mobile Brand Title */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-sm text-white">
              {user.currency || '₹'}
            </div>
            <span className="font-bold text-sm tracking-tight text-white truncate max-w-[120px]">
              {user.householdName || 'Finance'}
            </span>
          </div>

          {/* Household vs Personal Switcher (Admin Only; Members always have Personal view) */}
          {isAdmin ? (
            <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-700/60 shadow-inner">
              <button
                type="button"
                onClick={() => handleSwitchView('household')}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all duration-150 active:scale-95 ${
                  effectiveView === 'household'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/40 ring-1 ring-indigo-400/50 active-switcher-pill'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Household Combined View</span>
                <span className="sm:hidden">Combined</span>
                {effectiveView === 'household' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSwitchView('personal')}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all duration-150 active:scale-95 ${
                  effectiveView === 'personal'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/40 ring-1 ring-indigo-400/50 active-switcher-pill'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">My Personal View</span>
                <span className="sm:hidden">My View</span>
                {effectiveView === 'personal' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs font-medium text-slate-300">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Personal View</span>
            </div>
          )}

          {/* Right Header items: User Guide, Feedback, Quick Add, Prominent Logout */}
          <div className="flex items-center gap-2">
            {/* User Guide Link */}
            <Link
              href="/guide"
              className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm"
              title="Open Platform User Guide"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Guide</span>
            </Link>

            {/* Feedback Button */}
            <button
              onClick={() => setIsFeedbackModalOpen(true)}
              className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm"
              title="Share feedback or report an issue"
            >
              <MessageSquarePlus className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Feedback</span>
            </button>

            {/* Quick Add */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add</span>
            </button>

            {/* Prominent Universal Sign Out Button (Visible on both Mobile & Desktop) */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              title="Sign Out of your account"
              className="flex items-center gap-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 hover:text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>

            {/* User Initials Badge */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white"
              style={{ backgroundColor: user.avatarColor || '#6366f1' }}
              title={`${user.name} (${user.role})`}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Children */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* Mobile Bottom Navigation Bar with Next.js Links for instant SPA switches */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d1322]/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1 flex items-center justify-around safe-bottom">
        <Link
          href="/"
          className={`flex flex-col items-center py-1.5 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
            pathname === '/' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Overview</span>
        </Link>

        <Link
          href="/expenses"
          className={`flex flex-col items-center py-1.5 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
            pathname === '/expenses' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <Receipt className="w-5 h-5 mb-0.5" />
          <span>Transactions</span>
        </Link>

        {/* Center Floating Plus Button */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="-mt-5 w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/50 border-4 border-[#090d16] active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>

        <Link
          href="/recurring"
          className={`flex flex-col items-center py-1.5 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
            pathname === '/recurring' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <CalendarClock className="w-5 h-5 mb-0.5" />
          <span>Bills</span>
        </Link>

        <Link
          href="/household"
          className={`flex flex-col items-center py-1.5 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
            pathname === '/household' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Family</span>
        </Link>
      </div>

      {/* Global Quick Add Modal - Member can only log for themselves */}
      <AddTransactionModal
        key={user.id}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          if (onRefreshData) onRefreshData();
          else window.location.reload();
        }}
        members={isAdmin ? (user.members || [{ id: user.id, name: user.name }]) : [{ id: user.id, name: user.name }]}
        currentUserId={user.id}
        currency={user.currency || '₹'}
      />

      {/* Global User Feedback & Bug Reporting Modal */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />
    </div>
  );
}
