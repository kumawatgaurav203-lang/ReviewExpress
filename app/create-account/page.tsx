'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Mail,
  Lock,
  Link as LinkIcon,
  QrCode,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  Printer,
  Eye,
  EyeOff,
  UserCheck,
  Store,
  Layers,
  Check,
  Info,
  CheckCircle,
  Tag,
  Trash2,
  AlertTriangle,
  KeyRound,
  MessageSquare,
  Smartphone,
  Download,
  RefreshCw,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Turnstile } from '@marsidev/react-turnstile';
import { detectCategory } from '@/lib/tags-data';
import SocialContactBar from '@/components/SocialContactBar';

interface StoreItem {
  name: string;
  slug: string;
  email: string;
  password?: string;
  category?: string;
  createdAt?: string;
}

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  cafe: { label: 'Cafe & Coffee Shops', icon: '☕' },
  salon: { label: 'Salon & Hair Spa', icon: '✂️' },
  hotel: { label: 'Hotels & Hospitality', icon: '🏨' },
  medical: { label: 'Medical, Clinic & Pharmacy', icon: '🏥' },
  restaurant: { label: 'Restaurants & Dining', icon: '🍽️' },
  coaching: { label: 'Coaching & Education', icon: '📚' },
  beauty: { label: 'Beauty Parlour & Makeup', icon: '💄' },
  clothing: { label: 'Clothing & Fashion', icon: '👗' },
  studio: { label: 'Photography & Studio', icon: '📸' },
  automobile: { label: 'Automobile & Workshop', icon: '🚗' },
  general: { label: 'General Retail Stores', icon: '🏢' },
  other: { label: 'Other Businesses', icon: '🏷️' },
};

const normalizeCategory = (cat?: string, name?: string): string => {
  if (cat && cat !== 'auto' && cat.trim().length > 0) {
    return cat.toLowerCase().trim();
  }
  return detectCategory(name || '');
};

const getCategoryDisplay = (catKey: string) => {
  if (CATEGORY_META[catKey]) {
    return CATEGORY_META[catKey];
  }
  return {
    label: catKey.charAt(0).toUpperCase() + catKey.slice(1),
    icon: '🏷️',
  };
};

export default function CreateAccountAdminPage() {
  // Form Fields
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleReviewLink, setGoogleReviewLink] = useState('');
  const [category, setCategory] = useState(''); // Direct text input
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('all');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Toggle password visibility on store cards
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // 4-Step Delete Modal State (including permanent delete confirmation screen)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    store: StoreItem | null;
    step: 1 | 2 | 3 | 4;
    deletedStoreName: string;
    currentPassword1: string;
    currentPassword2: string;
    showPwd1: boolean;
    showPwd2: boolean;
    errorMsg: string;
    isDeleting: boolean;
  }>({
    isOpen: false,
    store: null,
    step: 1,
    deletedStoreName: '',
    currentPassword1: '',
    currentPassword2: '',
    showPwd1: false,
    showPwd2: false,
    errorMsg: '',
    isDeleting: false,
  });

  const openDeleteModal = (store: StoreItem) => {
    setDeleteModal({
      isOpen: true,
      store,
      step: 1,
      deletedStoreName: '',
      currentPassword1: '',
      currentPassword2: '',
      showPwd1: false,
      showPwd2: false,
      errorMsg: '',
      isDeleting: false,
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      store: null,
      step: 1,
      deletedStoreName: '',
      currentPassword1: '',
      currentPassword2: '',
      showPwd1: false,
      showPwd2: false,
      errorMsg: '',
      isDeleting: false,
    });
  };

  const handleVerifyPasswordForDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteModal.store) return;

    const p1 = deleteModal.currentPassword1.trim();
    const p2 = deleteModal.currentPassword2.trim();

    if (!p1 || !p2) {
      setDeleteModal((prev) => ({ ...prev, errorMsg: 'Please enter the current password in both fields.' }));
      return;
    }

    if (p1 !== p2) {
      setDeleteModal((prev) => ({ ...prev, errorMsg: 'Both entered passwords must match exactly.' }));
      return;
    }

    // Validate that entered password matches current account password
    if (deleteModal.store.password && p1 !== deleteModal.store.password) {
      setDeleteModal((prev) => ({
        ...prev,
        errorMsg: 'Incorrect current password! You must enter the exact current password of this account.',
      }));
      return;
    }

    // Verified! Move to final Step 3
    setDeleteModal((prev) => ({ ...prev, step: 3, errorMsg: '' }));
  };

  const handleFinalDeleteConfirm = async () => {
    if (!deleteModal.store) return;

    setDeleteModal((prev) => ({ ...prev, isDeleting: true, errorMsg: '' }));

    try {
      const res = await fetch('/api/delete-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          email: deleteModal.store.email,
          password: deleteModal.currentPassword1.trim(),
          confirmPassword: deleteModal.currentPassword2.trim(),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setDeleteModal((prev) => ({
          ...prev,
          isDeleting: false,
          errorMsg: data.message || 'Failed to delete store.',
        }));
        return;
      }

      // Successfully deleted! Update activeStores in real-time
      const deletedName = deleteModal.store.name;
      const deletedEmail = deleteModal.store.email.toLowerCase();
      const deletedSlug = deleteModal.store.slug;
      setActiveStores((prev) =>
        prev.filter(
          (s) => s.email.toLowerCase() !== deletedEmail && s.slug !== deletedSlug
        )
      );

      // Transition to Step 4: Show Permanent Deletion Success Screen
      setDeleteModal((prev) => ({
        ...prev,
        step: 4,
        isDeleting: false,
        deletedStoreName: deletedName,
        errorMsg: '',
      }));
    } catch (err) {
      console.error('Delete store network error:', err);
      setDeleteModal((prev) => ({
        ...prev,
        isDeleting: false,
        errorMsg: 'Network error while deleting store.',
      }));
    }
  };

  // OTP State
  const [showOtpField, setShowOtpField] = useState(false);
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  // Success State
  const [createdBusiness, setCreatedBusiness] = useState<{
    name: string;
    slug: string;
    customerFlowUrl: string;
    qrStandeeUrl: string;
    googleReviewLink: string;
    ownerEmail: string;
    ownerPassword: string;
  } | null>(null);

  // Dedicated QR Code & Host Origin for NFC programming
  const [createdQrDataUrl, setCreatedQrDataUrl] = useState<string>('');
  const [origin, setOrigin] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (createdBusiness && typeof window !== 'undefined') {
      const fullUrl = `${window.location.origin}/r/${createdBusiness.slug}`;
      QRCode.toDataURL(fullUrl, {
        width: 600,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
        .then(setCreatedQrDataUrl)
        .catch(console.error);
    } else {
      setCreatedQrDataUrl('');
    }
  }, [createdBusiness]);

  const handleDownloadQr = (slug: string, storeName: string) => {
    if (!createdQrDataUrl) return;
    const a = document.createElement('a');
    a.href = createdQrDataUrl;
    a.download = `${slug}-nfc-review-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Active stores list (Starts completely empty - Zero fake data)
  const [activeStores, setActiveStores] = useState<StoreItem[]>([]);

  // Fetch real registered stores on mount & poll every 6s (skips when tab hidden)
  useEffect(() => {
    const loadStores = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetch(`/api/register-owner?t=${Date.now()}`, { signal: AbortSignal.timeout(7000) })
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && Array.isArray(data.stores)) {
            setActiveStores(data.stores);
          }
        })
        .catch(() => {});
    };

    loadStores();
    const interval = setInterval(loadStores, 6000);
    return () => clearInterval(interval);
  }, []);

  // Slug preview computation
  const previewSlug = businessName
    ? businessName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    : 'store-slug';

  // Bulletproof Copy helper for HTTP & Mobile browsers
  const fallbackCopyText = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      textArea.style.opacity = '0';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (e) {
      console.warn('Fallback execCommand copy failed:', e);
      return false;
    }
  };

  const handleCopy = (text: string, fieldName: string) => {
    let copied = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).catch(() => {
          fallbackCopyText(text);
        });
        copied = true;
      } else {
        copied = fallbackCopyText(text);
      }
    } catch {
      copied = fallbackCopyText(text);
    }
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!businessName.trim()) {
      setErrorMsg('Store / Business Name is mandatory.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Valid Owner Email address is mandatory.');
      return;
    }

    if (!category.trim()) {
      setErrorMsg('Business Category is mandatory (e.g. Cafe, Salon, Hotel, Studio, Medical).');
      return;
    }

    // STRICT 8-CHARACTER PASSWORD VALIDATION + 1 SYMBOL MANDATORY
    if (password.length !== 8) {
      setErrorMsg(
        'Password must be strictly 8 characters long (neither more nor less). Currently: ' +
          password.length +
          '/8 characters.'
      );
      return;
    }

    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
    if (!hasSymbol) {
      setErrorMsg(
        'Password must contain at least 1 special symbol (@, #, $, %, !, *).'
      );
      return;
    }

    // GOOGLE MAPS REVIEW LINK IS MANDATORY
    if (!googleReviewLink.trim()) {
      setErrorMsg('Google Maps Review Link is mandatory. Please paste your Google review link.');
      return;
    }

    if (!googleReviewLink.trim().startsWith('http://') && !googleReviewLink.trim().startsWith('https://')) {
      setErrorMsg('Google Maps Review Link must start with https:// or http://');
      return;
    }

    // STEP 1: Send OTP if not shown
    if (!showOtpField) {
      if (!turnstileToken) {
        setErrorMsg('Please complete the Cloudflare Turnstile human verification ("Verify you are human") check.');
        return;
      }

      setIsSendingOtp(true);
      try {
        const res = await fetch('/api/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({ email: email.trim(), turnstileToken }),
        });
        const data = await res.json();
        setIsSendingOtp(false);

        if (!data.success) {
          setErrorMsg(data.message || 'Failed to send OTP.');
          return;
        }

        setShowOtpField(true);
        setErrorMsg(''); // Clear errors
      } catch (err: any) {
        console.error('OTP send error:', err);
        setErrorMsg(err.name === 'TimeoutError' ? 'OTP delivery timed out. Please retry.' : 'Network error while sending OTP.');
        setIsSendingOtp(false);
      }
      return;
    }

    // STEP 2: Verify OTP and Register
    if (!otp.trim()) {
      setErrorMsg('Please enter the OTP sent to the email.');
      return;
    }

    setIsLoading(true);
    const finalCategory = category.trim() || 'General';

    try {
      const res = await fetch('/api/register-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          businessName: businessName.trim(),
          email: email.trim(),
          password: password,
          googleReviewLink: googleReviewLink.trim(),
          category: finalCategory,
          otp: otp.trim(),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.message || 'Failed to onboard store.');
        setIsLoading(false);
        return;
      }

      setCreatedBusiness({
        name: data.business.name,
        slug: data.business.slug,
        customerFlowUrl: data.customerFlowUrl,
        qrStandeeUrl: data.qrStandeeUrl,
        googleReviewLink: data.googleReviewLink || 'https://g.page/r/CYa03-0ngD2lEAE/review',
        ownerEmail: email.trim(),
        ownerPassword: password,
      });

      // Add newly created store to active stores list with password
      setActiveStores((prev) => [
        { name: data.business.name, slug: data.business.slug, email: email.trim(), password: password, category: finalCategory },
        ...prev.filter((s) => s.slug !== data.business.slug),
      ]);

      setIsLoading(false);
      setShowOtpField(false);
      setOtp('');
      setCategory('');
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setErrorMsg('Network error. Please try again.');
      setIsLoading(false);
    }
  };

  const getHandoverMessage = () => {
    if (!createdBusiness) return '';
    return (
      `Client Email: ${createdBusiness.ownerEmail}\n` +
      `Password: ${createdBusiness.ownerPassword}`
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar - Mobile Responsive Without Overlap */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/reviewxpress-icon.png"
                alt="ReviewXpress"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
              />
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                Review<span className="text-indigo-400">Xpress</span>
              </span>
            </Link>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">
              <span className="sm:hidden">Admin</span>
              <span className="hidden sm:inline">Agency Master Admin</span>
            </span>
          </div>

          <div className="flex items-center shrink-0">
            <span className="text-[11px] sm:text-xs text-slate-400 font-medium hidden md:inline">
              Client Account Creation Portal
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Header Hero */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Dedicated Super Admin / Agency Panel (Restricted Access)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Client Store Onboarding & Scanner Creator
          </h1>
          <p className="text-sm text-slate-400">
            Create client accounts in under 2 minutes. Automatically generates the store's unique review URL, printable QR standee, and owner analytics credentials.
          </p>
        </div>

        {/* Feedback / Errors */}
        {errorMsg && (
          <div className="max-w-xl mx-auto p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* CONDITIONAL: REGISTRATION FORM OR SUCCESS SCREEN                  */}
        {/* ----------------------------------------------------------------- */}
        {!createdBusiness ? (
          <div className="max-w-xl mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800 gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-white truncate">New Store Information</h2>
                  <p className="text-[11px] text-slate-400 truncate">Enter client store details to generate account & scanner</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap">
                Step 1 of 1
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Field 1: Store Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Store / Business Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Sharma Sweets, Apex Coaching, Royal Salon"
                    className="w-full text-sm bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                {businessName && (
                  <p className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
                    <span>Generated Store Slug:</span>
                    <span className="font-mono text-indigo-400 font-bold">/r/{previewSlug}</span>
                  </p>
                )}
              </div>

              {/* Field 2: Owner Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Owner Email Address <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. owner@reviewxpress.io"
                    className="w-full text-sm bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  Used by the owner to log in to their dashboard at /dashboard/login
                </p>
              </div>

              {/* Business Category Direct Text Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>
                    Business Category <span className="text-rose-400">*</span>
                  </span>
                  <span className="text-[10px] text-indigo-400 font-normal">
                    Type category directly (e.g. Cafe, Salon, Hotel, Medical)
                  </span>
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Type category: Cafe, Salon, Hotel, Medical, Bakery, Gym..."
                    className="w-full text-sm bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-medium"
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-400 leading-tight">
                  Type any category name. Your client list and review highlights will adapt to this category automatically!
                </p>
              </div>

              {/* Field 3: Strictly 8-Character Password with 1 Symbol Mandatory */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Owner Password <span className="text-amber-400 font-bold">(Strictly 8 Digits Fix + 1 Symbol)</span> <span className="text-rose-400">*</span>
                  </label>
                  <span
                    className={`text-[11px] font-mono font-bold shrink-0 ${
                      password.length === 8 && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {password.length}/8
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    maxLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Strictly 8 chars (e.g. Gaur@270)"
                    className="w-full text-sm bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                      password.length === 8
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {password.length === 8 ? '✓ Exactly 8 Characters' : `${password.length}/8 Characters`}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)
                      ? '✓ 1 Symbol Included'
                      : '○ 1 Symbol Mandatory (@, #, $)'}
                  </span>
                </div>
              </div>

              {/* Field 4: Google Maps Review Link (MANDATORY) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>
                    Google Maps Review Link <span className="text-rose-400">*</span>
                  </span>
                  <span className="text-[10px] text-amber-400 font-semibold">
                    Mandatory
                  </span>
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    required
                    value={googleReviewLink}
                    onChange={(e) => setGoogleReviewLink(e.target.value)}
                    placeholder="https://g.page/r/.../review or maps.app.goo.gl link"
                    className="w-full text-xs sm:text-sm bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-400 leading-tight">
                  ★ Mandatory: In Google Maps, search shop name → click &quot;Share&quot; or &quot;Ask for reviews&quot; → paste link here.
                </p>
              </div>

              {/* Submit Button & OTP Field */}
              {showOtpField && (
                <div className="mt-6 p-4 rounded-xl bg-slate-900 border border-indigo-500/30">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Enter OTP sent to {email} <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-indigo-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className="w-full text-sm bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono tracking-wider"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Please check your client's email inbox (or spam) for the verification code.
                  </p>
                </div>
              )}

              {/* Cloudflare Turnstile Human Verification Checkbox */}
              {!showOtpField && (
                <div className="pt-2 flex flex-col items-center justify-center">
                  <div className="bg-slate-950/80 p-2 rounded-2xl border border-slate-800 inline-block overflow-hidden min-h-[70px]">
                    <Turnstile
                      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAAExg9IxCReGCFYX3"}
                      onSuccess={(token) => {
                        setTurnstileToken(token);
                        setErrorMsg('');
                      }}
                      onError={() => {
                        console.warn('Turnstile widget error');
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Protected by Cloudflare Turnstile</span>
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || isSendingOtp}
                className="w-full mt-4 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white font-bold text-sm shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {isSendingOtp ? (
                  <span>Sending OTP...</span>
                ) : isLoading ? (
                  <span>Verifying & Generating Store...</span>
                ) : showOtpField ? (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify OTP & Create Store</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Send Verification OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* --------------------------------------------------------------- */
          /* ONBOARDING SUCCESS & CLIENT HANDOVER PANEL                      */
          /* --------------------------------------------------------------- */
          <div className="max-w-2xl mx-auto bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Client Onboarded Successfully!</h2>
                <p className="text-xs text-emerald-300">
                  {createdBusiness.name} is now live with its dedicated QR scanner and dashboard.
                </p>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* 🔗 PERMANENT NFC REVIEW LINK & HIGH-RES QR STANDEE HUB        */}
            {/* ------------------------------------------------------------- */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/40 border border-indigo-500/30 space-y-4 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Permanent NFC Review Link & High-Res QR</span>
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Admin NFC Hub
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Program NFC cards or print QR standees for {createdBusiness.name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
                {/* QR Display */}
                <div className="md:col-span-4 flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-md space-y-2">
                  {createdQrDataUrl ? (
                    <img
                      src={createdQrDataUrl}
                      alt={`${createdBusiness.name} Review QR`}
                      className="w-36 h-36 object-contain"
                    />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center text-slate-400 text-xs">
                      Generating QR...
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownloadQr(createdBusiness.slug, createdBusiness.name)}
                    className="w-full py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Download QR (PNG)</span>
                  </button>
                </div>

                {/* NFC Details & Actions */}
                <div className="md:col-span-8 space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Permanent Public Review URL (Write to NFC Tag)
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-indigo-300 truncate select-all">
                        {origin ? `${origin}/r/${createdBusiness.slug}` : `/r/${createdBusiness.slug}`}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            origin ? `${origin}/r/${createdBusiness.slug}` : `${window.location.origin}/r/${createdBusiness.slug}`,
                            'nfc-permanent'
                          )
                        }
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow shrink-0 cursor-pointer"
                      >
                        {copiedField === 'nfc-permanent' ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-300" />
                            <span className="text-emerald-300">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy NFC Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Quick Test Direct Links */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <a
                      href={`/r/${createdBusiness.slug}?source=nfc`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all text-center"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px] font-medium">Test NFC Tap</span>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
                    </a>
                    <a
                      href={`/r/${createdBusiness.slug}?source=qr`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-teal-500/40 text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all text-center"
                    >
                      <QrCode className="w-3.5 h-3.5 text-teal-400" />
                      <span className="text-[11px] font-medium">Test QR Scan</span>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
                    </a>
                  </div>

                  {/* NFC Re-write explanation */}
                  <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <p className="leading-snug">
                      <strong>Permanent Link Guarantee:</strong> This URL is permanently locked to this store. Even if the store changes its Google Review destination in the future, physical NFC cards & printed stands never need to be replaced!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Generated Links Grid */}
            <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Standee Link Box */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Printable QR Standee</span>
                    <Printer className="w-4 h-4 text-teal-400" />
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Ready to print for billing counter or acrylic stand (Scan with phone camera).
                  </p>
                </div>
                <Link
                  href={createdBusiness.qrStandeeUrl}
                  target="_blank"
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md mt-2"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Open & Print QR Standee</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {/* Customer Flow Box */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Customer Review Page</span>
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Tap stars, select AI highlights, and test redirect to Google Review.
                  </p>
                </div>
                <Link
                  href={createdBusiness.customerFlowUrl}
                  target="_blank"
                  className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md mt-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test Customer Review Flow</span>
                </Link>
              </div>
            </div>

            {/* Direct Google Review Box */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Target Google Review Dialog:</strong> Verified & active for this store</span>
              </div>
              <a
                href={createdBusiness.googleReviewLink}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 transition-all"
              >
                <span>Direct Google Review Popup</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

            {/* Store Owner Login Credentials Box */}
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-indigo-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                  Store Owner Login Credentials
                </span>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                  Handover to Client
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Owner Email:</span>
                  <span className="text-white font-semibold">{createdBusiness.ownerEmail}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Owner Password:</span>
                  <span className="text-emerald-400 font-semibold">{createdBusiness.ownerPassword}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>Login Portal:</span>
                <span className="text-indigo-400 font-mono">/dashboard/login</span>
              </div>

              {/* 1-Click WhatsApp Handover Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCopy(getHandoverMessage(), 'handover')}
                  className="w-full py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {copiedField === 'handover' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Copied Message!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span>Copy WhatsApp Message</span>
                    </>
                  )}
                </button>

                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(getHandoverMessage())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 text-center cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Open Directly in WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Next Action Button */}
            <button
              type="button"
              onClick={() => {
                setCreatedBusiness(null);
                setBusinessName('');
                setEmail('');
                setPassword('');
                setGoogleReviewLink('');
              }}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>Onboard Another Store / Client</span>
            </button>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* REGISTERED CLIENT STORES DIRECTORY (Categorized Management View)   */}
        {/* ----------------------------------------------------------------- */}
        <div className="max-w-4xl mx-auto space-y-5 pt-6 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Registered Client Stores ({activeStores.length})</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Organized & categorized by business niche (Cafe, Salon, Hotel, Medical, etc.)
              </p>
            </div>
            {activeStores.length > 0 && (
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold self-start sm:self-auto bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{activeStores.length} Accounts Active</span>
              </span>
            )}
          </div>

          {activeStores.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-2">
              <Store className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 font-medium">
                No store accounts created yet.
              </p>
              <p className="text-[11px] text-slate-500">
                Create your first store account using the form above. It will appear here instantly under its category!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Category Filter Pills / Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryTab('all')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    selectedCategoryTab === 'all'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-500/20'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span>All Stores</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      selectedCategoryTab === 'all'
                        ? 'bg-indigo-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {activeStores.length}
                  </span>
                </button>

                {Array.from(new Set(activeStores.map((s) => normalizeCategory(s.category, s.name)))).map((catKey) => {
                  const meta = getCategoryDisplay(catKey);
                  const count = activeStores.filter(
                    (s) => normalizeCategory(s.category, s.name) === catKey
                  ).length;
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => setSelectedCategoryTab(catKey)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                        selectedCategoryTab === catKey
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-500/20'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <span>{meta.icon}</span>
                      <span>{meta.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          selectedCategoryTab === catKey
                            ? 'bg-indigo-700 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Categorized Store Sections */}
              <div className="space-y-6">
                {(selectedCategoryTab === 'all'
                  ? Array.from(new Set(activeStores.map((s) => normalizeCategory(s.category, s.name))))
                  : [selectedCategoryTab]
                ).map((catKey) => {
                  const meta = getCategoryDisplay(catKey);
                  const categoryStores = activeStores.filter(
                    (s) => normalizeCategory(s.category, s.name) === catKey
                  );

                  if (categoryStores.length === 0) return null;

                  return (
                    <div
                      key={catKey}
                      className="space-y-3 bg-slate-900/50 border border-slate-800/90 rounded-2xl p-4 sm:p-5"
                    >
                      {/* Category Section Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800/70">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl p-2 bg-slate-800/80 border border-slate-700/60 rounded-xl leading-none">
                            {meta.icon}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                              <span>{meta.label}</span>
                            </h4>
                            <span className="text-[11px] text-slate-400">
                              {categoryStores.length}{' '}
                              {categoryStores.length === 1 ? 'store account' : 'store accounts'} registered in this category
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {catKey}
                        </span>
                      </div>

                      {/* Store Cards in this Category */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                        {categoryStores.map((store, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-xl bg-slate-950/90 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col justify-between gap-3 shadow-md group"
                          >
                            <div className="space-y-2">
                              {/* Top Bar: Store Name & Action Badges */}
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-bold text-white tracking-tight block truncate group-hover:text-indigo-300 transition-colors">
                                  {store.name}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    Active
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => openDeleteModal(store)}
                                    title="Delete store account"
                                    className="inline-flex items-center gap-1 text-[9px] font-semibold text-rose-400 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/25 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>

                              {/* Real-Time Synced ID & Current Password Box */}
                              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-2 text-xs">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-400 flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-slate-500" />
                                    <span>Client ID:</span>
                                  </span>
                                  <span className="text-white font-mono font-medium truncate max-w-[135px]" title={store.email}>
                                    {store.email}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-400 flex items-center gap-1">
                                    <Lock className="w-3 h-3 text-slate-500" />
                                    <span>Password:</span>
                                  </span>
                                  <div className="flex items-center gap-1.5 font-mono">
                                    <span className="text-emerald-400 font-bold tracking-wider">
                                      {visiblePasswords[store.email] ? store.password || '••••••••' : '••••••••'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setVisiblePasswords((prev) => ({
                                          ...prev,
                                          [store.email]: !prev[store.email],
                                        }))
                                      }
                                      className="text-slate-500 hover:text-slate-300 p-0.5 transition-colors cursor-pointer"
                                      title={visiblePasswords[store.email] ? 'Hide password' : 'Show current password'}
                                    >
                                      {visiblePasswords[store.email] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                    </button>
                                  </div>
                                </div>

                                {/* Store PVC Card (NFC & QR) Review URL Preview */}
                                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-amber-300 font-semibold flex items-center gap-1">
                                      <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                                      <span>PVC Card Review URL:</span>
                                    </span>
                                    <Link
                                      href={`/r/${store.slug}`}
                                      target="_blank"
                                      className="text-[10px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                                      title="Open review page in new tab"
                                    >
                                      <span>Test Flow</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </Link>
                                  </div>
                                  <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 rounded-lg px-2.5 py-1.5">
                                    <span className="text-[10.5px] font-mono text-indigo-300 truncate select-all flex-1" title={origin ? `${origin}/r/${store.slug}` : `/r/${store.slug}`}>
                                      {origin ? `${origin}/r/${store.slug}` : `/r/${store.slug}`}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* The ONLY One Action Option: Copy PVC Card Link (NFC + QR) */}
                            <div className="pt-2.5 border-t border-slate-800/60">
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(
                                    origin ? `${origin}/r/${store.slug}` : `${window.location.origin}/r/${store.slug}`,
                                    `pvc-${store.slug}`
                                  )
                                }
                                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-indigo-600 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                                title="Copy Link for PVC Card NFC Tap & QR Code"
                              >
                                {copiedField === `pvc-${store.slug}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                                    <span className="text-emerald-200">PVC Card Link Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-amber-200" />
                                    <span>Copy PVC Card Link (NFC & QR)</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* 3-STEP RECONFIRMATION DELETE ACCOUNT MODAL                         */}
        {/* ----------------------------------------------------------------- */}
        {deleteModal.isOpen && deleteModal.store && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-scale-in">
              
              {/* STEP 1: Reconfirm Initial Question */}
              {deleteModal.step === 1 && (
                <div className="space-y-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      Delete Store Account?
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Do you really want to delete <strong className="text-white">{deleteModal.store.name}</strong>?
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-left text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Store Name:</span>
                      <span className="text-white font-bold">{deleteModal.store.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Client Email (ID):</span>
                      <span className="text-slate-300 font-mono">{deleteModal.store.email}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeDeleteModal}
                      className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                    >
                      No, Go Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteModal((prev) => ({ ...prev, step: 2 }))}
                      className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-lg shadow-rose-600/25 cursor-pointer"
                    >
                      Yes, Continue
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Current Password Verification (Entered 2 times) */}
              {deleteModal.step === 2 && (
                <form onSubmit={handleVerifyPasswordForDelete} className="space-y-4">
                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                      <KeyRound className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-black text-white">
                      Verify Current Password
                    </h3>
                    <p className="text-xs text-slate-400">
                      Enter current password of <strong className="text-white">{deleteModal.store.name}</strong> twice to verify authorization.
                    </p>
                  </div>

                  {deleteModal.errorMsg && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-medium">
                      {deleteModal.errorMsg}
                    </div>
                  )}

                  <div className="space-y-3 text-left">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-slate-300">
                          Enter Current Password <span className="text-rose-400">*</span>
                        </label>
                        <span className={`text-[11px] font-bold ${deleteModal.currentPassword1.length === 8 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {deleteModal.currentPassword1.length}/8
                        </span>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={deleteModal.showPwd1 ? 'text' : 'password'}
                          required
                          maxLength={8}
                          value={deleteModal.currentPassword1}
                          onChange={(e) => setDeleteModal((prev) => ({ ...prev, currentPassword1: e.target.value, errorMsg: '' }))}
                          placeholder="Strictly 8 chars (e.g. Gaur@270)"
                          className="w-full text-xs bg-slate-950/80 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono tracking-wider"
                        />
                        <button
                          type="button"
                          onClick={() => setDeleteModal((prev) => ({ ...prev, showPwd1: !prev.showPwd1 }))}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {deleteModal.showPwd1 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span
                          className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                            deleteModal.currentPassword1.length === 8
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {deleteModal.currentPassword1.length === 8 ? '✓ Exactly 8 Characters' : `${deleteModal.currentPassword1.length}/8 Characters`}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                            /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(deleteModal.currentPassword1)
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(deleteModal.currentPassword1)
                            ? '✓ 1 Symbol Included'
                            : '○ 1 Symbol Mandatory (@, #, $)'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-slate-300">
                          Re-enter Current Password <span className="text-rose-400">*</span>
                        </label>
                        <span className={`text-[11px] font-bold ${deleteModal.currentPassword2.length === 8 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {deleteModal.currentPassword2.length}/8
                        </span>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={deleteModal.showPwd2 ? 'text' : 'password'}
                          required
                          maxLength={8}
                          value={deleteModal.currentPassword2}
                          onChange={(e) => setDeleteModal((prev) => ({ ...prev, currentPassword2: e.target.value, errorMsg: '' }))}
                          placeholder="Repeat 8-digit password"
                          className="w-full text-xs bg-slate-950/80 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono tracking-wider"
                        />
                        <button
                          type="button"
                          onClick={() => setDeleteModal((prev) => ({ ...prev, showPwd2: !prev.showPwd2 }))}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {deleteModal.showPwd2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span
                          className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                            deleteModal.currentPassword2.length === 8
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {deleteModal.currentPassword2.length === 8 ? '✓ Exactly 8 Characters' : `${deleteModal.currentPassword2.length}/8 Characters`}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                            /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(deleteModal.currentPassword2)
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(deleteModal.currentPassword2)
                            ? '✓ 1 Symbol Included'
                            : '○ 1 Symbol Mandatory (@, #, $)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeDeleteModal}
                      className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                    >
                      No, Cancel
                    </button>
                    <button
                      type="submit"
                      className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-lg shadow-indigo-600/25 cursor-pointer"
                    >
                      Verify Passwords
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Final Reconfirmation */}
              {deleteModal.step === 3 && (
                <div className="space-y-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-rose-600/30 animate-pulse">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      Permanent Deletion Confirmation
                    </h3>
                    <p className="text-xs text-rose-300 mt-1 font-semibold">
                      Warning: This action is permanent and cannot be undone!
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                      All review data, private complaints, QR standees, and database credentials for <strong className="text-white">{deleteModal.store.name}</strong> will be permanently erased.
                    </p>
                  </div>

                  {deleteModal.errorMsg && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-medium">
                      {deleteModal.errorMsg}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      disabled={deleteModal.isDeleting}
                      onClick={closeDeleteModal}
                      className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      No, Keep Account
                    </button>
                    <button
                      type="button"
                      disabled={deleteModal.isDeleting}
                      onClick={handleFinalDeleteConfirm}
                      className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {deleteModal.isDeleting ? (
                        <span>Deleting Data...</span>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Yes, Delete Permanently</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Permanent Deletion Success Screen */}
              {deleteModal.step === 4 && (
                <div className="space-y-4 text-center py-2 animate-fade-in">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-emerald-400 tracking-tight">
                      Permanently Deleted!
                    </h3>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      Store account <strong className="text-white">"{deleteModal.deletedStoreName}"</strong> and all associated database records, QR standees, review flows, and credentials have been permanently removed.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={closeDeleteModal}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-md cursor-pointer"
                    >
                      Done / Close
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </main>

      {/* Footer with Official Contact & Social Media Badges */}
      <footer className="border-t border-slate-800/80 py-6 px-4 max-w-5xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <img src="/reviewxpress-icon.png" alt="ReviewXpress" className="w-4 h-4 object-contain" />
          <span className="font-semibold text-slate-400">ReviewXpress — Store Onboarding Portal</span>
        </div>
        <SocialContactBar showLabels={false} />
      </footer>
    </div>
  );
}
