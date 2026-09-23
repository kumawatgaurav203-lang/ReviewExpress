import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { DEMO_BUSINESSES } from '@/lib/demo-data';
import { getAccountBySlug } from '@/lib/accounts-store';
import { getShuffledCategoryTags } from '@/lib/tags-data';
import { Business } from '@/lib/types';
import { redisCache } from '@/lib/redis';
import ReviewFlow from './ReviewFlow';

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
  const cacheKey = `store:profile:${cleanSlug}`;

  // Serve from Redis cache (< 2ms) or compute and cache for 10 minutes (600s)
  return redisCache.remember(cacheKey, 600, async () => {
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
          .select('id, name, slug, google_review_link, category, tags, is_active, status')
          .eq('slug', cleanSlug)
          .single();

        if (!error && data) {
          // Verify business is active
          const isActive = data.is_active !== false && data.status !== 'inactive' && data.status !== 'suspended';
          if (!isActive) {
            return null; // Inactive business triggers 404
          }

          // Return strictly public sanitized business representation
          return {
            id: data.id,
            name: data.name,
            slug: data.slug,
            category: data.category || 'general',
            google_review_link: data.google_review_link,
            tags: data.tags && data.tags.length > 0 ? data.tags : getShuffledCategoryTags(data.name, data.category),
            is_active: true,
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
        return {
          id: 'b-' + acc.businessSlug,
          name: acc.businessName,
          slug: acc.businessSlug,
          category: acc.category,
          google_review_link: acc.googleReviewLink,
          tags: getShuffledCategoryTags(acc.businessName, acc.category),
          is_active: true,
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
        is_active: true,
      };
    }

    // 5. Store not found or inactive -> trigger 404
    return null;
  });
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

  const initialSource: 'nfc' | 'qr' = searchParams?.source === 'nfc' ? 'nfc' : 'qr';

  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-slate-100 dark:bg-slate-950 px-4 py-6 transition-colors">
      <ReviewFlow business={business} initialSource={initialSource} />
    </main>
  );
}
