'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ fallback = '/dashboard' }: { fallback?: string }) {
  const handleBack = () => {
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = fallback;
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer py-1.5 px-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800"
      title="Go back to previous page"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      <span>Back</span>
    </button>
  );
}
