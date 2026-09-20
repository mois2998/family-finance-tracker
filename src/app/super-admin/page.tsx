'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  LogOut,
  Bug,
  Lightbulb,
  Sparkles,
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  User,
  Home,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Image as ImageIcon,
  Trash2,
  Save,
  ChevronDown,
  X,
  Maximize2,
  Check,
  AlertCircle
} from 'lucide-react';

interface FeedbackItem {
  id: string;
  householdId: string;
  userId: string;
  type: 'BUG' | 'FEATURE_REQUEST' | 'IMPROVEMENT' | 'GENERAL';
  title: string;
  message: string;
  screenshot?: string | null;
  pageUrl?: string | null;
  deviceInfo?: string | null;
  status: 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';
  adminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarColor?: string | null;
  };
  household: {
    id: string;
    name: string;
    inviteCode: string;
    currency: string;
  };
}

interface Stats {
  total: number;
  pending: number;
  inReview: number;
  resolved: number;
}

interface HouseholdOption {
  id: string;
  name: string;
  inviteCode: string;
}

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, inReview: 0, resolved: 0 });
  const [households, setHouseholds] = useState<HouseholdOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  // Filters
  const [filterHousehold, setFilterHousehold] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Active notes editing state
  const [notesDrafts, setNotesDrafts] = useState<{ [id: string]: string }>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [savedNoteSuccess, setSavedNoteSuccess] = useState<string | null>(null);

  // Screenshot lightbox modal state
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const fetchFeedbacks = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filterHousehold !== 'ALL') params.set('householdId', filterHousehold);
      if (filterStatus !== 'ALL') params.set('status', filterStatus);
      if (filterType !== 'ALL') params.set('type', filterType);

      const res = await fetch(`/api/super-admin/feedback?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      if (res.status === 401) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }
      setUnauthorized(false);

      if (!res.ok) {
        throw new Error('Failed to load feedback records');
      }

      const data = await res.json();
      setFeedbacks(data.feedbacks || []);
      setStats(data.stats || { total: 0, pending: 0, inReview: 0, resolved: 0 });
      setHouseholds(data.households || []);

      // Initialize notes drafts
      const notesMap: { [id: string]: string } = {};
      (data.feedbacks || []).forEach((item: FeedbackItem) => {
        notesMap[item.id] = item.adminNotes || '';
      });
      setNotesDrafts(notesMap);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unable to load platform feedback');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterHousehold, filterStatus, filterType]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const handleLogout = async () => {
    try {
      await fetch('/api/super-admin/login', { method: 'DELETE' });
      router.push('/super-admin/login');
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (id: string, newStatus: FeedbackItem['status']) => {
    try {
      const res = await fetch('/api/super-admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (!res.ok) throw new Error('Status update failed');
      const data = await res.json();

      setFeedbacks((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: newStatus } : f))
      );

      // Refresh stats
      fetchFeedbacks();
    } catch (err: any) {
      alert(err.message || 'Could not update status');
    }
  };

  const handleSaveNotes = async (id: string) => {
    setSavingNoteId(id);
    try {
      const noteContent = notesDrafts[id] ?? '';
      const res = await fetch('/api/super-admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, adminNotes: noteContent }),
      });

      if (!res.ok) throw new Error('Could not save note');

      setFeedbacks((prev) =>
        prev.map((f) => (f.id === id ? { ...f, adminNotes: noteContent } : f))
      );

      setSavedNoteSuccess(id);
      setTimeout(() => setSavedNoteSuccess(null), 2500);
    } catch (err: any) {
      alert(err.message || 'Error saving notes');
    } finally {
      setSavingNoteId(null);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete feedback: "${title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/super-admin/feedback?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete item');

      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
      fetchFeedbacks();
    } catch (err: any) {
      alert(err.message || 'Delete operation failed');
    }
  };

  // Filter feedbacks locally by search term
  const filteredFeedbacks = feedbacks.filter((f) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      f.title.toLowerCase().includes(term) ||
      f.message.toLowerCase().includes(term) ||
      f.user.name.toLowerCase().includes(term) ||
      f.user.email.toLowerCase().includes(term) ||
      f.household.name.toLowerCase().includes(term) ||
      f.household.inviteCode.toLowerCase().includes(term)
    );
  });

  const getTypeBadge = (type: FeedbackItem['type']) => {
    switch (type) {
      case 'BUG':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Bug className="w-3.5 h-3.5" /> Bug
          </span>
        );
      case 'FEATURE_REQUEST':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Lightbulb className="w-3.5 h-3.5" /> Feature Request
          </span>
        );
      case 'IMPROVEMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Sparkles className="w-3.5 h-3.5" /> Improvement
          </span>
        );
      case 'GENERAL':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/20">
            <MessageSquare className="w-3.5 h-3.5" /> General
          </span>
        );
    }
  };

  const getStatusBadgeClass = (status: FeedbackItem['status']) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'IN_REVIEW':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'RESOLVED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'DISMISSED':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  if (unauthorized) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Super Admin Session Required</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your session may have expired or credentials are required. Please sign in to access the multi-tenant control panel.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <a
              href="/super-admin/login"
              className="py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow transition-colors"
            >
              Sign In to Super Admin
            </a>
            <button
              onClick={() => {
                setUnauthorized(false);
                setLoading(true);
                fetchFeedbacks(true);
              }}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Super Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 ring-1 ring-white/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">Super Admin Portal</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                  Root
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Aggregated Multi-Tenant Feedback & Issue Tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchFeedbacks(true)}
              disabled={refreshing}
              title="Refresh feedback list"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Metric KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Reports</span>
              <MessageSquare className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-slate-500 mt-1">Across all registered households</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Pending</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-amber-400">{stats.pending}</div>
            <div className="text-xs text-slate-500 mt-1">Awaiting triage & review</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">In Review</span>
              <AlertTriangle className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-blue-400">{stats.inReview}</div>
            <div className="text-xs text-slate-500 mt-1">Under active investigation</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Resolved</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400">{stats.resolved}</div>
            <div className="text-xs text-slate-500 mt-1">Fixed or addressed</div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title, description, user, or tenant code..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Tenant Household Filter */}
              <div className="relative">
                <select
                  value={filterHousehold}
                  onChange={(e) => setFilterHousehold(e.target.value)}
                  className="appearance-none bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="ALL">All Households ({households.length})</option>
                  {households.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} (#{h.inviteCode})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="appearance-none bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="DISMISSED">Dismissed</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Type Filter */}
              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="appearance-none bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  <option value="BUG">Bugs</option>
                  <option value="FEATURE_REQUEST">Feature Requests</option>
                  <option value="IMPROVEMENT">Improvements</option>
                  <option value="GENERAL">General</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Feedback List Section */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
            <p className="text-sm text-slate-400">Loading cross-tenant feedback...</p>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">No Feedback Matches Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              No reports match your current filter selection. Reset filters or check back later.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
              Showing {filteredFeedbacks.length} of {feedbacks.length} reports
            </div>

            {filteredFeedbacks.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-5 sm:p-6 transition-all shadow-md space-y-4"
              >
                {/* Header row: Household Tag, Submitter Info, Category & Status */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 pb-3.5">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {/* Household identifier */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 text-xs font-medium">
                      <Home className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{item.household.name}</span>
                      <span className="text-[10px] text-indigo-400/80 font-mono">
                        #{item.household.inviteCode}
                      </span>
                    </div>

                    {/* Submitter User */}
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-200">
                        {item.user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-200">{item.user.name}</span>
                      <span className="text-slate-500 font-mono text-[11px] hidden sm:inline">
                        ({item.user.email})
                      </span>
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        {item.user.role}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getTypeBadge(item.type)}

                    {/* Interactive Status Selector */}
                    <div className="relative">
                      <select
                        value={item.status}
                        onChange={(e) =>
                          handleStatusChange(item.id, e.target.value as FeedbackItem['status'])
                        }
                        className={`appearance-none text-xs font-semibold rounded-lg pl-3 pr-7 py-1 border focus:outline-none cursor-pointer transition-colors ${getStatusBadgeClass(
                          item.status
                        )}`}
                      >
                        <option value="PENDING" className="bg-slate-900 text-amber-400">
                          PENDING
                        </option>
                        <option value="IN_REVIEW" className="bg-slate-900 text-blue-400">
                          IN REVIEW
                        </option>
                        <option value="RESOLVED" className="bg-slate-900 text-emerald-400">
                          RESOLVED
                        </option>
                        <option value="DISMISSED" className="bg-slate-900 text-slate-400">
                          DISMISSED
                        </option>
                      </select>
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      title="Delete feedback entry"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Content: Title & Message */}
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">{item.title}</h3>
                  <div className="mt-2 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60 font-sans">
                    {item.message}
                  </div>
                </div>

                {/* Screenshot Attachment (if present) */}
                {item.screenshot && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Attached Screenshot</span>
                    </div>
                    <div className="relative inline-block group">
                      <img
                        src={item.screenshot}
                        alt="Feedback screenshot preview"
                        className="max-h-48 max-w-full sm:max-w-md rounded-xl border border-slate-700/80 object-cover cursor-pointer group-hover:brightness-90 transition-all shadow-md"
                        onClick={() =>
                          setPreviewImage({ url: item.screenshot!, title: item.title })
                        }
                      />
                      <button
                        onClick={() =>
                          setPreviewImage({ url: item.screenshot!, title: item.title })
                        }
                        className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-slate-900/85 hover:bg-slate-900 text-white text-xs font-medium backdrop-blur-sm border border-slate-700/80 flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity cursor-pointer shadow"
                      >
                        <Maximize2 className="w-3.5 h-3.5" /> Full View
                      </button>
                    </div>
                  </div>
                )}

                {/* Metadata details row: Page URL, Device, Created Time */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>

                  {item.pageUrl && (
                    <div className="flex items-center gap-1.5 text-slate-400 max-w-xs truncate">
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-mono text-[11px] truncate">{item.pageUrl}</span>
                    </div>
                  )}

                  {item.deviceInfo && (
                    <div className="text-slate-500 text-[11px] truncate max-w-sm hidden lg:block">
                      {item.deviceInfo}
                    </div>
                  )}
                </div>

                {/* Admin Notes Section */}
                <div className="pt-2 border-t border-slate-800/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Super Admin Private Notes
                    </span>
                    {savedNoteSuccess === item.id && (
                      <span className="text-xs font-medium text-emerald-400 flex items-center gap-1 animate-pulse">
                        <Check className="w-3.5 h-3.5" /> Saved!
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={notesDrafts[item.id] ?? ''}
                      onChange={(e) =>
                        setNotesDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      placeholder="Add administrative notes, diagnosis, or resolution details..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => handleSaveNotes(item.id)}
                      disabled={savingNoteId === item.id}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingNoteId === item.id ? 'Saving...' : 'Save'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Fullscreen Screenshot Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col justify-center items-center p-4 sm:p-8 animate-fadeIn"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200 truncate">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                <span className="truncate">{previewImage.title}</span>
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 overflow-auto flex items-center justify-center bg-slate-950">
              <img
                src={previewImage.url}
                alt="Screenshot Full View"
                className="max-h-[75vh] w-auto object-contain rounded-lg border border-slate-800/80"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
