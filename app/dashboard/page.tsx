'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  TrendingUp,
  Star,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
  QrCode,
  LogOut,
  Clock,
  Scale,
  Phone,
  Filter,
  Users,
  Eye,
  ArrowRight,
  Trash2,
  AlertTriangle,
  X,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { DEMO_BUSINESSES } from '@/lib/demo-data';
import TermsModal from '@/components/TermsModal';
import SocialContactBar from '@/components/SocialContactBar';

interface ComplaintItem {
  id: string;
  businessId: string;
  businessName: string;
  rating: number;
  customerFeedback: string;
  customerPhone?: string;
  selectedTags: string[];
  createdAt: string;
  isResolved: boolean;
  source?: 'nfc' | 'qr';
}

interface ChannelStats {
  total: number;
  scans: number;
  posted: number;
  draftedUnposted: number;
  bounced: number;
  complaints: number;
}

interface DashboardData {
  filter: 'all' | 'posted_only' | 'drafted_unposted' | 'bounced_scans' | 'unposted_scans' | 'complaints';
  channel?: 'all' | 'nfc' | 'qr';
  businessInfo?: {
    name: string;
    slug: string;
    googleReviewLink: string;
  };
  metrics: {
    totalTraffic: number;
    totalReviews: number;
    postedToGoogle: number;
    draftedUnposted: number;
    bouncedScans: number;
    interceptedComplaints: number;
    unpostedScans: number;
    averageRating: number;
    ratingBreakdown: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
    googleConversionRate: number;
    nfc?: ChannelStats;
    qr?: ChannelStats;
  };
  complaints: ComplaintItem[];
  recentGoogleReviews: Array<{
    id: string;
    businessName: string;
    rating: number;
    reviewText: string;
    selectedTags?: string[];
    createdAt: string;
    source?: 'nfc' | 'qr';
  }>;
  draftedUnpostedReviews?: Array<{
    id: string;
    businessName: string;
    rating: number;
    reviewText: string;
    selectedTags?: string[];
    createdAt: string;
    source?: 'nfc' | 'qr';
  }>;
  bouncedScansList?: Array<{
    id: string;
    businessName: string;
    rating: number;
    createdAt: string;
    status: string;
    source?: 'nfc' | 'qr';
  }>;
  unpostedScansList: Array<{
    id: string;
    businessName: string;
    rating: number;
    createdAt: string;
    status: string;
    source?: 'nfc' | 'qr';
  }>;
}

export default function OwnerDashboardPage() {
  const router = useRouter();

  // Authentication & Fixed store state
  const [ownerSession, setOwnerSession] = useState<{
    token?: string;
    email: string;
    businessName?: string;
    businessSlug?: string;
    authorizedBusinessIds?: string[];
  } | null>(null);
  const [accessDeniedError, setAccessDeniedError] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const currentSlug = ownerSession?.businessSlug || 'photify-studio';
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('month');
  const [channelFilter, setChannelFilter] = useState<'all' | 'nfc' | 'qr'>('all');

  // Data fetching state
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [complaintFilter, setComplaintFilter] = useState<'all' | 'pending' | 'resolved'>('all');

  const [deletingComplaintId, setDeletingComplaintId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const handleCopyLink = (text: string, id: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
    } catch {
      // fallback
    }
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const business = {
    id: 'b-' + currentSlug,
    name: dashboardData?.businessInfo?.name || ownerSession?.businessName || DEMO_BUSINESSES[currentSlug]?.name || 'Photify Studio',
    slug: currentSlug,
    google_review_link: dashboardData?.businessInfo?.googleReviewLink || DEMO_BUSINESSES[currentSlug]?.google_review_link || 'https://g.page/r/CYa03-0ngD2lEAE/review',
    tags: [],
    is_active: true,
  };

  const handleDeleteSingleComplaint = async (complaintId: string) => {
    setDeletingComplaintId(complaintId);
    try {
      const res = await fetch('/api/dashboard', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaintId }),
      });
      const data = await res.json();
      if (data.success) {
        setDashboardData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            complaints: prev.complaints.filter((c) => c.id !== complaintId),
            metrics: {
              ...prev.metrics,
              interceptedComplaints: Math.max(0, prev.metrics.interceptedComplaints - 1),
            },
          };
        });
      }
    } catch (err) {
      console.error('Failed to delete complaint:', err);
    } finally {
      setDeletingComplaintId(null);
    }
  };

  // Verify auth session on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sessionStr = localStorage.getItem('reviewxpress_owner_session');
      if (sessionStr) {
        try {
          const parsed = JSON.parse(sessionStr);
          if (parsed.isLoggedIn) {
            setOwnerSession(parsed);
          } else {
            router.push('/dashboard/login');
          }
        } catch {
          router.push('/dashboard/login');
        }
      } else {
        router.push('/dashboard/login');
      }
    }
  }, [router]);

  // Fetch metrics and complaints from API with silent background polling
  const fetchDashboardData = async (isBackground = false) => {
    // Only fetch if session is loaded to prevent premature requests with default fallback
    if (!ownerSession?.businessSlug) {
      return;
    }

    if (!isBackground) setIsLoading(true);
    try {
      const activeSlug = ownerSession.businessSlug;
      const activeBiz = DEMO_BUSINESSES[activeSlug];
      const bizId = activeBiz?.id || ('b-' + activeSlug);
      const headers: Record<string, string> = {};
      if (ownerSession?.token) {
        headers['Authorization'] = `Bearer ${ownerSession.token}`;
      }
      const res = await fetch(
        `/api/dashboard?businessId=${bizId}&period=${timePeriod}&channel=${channelFilter}&t=${Date.now()}`,
        { headers, signal: AbortSignal.timeout(7000) }
      );
      const data = await res.json();
      if (res.status === 403 || (data && !data.success && data.message?.includes('Access Denied'))) {
        setAccessDeniedError(data?.message || 'Access Denied: You are not authorized to view this shop.');
        setIsLoading(false);
        return;
      }
      if (data?.success) {
        setAccessDeniedError(null);
        setDashboardData(data);
      }
    } catch (err) {
      console.warn('Dashboard sync note:', err);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };


  useEffect(() => {
    fetchDashboardData(false);

    // Dynamic sync polling (60 seconds when tab active to conserve server bandwidth & memory)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchDashboardData(true);
    }, 60000);

    return () => clearInterval(interval);
  }, [timePeriod, channelFilter, ownerSession]);

  // Toggle complaint status
  const handleToggleComplaint = async (complaintId: string) => {
    try {
      const res = await fetch('/api/dashboard', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(6000),
        body: JSON.stringify({ complaintId }),
      });
      const data = await res.json();
      if (data?.success) {
        setDashboardData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            complaints: prev.complaints.map((c) =>
              c.id === complaintId ? { ...c, isResolved: data.isResolved } : c
            ),
          };
        });
      }
    } catch (err) {
      console.warn('Failed to toggle complaint status:', err);
    }
  };

  // Sign out handler
  const handleSignOut = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('reviewxpress_owner_session');
    }
    router.push('/dashboard/login');
  };

  // Filter complaints list
  const filteredComplaints = (dashboardData?.complaints || []).filter((c) => {
    if (complaintFilter === 'pending') return !c.isResolved;
    if (complaintFilter === 'resolved') return c.isResolved;
    return true;
  });

  const pendingComplaintsCount = (dashboardData?.complaints || []).filter((c) => !c.isResolved).length;
  const resolvedComplaintsCount = (dashboardData?.complaints || []).filter((c) => c.isResolved).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar - Mobile Responsive Without Overlap */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
          {/* Brand Logo & Portal Tag - Stays on Dashboard and refreshes */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/dashboard"
              onClick={(e) => {
                e.preventDefault();
                fetchDashboardData(false);
              }}
              title="Dashboard Home (Refreshes data)"
              className="flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <img
                src="/reviewxpress-icon.png"
                alt="ReviewXpress"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
              />
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                Review<span className="text-indigo-400">Xpress</span>
              </span>
            </Link>
            <span className="hidden sm:inline-flex text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-0.5 rounded-full shrink-0">
              Owner Panel
            </span>
          </div>

          {/* Header Action Links */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <Link
              href={`/qr/${currentSlug}`}
              target="_blank"
              className="text-[11px] sm:text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-400" />
              <span>Store QR Standee</span>
            </Link>

            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="text-xs text-slate-400 hover:text-rose-400 p-1.5 sm:p-2 rounded-xl hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700 shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {accessDeniedError && (
          <div className="w-full bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-2xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="text-sm font-semibold">{accessDeniedError}</div>
          </div>
        )}
        {/* Header Title + Time Period Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/60">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>{ownerSession?.businessName || business?.name || 'Photify Studios'} Analytics</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Sync
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Filter review performance & manage intercepted customer feedback
            </p>
          </div>

          {/* Time Filter Controls: Today, 1 Week, 1 Month, 1 Year, All Time */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto scrollbar-none w-full sm:w-auto">
            {[
              { label: 'Today', shortLabel: 'Today', value: 'day' },
              { label: '1 Week', shortLabel: '1 Week', value: 'week' },
              { label: '1 Month', shortLabel: '1 Month', value: 'month' },
              { label: '1 Year', shortLabel: '1 Year', value: 'year' },
              { label: 'All Time', shortLabel: 'All', value: 'all' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setTimePeriod(tab.value as any)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 flex-1 sm:flex-initial text-center ${
                  timePeriod === tab.value
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Source Channel Filter Bar (NFC vs QR separation) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-md">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-violet-500/15 text-violet-400 text-xs">📱/📷</span>
            <span className="text-xs font-bold text-white">Source Channel:</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              (Filter between counter QR standee & NFC tap chip traffic)
            </span>
          </div>

          <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setChannelFilter('all')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl transition-all text-center cursor-pointer ${
                channelFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <span className="sm:hidden">All ({dashboardData?.metrics.totalTraffic || 0})</span>
              <span className="hidden sm:inline">🌐 All Traffic ({dashboardData?.metrics.totalTraffic || 0})</span>
            </button>

            <button
              onClick={() => setChannelFilter('nfc')}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                channelFilter === 'nfc'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 border border-violet-500 ring-2 ring-violet-500/30'
                  : 'text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30'
              }`}
            >
              <span>📱 NFC ({dashboardData?.metrics.nfc?.total || 0})</span>
            </button>

            <button
              onClick={() => setChannelFilter('qr')}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                channelFilter === 'qr'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-500 ring-2 ring-blue-500/30'
                  : 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30'
              }`}
            >
              <span>📷 QR ({dashboardData?.metrics.qr?.total || 0})</span>
            </button>
          </div>
        </div>


        {/* 3 Primary KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Card 1: Total Visits / Scans */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {channelFilter === 'nfc'
                  ? 'Total NFC Taps'
                  : channelFilter === 'qr'
                  ? 'Total QR Scans'
                  : 'Total Visits (NFC & QR)'}
              </span>
              <div className="p-1.5 sm:p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {isLoading ? '...' : dashboardData?.metrics.totalTraffic ?? 0}
              </span>
              <span className="text-xs font-semibold text-blue-400 flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Live
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">Customer counter interactions in selected period</p>
          </div>

          {/* Card 2: Reviews Posted to Google */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Review Live Status (3-5 ⭐)
              </span>
              <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                {isLoading ? '...' : dashboardData?.metrics.postedToGoogle ?? 0}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                ({dashboardData?.metrics.googleConversionRate ?? 0}%)
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">Confirmed published on Google Maps</p>
          </div>

          {/* Card 3: Shielded Complaints (1-2 Stars) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-rose-400 uppercase tracking-wider">
                Shielded Complaints (1-2 ⭐)
              </span>
              <div className="p-1.5 sm:p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-rose-400">
                {isLoading ? '...' : dashboardData?.metrics.interceptedComplaints ?? 0}
              </span>
              {pendingComplaintsCount > 0 && (
                <span className="text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                  {pendingComplaintsCount} Pending
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">Private feedback saved from public Google Maps</p>
          </div>
        </div>

        {/* NFC vs QR Channel Breakdown Comparison Hub */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Channel Analytics: 📱 NFC Tap vs 📷 QR Standee</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Real-time comparison between NFC chip taps and QR standee scans
                </p>
              </div>
            </div>

            {channelFilter !== 'all' && (
              <button
                onClick={() => setChannelFilter('all')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              >
                <span>Reset to All Channels</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NFC Tap Card */}
            <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
              channelFilter === 'nfc'
                ? 'bg-violet-950/40 border-violet-500 shadow-lg shadow-violet-950/40 ring-1 ring-violet-500/50'
                : 'bg-slate-950/60 border-slate-800 hover:border-violet-500/40'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 text-base">
                    📱
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-white">NFC Chip Taps</h3>
                    <p className="text-[11px] text-slate-400">Customers who tapped phone on counter NFC</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 pt-1">
                <div className="p-2 sm:p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-center">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-violet-300 block truncate">Total Taps</span>
                  <span className="text-base sm:text-lg font-black text-violet-300">{dashboardData?.metrics.nfc?.total || 0}</span>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-400 block truncate">Google Reviews</span>
                  <span className="text-base sm:text-lg font-black text-emerald-400">{dashboardData?.metrics.nfc?.posted || 0}</span>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-rose-400 block truncate">Complaints</span>
                  <span className="text-base sm:text-lg font-black text-rose-400">{dashboardData?.metrics.nfc?.complaints || 0}</span>
                </div>
              </div>
            </div>

            {/* QR Code Card */}
            <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
              channelFilter === 'qr'
                ? 'bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-950/40 ring-1 ring-blue-500/50'
                : 'bg-slate-950/60 border-slate-800 hover:border-blue-500/40'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 text-base">
                    📷
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-white">QR Standee Scans</h3>
                    <p className="text-[11px] text-slate-400">Customers who scanned counter QR standee</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 pt-1">
                <div className="p-2 sm:p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-blue-300 block truncate">Total Scans</span>
                  <span className="text-base sm:text-lg font-black text-blue-300">{dashboardData?.metrics.qr?.total || 0}</span>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-400 block truncate">Google Reviews</span>
                  <span className="text-base sm:text-lg font-black text-emerald-400">{dashboardData?.metrics.qr?.posted || 0}</span>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-rose-400 block truncate">Complaints</span>
                  <span className="text-base sm:text-lg font-black text-rose-400">{dashboardData?.metrics.qr?.complaints || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* 2-Column Grid: Rating Breakdown & Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Star Distribution Bars */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Customer Rating Distribution</span>
              </h2>
              <span className="text-xs text-slate-400">
                Period: <strong className="text-indigo-300 uppercase">{timePeriod}</strong>
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {[5, 4, 3, 2, 1].map((starVal) => {
                const count = dashboardData?.metrics.ratingBreakdown[starVal as 1 | 2 | 3 | 4 | 5] || 0;
                const total = dashboardData?.metrics.totalReviews || 1;
                const percentage = Math.round((count / total) * 100);
                const isNegative = starVal <= 2;

                return (
                  <div key={starVal} className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1 w-12 font-bold text-slate-300">
                      <span>{starVal}</span>
                      <Star className={`w-3.5 h-3.5 ${isNegative ? 'text-rose-400 fill-rose-400' : 'text-amber-400 fill-amber-400'}`} />
                    </div>

                    <div className="flex-1 bg-slate-800/80 h-3 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isNegative
                            ? 'bg-rose-500'
                            : starVal >= 4
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : 'bg-amber-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="w-16 text-right font-semibold text-slate-400">
                      <span>{count}</span>
                      <span className="text-[10px] text-slate-500 ml-1">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Review Funnel */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-lg flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>AI Review Shield Funnel</span>
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                How ReviewXpress protects your Google Maps rating
              </p>

              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                  <div className="text-[11px] font-bold text-indigo-300 uppercase">1. Scan & Star Tap</div>
                  <p className="text-xs text-slate-300 mt-0.5">Customers tap NFC tag or scan counter standee</p>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-[11px] font-bold text-emerald-400 uppercase">2. Positive Reviews (3-5 ⭐)</div>
                  <p className="text-xs text-emerald-200/90 mt-0.5">AI drafts natural review & opens Google Reviews</p>
                </div>

                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                  <div className="text-[11px] font-bold text-rose-400 uppercase">3. Intercepted Complaints (1-2 ⭐)</div>
                  <p className="text-xs text-rose-200/90 mt-0.5">Private form captures phone & problem for owner resolution</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* COMPLAINTS MANAGEMENT HUB (1 to 3 Stars - User's Core Request)    */}
        {/* ----------------------------------------------------------------- */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      Intercepted Customer Complaints (1-2 Stars)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Private feedback intercepted before reaching Google Maps. Contact customers to resolve issues.
                    </p>
                  </div>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 self-start sm:self-auto">
                  <button
                    onClick={() => setComplaintFilter('all')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      complaintFilter === 'all'
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({dashboardData?.complaints.length || 0})
                  </button>
                  <button
                    onClick={() => setComplaintFilter('pending')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      complaintFilter === 'pending'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Needs Action ({pendingComplaintsCount})
                  </button>
                  <button
                    onClick={() => setComplaintFilter('resolved')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      complaintFilter === 'resolved'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Resolved ({resolvedComplaintsCount})
                  </button>
                </div>
              </div>

            {/* Complaints List */}
            {filteredComplaints.length === 0 ? (
              <div className="py-12 text-center">
                <div className="inline-flex p-4 rounded-full bg-emerald-500/10 text-emerald-400 mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white">No complaints in this period!</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  Your customers had great visits during this time. Any negative 1-3 star feedback will be captured privately here.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredComplaints.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      item.isResolved
                        ? 'bg-slate-950/40 border-slate-800/80 opacity-75'
                        : 'bg-slate-950/90 border-rose-500/30 shadow-md shadow-rose-950/20'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            {item.rating} <Star className="w-3 h-3 fill-rose-300 text-rose-300" />
                          </span>

                          <span className="text-xs text-slate-400 font-medium">
                            • {item.businessName}
                          </span>

                          {item.source === 'nfc' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1">
                              📱 via NFC Tap
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                              📷 via QR Scan
                            </span>
                          )}

                          <span className="text-[11px] text-slate-500 flex items-center gap-1 ml-auto">
                            <Clock className="w-3 h-3" />
                            {new Date(item.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <p className="text-sm text-slate-200 font-medium leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                          "{item.customerFeedback}"
                        </p>

                        {item.selectedTags && item.selectedTags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[11px] text-slate-500">Tags:</span>
                            {item.selectedTags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700/60"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action buttons (Right side: Call + Mark Resolved) */}
                      <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0">
                        {item.customerPhone && item.customerPhone !== 'Not provided' && (
                          <a
                            href={`tel:${item.customerPhone}`}
                            className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Call</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handleToggleComplaint(item.id)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                            item.isResolved
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{item.isResolved ? 'Resolved' : 'Mark Resolved'}</span>
                        </button>

                        {item.isResolved && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSingleComplaint(item.id)}
                            disabled={deletingComplaintId === item.id}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title="Permanently remove this solved complaint to free database storage"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>{deletingComplaintId === item.id ? 'Deleting...' : 'Delete'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Storage preservation tip */}
            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-400">
              <span className="leading-relaxed">
                💡 <strong>Storage Cleanup:</strong> Solved customer complaints can be cleared anytime above, and are auto-purged 10 days after being marked as resolved to preserve database storage and keep your dashboard fast.
              </span>
              <span className="text-emerald-400 font-semibold shrink-0 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                ✓ Auto-Pruning Active
              </span>
            </div>
          </section>
      </main>

      {/* Owner Portal Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-4 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-center gap-3">
        <div className="flex items-center gap-2">
          <img src="/reviewxpress-icon.png" alt="ReviewXpress" className="w-4 h-4 object-contain" />
          <span className="font-semibold text-slate-400">ReviewXpress Owner Panel</span>
        </div>
        <span className="hidden sm:inline text-slate-700">•</span>
        <span>Business: {business?.name || 'Photify Studios'}</span>
        <span className="hidden sm:inline text-slate-700">•</span>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowTermsModal(true)}
            className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Terms & Conditions</span>
          </button>
          <span className="text-slate-700">•</span>
          <SocialContactBar showLabels={false} />
        </div>
      </footer>

      {/* Terms & Conditions Modal */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </div>
  );
}
