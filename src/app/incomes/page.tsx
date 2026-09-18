'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { Wallet, Plus, Trash2, Calendar, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';

export default function IncomesPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading, viewMode: view, setViewMode: setView } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';
  const [incomes, setIncomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect unauthenticated user to /login
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [authLoading, currentUser, router]);

  const fetchIncomes = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const targetView = isAdmin ? view : 'personal';
      const res = await fetch(`/api/incomes?view=${targetView}`);
      if (res.ok) {
        const data = await res.json();
        setIncomes(data.incomes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin, view]);

  useEffect(() => {
    if (currentUser) {
      fetchIncomes();
    }
  }, [currentUser, fetchIncomes]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this income entry?')) return;
    try {
      const res = await fetch(`/api/incomes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setIncomes((prev) => prev.filter((i) => i.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (authLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium text-slate-400">Loading incomes...</p>
      </div>
    );
  }

  if (!currentUser) return null;

  const currency = currentUser.currency || '₹';
  const totalIncomes = incomes.reduce((sum, i) => sum + i.amount, 0);

  // Group inflows by member in household view
  const memberTotals = incomes.reduce((acc: Record<string, { name: string; avatarColor: string; amount: number }>, inc) => {
    const uid = inc.userId || inc.user?.id || 'unknown';
    const name = inc.user?.name || (uid === currentUser.id ? currentUser.name : 'Unknown');
    const avatarColor = inc.user?.avatarColor || '#6366f1';
    if (!acc[uid]) {
      acc[uid] = { name, avatarColor, amount: 0 };
    }
    acc[uid].amount += inc.amount;
    return acc;
  }, {});

  return (
    <AppShell
      user={currentUser}
      currentView={view}
      onViewChange={isAdmin ? setView : undefined}
      onRefreshData={fetchIncomes}
    >
      <div className="space-y-6 pb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Wallet className="w-6 h-6 text-emerald-400" />
              <span>{isAdmin && view === 'household' ? 'Household Income Streams' : 'My Personal Incomes'}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              {isAdmin && view === 'household'
                ? 'Salaries, freelancing, and inflows across all family members'
                : `Salary and cash inflows strictly belonging to ${currentUser.name}`}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl">
            <span className="text-xs text-slate-400">
              {isAdmin && view === 'household' ? 'Household Total:' : 'Personal Total:'}
            </span>
            <span className="text-base font-bold text-emerald-400">
              +{currency}
              {totalIncomes.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Member Inflow Breakdown Bar (Visible to Admin in Household View) */}
        {isAdmin && view === 'household' && Object.keys(memberTotals).length > 0 && (
          <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">
              Inflows By Member:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(memberTotals).map(([uid, m]) => (
                <div
                  key={uid}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs shadow-inner"
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.avatarColor }} />
                  <span className="font-semibold text-slate-200">
                    {m.name} {uid === currentUser.id ? '(You)' : ''}:
                  </span>
                  <span className="font-bold text-emerald-400">
                    +{currency}{m.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Income Stream Cards */}
        <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading income streams...</p>
            </div>
          ) : incomes.length === 0 ? (
            <div className="py-16 text-center text-slate-400 border border-dashed border-slate-800/80 m-4 rounded-xl">
              <Wallet className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">No income sources recorded</p>
              <p className="text-xs text-slate-500 mt-1">
                Tap &quot;Add Transaction&quot; &gt; &quot;Add Income&quot; to declare your salary or inflows.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {incomes.map((inc) => (
                <div
                  key={inc.id}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm sm:text-base font-semibold text-white truncate">
                        {inc.source}
                      </p>
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                        {inc.frequency}
                      </span>
                      {inc.user && (
                        <span className="flex items-center gap-1.5 text-[11px] font-medium bg-slate-800/90 text-slate-300 border border-slate-700/60 px-2.5 py-0.5 rounded-full shrink-0">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: inc.user.avatarColor || '#6366f1' }}
                          />
                          {inc.user.name} {inc.userId === currentUser.id ? '(You)' : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>Received: {format(new Date(inc.dateReceived), 'MMMM d, yyyy')}</span>
                      {inc.notes && (
                        <>
                          <span>•</span>
                          <span className="text-slate-300 italic">{inc.notes}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-base sm:text-lg font-black text-emerald-400">
                      +{currency}
                      {inc.amount.toLocaleString('en-IN')}
                    </span>

                    {(currentUser.role === 'ADMIN' || inc.userId === currentUser.id) && (
                      <button
                        onClick={() => handleDelete(inc.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                        title="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
