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
  Plus,
  Pencil,
  Tag,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { DEMO_BUSINESSES } from '@/lib/demo-data';
import { detectCategory, CATEGORY_TAGS } from '@/lib/tags-data';
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
    tags?: string[];
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
  const currentSlug = ownerSession?.businessSlug || '';
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('day');
  const [channelFilter, setChannelFilter] = useState<'all' | 'nfc' | 'qr'>('all');

  // Review Highlights state
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [tagsMessage, setTagsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);
  const [editingTagText, setEditingTagText] = useState<string>('');
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState<boolean>(false);

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
    id: currentSlug ? 'b-' + currentSlug : '',
    name: dashboardData?.businessInfo?.name || ownerSession?.businessName || (currentSlug && DEMO_BUSINESSES[currentSlug]?.name) || 'Store Dashboard',
    slug: currentSlug,
    google_review_link: dashboardData?.businessInfo?.googleReviewLink || (currentSlug && DEMO_BUSINESSES[currentSlug]?.google_review_link) || '',
    tags: customTags.length > 0 ? customTags : (dashboardData?.businessInfo?.tags || []),
    is_active: true,
  };

  // Preload customTags from server, or populate with recommended category defaults so merchant always sees active tags
  useEffect(() => {
    if (dashboardData?.businessInfo?.tags && dashboardData.businessInfo.tags.length > 0) {
      setCustomTags(dashboardData.businessInfo.tags);
    } else if (business.name && customTags.length === 0) {
      const cat = detectCategory(business.name);
      const defaultPool = CATEGORY_TAGS[cat] || CATEGORY_TAGS.general;
      if (defaultPool && defaultPool.length > 0) {
        setCustomTags([...defaultPool]);
      }
    }
  }, [dashboardData?.businessInfo?.tags, business.name]);

  const PRESET_SUGGESTIONS = [
    'Quick Response',
    'Cooperative Staff',
    'Best in Town',
    'Pocket Friendly Rates',
    'Superb Quality',
    'Highly Recommended',
    'Clean & Hygienic Space',
    'On-Time Service',
    'Trustworthy & Reliable',
    'Great Overall Experience',
    'Professional Behavior',
    'Worth Every Penny',
  ];

  const newTagWords = newTagInput.trim() ? newTagInput.trim().split(/\s+/).filter(Boolean) : [];
  const isTagWordLimitExceeded = newTagWords.length > 6;
  const isTagCharLimitExceeded = newTagInput.trim().length > 45;

  const handleAddTag = (tagToAdd?: string) => {
    const raw = (tagToAdd !== undefined ? tagToAdd : newTagInput).trim();
    if (!raw) return;

    if (customTags.length >= 24) {
      setTagsMessage({ type: 'error', text: 'Maximum 24 highlights limit reached.' });
      return;
    }

    const words = raw.split(/\s+/).filter(Boolean);
    if (words.length > 6) {
      setTagsMessage({ type: 'error', text: `"${raw}" has ${words.length} words. Maximum allowed is 6 words.` });
      return;
    }

    if (raw.length > 45) {
      setTagsMessage({ type: 'error', text: `"${raw}" has ${raw.length} characters. Maximum allowed is 45 characters.` });
      return;
    }

    if (customTags.some((t) => t.toLowerCase() === raw.toLowerCase())) {
      setTagsMessage({ type: 'error', text: `"${raw}" is already in your highlights list.` });
      return;
    }

    setCustomTags((prev) => [...prev, raw]);
    if (tagToAdd === undefined) {
      setNewTagInput('');
    }
    setTagsMessage(null);
  };

  const handleStartEditTag = (index: number) => {
    setEditingTagIndex(index);
    setEditingTagText(customTags[index]);
    setTagsMessage(null);
  };

  const handleCancelEditTag = () => {
    setEditingTagIndex(null);
    setEditingTagText('');
  };

  const handleSaveEditTag = (index: number) => {
    const trimmed = editingTagText.trim();
    if (!trimmed) {
      setTagsMessage({ type: 'error', text: 'Highlight sentence cannot be empty.' });
      return;
    }
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length > 6) {
      setTagsMessage({ type: 'error', text: `Highlight has ${words.length} words. Maximum allowed is 6 words.` });
      return;
    }
    if (trimmed.length > 45) {
      setTagsMessage({ type: 'error', text: `Highlight has ${trimmed.length} characters. Maximum allowed is 45 characters.` });
      return;
    }
    if (customTags.some((t, i) => i !== index && t.toLowerCase() === trimmed.toLowerCase())) {
      setTagsMessage({ type: 'error', text: `"${trimmed}" already exists in your highlights list.` });
      return;
    }

    const updated = [...customTags];
    updated[index] = trimmed;
    setCustomTags(updated);
    setEditingTagIndex(null);
    setEditingTagText('');
    setTagsMessage(null);
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setCustomTags((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (editingTagIndex === indexToRemove) {
      setEditingTagIndex(null);
      setEditingTagText('');
    }
  };

  const handleResetToDefaultTags = () => {
    const bizName = dashboardData?.businessInfo?.name || ownerSession?.businessName || '';
    const cat = detectCategory(bizName);
    const pool = CATEGORY_TAGS[cat] || CATEGORY_TAGS.general;
    setCustomTags([...pool]);
    setEditingTagIndex(null);
    setEditingTagText('');
    setTagsMessage({ type: 'success', text: `Loaded recommended highlights for ${cat.toUpperCase()}.` });
  };

  const handleSaveTags = async () => {
    if (!currentSlug) return;
    setIsSavingTags(true);
    setTagsMessage(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ownerSession?.token) {
        headers['Authorization'] = `Bearer ${ownerSession.token}`;
      }
      const res = await fetch('/api/dashboard/tags', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          businessId: currentSlug,
          slug: currentSlug,
          tags: customTags,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update review highlights');
      }
      if (data.tags) {
        setCustomTags(data.tags);
        setDashboardData((prev) => {
          if (!prev || !prev.businessInfo) return prev;
          return {
            ...prev,
            businessInfo: {
              ...prev.businessInfo,
              tags: data.tags,
            },
          };
        });
      }
      setTagsMessage({ type: 'success', text: 'Review highlights updated successfully! Active on your review page.' });
      setTimeout(() => {
        setTagsMessage(null);
      }, 4000);
    } catch (err: any) {
      setTagsMessage({ type: 'error', text: err.message || 'Failed to save highlights' });
    } finally {
      setIsSavingTags(false);
    }
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
        if (Array.isArray(data.businessInfo?.tags) && data.businessInfo.tags.length > 0) {
          setCustomTags(data.businessInfo.tags);
        }
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
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 relative">
            <Link
              href={`/qr/${currentSlug}`}
              target="_blank"
              className="text-[11px] sm:text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Store QR Standee</span>
              <span className="sm:hidden">Standee</span>
            </Link>

            {/* Settings Dropdown Button (Replaces bare logout) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
                className={`text-xs font-semibold px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSettingsMenuOpen
                    ? 'bg-slate-800 text-white border-indigo-500/50 shadow-md ring-2 ring-indigo-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
                title="Account & Dashboard Settings"
              >
                <Settings className={`w-3.5 h-3.5 text-indigo-400 transition-transform ${isSettingsMenuOpen ? 'rotate-45' : ''}`} />
                <span>Settings</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isSettingsMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Settings Dropdown Popover */}
              {isSettingsMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsSettingsMenuOpen(false)}
                  />

                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-slate-800/80">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Store Settings</div>
                      <div className="text-xs font-semibold text-slate-200 truncate">{business.name}</div>
                    </div>

                    {/* Option 1: Review Highlights */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsMenuOpen(false);
                        setIsTagsModalOpen(true);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold text-slate-200 hover:text-white hover:bg-indigo-600/20 border border-transparent hover:border-indigo-500/30 flex items-center gap-2.5 transition-all cursor-pointer group"
                    >
                      <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold">Review Highlights</div>
                        <div className="text-[10px] text-slate-400 font-normal">Edit compliment chips ({customTags.length}/24)</div>
                      </div>
                    </button>

                    {/* Option 2: Logout */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsMenuOpen(false);
                        handleSignOut();
                      }}
                      className="w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 flex items-center gap-2.5 transition-all cursor-pointer group"
                    >
                      <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                        <LogOut className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold">Logout</div>
                        <div className="text-[10px] text-slate-400 font-normal">Sign out of owner panel</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
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
              <span>{ownerSession?.businessName || business?.name || 'Store'} Analytics</span>
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
        <span>Business: {business?.name || 'Store'}</span>
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

      {/* Review Highlights Customizer Modal */}
      {isTagsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-800 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      Customize Review Highlights
                    </h3>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {customTags.length} / 24 Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Maximum 24 highlight sentences, up to 6 words each. Your customers can tap these when giving a review.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsTagsModalOpen(false);
                  setTagsMessage(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {tagsMessage && (
                <div
                  className={`p-3 rounded-2xl text-xs font-medium flex items-center gap-2 ${
                    tagsMessage.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                  }`}
                >
                  {tagsMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{tagsMessage.text}</span>
                </div>
              )}

              {/* Add New Highlight Sentence Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Add New Highlight Sentence (Max 6 words, 45 chars)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => {
                        setNewTagInput(e.target.value);
                        setTagsMessage(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="e.g. Quick Service, Best Quality in Town..."
                      maxLength={45}
                      disabled={customTags.length >= 24}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddTag()}
                    disabled={
                      !newTagInput.trim() ||
                      isTagWordLimitExceeded ||
                      isTagCharLimitExceeded ||
                      customTags.length >= 24
                    }
                    className="px-4 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-500 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Counters and limits helper */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span className={isTagWordLimitExceeded ? 'text-rose-400 font-bold' : ''}>
                    Words: {newTagWords.length} / 6 max
                  </span>
                  <span className={isTagCharLimitExceeded ? 'text-rose-400 font-bold' : ''}>
                    Characters: {newTagInput.trim().length} / 45 max
                  </span>
                </div>
              </div>

              {/* Current Highlights List */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">
                      Active Highlights ({customTags.length} of 24)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      (Click Edit to modify or Delete to remove)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetToDefaultTags}
                      className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer flex items-center gap-1"
                      title="Restore industry-recommended compliments for this store"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Reset to Store Defaults</span>
                    </button>
                    {customTags.length > 0 && (
                      <>
                        <span className="text-slate-700">•</span>
                        <button
                          type="button"
                          onClick={() => setCustomTags([])}
                          className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                        >
                          Clear All
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {customTags.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-2">
                    <p className="text-xs text-slate-400">
                      No custom highlights added yet. Type your own above or load recommended compliments.
                    </p>
                    <button
                      type="button"
                      onClick={handleResetToDefaultTags}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Load Recommended Compliments</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 bg-slate-950/50 rounded-2xl border border-slate-800/80">
                    {customTags.map((tag, idx) => (
                      editingTagIndex === idx ? (
                        <div key={idx} className="sm:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-xl bg-indigo-950/60 border-2 border-indigo-500 shadow-md">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={editingTagText}
                              onChange={(e) => setEditingTagText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveEditTag(idx);
                                } else if (e.key === 'Escape') {
                                  handleCancelEditTag();
                                }
                              }}
                              maxLength={45}
                              autoFocus
                              placeholder="Edit sentence (max 6 words)..."
                              className="w-full bg-slate-900 border border-indigo-400/60 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            />
                            <div className="flex items-center justify-between text-[10px] text-indigo-300 px-1 mt-0.5">
                              <span>Words: {editingTagText.trim().split(/\s+/).filter(Boolean).length}/6</span>
                              <span>Chars: {editingTagText.trim().length}/45</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSaveEditTag(idx)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                              title="Save changes"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditTag}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                              title="Cancel editing"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div key={idx} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="text-indigo-400 shrink-0 text-xs">✨</span>
                            <span className="text-xs text-slate-200 font-medium truncate" title={tag}>
                              {tag}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditTag(idx)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 border border-slate-700 hover:border-indigo-500/40 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Edit this highlight"
                            >
                              <Pencil className="w-3 h-3 text-indigo-400" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(idx)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Delete this highlight"
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Preset Suggestions */}
              {customTags.length < 24 && (
                <div className="space-y-2 pt-1 border-t border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    Quick Suggestions (Click to add):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_SUGGESTIONS.filter((s) => !customTags.includes(s)).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleAddTag(preset)}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-300 border border-slate-700/60 hover:border-indigo-500/40 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 opacity-60" />
                        <span>{preset}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                Changes apply instantly to customer review page
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsTagsModalOpen(false);
                    setTagsMessage(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTags}
                  disabled={isSavingTags}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-indigo-900/30 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSavingTags ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Highlights</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
