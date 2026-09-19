'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { BarChart3, RefreshCw, LogIn } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-white">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-indigo-500/20">
          <BarChart3 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">
          Dashboard Connection Notice
        </h2>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          We encountered a temporary issue syncing dashboard metrics. Please reload or re-authenticate.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-5 rounded-xl transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Reload
          </button>
          <Link
            href="/dashboard/login"
            className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 px-5 rounded-xl transition-all"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
