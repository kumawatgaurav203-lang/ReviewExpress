import { Metadata } from 'next';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getFallbackBusiness } from '@/lib/demo-data';
import { Business } from '@/lib/types';
import ReviewFlow from './ReviewFlow';

interface PageProps {
  params: {
    slug: string;
  };
}

async function getBusinessBySlug(slug: string): Promise<Business> {
  // If Supabase is properly configured, query the businesses table
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (!error && data) {
        return {
          id: data.id,
          name: data.name,
          slug: data.slug,
          google_review_link: data.google_review_link,
          tags: data.tags || ['Fast Service', 'Polite Staff', 'Clean Ambience', 'Great Quality', 'Value for Money'],
          is_active: data.is_active,
        };
      }
    } catch (err) {
      console.error('Error fetching business from Supabase:', err);
    }
  }

  // Fallback to local demo data if Supabase is unconfigured or not found
  return getFallbackBusiness(slug);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const business = await getBusinessBySlug(params.slug);
  return {
    title: `Rate & Review | ${business.name}`,
    description: `Share your experience with ${business.name} and get an instant AI review draft.`,
  };
}

export default async function NFCReviewPage({ params }: PageProps) {
  const business = await getBusinessBySlug(params.slug);

  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 px-4 py-6">
      <ReviewFlow business={business} />
    </main>
  );
}
