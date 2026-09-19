import Link from 'next/link';
import QRCode from 'qrcode';
import {
  Sparkles,
  ArrowLeft,
  ExternalLink,
  Camera,
  QrCode,
} from 'lucide-react';
import { getBaseUrl } from '@/lib/network';

export const metadata = {
  title: 'Client Interactive Demo | ReviewXpress',
  description: 'Experience how ReviewXpress helps local stores collect 5-star Google reviews in 3 seconds.',
};

export default async function ClientDemoPage() {
  const baseUrl = getBaseUrl();
  const customerFlowUrl = `${baseUrl}/r/demo`;

  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(customerFlowUrl, {
      width: 600,
      margin: 2,
      color: {
        dark: '#020617',
        light: '#ffffff',
      },
    });
  } catch (qrErr) {
    console.error('Error generating demo QR code:', qrErr);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col justify-between p-4 sm:p-6">
      {/* Top Header */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between py-3">
        <Link
          href="/"
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-2">
          <img
            src="/reviewxpress-icon.png"
            alt="ReviewXpress"
            className="w-6 h-6 object-contain"
          />
          <span className="font-extrabold text-sm text-white tracking-tight">
            Review<span className="text-indigo-400">Xpress</span>
          </span>
        </div>
      </div>

      {/* Main Showcase Card */}
      <div className="w-full max-w-xl mx-auto my-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
          {/* Badge & Title */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Interactive Client Showcase</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Scan with Your Phone Camera
            </h1>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Scan the QR code below using your smartphone camera to experience the live customer review demo on your own mobile device!
            </p>
          </div>

          {/* Scannable QR Code */}
          <div className="inline-block p-4 sm:p-5 bg-white rounded-3xl shadow-2xl shadow-indigo-500/10 border-4 border-slate-700/50 min-h-[260px]">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Scan QR code for live demo"
                className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-2xl mx-auto"
              />
            ) : (
              <div className="w-56 h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
                <QrCode className="w-12 h-12 mb-2 text-slate-300" />
                <span>Loading QR Code...</span>
              </div>
            )}
          </div>

          {/* Step-by-Step Testing Guide */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-left space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2 font-bold text-white text-[11px] uppercase tracking-wider pb-1 border-b border-slate-800">
              <Camera className="w-4 h-4 text-indigo-400" />
              <span>How to Test the Demo:</span>
            </div>
            <ol className="space-y-1.5 list-decimal list-inside text-slate-400 text-[11px] leading-relaxed">
              <li>Open your smartphone Camera or QR code scanner.</li>
              <li>Point your camera at the QR code on your screen.</li>
              <li>Tap 5 Stars (⭐⭐⭐⭐⭐) and select experience tags.</li>
              <li>Experience the instant AI-crafted review and test the Google review flow!</li>
            </ol>
          </div>

          {/* Direct Link for Device Testing */}
          <div>
            <Link
              href="/r/demo"
              className="inline-flex items-center gap-2 text-xs font-bold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-4 py-2.5 rounded-xl transition-all"
            >
              <span>👉 Or Tap Here to Open Demo Review Directly on this Device</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-500 py-2">
        <span>ReviewXpress — Next Generation Google Review Growth System</span>
      </footer>
    </div>
  );
}
