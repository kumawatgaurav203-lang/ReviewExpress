import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { DEMO_BUSINESSES } from '@/lib/demo-data';
import { getAccountBySlug } from '@/lib/accounts-store';
import { getShuffledCategoryTags } from '@/lib/tags-data';
import { Business } from '@/lib/types';
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

  // 2. Check registered owner accounts from persistent accounts.json
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

  // 3. Supabase check
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', cleanSlug)
        .eq('is_active', true)
        .single();

      if (!error && data) {
        return {
          id: data.id,
          name: data.name,
          slug: data.slug,
          category: data.category,
          google_review_link: data.google_review_link,
          tags: data.tags || getShuffledCategoryTags(data.name),
          is_active: data.is_active,
        };
      }
    } catch (err) {
      console.error('Error fetching business from Supabase in /r/[slug]:', err);
    }
  }

  // 4. In-memory demo dictionary
  if (DEMO_BUSINESSES[cleanSlug]) {
    return {
      ...DEMO_BUSINESSES[cleanSlug],
      tags: getShuffledCategoryTags(DEMO_BUSINESSES[cleanSlug].name),
    };
  }

  // 5. If store not found anywhere, return null to trigger branded 404
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

  const initialSource: 'nfc' | 'qr' = searchParams?.source === 'nfc' ? 'nfc' : 'qr';

  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 px-4 py-6">
      <ReviewFlow business={business} initialSource={initialSource} />
    </main>
  );
}
