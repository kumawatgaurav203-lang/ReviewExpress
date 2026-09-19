import { Business } from './types';
import { getShuffledCategoryTags } from './tags-data';

// Real registry of businesses (starts with demo for client sales pitch)
export const DEMO_BUSINESSES: Record<string, Business> = {
  'demo': {
    id: 'b0000000-0000-4000-8000-000000000000',
    name: 'ReviewXpress Client Demo',
    slug: 'demo',
    google_review_link: 'https://www.google.com/maps',
    tags: getShuffledCategoryTags('ReviewXpress Client Demo'),
    is_active: true,
  },
};

export function getFallbackBusiness(slug: string): Business {
  // 1. Check in-memory DEMO_BUSINESSES
  if (DEMO_BUSINESSES[slug]) {
    return {
      ...DEMO_BUSINESSES[slug],
      // Reshuffle tags on every fetch
      tags: getShuffledCategoryTags(DEMO_BUSINESSES[slug].name),
    };
  }

  // 2. Clean fallback for dynamic / fresh slugs
  const formattedName = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    id: 'b-' + slug,
    name: formattedName || 'Local Business',
    slug: slug,
    google_review_link: 'https://g.page/r/CYa03-0ngD2lEAE/review',
    tags: getShuffledCategoryTags(formattedName),
    is_active: true,
  };
}

export function registerNewBusiness(biz: Business): Business {
  DEMO_BUSINESSES[biz.slug] = biz;
  return biz;
}

export function deleteBusiness(slug: string): boolean {
  if (DEMO_BUSINESSES[slug]) {
    delete DEMO_BUSINESSES[slug];
    return true;
  }
  return false;
}
