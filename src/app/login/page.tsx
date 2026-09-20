'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const identifier = email.trim();

    try {
      // Direct Super Admin login support
      if (identifier.toLowerCase() === 'super') {
        const adminRes = await fetch('/api/super-admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: identifier, password }),
        });

        const adminData = await adminRes.json();
        if (!adminRes.ok) throw new Error(adminData.error || 'Super admin authentication failed');

        router.push('/super-admin');
        return;
      }

      // Normal Family Member login
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      await refreshUser();
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center font-black text-2xl text-white shadow-xl shadow-indigo-600/30">
            ₹
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Family Finance Tracker</h1>
          <p className="text-sm text-slate-400">
            Collaborative household budget & predictable cash flow
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#0f172a]/90 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <LogIn className="w-5 h-5 text-indigo-400" /> Sign In
            </h2>
            <span className="text-xs text-slate-400">Family Member / Admin</span>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs sm:text-sm rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Email Address or Admin Username
              </label>
              <input
                type="text"
                required
                autoCapitalize="none"
                placeholder="you@family.com or super"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800">
            Don&apos;t have an account yet?{' '}
            <a href="/register" className="text-indigo-400 font-semibold hover:underline">
              Create or Join Household
            </a>
          </div>
        </div>

        {/* Info Pill & Super Admin Portal Link */}
        <div className="flex flex-col items-center gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Secure multi-user session with encrypted passwords</span>
          </div>
          <Link
            href="/super-admin/login"
            className="text-[11px] text-slate-500 hover:text-indigo-400 transition-colors inline-flex items-center gap-1 underline underline-offset-4"
          >
            Go to Dedicated Super Admin Portal →
          </Link>
        </div>
      </div>
    </div>
  );
}
