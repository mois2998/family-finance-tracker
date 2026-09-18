'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import {
  Users,
  Key,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Globe,
  Share2,
  Settings,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { LogOut } from 'lucide-react';

export default function HouseholdPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading, logout } = useAuth();
  const [household, setHousehold] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Settings form
  const [householdName, setHouseholdName] = useState('');
  const [currency, setCurrency] = useState('₹');
  const [savingSettings, setSavingSettings] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Redirect unauthenticated user to /login
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [authLoading, currentUser, router]);

  useEffect(() => {
    async function loadHousehold() {
      if (!currentUser) return;
      try {
        setLoading(true);
        const resH = await fetch('/api/household');
        if (resH.ok) {
          const hData = await resH.json();
          setHousehold(hData.household);
          setHouseholdName(hData.household.name);
          setCurrency(hData.household.currency);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadHousehold();
  }, [currentUser]);

  const handleCopyLink = () => {
    if (!household?.inviteCode) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteUrl = `${origin}/register?invite=${household.inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyCode = () => {
    if (!household?.inviteCode) return;
    navigator.clipboard.writeText(household.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleRegenerateCode = async () => {
    if (!confirm('Regenerate invite code? The previous code will no longer work for new signups.')) return;
    setRegenerating(true);
    try {
      const res = await fetch('/api/household', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate_invite' }),
      });
      if (res.ok) {
        const data = await res.json();
        setHousehold((prev: any) => ({ ...prev, inviteCode: data.inviteCode }));
      }
    } finally {
      setRegenerating(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setStatusMessage('');
    try {
      const res = await fetch('/api/household', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_settings',
          name: householdName,
          currency,
        }),
      });
      if (res.ok) {
        setStatusMessage('Household settings saved successfully!');
        setTimeout(() => setStatusMessage(''), 3000);
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleMemberRole = async (memberId: string, currentRole: string) => {
    const newRole = currentRole === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    try {
      const res = await fetch('/api/household', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_member_role',
          memberId,
          newRole,
        }),
      });
      if (res.ok) {
        setHousehold((prev: any) => ({
          ...prev,
          users: prev.users.map((u: any) => (u.id === memberId ? { ...u, role: newRole } : u)),
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (authLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium text-slate-400">Loading household details...</p>
      </div>
    );
  }

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <AppShell user={currentUser}>
      <div className="space-y-6 pb-6 max-w-4xl mx-auto">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            <span>Household & Family Management</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Manage your family roster, invite new members, and configure currency settings
          </p>
        </div>

        {/* Family Member Invite Box */}
        <div className="bg-gradient-to-r from-indigo-950/50 via-slate-900 to-indigo-950/30 border border-indigo-500/40 p-5 sm:p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Family Invite Code</h3>
                <p className="text-xs text-slate-300">
                  Share this code or link with family members to let them join your household
                </p>
              </div>
            </div>

            {isAdmin && (
              <button
                onClick={handleRegenerateCode}
                disabled={regenerating}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 px-3 py-1.5 rounded-lg border border-indigo-800/60 transition-colors self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                <span>Regenerate Code</span>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <div className="w-full sm:w-auto bg-slate-900 border border-indigo-500/50 rounded-2xl px-6 py-3 text-center">
              <span className="text-xl sm:text-2xl font-mono font-black text-indigo-300 tracking-widest">
                {household?.inviteCode || '...'}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleCopyCode}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-3 bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold rounded-xl border border-slate-700 transition-all shadow-sm"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Code Copied!' : 'Copy Code'}</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02]"
              >
                {copied ? <Check className="w-4 h-4 text-white" /> : <Share2 className="w-4 h-4" />}
                <span>{copied ? 'Invite Link Copied!' : 'Copy Invite Link'}</span>
              </button>
            </div>
          </div>

          {/* ngrok / Tunnel Info Note */}
          <div className="flex items-start gap-2 pt-2 border-t border-slate-800 text-xs text-slate-400">
            <Globe className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p>
              <strong>Tunnel / ngrok Note:</strong> The invite link automatically adopts whatever URL you are
              currently accessing the app with (including your ngrok domain), so family members can click and join
              instantly from their phones anywhere in the world!
            </p>
          </div>
        </div>

        {/* Family Roster */}
        <div className="bg-[#0f172a]/80 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Family Members ({household?.users?.length || 0})</h3>
            </div>
          </div>

          <div className="divide-y divide-slate-800">
            {household?.users?.map((member: any) => (
              <div
                key={member.id}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-inner shrink-0"
                    style={{ backgroundColor: member.avatarColor || '#6366f1' }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm sm:text-base font-bold text-white">{member.name}</p>
                      {member.id === currentUser.id && (
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.2 rounded-full border border-slate-700">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                      member.role === 'ADMIN'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {member.role === 'ADMIN' ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" /> Admin / Parent
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5" /> Member
                      </>
                    )}
                  </span>

                  {isAdmin && member.id !== currentUser.id && (
                    <button
                      onClick={() => handleToggleMemberRole(member.id, member.role)}
                      className="text-xs text-slate-400 hover:text-indigo-300 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
                    >
                      Make {member.role === 'ADMIN' ? 'Member' : 'Admin'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Household Settings (Admin only) */}
        {isAdmin && (
          <div className="bg-[#0f172a]/80 border border-slate-800 p-5 sm:p-6 rounded-3xl shadow-lg space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Settings className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Household Configuration</h3>
            </div>

            {statusMessage && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs rounded-xl">
                {statusMessage}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Household Display Name
                </label>
                <input
                  type="text"
                  required
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  required
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white text-center font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md disabled:opacity-50 transition-all"
              >
                {savingSettings ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}

        {/* Account & Session Management Card (Accessible to both Admin and Members) */}
        <div className="bg-[#0f172a]/80 border border-slate-800 p-5 sm:p-6 rounded-3xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Signed In As {currentUser.name}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Email: {currentUser.email} • Role: {currentUser.role === 'ADMIN' ? 'Household Admin' : 'Family Member'}
            </p>
          </div>

          <button
            onClick={async () => {
              setLoggingOut(true);
              try {
                await logout();
              } catch {
                setLoggingOut(false);
              }
            }}
            disabled={loggingOut}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-white border border-rose-600/40 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>{loggingOut ? 'Signing out...' : 'Sign Out of Account'}</span>
          </button>
        </div>
      </div>
    </AppShell>
  );
}
