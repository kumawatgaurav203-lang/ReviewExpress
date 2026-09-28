import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { DEMO_BUSINESSES } from '@/lib/demo-data';
import { getAccountBySlug } from '@/lib/accounts-store';
import { getShuffledCategoryTags, detectCategory } from '@/lib/tags-data';
import { Business } from '@/lib/types';
import ReviewFlow from './ReviewFlow';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: {
    slug: string;
  };
  searchParams?: {
    source?: string;
  };
}

async function getBusinessBySlug(slug: string): Promise<Business | null> {
  const cleanSlug = slug.toLowerCase().trim();

  // 1. Official demo portal
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

    // 2. Query Supabase businesses table (primary source of truth)
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('id, name, slug, google_review_link, tags, is_active')
          .eq('slug', cleanSlug)
          .single();

        if (!error && data) {
          // Resolve category from accounts store or auto-detection
          const acc = getAccountBySlug(cleanSlug);
          const category = acc?.category || detectCategory(data.name);
          const isStoreActive = data.is_active !== false && acc?.is_active !== false;

          // Return strictly public sanitized business representation
          return {
            id: data.id,
            name: data.name,
            slug: data.slug,
            category,
            google_review_link: data.google_review_link,
            tags: Array.isArray(data.tags) && data.tags.length > 0
              ? data.tags
              : (Array.isArray(acc?.tags) && acc.tags.length > 0
                ? acc.tags
                : getShuffledCategoryTags(data.name, category)),
            is_active: isStoreActive,
          };
        }
      } catch (err) {
        console.error('Error fetching business from Supabase in /r/[slug]:', err);
      }
    }

    // 3. Fallback: Check registered owner accounts from persistent accounts.json
    try {
      const acc = getAccountBySlug(cleanSlug);
      if (acc) {
        const category = acc.category || detectCategory(acc.businessName);
        const isStoreActive = acc.is_active !== false;
        return {
          id: 'b-' + acc.businessSlug,
          name: acc.businessName,
          slug: acc.businessSlug,
          category,
          google_review_link: acc.googleReviewLink,
          tags: Array.isArray(acc.tags) && acc.tags.length > 0
            ? acc.tags
            : getShuffledCategoryTags(acc.businessName, category),
          is_active: isStoreActive,
        };
      }
    } catch (err) {
      console.error('Error fetching account by slug in /r/[slug]:', err);
    }

    // 4. In-memory demo dictionary
    if (DEMO_BUSINESSES[cleanSlug]) {
      const b = DEMO_BUSINESSES[cleanSlug];
      return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        category: b.category,
        google_review_link: b.google_review_link,
        tags: getShuffledCategoryTags(b.name, b.category),
        is_active: b.is_active !== false,
      };
    }

  // 5. Store not found -> trigger 404
  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const business = await getBusinessBySlug(params.slug);
  if (!business) {
    return {
      title: 'Store Not Found | ReviewXpress',
      description: 'The requested store review page was not found.',
    };
  }

  return {
    title: `Rate & Review | ${business.name}`,
    description: `Share your experience with ${business.name} and get an instant AI review draft.`,
  };
}

export default async function NFCReviewPage({ params, searchParams }: PageProps) {
  const business = await getBusinessBySlug(params.slug);

  if (!business) {
    notFound();
  }

  // If store is deactivated by administrator, show polite maintenance screen
  if (!business.is_active) {
    const initials = business.name
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return (
      <main className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 px-4 py-8 text-white">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl backdrop-blur-md space-y-5">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-tr from-slate-700 via-slate-800 to-slate-700 flex items-center justify-center font-black text-2xl text-slate-300 border-2 border-slate-700 shadow-md">
            <span>{initials}</span>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{business.name}</h1>
            <p className="text-xs font-semibold text-slate-400">Digital Review Counter</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Counter Currently Paused</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Our digital review service is undergoing scheduled maintenance. Please visit us again soon!
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-500">
            <img src="/reviewxpress-icon.png" alt="ReviewXpress" className="w-4 h-4 object-contain opacity-70" />
            <span>Powered by ReviewXpress</span>
          </div>
        </div>
      </main>
    );
  }

  const initialSource: 'nfc' | 'qr' = searchParams?.source === 'nfc' ? 'nfc' : 'qr';

  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 px-4 py-6">
      <ReviewFlow business={business} initialSource={initialSource} />
    </main>
  );
}
