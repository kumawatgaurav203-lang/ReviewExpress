'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Fatal global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-white">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl border border-slate-700/80 p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">System Error</h2>
          <p className="text-slate-400 text-sm mb-6">
            A critical system error occurred. Please click below to reload the application.
          </p>
          <button
            onClick={() => reset()}
            className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 px-6 rounded-xl shadow-lg transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Reload ReviewXpress
          </button>
        </div>
      </body>
    </html>
  );
}
