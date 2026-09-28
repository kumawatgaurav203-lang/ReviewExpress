import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { DEMO_BUSINESSES } from '@/lib/demo-data';
import { getAccountBySlug } from '@/lib/accounts-store';
import { getShuffledCategoryTags } from '@/lib/tags-data';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Business } from '@/lib/types';
import { getBaseUrl } from '@/lib/network';
import { Star, QrCode } from 'lucide-react';
import BackButton from '@/components/BackButton';

import { redisCache } from '@/lib/redis';

interface PageProps {
  params: {
    slug: string;
  };
}

async function getBusinessBySlug(slug: string): Promise<Business | null> {
  const cleanSlug = slug.toLowerCase().trim();
  const cacheKey = `store:profile:${cleanSlug}`;

  return redisCache.remember(cacheKey, 600, async () => {
    // 1. Official demo business
    if (cleanSlug === 'demo') {
      return {
        id: 'b0000000-0000-4000-8000-000000000000',
        name: 'ReviewXpress Client Demo',
        slug: 'demo',
        google_review_link: 'https://www.google.com/maps',
        tags: getShuffledCategoryTags('ReviewXpress Client Demo'),
        is_active: true,
      };
    }

    // 2. Check registered owner accounts (accounts.json)
    try {
      const acc = getAccountBySlug(cleanSlug);
      if (acc) {
        return {
          id: 'b-' + acc.businessSlug,
          name: acc.businessName,
          slug: acc.businessSlug,
          category: acc.category,
          google_review_link: acc.googleReviewLink,
          tags: getShuffledCategoryTags(acc.businessName, acc.category),
          is_active: acc.is_active !== false,
        };
      }
    } catch (err) {
      console.error('Error fetching account by slug in /qr/[slug]:', err);
    }

    // 3. Supabase check
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('slug', cleanSlug)
          .single();

        if (!error && data) {
          const acc = getAccountBySlug(cleanSlug);
          return {
            id: data.id,
            name: data.name,
            slug: data.slug,
            category: data.category,
            google_review_link: data.google_review_link,
            tags: data.tags || getShuffledCategoryTags(data.name),
            is_active: data.is_active !== false && acc?.is_active !== false,
          };
        }
      } catch (err) {
        console.error('Error fetching business from Supabase:', err);
      }
    }

    // 4. In-memory demo dictionary
    if (DEMO_BUSINESSES[cleanSlug]) {
      return {
        ...DEMO_BUSINESSES[cleanSlug],
        tags: getShuffledCategoryTags(DEMO_BUSINESSES[cleanSlug].name),
      };
    }

    return null;
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const business = await getBusinessBySlug(params.slug);
  if (!business) {
    return { title: 'Store Not Found | ReviewXpress' };
  }
  return {
    title: `QR Standee | ${business.name}`,
    description: `Printable QR Standee for ${business.name} to collect 5-star Google reviews.`,
  };
}

export default async function QRStandeePage({ params }: PageProps) {
  const business = await getBusinessBySlug(params.slug);

  if (!business) {
    notFound();
  }

  const baseUrl = getBaseUrl();
  const qrFlowUrl = `${baseUrl}/r/${encodeURIComponent(business.slug)}?source=qr`;

  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(qrFlowUrl, {
      width: 500,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (qrErr) {
    console.error('Error generating QR code in /qr/[slug]:', qrErr);
  }

  if (!business.is_active) {
    const initials = business.name.slice(0, 2).toUpperCase();
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 pb-12">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-700 via-slate-800 to-slate-700 text-slate-300 flex items-center justify-center font-black text-2xl shadow-lg border border-slate-700">
            <span>{initials}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">{business.name}</h1>
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              ● QR Standee Inactive
            </span>
            <p className="text-xs text-slate-400">
              This review standee is currently paused by store administration. Please contact staff for assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 pb-12">
      {/* Top Controls */}
      <div className="w-full max-w-md flex items-center justify-between mb-4 print:hidden">
        <BackButton fallback="/dashboard" />
        <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
          Ready to Scan
        </span>
      </div>

      {/* Printable Counter Standee Card */}
      <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center border-4 border-slate-100">
        {/* Standee Header */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-2xl shadow-lg mb-3">
          <span>{business.name.slice(0, 2).toUpperCase()}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          {business.name}
        </h1>
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mt-1">
          Review Us with AI on Google
        </p>

        {/* 5 Golden Stars Display */}
        <div className="flex items-center gap-1.5 my-3">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className="w-6 h-6 text-amber-400 fill-amber-400" />
          ))}
        </div>

        {/* High Res QR Code Frame */}
        <div className="my-2 p-3 bg-slate-50 rounded-2xl border-2 border-slate-200/80 shadow-inner min-h-[240px] flex items-center justify-center">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`Scan QR Code to review ${business.name}`}
              className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl"
            />
          ) : (
            <div className="w-56 h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
              <QrCode className="w-12 h-12 mb-2 text-slate-300" />
              <span>QR Code Loading...</span>
            </div>
          )}
        </div>

        {/* Instructions Banner */}
        <div className="mt-3 bg-slate-900 text-white rounded-2xl p-3 w-full space-y-1">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-300">
            <QrCode className="w-4 h-4" />
            <span>📷 Scan QR Code to Review</span>
          </div>
          <p className="text-[11px] text-slate-300">
            AI generates your 5-star review in 3 seconds!
          </p>
        </div>

        {/* ReviewXpress Branding Footer */}
        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
          <img src="/reviewxpress-icon.png" alt="ReviewXpress" className="w-5 h-5 object-contain" />
          <span>Powered by <strong className="text-slate-600">ReviewXpress</strong></span>
        </div>
      </div>
    </div>
  );
}
