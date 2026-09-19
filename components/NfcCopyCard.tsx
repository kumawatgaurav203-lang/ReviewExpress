'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Copy, CheckCircle2, Smartphone, QrCode, Radio, ExternalLink, LogIn, Scale } from 'lucide-react';
import TermsModal from './TermsModal';

interface NfcCopyCardProps {
  nfcUrl: string;
  qrUrl: string;
  slug: string;
}

export default function NfcCopyCard({ nfcUrl, qrUrl, slug }: NfcCopyCardProps) {
  const [copied, setCopied] = useState<boolean>(false);
  const [showTerms, setShowTerms] = useState<boolean>(false);

  const handleCopyNfc = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(nfcUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = nfcUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  return (
    <div className="w-full max-w-md mt-6 space-y-4 print:hidden">
      {/* NFC Standee Setup Card */}
      <div className="bg-slate-900 border border-violet-500/30 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/30">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>NFC Chip Setup Link</span>
                <span className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full font-bold border border-violet-500/30">
                  NTAG213 / 215 / 216
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Write this URL to your counter standee's NFC chip using the NFC Tools app
              </p>
            </div>
          </div>
        </div>

        {/* URL Box */}
        <div className="flex items-center gap-2 p-2.5 bg-slate-950 rounded-2xl border border-slate-800">
          <input
            type="text"
            readOnly
            value={nfcUrl}
            className="bg-transparent text-xs text-violet-300 font-mono flex-1 outline-none truncate selection:bg-violet-500/30"
          />
          <button
            type="button"
            onClick={handleCopyNfc}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/30 active:scale-95'
            }`}
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy NFC URL</span>
              </>
            )}
          </button>
        </div>

        <p className="text-[10px] text-slate-400 leading-relaxed">
          When a customer taps their phone on the counter <strong>NFC Chip</strong>, it is logged separately as an <strong>NFC Tap</strong> on your dashboard.
        </p>
      </div>

      {/* Direct Test Links */}
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href={`/r/${slug}?source=nfc`}
          target="_blank"
          className="flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-bold transition-all text-center"
        >
          <Smartphone className="w-3.5 h-3.5 text-violet-400" />
          <span>📱 Test NFC Tap</span>
          <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
        </Link>

        <Link
          href={`/r/${slug}?source=qr`}
          target="_blank"
          className="flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all text-center"
        >
          <QrCode className="w-3.5 h-3.5 text-blue-400" />
          <span>📷 Test QR Scan</span>
          <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
        </Link>
      </div>

      {/* Owner Login & Terms Controls */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        <Link
          href="/dashboard/login"
          className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-center transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-95"
        >
          <LogIn className="w-4 h-4" />
          <span>Go to Owner Dashboard Login</span>
        </Link>
        <button
          type="button"
          onClick={() => setShowTerms(true)}
          className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold transition-all border border-slate-700/80 text-center flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
        >
          <Scale className="w-3.5 h-3.5 text-slate-400" />
          <span>Terms & Conditions</span>
        </button>
      </div>

      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  );
}
