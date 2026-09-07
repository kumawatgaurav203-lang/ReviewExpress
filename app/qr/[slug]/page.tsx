import { Metadata } from 'next';
import Link from 'next/link';
import QRCode from 'qrcode';
import { getFallbackBusiness } from '@/lib/demo-data';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Business } from '@/lib/types';
import { Sparkles, Star, Smartphone, ShieldCheck, ArrowLeft, Download, Printer } from 'lucide-react';

interface PageProps {
  params: {
    slug: string;
  };
}

async function getBusinessBySlug(slug: string): Promise<Business> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.error('Error fetching business:', err);
    }
  }

  return getFallbackBusiness(slug);
}

export default async function QRStandeePage({ params }: PageProps) {
  const business = await getBusinessBySlug(params.slug);
  
  // URL pointing to the customer NFC/QR flow on the local network
  const customerFlowUrl = `http://10.212.203.114:3000/r/${business.slug}`;
  
  // Generate high-res base64 Data URL for the QR code
  const qrDataUrl = await QRCode.toDataURL(customerFlowUrl, {
    width: 500,
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Top Controls */}
      <div className="w-full max-w-md flex items-center justify-between mb-4 print:hidden">
        <Link
          href={`/r/${business.slug}`}
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>View Mobile Screen</span>
        </Link>
        <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
          Ready to Scan
        </span>
      </div>

      {/* Printable Counter Standee Card */}
      <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center border-4 border-slate-100">
        {/* Standee Header */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-2xl shadow-lg mb-3">
          {business.name.slice(0, 2).toUpperCase()}
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          {business.name}
        </h1>
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">
          Review us with AI on Google
        </p>

        {/* 5 Golden Stars Display */}
        <div className="flex items-center gap-1.5 my-3">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className="w-6 h-6 text-amber-400 fill-amber-400" />
          ))}
        </div>

        {/* High Res QR Code Frame */}
        <div className="my-2 p-3 bg-slate-50 rounded-2xl border-2 border-slate-200/80 shadow-inner">
          <img
            src={qrDataUrl}
            alt={`Scan QR Code to review ${business.name}`}
            className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl"
          />
        </div>

        {/* Instructions Banner */}
        <div className="mt-3 bg-slate-900 text-white rounded-2xl p-3 w-full space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-300">
            <Smartphone className="w-4 h-4" />
            <span>Scan with your Phone Camera</span>
          </div>
          <p className="text-[11px] text-slate-300">
            AI generates your 5-star review in 3 seconds!
          </p>
        </div>

        {/* Partner trust footer */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Verified Google Partner • Instant Review Hub</span>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-slate-400 print:hidden">
        <p>Pointing to: <code className="text-indigo-300">{customerFlowUrl}</code></p>
      </div>
    </div>
  );
}
