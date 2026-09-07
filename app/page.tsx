import Link from 'next/link';
import {
  Sparkles,
  Smartphone,
  Star,
  ShieldCheck,
  Zap,
  ArrowRight,
  Database,
  Key,
  Flame,
  CheckCircle,
  ExternalLink,
  Camera,
  Wrench,
  ShoppingBag,
  TrendingUp,
  MessageSquareWarning,
} from 'lucide-react';
import { DEMO_BUSINESSES } from '@/lib/demo-data';

export default function HomePage() {
  const demoList = Object.values(DEMO_BUSINESSES).slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-violet-500 flex items-center justify-center font-black text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white">TapReview AI</span>
              <span className="ml-2 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                NFC Growth SaaS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/r/photify-studios"
              className="text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Test NFC Tap</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/90 border border-slate-700 text-xs font-medium text-slate-300 shadow-inner">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>AI-Powered NFC Google Review Acceleration</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Turn Physical NFC Taps into{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
              5-Star Google Reviews
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Customers tap the NFC card at billing. Gemini AI writes a personalized 2-sentence review in 3 seconds. Happy customers post to Google; unhappy customers are privately intercepted.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/r/photify-studios"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition-all flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              <span>Experience Customer NFC Tap</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Live Demo Businesses Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <span>Interactive NFC Demos</span>
            </h2>
            <span className="text-xs text-slate-400">Click any card to simulate customer scan</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {demoList.map((biz) => {
              const icon =
                biz.slug === 'photify-studios' ? (
                  <Camera className="w-5 h-5" />
                ) : biz.slug === 'jeep-center' ? (
                  <Wrench className="w-5 h-5" />
                ) : (
                  <ShoppingBag className="w-5 h-5" />
                );

              return (
                <div
                  key={biz.slug}
                  className="group relative bg-slate-800/60 hover:bg-slate-800 rounded-3xl p-6 border border-slate-700/80 hover:border-indigo-500/50 transition-all duration-200 flex flex-col justify-between shadow-lg shadow-black/20 hover:shadow-indigo-500/10"
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-violet-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
                        {icon}
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-emerald-400" />
                        <span>Ready</span>
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {biz.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">/r/{biz.slug}</p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {biz.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-700/50 text-slate-300 border border-slate-600/50"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs font-semibold text-indigo-400">
                    <Link href={`/r/${biz.slug}`} className="flex items-center gap-1 hover:text-indigo-300">
                      <span>NFC Flow</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/qr/${biz.slug}`}
                        className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px] bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-lg"
                      >
                        <Smartphone className="w-3 h-3" />
                        <span>Scan QR</span>
                      </Link>
                      <a
                        href={biz.google_review_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[11px]"
                      >
                        <span>Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          <div className="bg-slate-800/40 border border-slate-700/70 rounded-3xl p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Star className="w-5 h-5 fill-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white">
              3-5 Stars: 1-Tap AI Review Generation
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              When delighted customers tap 4 or 5 stars and select tags, Gemini AI crafts an authentic 2-sentence Indian review. Customers copy with 1 click and get redirected straight to Google Maps.
            </p>
            <ul className="text-xs text-slate-300 space-y-2 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Zero typing fatigue for customers</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Boosts local SEO keyword density naturally</span>
              </li>
            </ul>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/70 rounded-3xl p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <MessageSquareWarning className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">
              1-2 Stars: Smart Interception Shield
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Dissatisfied customers are never shown the public Google Maps link. Instead, they are presented with an apologetic private feedback form where management can capture their phone number and resolve grievances internally.
            </p>
            <ul className="text-xs text-slate-300 space-y-2 pt-2">
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                <span>Protects overall Google star rating</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                <span>Instant escalation to business owners</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>Built with Next.js 14 App Router • TypeScript • Tailwind CSS • Supabase • Google Gemini</p>
      </footer>
    </div>
  );
}
