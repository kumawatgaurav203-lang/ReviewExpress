import { Business } from './types';

export const DEMO_BUSINESSES: Record<string, Business> = {
  'photify-studios': {
    id: 'b1111111-1111-4111-8111-111111111111',
    name: 'Photify Studios',
    slug: 'photify-studios',
    google_review_link: 'https://www.google.com/search?q=Photify+Studios+Jaipur#lrd=0x396db550a36bf10b:0xa53d8027eddfb486,3,,,',
    tags: [
      'Stunning Portrait Edits',
      'Professional Lighting',
      'Creative Poses',
      'Punctual & Friendly Staff',
      'Quick Album Delivery',
      'High Resolution Photos'
    ],
    is_active: true,
  },
  'jeep-center': {
    id: 'b2222222-2222-4222-8222-222222222222',
    name: 'Jeep Center & Hind Automobile',
    slug: 'jeep-center',
    google_review_link: 'https://www.google.com/search?q=Jeep+Center+Hind+Automobile+Jaipur#lrd=0x396db3004a1a681b:0xd1b9c6126c2ca10b,3,,,',
    tags: [
      'Expert Diagnostic & Repair',
      'Genuine Spare Parts',
      'Transparent Estimates',
      'Fast Vehicle Delivery',
      'Honest Mechanics',
      'Smooth Engine Tuning'
    ],
    is_active: true,
  },
  'butterfly-bangles': {
    id: 'b3333333-3333-4333-8333-333333333333',
    name: 'Butterfly Bangles',
    slug: 'butterfly-bangles',
    google_review_link: 'https://www.google.com/search?q=Butterfly+Bangles+Jaipur#lrd=0x396db3ff08717c23:0x4eec92bec04effc9,3,,,',
    tags: [
      'Authentic Jaipur Lac Bangles',
      'Exquisite Color Variety',
      'Reasonable Wholesale Prices',
      'Humble & Polite Owner',
      'Durable Handcrafting',
      'Best Traditional Designs'
    ],
    is_active: true,
  },
  'chai-point': {
    id: 'b4444444-4444-4444-8444-444444444444',
    name: 'Chai Point & Snacks',
    slug: 'chai-point',
    google_review_link: 'https://maps.app.goo.gl/d5MEpqQ5mK5YAEXj7',
    tags: ['Quick Service', 'Authentic Ginger Chai', 'Crispy Samosas', 'Clean Seating', 'Friendly Staff', 'Pocket Friendly'],
    is_active: true,
  },
  'royal-salon': {
    id: 'b5555555-5555-4555-8555-555555555555',
    name: 'Royal Rajputana Salon & Spa',
    slug: 'royal-salon',
    google_review_link: 'https://maps.app.goo.gl/N6nkc4LLqGSGZ1m88',
    tags: ['Expert Stylists', 'Hygienic Equipment', 'Relaxing Ambience', 'Great Haircut', 'Premium Products', 'Courteous Staff'],
    is_active: true,
  },
  'spice-garden': {
    id: 'b6666666-6666-4666-8666-666666666666',
    name: 'The Spice Garden Fine Dine',
    slug: 'spice-garden',
    google_review_link: 'https://maps.app.goo.gl/RpUJEozPAdMLBdRG6',
    tags: ['Delicious Paneer Tikka', 'Prompt Service', 'Romantic Ambience', 'Family Friendly', 'Authentic Flavours', 'Great Hospitality'],
    is_active: true,
  },
};

export function getFallbackBusiness(slug: string): Business {
  if (DEMO_BUSINESSES[slug]) {
    return DEMO_BUSINESSES[slug];
  }

  const formattedName = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    id: '00000000-0000-0000-0000-000000000000',
    name: formattedName || 'Local Business',
    slug: slug,
    google_review_link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formattedName || 'Local Business')}`,
    tags: ['Fast Service', 'Polite Staff', 'Clean Ambience', 'Great Quality', 'Value for Money'],
    is_active: true,
  };
}
