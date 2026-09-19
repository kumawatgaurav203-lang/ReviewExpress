'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected runtime error to console for monitoring
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center animate-fade-in">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">
          Something went wrong!
        </h2>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          An unexpected error occurred while loading this page. Don't worry, your data is safe.
        </p>

        {process.env.NODE_ENV === 'development' && error?.message && (
          <div className="bg-slate-100 p-3 rounded-lg text-left text-xs font-mono text-red-600 mb-6 overflow-x-auto max-h-32">
            {error.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-5 rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-5 rounded-xl transition-all active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
