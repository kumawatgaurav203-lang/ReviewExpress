'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Smartphone,
  Star,
  ShieldCheck,
  Zap,
  ArrowRight,
  Flame,
  CheckCircle,
  BarChart3,
  ShieldAlert,
  QrCode,
  TrendingUp,
  Clock,
  ThumbsUp,
  Award,
  Search,
  Lock,
  Scale,
} from 'lucide-react';
import TermsModal from '@/components/TermsModal';
import SocialContactBar from '@/components/SocialContactBar';

export default function HomePage() {
  const [showTermsModal, setShowTermsModal] = useState(false);
  const advantages = [
    {
      icon: Zap,
      color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
      title: '10x Faster Reviews via AI',
      description:
        'Customers hate writing long reviews. Our AI writes high-converting, 2-sentence natural reviews in 3 seconds based on 1-click tag selections.',
    },
    {
      icon: ShieldAlert,
      color: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
      title: 'Smart Negative Review Shield',
      description:
        '1 & 2-star ratings are intercepted privately. Unhappy customers get a direct feedback channel to management, keeping bad ratings off Google Maps.',
    },
    {
      icon: Smartphone,
      color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
      title: 'Zero App Installation Needed',
      description:
        'Customers simply tap the NFC standee or scan the high-resolution QR code. Works natively in Safari and Chrome on both iPhone and Android.',
    },
    {
      icon: Search,
      color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
      title: 'Dominates Local Google Maps SEO',
      description:
        'Fresh, frequent, keyword-rich 5-star customer reviews trigger Google’s local ranking algorithm to rank your store at the very top of Google Maps search.',
    },
    {
      icon: BarChart3,
      color: 'text-indigo-400 bg-indigo-400/10 border-indigo-500/20',
      title: 'Real-Time Owner Analytics CRM',
      description:
        'Track review count daily, weekly, monthly, and yearly. Review intercepted 1-2 star customer feedback privately to resolve issues immediately.',
    },
    {
      icon: ShieldCheck,
      color: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
      title: '100% Google Guidelines Compliant',
      description:
        'Fully compliant with Google Business Profile terms. No bot automation, no fake reviews—every review is organically generated and customer-approved.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* Brand Logo & Tag */}
          <div className="flex items-center gap-2.5 shrink-0">
            <img
              src="/reviewxpress-icon.png"
              alt="ReviewXpress"
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
            />
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
              Review<span className="text-indigo-400">Xpress</span>
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

            {/* Owner Login Link */}
            <Link
              href="/dashboard/login"
              className="text-[11px] sm:text-xs font-bold px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm transition-all flex items-center gap-1 shrink-0"
            >
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              <span><span className="hidden sm:inline">Owner </span>Login</span>
            </Link>

            {/* Client Live Demo Link */}
            <Link
              href="/r/demo"
              className="text-[11px] sm:text-xs font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span><span className="hidden sm:inline">Client </span>Live Demo</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 shadow-inner">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Smart In-Store Google Reviews Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
            Turn In-Store Foot Traffic into{' '}
            <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-amber-500 bg-clip-text text-transparent">
              5-Star Google Reviews
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Customers tap NFC standee or scan QR. Positive feedback (3-5⭐) gets instant 2-sentence AI reviews & direct Google Maps review box. Negative feedback (1-2⭐) is shielded privately for store owners!
          </p>

          <div className="flex justify-center pt-2">
            <Link
              href="/dashboard/login"
              className="px-7 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 font-bold text-sm shadow-xl shadow-indigo-600/25 flex items-center gap-2.5 transition-all hover:scale-105"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Open Owner Analytics Panel</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* SAAS ADVANTAGES & FEATURES SECTION                                 */}
        {/* ----------------------------------------------------------------- */}
        <section className="space-y-8 pt-4">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Why Store Owners Choose ReviewXpress
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              The complete in-store reputation system that skyrockets Google ratings and shields against bad reviews.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {advantages.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-3 hover:border-slate-700/80 transition-all hover:shadow-xl hover:shadow-indigo-950/20"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${item.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white tracking-tight">{item.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* LIVE CLIENT DEMO BANNER WITH SCANNER LINK                         */}
        {/* ----------------------------------------------------------------- */}
        <div className="bg-gradient-to-r from-blue-950/60 via-indigo-950/60 to-purple-950/60 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2 text-center sm:text-left">
            <span className="text-xs font-bold text-amber-400 flex items-center justify-center sm:justify-start gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>Ready for Client Showcase</span>
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white">Experience the Live Client Demo</h3>
            <p className="text-xs text-slate-300 max-w-lg">
              Scan the QR code with your phone camera to test the live review flow on your mobile, or test directly in your browser!
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/demo"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all hover:scale-105 shrink-0"
            >
              <QrCode className="w-4 h-4 text-amber-300" />
              <span>Try Live Interactive Demo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-4 max-w-6xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <img src="/reviewxpress-icon.png" alt="ReviewXpress" className="w-4 h-4 object-contain" />
          <span className="font-medium text-slate-400">ReviewXpress — Smart Google Reviews Platform</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <button
            type="button"
            onClick={() => setShowTermsModal(true)}
            className="hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Scale className="w-3 h-3 text-indigo-400" />
            Terms & Conditions
          </button>
          <span className="text-slate-700">•</span>
          <SocialContactBar showLabels={false} />
        </div>
      </footer>

      {/* Terms & Conditions Modal */}
      <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
    </div>
  );
}
