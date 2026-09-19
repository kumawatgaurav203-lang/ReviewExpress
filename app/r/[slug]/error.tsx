'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Star, RefreshCw } from 'lucide-react';

export default function ReviewFlowError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Review flow error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50/30 flex items-center justify-center p-4 font-sans">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center animate-fade-in">
        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
          <Star className="w-8 h-8 fill-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          Unable to Load Review Portal
        </h2>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          There was a momentary hiccup connecting to the review portal. Please tap try again to reload.
        </p>
        <button
          onClick={() => reset()}
          className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold py-3.5 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] mb-3"
        >
          <RefreshCw className="w-4 h-4" />
          Reload Portal
        </button>
        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Powered by ReviewXpress
        </Link>
      </div>
    </div>
  );
}
