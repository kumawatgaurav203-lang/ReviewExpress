'use client';

import React from 'react';
import {
  ShieldAlert,
  Mail,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  Lock,
  ExternalLink,
} from 'lucide-react';

interface StoreSuspendedCardProps {
  storeName?: string;
  storeSlug?: string;
  reason?: string;
  note?: string;
  deactivatedAt?: string;
  onBackToLogin?: () => void;
  onRefresh?: () => void;
}

export default function StoreSuspendedCard({
  storeName = 'Store Account',
  storeSlug = '',
  reason = 'Subscription / Account Review',
  note,
  deactivatedAt,
  onBackToLogin,
  onRefresh,
}: StoreSuspendedCardProps) {
  const formattedDate = deactivatedAt
    ? new Date(deactivatedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const emailUrl = `mailto:reviewxpressindia@gmail.com?subject=${encodeURIComponent(
    `Reactivation Request - ${storeName} (${storeSlug || 'ID'})`
  )}&body=${encodeURIComponent(
    `Hello ReviewExpress Support Team,\n\nI would like to request reactivation for my store account:\n\n• Store Name: ${storeName}\n• Store ID: ${storeSlug || 'N/A'}\n• Hold Notice: ${reason}\n\nPlease help me reactivate my service.`
  )}`;

  return (
    <div className="w-full max-w-xl mx-auto p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-200">
      <div className="relative overflow-hidden rounded-3xl bg-[#0b0f19]/95 border border-rose-500/25 shadow-2xl backdrop-blur-2xl p-6 sm:p-8 text-white">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-40 bg-rose-500/15 blur-3xl pointer-events-none rounded-full" />

        {/* Top Warning Shield */}
        <div className="relative flex flex-col items-center text-center mb-6">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-950/80 to-rose-900/40 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.25)]">
              <ShieldAlert className="w-9 h-9" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-500 border-2 border-[#0b0f19] flex items-center justify-center">
              <Lock className="w-2.5 h-2.5 text-white" />
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-rose-500/10 text-rose-400 border border-rose-500/25 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            Account Deactivated
          </span>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            Store Access Temporarily Paused
          </h2>
          <p className="text-sm text-slate-300 max-w-md">
            This store account has been placed on hold by the system administrator.
          </p>
        </div>

        {/* Details Card */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 sm:p-5 mb-5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 text-sm">
            <span className="text-slate-400">Store Name</span>
            <span className="font-semibold text-white truncate max-w-[200px] text-right">{storeName}</span>
          </div>

          {storeSlug && (
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 text-sm">
              <span className="text-slate-400">Store ID / Slug</span>
              <code className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                {storeSlug}
              </code>
            </div>
          )}

          <div className="flex items-start justify-between pb-3 border-b border-slate-800/80 text-sm">
            <span className="text-slate-400 mt-0.5">Hold Reason</span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-950/60 text-rose-300 border border-rose-800/60 text-right max-w-[240px]">
              {reason}
            </span>
          </div>

          {note && (
            <div className="flex items-start justify-between pb-3 border-b border-slate-800/80 text-sm">
              <span className="text-slate-400 mt-0.5">Admin Note</span>
              <span className="text-xs text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800 max-w-[260px] text-right">
                {note}
              </span>
            </div>
          )}

          {formattedDate && (
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>Paused On</span>
              <span>{formattedDate}</span>
            </div>
          )}
        </div>

        {/* Safety & Data Preservation Guarantee */}
        <div className="rounded-2xl bg-emerald-950/30 border border-emerald-500/20 p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 p-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-emerald-300">
                Zero Data Loss Guaranteed
              </p>
              <p className="text-slate-300 leading-relaxed">
                All your customer reviews, shielded feedback, NFC tap metrics, QR codes, and custom highlights are 100% safely preserved in our encrypted database.
              </p>
              <p className="text-slate-400 leading-relaxed pt-1">
                Your existing physical NFC cards and QR codes remain permanently linked. Once reactivated by the administrator, your live counter resumes instantly.
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Button: Email Support */}
        <div className="mb-6 space-y-2">
          <a
            href={emailUrl}
            className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] transition shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <Mail className="w-4 h-4 text-indigo-200" />
            <span>Email Support to Reactivate</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
          <p className="text-[11px] text-center text-slate-400">
            Official Support:{' '}
            <a
              href={emailUrl}
              className="font-mono text-indigo-300 hover:underline"
            >
              reviewxpressindia@gmail.com
            </a>
          </p>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
          {onBackToLogin ? (
            <button
              type="button"
              onClick={onBackToLogin}
              className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </button>
          ) : (
            <span />
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Check Status</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
