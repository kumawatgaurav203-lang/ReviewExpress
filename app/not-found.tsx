'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Home, Sparkles } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-4 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full text-center space-y-6 relative z-10">
        {/* Brand Icon */}
        <div className="inline-flex p-3 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 shadow-inner">
          <img src="/reviewxpress-icon.png" alt="ReviewXpress" className="w-10 h-10 object-contain" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Page Not Found • 404</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Store Or Page Not Found
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
            The review link or dashboard page you are looking for might have moved, been deleted, or the store slug is incorrect.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Go to Home</span>
          </Link>
          <Link
            href="/create-account"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Store Onboarding</span>
          </Link>
        </div>

        <p className="text-[11px] text-slate-500 pt-4">
          Need assistance? Contact support at <a href="mailto:reviewxpressindia@gmail.com" className="text-indigo-400 underline">reviewxpressindia@gmail.com</a>
        </p>
      </div>
    </div>
  );
}
