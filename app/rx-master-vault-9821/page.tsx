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
  Clock,
} from 'lucide-react';
import QRCode from 'qrcode';
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

  // Master Admin Two-Way Verification (2FA) State
  const [isMasterVerified, setIsMasterVerified] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [masterKeyInput, setMasterKeyInput] = useState('');
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [maskedAdminEmail, setMaskedAdminEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Change Master Key Modal State
  const [isChangeKeyModalOpen, setIsChangeKeyModalOpen] = useState(false);
  const [currentKeyInput, setCurrentKeyInput] = useState('');
  const [newKeyInput, setNewKeyInput] = useState('');
  const [confirmKeyInput, setConfirmKeyInput] = useState('');
  const [showKeyField1, setShowKeyField1] = useState(false);
  const [showKeyField2, setShowKeyField2] = useState(false);
  const [showKeyField3, setShowKeyField3] = useState(false);
  const [changeKeyError, setChangeKeyError] = useState('');
  const [changeKeySuccess, setChangeKeySuccess] = useState('');
  const [isUpdatingKey, setIsUpdatingKey] = useState(false);

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

  // 10-minute countdown for 2FA OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // 10-minute countdown for Store Onboarding OTP
  const [storeOtpCountdown, setStoreOtpCountdown] = useState<number>(0);
  useEffect(() => {
    if (storeOtpCountdown <= 0) return;
    const timer = setInterval(() => {
      setStoreOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [storeOtpCountdown]);

  // Master Admin Auto-Lock Timer (20 minutes = 1200 seconds)
  const [sessionRemaining, setSessionRemaining] = useState<number>(20 * 60);

  // Check existing 2FA session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/admin-auth', { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        if (data?.success && data?.verified) {
          // Check if session start time in sessionStorage has exceeded 20 minutes
          const storedStart = typeof window !== 'undefined' ? sessionStorage.getItem('rx_admin_session_start') : null;
          if (storedStart) {
            const elapsed = Math.floor((Date.now() - parseInt(storedStart, 10)) / 1000);
            if (elapsed >= 20 * 60) {
              // 20 minutes expired! Force lock
              await fetch('/api/admin-auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'lock' }),
              });
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('rx_admin_session_start');
              }
              setIsMasterVerified(false);
              return;
            } else {
              setSessionRemaining(Math.max(0, 20 * 60 - elapsed));
            }
          }
          setIsMasterVerified(true);
        } else {
          setIsMasterVerified(false);
        }
        if (data?.maskedEmail) {
          setMaskedAdminEmail(data.maskedEmail);
        }
      } catch {
        setIsMasterVerified(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkSession();
  }, []);

  // 20-minute Active auto-lock countdown timer
  useEffect(() => {
    if (!isMasterVerified) return;

    const timer = setInterval(() => {
      setSessionRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleLockPanel();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isMasterVerified]);


  const handleSend2FAOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');

    if (!masterKeyInput.trim()) {
      setAuthError('Please enter your Master Admin Key.');
      return;
    }

    setIsSubmittingAuth(true);
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({ action: 'send-otp', masterKey: masterKeyInput.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setAuthError(data.message || 'Failed to verify Master Key.');
        return;
      }

      setOtpSent(true);
      setCountdown(600); // Strictly 10 minutes
      if (data.maskedEmail) setMaskedAdminEmail(data.maskedEmail);
      setAuthSuccessMsg(data.message || 'Security OTP sent to your verified admin email.');
    } catch (err: any) {
      if (err?.name === 'TimeoutError') {
        setAuthError('Request timed out. Please try again.');
      } else {
        setAuthError('Network connection error while sending 2FA code.');
      }
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleVerify2FAOtp = async (e?: React.FormEvent, directOtp?: string) => {
    if (e) e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');

    const targetOtp = (directOtp !== undefined ? directOtp : otpInput).trim();
    if (!targetOtp || targetOtp.length < 6) {
      setAuthError('Please enter the 6-digit security OTP code.');
      return;
    }

    setIsSubmittingAuth(true);
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          action: 'verify-otp',
          masterKey: masterKeyInput.trim(),
          otp: targetOtp,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setAuthError(data.message || 'Invalid or expired OTP code.');
        return;
      }

      setIsMasterVerified(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('rx_admin_session_start', Date.now().toString());
      }
      setSessionRemaining(20 * 60);
      setOtpSent(false);
      setOtpInput('');
      setAuthSuccessMsg('');
    } catch (err: any) {
      if (err?.name === 'TimeoutError') {
        setAuthError('Verification timed out. Please try again.');
      } else {
        setAuthError('Network error during 2-way verification.');
      }
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleLockPanel = async () => {
    try {
      await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lock' }),
      });
    } catch {}
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('rx_admin_session_start');
    }
    setIsMasterVerified(false);
    setOtpSent(false);
    setOtpInput('');
    setMasterKeyInput('');
    setActiveStores([]);
  };


  const handleChangeMasterKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeKeyError('');
    setChangeKeySuccess('');

    if (!currentKeyInput.trim()) {
      setChangeKeyError('Please enter your current Master Admin Key.');
      return;
    }

    if (newKeyInput.length < 8) {
      setChangeKeyError('New Master Key must be at least 8 characters long.');
      return;
    }

    if (newKeyInput !== confirmKeyInput) {
      setChangeKeyError('New Master Key and Confirmation do not match.');
      return;
    }

    setIsUpdatingKey(true);
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          action: 'change-key',
          currentKey: currentKeyInput.trim(),
          newKey: newKeyInput.trim(),
          confirmKey: confirmKeyInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setChangeKeyError(data.message || 'Failed to update Master Key.');
        return;
      }

      setChangeKeySuccess('Master Admin Secret Key updated successfully! Your new key is now active.');
      setCurrentKeyInput('');
      setNewKeyInput('');
      setConfirmKeyInput('');
      setTimeout(() => {
        setIsChangeKeyModalOpen(false);
        setChangeKeySuccess('');
      }, 2500);
    } catch (err: any) {
      if (err?.name === 'TimeoutError') {
        setChangeKeyError('Request timed out while updating Master Key.');
      } else {
        setChangeKeyError('Network error while updating Master Key.');
      }
    } finally {
      setIsUpdatingKey(false);
    }
  };

  // Fetch real registered stores on mount & poll every 60s (only when 2FA verified)
  useEffect(() => {
    if (!isMasterVerified) return;

    const loadStores = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetch(`/api/register-owner?t=${Date.now()}`, { signal: AbortSignal.timeout(7000) })
        .then((res) => {
          if (res.status === 401) {
            setIsMasterVerified(false);
            return null;
          }
          return res.json();
        })
        .then((data) => {
          if (data?.success && Array.isArray(data.stores)) {
            setActiveStores(data.stores);
          }
        })
        .catch(() => {});
    };

    loadStores();
    const interval = setInterval(loadStores, 60000); // 60s gentle sync to reduce server load
    return () => clearInterval(interval);
  }, [isMasterVerified]);

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

  // Resend OTP for Store Onboarding with 30s cooldown & fresh 10-min validity
  const handleResendStoreOtp = async () => {
    if (!email.trim() || isSendingOtp || storeOtpCountdown > 570) return;
    setIsSendingOtp(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({ email: email.trim(), resend: true }),
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.message || 'Failed to resend OTP.');
      } else {
        setStoreOtpCountdown(600);
        setOtp('');
      }
    } catch {
      setErrorMsg('Network error while resending verification code.');
    } finally {
      setIsSendingOtp(false);
    }
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
      setIsSendingOtp(true);
      try {
        const res = await fetch('/api/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(25000),
          body: JSON.stringify({ email: email.trim() }),
        });
        const data = await res.json();
        setIsSendingOtp(false);

        if (!data.success) {
          setErrorMsg(data.message || 'Failed to send OTP.');
          return;
        }

        setOtp('');
        setShowOtpField(true);
        setStoreOtpCountdown(600); // Strictly 10 minutes
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

  const liveOrigin =
    origin ||
    (typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://reviewxpress.in');

  const getHandoverMessage = () => {
    if (!createdBusiness) return '';
    const host = liveOrigin;
    const qrLink = `${host}/r/${createdBusiness.slug}?source=qr`;
    const nfcLink = `${host}/r/${createdBusiness.slug}?source=nfc`;
    const loginLink = `${host}/dashboard/login`;
    return (
      `⭐ *ReviewXpress Store Setup Complete!*\n\n` +
      `🏪 *Store Name:* ${createdBusiness.name}\n\n` +
      `📱 *NFC Tag Link (Write to NFC Chip / Card):*\n${nfcLink}\n\n` +
      `📷 *QR Review Link (Standee Print):*\n${qrLink}\n\n` +
      `🔐 *Store Owner Dashboard Login:*\n${loginLink}\n` +
      `📧 *Client ID / Email:* ${createdBusiness.ownerEmail}\n` +
      `🔑 *Password:* ${createdBusiness.ownerPassword}\n\n` +
      `⚡ *ReviewXpress Smart NFC & QR Review System*`
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar - Mobile Responsive Without Overlap */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-2 select-none cursor-default">
              <img
                src="/reviewxpress-icon.png"
                alt="ReviewXpress"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
              />
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                Review<span className="text-indigo-400">Xpress</span>
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">
              <span className="sm:hidden">Admin</span>
              <span className="hidden sm:inline">Agency Master Admin</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="text-[11px] sm:text-xs text-slate-400 font-medium hidden lg:inline">
              Client Account Creation Portal
            </span>
            {isMasterVerified && (
              <>
                <div 
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-semibold border ${
                    sessionRemaining < 120 
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 animate-pulse' 
                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  }`}
                  title="Session locks automatically when timer expires"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Auto-Lock: {Math.floor(sessionRemaining / 60)}:{String(sessionRemaining % 60).padStart(2, '0')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangeKeyModalOpen(true);
                    setChangeKeyError('');
                    setChangeKeySuccess('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
                  title="Change Master Admin Secret Key"
                >
                  <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Change Key</span>
                  <span className="sm:hidden">Key</span>
                </button>
                <button
                  type="button"
                  onClick={handleLockPanel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/25 text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
                  title="Lock Master Admin Panel Immediately"
                >
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  <span>Lock Panel</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {isCheckingAuth ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-indigo-400 animate-pulse" />
              </div>
              <div className="absolute -inset-1 rounded-2xl bg-indigo-500/20 blur-md -z-10" />
            </div>
            <p className="text-xs text-slate-400 font-medium flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>Verifying Two-Way Security Handshake...</span>
            </p>
          </div>
        ) : !isMasterVerified ? (
          /* ================================================================= */
          /* ULTRA-STRONG TWO-WAY VERIFICATION (2FA) SECURITY SHIELD           */
          /* ================================================================= */
          <div className="max-w-md mx-auto my-4 sm:my-8 space-y-6 animate-fade-in">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-6">
              {/* Subtle Ambient Glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

              {/* Shield Header */}
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400 mb-1 shadow-inner">
                  <ShieldCheck className="w-8 h-8 text-indigo-400" />
                </div>
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider">
                    Two-Way Verification (2FA) Required
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Agency Master Admin
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Strictly restricted access. Enter your secret Master Admin Key and verify the 6-digit one-time code sent to your registered email.
                </p>
              </div>

              {/* Security Errors / Success Notifications */}
              {authError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{authError}</span>
                </div>
              )}

              {authSuccessMsg && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{authSuccessMsg}</span>
                </div>
              )}

              {/* Form Step: Master Key & OTP */}
              {!otpSent ? (
                /* ---------------- STEP 1: ENTER MASTER KEY ---------------- */
                <form onSubmit={handleSend2FAOtp} className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Master Admin Secret Key</span>
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type={showMasterKey ? 'text' : 'password'}
                        value={masterKeyInput}
                        onChange={(e) => setMasterKeyInput(e.target.value)}
                        placeholder="Enter Master Admin Secret Key"
                        required
                        disabled={isSubmittingAuth}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowMasterKey(!showMasterKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
                        title={showMasterKey ? 'Hide key' : 'Show key'}
                      >
                        {showMasterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingAuth || !masterKeyInput.trim()}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white font-bold text-xs tracking-wide shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    {isSubmittingAuth ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Key & Dispatching 2FA Code...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-indigo-300" />
                        <span>Verify Key & Send 2-Way OTP</span>
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-300" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* ---------------- STEP 2: ENTER EMAIL OTP ---------------- */
                <form onSubmit={(e) => handleVerify2FAOtp(e)} className="space-y-4">
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2">
                    <Mail className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">Verification Code Dispatched</p>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Sent to: <strong className="text-indigo-300 font-mono">{maskedAdminEmail || 'Admin Email'}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>6-Digit Security OTP</span>
                      </label>
                      <span className="text-[11px] font-mono font-bold text-amber-300">
                        {countdown > 0
                          ? `⏱️ ${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}`
                          : '⚠️ Code Expired'}
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setOtpInput(val);
                        if (val.length === 6 && !isSubmittingAuth) {
                          handleVerify2FAOtp(undefined, val);
                        }
                      }}
                      placeholder="••••••"
                      autoFocus
                      required
                      disabled={isSubmittingAuth}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3.5 text-center text-2xl font-mono font-black tracking-[12px] text-indigo-400 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all select-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingAuth || otpInput.trim().length !== 6 || countdown <= 0}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-indigo-600 to-indigo-700 hover:from-emerald-500 hover:to-indigo-600 disabled:opacity-50 text-white font-bold text-xs tracking-wide shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    {isSubmittingAuth ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Validating Handshake...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-300" />
                        <span>Confirm & Unlock Agency Master Panel</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpInput('');
                        setAuthError('');
                        setAuthSuccessMsg('');
                      }}
                      className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      ← Re-enter Master Key
                    </button>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-400">
                        {countdown > 0 ? (
                          <span>Valid: <strong className="text-indigo-400 font-mono">{Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</strong></span>
                        ) : (
                          <span className="text-rose-400 font-bold">Expired</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSend2FAOtp()}
                        disabled={isSubmittingAuth || countdown > 570}
                        className="text-indigo-400 hover:text-indigo-300 disabled:opacity-40 transition-colors font-semibold cursor-pointer"
                      >
                        Resend Code {countdown > 570 ? `(${countdown - 570}s)` : ''}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Zero-Storage Protocol Security Notice */}
              <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-start gap-2 text-left">
                <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Zero-Storage Security Protocol:</strong> Authentication operates purely via stateless HMAC-SHA256 signatures with 0 database storage and near-zero server memory footprint. 5 failed attempts will initiate an automatic 15-minute security lockout.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
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
                <div className="mt-6 p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/40 shadow-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-200">
                      Enter 6-Digit OTP sent to {email} <span className="text-rose-400">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-indigo-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit verification code"
                      className="w-full text-sm bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono tracking-wider font-bold text-center tracking-widest text-lg"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-800/80">
                    <span className="text-slate-400">
                      {storeOtpCountdown > 0 ? (
                        <span>Valid: <strong className="text-indigo-400 font-mono">{Math.floor(storeOtpCountdown / 60)}:{String(storeOtpCountdown % 60).padStart(2, '0')}</strong></span>
                      ) : (
                        <span className="text-rose-400 font-bold">OTP Expired! Click Resend Code.</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={handleResendStoreOtp}
                      disabled={isSendingOtp || storeOtpCountdown > 570}
                      className="text-indigo-400 hover:text-indigo-300 disabled:opacity-40 transition-colors font-semibold cursor-pointer"
                    >
                      Resend Code {storeOtpCountdown > 570 ? `(${storeOtpCountdown - 570}s)` : ''}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    📧 Please check your client's email inbox for the 6-digit verification code from <span className="text-indigo-400 font-medium">noreply@reviewxpress.in</span>.
                  </p>
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

                {/* NFC & QR Details & Copy Actions */}
                <div className="md:col-span-8 space-y-4">
                  {/* BOX 1: Permanent QR Code URL */}
                  <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-indigo-400" />
                        <span>Permanent QR Review URL (Standee Print)</span>
                      </label>
                      <a
                        href={`${liveOrigin}/r/${createdBusiness.slug}?source=qr`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-indigo-400 hover:text-indigo-200 font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span>Test QR Flow</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono text-indigo-300 break-all select-all">
                        {`${liveOrigin}/r/${createdBusiness.slug}?source=qr`}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            `${liveOrigin}/r/${createdBusiness.slug}?source=qr`,
                            'qr-permanent'
                          )
                        }
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shrink-0 cursor-pointer"
                      >
                        {copiedField === 'qr-permanent' ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-300" />
                            <span className="text-emerald-300">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy QR Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* BOX 2: Permanent NFC Review URL */}
                  <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-amber-400" />
                        <span>Permanent NFC Tag URL (Write to NFC Chip)</span>
                      </label>
                      <a
                        href={`${liveOrigin}/r/${createdBusiness.slug}?source=nfc`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-amber-400 hover:text-amber-200 font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span>Test NFC Flow</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono text-amber-300 break-all select-all">
                        {`${liveOrigin}/r/${createdBusiness.slug}?source=nfc`}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            `${liveOrigin}/r/${createdBusiness.slug}?source=nfc`,
                            'nfc-permanent'
                          )
                        }
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-slate-950 text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md shrink-0 cursor-pointer"
                      >
                        {copiedField === 'nfc-permanent' ? (
                          <>
                            <Check className="w-4 h-4 text-slate-950" />
                            <span className="text-slate-950">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-slate-950" />
                            <span>Copy NFC Link</span>
                          </>
                        )}
                      </button>
                    </div>
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

              {/* Horizontal Grid of All Filtered Stores */}
              {(() => {
                const displayedStores =
                  selectedCategoryTab === 'all'
                    ? activeStores
                    : activeStores.filter(
                        (s) => normalizeCategory(s.category, s.name) === selectedCategoryTab
                      );

                if (displayedStores.length === 0) {
                  return (
                    <div className="p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-1">
                      <p className="text-xs text-slate-400 font-medium">
                        No store accounts found in this category.
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedCategoryTab('all')}
                        className="text-[11px] text-indigo-400 hover:underline cursor-pointer"
                      >
                        View all registered stores
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedStores.map((store, idx) => {
                      const catKey = normalizeCategory(store.category, store.name);
                      const meta = getCategoryDisplay(catKey);

                      return (
                        <div
                          key={store.email || store.slug || idx}
                          className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col justify-between gap-3 shadow-lg group"
                        >
                          <div className="space-y-3">
                            {/* Top Bar: Store Name, Category Pill, Active & Delete */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h4
                                  className="text-sm font-bold text-white tracking-tight truncate group-hover:text-indigo-300 transition-colors"
                                  title={store.name}
                                >
                                  {store.name}
                                </h4>
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 mt-0.5">
                                  <span>{meta.icon}</span>
                                  <span className="truncate max-w-[140px]">{meta.label}</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
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
                            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-400 flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-slate-500" />
                                  <span>Client ID:</span>
                                </span>
                                <span
                                  className="text-white font-mono font-medium truncate max-w-[140px]"
                                  title={store.email}
                                >
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

                              {/* Review URLs Preview */}
                              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                                {/* QR Review URL */}
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-indigo-300 font-semibold flex items-center gap-1">
                                    <QrCode className="w-3 h-3 text-indigo-400" />
                                    <span>QR Review URL:</span>
                                  </span>
                                  <Link
                                    href={`/r/${store.slug}?source=qr`}
                                    target="_blank"
                                    className="text-[10px] text-slate-400 hover:text-indigo-300 flex items-center gap-0.5 transition-colors"
                                    title="Test QR Flow"
                                  >
                                    <span>Test QR</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </Link>
                                </div>
                                <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-1 text-[10.5px] font-mono text-indigo-300 truncate select-all">
                                  {`${liveOrigin}/r/${store.slug}?source=qr`}
                                </div>

                                {/* NFC Tag URL */}
                                <div className="flex items-center justify-between text-[10px] pt-1">
                                  <span className="text-amber-300 font-semibold flex items-center gap-1">
                                    <Smartphone className="w-3 h-3 text-amber-400" />
                                    <span>NFC Tag URL:</span>
                                  </span>
                                  <Link
                                    href={`/r/${store.slug}?source=nfc`}
                                    target="_blank"
                                    className="text-[10px] text-slate-400 hover:text-amber-300 flex items-center gap-0.5 transition-colors"
                                    title="Test NFC Flow"
                                  >
                                    <span>Test NFC</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </Link>
                                </div>
                                <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-1 text-[10.5px] font-mono text-amber-300 truncate select-all">
                                  {`${liveOrigin}/r/${store.slug}?source=nfc`}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Dual Action Copy Buttons: QR & NFC */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60">
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(
                                  `${liveOrigin}/r/${store.slug}?source=qr`,
                                  `qr-${store.slug}`
                                )
                              }
                              className="py-2 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer shadow active:scale-[0.98]"
                              title="Copy Permanent QR URL"
                            >
                              {copiedField === `qr-${store.slug}` ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                                  <span className="text-emerald-300">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>Copy QR Link</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(
                                  `${liveOrigin}/r/${store.slug}?source=nfc`,
                                  `nfc-${store.slug}`
                                )
                              }
                              className="py-2 px-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer shadow active:scale-[0.98]"
                              title="Copy Permanent NFC Tag URL"
                            >
                              {copiedField === `nfc-${store.slug}` ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-slate-950" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Smartphone className="w-3.5 h-3.5" />
                                  <span>Copy NFC Link</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
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

        {/* ----------------------------------------------------------------- */}
        {/* CHANGE MASTER ADMIN SECRET KEY MODAL                               */}
        {/* ----------------------------------------------------------------- */}
        {isChangeKeyModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-scale-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Update Secret Master Key
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Change the 2FA secret key for Agency Master Admin
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChangeKeyModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {changeKeyError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{changeKeyError}</span>
                </div>
              )}

              {changeKeySuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{changeKeySuccess}</span>
                </div>
              )}

              <form onSubmit={handleChangeMasterKey} className="space-y-3.5 text-left text-xs">
                {/* Current Key */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Current Master Admin Key:</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showKeyField1 ? 'text' : 'password'}
                      value={currentKeyInput}
                      onChange={(e) => setCurrentKeyInput(e.target.value)}
                      placeholder="Enter existing master key"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeyField1(!showKeyField1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                    >
                      {showKeyField1 ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* New Key */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                    <span>New Master Admin Key (min. 8 chars):</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showKeyField2 ? 'text' : 'password'}
                      value={newKeyInput}
                      onChange={(e) => setNewKeyInput(e.target.value)}
                      placeholder="Enter new secret key"
                      required
                      minLength={8}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeyField2(!showKeyField2)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                    >
                      {showKeyField2 ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Key */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Confirm New Master Admin Key:</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showKeyField3 ? 'text' : 'password'}
                      value={confirmKeyInput}
                      onChange={(e) => setConfirmKeyInput(e.target.value)}
                      placeholder="Re-type new secret key"
                      required
                      minLength={8}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeyField3(!showKeyField3)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                    >
                      {showKeyField3 ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsChangeKeyModalOpen(false)}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingKey || !currentKeyInput || newKeyInput.length < 8}
                    className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isUpdatingKey ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Save New Key</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
          </>
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
