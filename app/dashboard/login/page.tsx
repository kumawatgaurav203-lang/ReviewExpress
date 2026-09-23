'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowLeft,
  Store,
  Scale,
} from 'lucide-react';
import TermsModal from '@/components/TermsModal';
import HumanVerification from '@/components/HumanVerification';

export default function OwnerLoginPage() {
  const router = useRouter();

  // Mode: 'login' | 'forgot_password'
  const [viewMode, setViewMode] = useState<'login' | 'forgot_password'>('login');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Human Verification State
  const [isHumanVerified, setIsHumanVerified] = useState(false);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Forgot Password States
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotOtpCountdown, setForgotOtpCountdown] = useState<number>(0);

  // 10-minute countdown for Forgot Password OTP
  useEffect(() => {
    if (forgotOtpCountdown <= 0) return;
    const timer = setInterval(() => {
      setForgotOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotOtpCountdown]);

  // Validate password (strictly 8 characters)
  const validate8CharPassword = (pwd: string): boolean => {
    return pwd.length === 8;
  };

  // Handle Login submission with real backend authentication
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (password.length !== 8) {
      setErrorMsg('Password must be strictly 8 characters (currently: ' + password.length + '/8 characters).');
      return;
    }

    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
    if (!hasSymbol) {
      setErrorMsg('Password must contain at least 1 special symbol (@, #, $).');
      return;
    }

    if (!isHumanVerified) {
      setErrorMsg('Please tap "I am not a robot" security check before signing in.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/login-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.message || 'Invalid email or password.');
        setIsLoading(false);
        return;
      }

      const sessionData = {
        token: data.token,
        email: data.user.email,
        businessName: data.user.businessName,
        businessSlug: data.user.businessSlug,
        authorizedBusinessIds: data.user.authorizedBusinessIds || [],
        isLoggedIn: true,
        loginTime: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('reviewxpress_owner_session', JSON.stringify(sessionData));
      }

      setIsLoading(false);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(err.name === 'TimeoutError' ? 'Connection timed out. Please try again.' : 'Network error. Please try again.');
      setIsLoading(false);
    }
  };

  // Resend OTP for Forgot Password with 30s cooldown & fresh 10-min validity
  const handleResendForgotOtp = async () => {
    if (!email.trim() || isLoading || forgotOtpCountdown > 570) return;
    setIsLoading(true);
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
        setForgotOtpCountdown(600);
        setForgotOtp('');
        setErrorMsg('');
      }
    } catch {
      setErrorMsg('Network error while resending verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Forgot Password submission
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setResetSuccessMsg('');

    if (forgotStep === 1) {
      if (!email.trim() || !email.includes('@')) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }
      setIsLoading(true);
      try {
        // Check if email exists
        const checkRes = await fetch('/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({ action: 'send_otp', email: email.trim() }),
        });
        const checkData = await checkRes.json();
        
        if (!checkData.success) {
          setErrorMsg(checkData.message || 'Email not found.');
          setIsLoading(false);
          return;
        }

        // Send OTP with generous timeout
        const otpRes = await fetch('/api/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(25000),
          body: JSON.stringify({ email: email.trim() }),
        });
        const otpData = await otpRes.json();
        
        if (!otpData.success) {
          setErrorMsg(otpData.message || 'Failed to send OTP.');
          setIsLoading(false);
          return;
        }

        setForgotStep(2);
        setForgotOtpCountdown(600); // Strictly 10 minutes
        setIsLoading(false);
      } catch (err: any) {
        setErrorMsg(err.name === 'TimeoutError' ? 'OTP delivery timed out. Please try again.' : 'Network error. Please try again.');
        setIsLoading(false);
      }
    } else if (forgotStep === 2) {
      if (!forgotOtp.trim()) {
        setErrorMsg('Please enter the 6-digit OTP received in your email.');
        return;
      }
      setIsLoading(true);
      try {
        const verifyRes = await fetch('/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(12000),
          body: JSON.stringify({
            action: 'verify_otp',
            email: email.trim(),
            otp: forgotOtp.trim(),
          }),
        });
        const verifyData = await verifyRes.json();
        setIsLoading(false);
        if (!verifyData.success) {
          setErrorMsg(verifyData.message || 'Invalid OTP. Please enter the 6-digit code received in your email.');
          return;
        }
        setErrorMsg('');
        setForgotStep(3);
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg('Network error while verifying code. Please try again.');
      }
    } else if (forgotStep === 3) {
      if (newPassword.length !== 8) {
        setErrorMsg('New password must be strictly 8 characters (currently: ' + newPassword.length + '/8 characters).');
        return;
      }
      const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword);
      if (!hasSymbol) {
        setErrorMsg('New password must contain at least 1 special symbol (@, #, $, %, !, *).');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch('/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            action: 'verify_and_reset',
            email: email.trim(),
            otp: forgotOtp.trim(),
            newPassword: newPassword
          }),
        });
        const data = await res.json();
        setIsLoading(false);

        if (!data.success) {
          setErrorMsg(data.message || 'Failed to reset password.');
          if (data?.message?.includes('OTP')) {
            setForgotStep(2); // Go back to OTP step if OTP was wrong
          }
          return;
        }

        setResetSuccessMsg('Password reset successfully! You can now log in.');
        setTimeout(() => {
          setViewMode('login');
          setForgotStep(1);
          setForgotOtp('');
          setNewPassword('');
          setConfirmNewPassword('');
          setResetSuccessMsg('');
        }, 3000);
      } catch (err: any) {
        setErrorMsg(err.name === 'TimeoutError' ? 'Request timed out.' : 'Network error.');
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4 py-8 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Back Link to Home */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
          <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
            Store Owner Portal
          </span>
        </div>

        {/* Card Container */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Brand Logo & Title */}
          <div className="text-center mb-6">
            <div className="inline-flex p-2.5 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 mb-3 shadow-inner">
              <img src="/reviewxpress-icon.png" alt="ReviewXpress" className="w-8 h-8 object-contain" />
            </div>

            {viewMode === 'login' && (
              <>
                <h1 className="text-2xl font-black tracking-tight text-white">Login</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Sign in with your registered email and 8-character password
                </p>
              </>
            )}

            {viewMode === 'forgot_password' && (
              <>
                <h1 className="text-2xl font-black tracking-tight text-white">Reset Password</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your registered email address to receive a secure reset link
                </p>
              </>
            )}
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {resetSuccessMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Link Sent!</span>
              </div>
              <p>{resetSuccessMsg}</p>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* LOGIN FORM                                                      */}
          {/* --------------------------------------------------------------- */}
          {viewMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Registered Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Registered email used during signup"
                    className="w-full text-sm bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Password <span className="text-[10px] text-amber-400 font-semibold">(Strictly 8 Digits Fix + 1 Symbol)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold ${password.length === 8 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {password.length}/8
                    </span>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('forgot_password');
                        setErrorMsg('');
                        setResetSuccessMsg('');
                      }}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
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
                    className="w-full text-sm bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
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

              {/* Human Verification Security Check */}
              <div className="pt-1">
                <HumanVerification
                  theme="dark"
                  label="I am not a robot"
                  onVerified={() => {
                    setIsHumanVerified(true);
                    setErrorMsg('');
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* --------------------------------------------------------------- */}
          {/* FORGOT PASSWORD FORM                                            */}
          {/* --------------------------------------------------------------- */}
          {viewMode === 'forgot_password' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              {forgotStep === 1 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Enter Your Registered Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@store.com"
                      className="w-full text-sm bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {forgotStep === 2 && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Enter OTP sent to {email}
                  </label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-indigo-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="6-digit OTP"
                      className="w-full text-sm bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono tracking-widest text-center text-lg font-bold"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-400">
                      {forgotOtpCountdown > 0 ? (
                        <span>Valid: <strong className="text-indigo-400 font-mono">{Math.floor(forgotOtpCountdown / 60)}:{String(forgotOtpCountdown % 60).padStart(2, '0')}</strong></span>
                      ) : (
                        <span className="text-rose-400 font-bold">OTP Expired! Click Resend.</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={handleResendForgotOtp}
                      disabled={isLoading || forgotOtpCountdown > 570}
                      className="text-indigo-400 hover:text-indigo-300 disabled:opacity-40 transition-colors font-semibold cursor-pointer"
                    >
                      Resend Code {forgotOtpCountdown > 570 ? `(${forgotOtpCountdown - 570}s)` : ''}
                    </button>
                  </div>
                </div>
              )}

              {forgotStep === 3 && (
                <div className="space-y-4">
                  {/* Field 1: New Password */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        New Password <span className="text-[10px] text-amber-400 font-semibold">(Strictly 8 Digits Fix + 1 Symbol)</span>
                      </label>
                      <span className={`text-[11px] font-bold ${newPassword.length === 8 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {newPassword.length}/8
                      </span>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        maxLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Strictly 8 chars (e.g. Gaur@270)"
                        className="w-full text-sm bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span
                        className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                          newPassword.length === 8
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {newPassword.length === 8 ? '✓ Exactly 8 Characters' : `${newPassword.length}/8 Characters`}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                          /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword)
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword)
                          ? '✓ 1 Symbol Included'
                          : '○ 1 Symbol Mandatory (@, #, $)'}
                      </span>
                    </div>
                  </div>

                  {/* Field 2: Confirm New Password */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Confirm New Password <span className="text-[10px] text-amber-400 font-semibold">(Repeat 8-digit password)</span>
                      </label>
                      <span className={`text-[11px] font-bold ${confirmNewPassword.length === 8 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {confirmNewPassword.length}/8
                      </span>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        maxLength={8}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Repeat 8-digit password"
                        className="w-full text-sm bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span
                        className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                          confirmNewPassword.length === 8
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {confirmNewPassword.length === 8 ? '✓ Exactly 8 Characters' : `${confirmNewPassword.length}/8 Characters`}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                          /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(confirmNewPassword)
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(confirmNewPassword)
                          ? '✓ 1 Symbol Included'
                          : '○ 1 Symbol Mandatory (@, #, $)'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Processing...</span>
                ) : (
                  <span>
                    {forgotStep === 1 ? 'Send OTP' : forgotStep === 2 ? 'Verify OTP' : 'Reset Password'}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode('login');
                  setErrorMsg('');
                  setResetSuccessMsg('');
                  setForgotStep(1);
                  setForgotOtp('');
                }}
                className="w-full text-center text-xs text-slate-400 hover:text-white pt-2 cursor-pointer transition-colors"
              >
                Return to Login
              </button>
            </form>
          )}

          {/* Security & Access footer notice */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>ReviewXpress Authorized Store Portal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reusable Terms & Conditions Modal */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </div>
  );
}
