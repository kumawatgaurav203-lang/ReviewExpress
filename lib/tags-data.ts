export const MASTER_HIGHLIGHT_POOL: string[] = [
  'Fast & Friendly Service',
  'Clean & Welcoming Ambience',
  'Polite Staff',
  'Great Value for Money',
  'Highly Recommended',
  'Quick Response',
  'Cooperative Staff',
  'Best in Town',
  'Pocket Friendly Rates',
  'Superb Quality',
  'Clean & Hygienic Space',
  'On-Time Service',
  'Trustworthy & Reliable',
  'Great Overall Experience',
  'Professional Behavior',
  'Worth Every Penny',
  'Courteous & Polite',
  'Fast Turnaround Time',
  'Genuine & Honest Advice',
  'Excellent Customer Support',
  'Transparent Pricing',
  'High Attention to Detail',
  'Skilled Professionals',
  'Hassle-Free Process',
  'Always Exceeds Expectations',
  'Punctual & Dedicated',
  'Safe & Dependable Service',
];

export const DEFAULT_STORE_HIGHLIGHTS: string[] = MASTER_HIGHLIGHT_POOL.slice(0, 16);

export const CATEGORY_TAGS: Record<string, string[]> = {
  general: DEFAULT_STORE_HIGHLIGHTS,
  coaching: [
    'Concept Clarity',
    'Expert Faculty',
    'Doubt Solving Support',
    'Best Study Material',
    'Top Test Series',
    'Personal Mentorship',
    'Result Oriented',
    'Friendly Teachers',
    'Disciplined Environment',
    'Regular Mock Tests',
    'Motivational Guidance',
    'Timely Syllabus Finish',
  ],
  salon: [
    'Expert Hair Stylist',
    'Hygienic Equipment',
    'Relaxing Ambience',
    'Premium Hair Products',
    'Courteous Staff',
    'Trendy Haircut',
    'Great Hospitality',
    'Punctual Service',
    'Smooth Hair Spa',
    'Value for Money',
    'Custom Beard Styling',
    'Clean Towels & Tools',
  ],
  beauty: [
    'Flawless Bridal Makeup',
    'Gentle Skin Treatment',
    'Clean & Hygienic',
    'Friendly Beauticians',
    'Quality Products',
    'Glow Facial Service',
    'Affordable Packages',
    'Relaxing Experience',
    'Expert Nail Art',
    'Polite Staff',
    'Long Lasting Makeup',
    'Safe & Chemical-Free',
  ],
  cafe: [
    'Aesthetic Ambience',
    'Fresh Brewed Coffee',
    'Delicious Pastries',
    'Cozy Seating',
    'Fast & Polite Service',
    'Free High-Speed Wi-Fi',
    'Great Music Playlist',
    'Pocket Friendly',
    'Must-Try Shakes',
    'Clean Environment',
    'Perfect Work Spot',
    'Instagrammable Decor',
  ],
  restaurant: [
    'Delicious Fresh Food',
    'Authentic Flavours',
    'Prompt Table Service',
    'Family Friendly Ambience',
    'Clean Cutlery & Tables',
    'Great Portion Size',
    'Superb Hospitality',
    'Must-Try Starters',
    'Reasonable Prices',
    'Quick Order Delivery',
    'Mouthwatering Desserts',
    'Hygienic Kitchen',
  ],
  clothing: [
    'Latest Trendy Collection',
    'Premium Fabric Quality',
    'Perfect Fitting & Alterations',
    'Helpful Staff',
    'Reasonable Pricing',
    'Huge Color Variety',
    'Clean Trial Rooms',
    'Festive & Party Wear',
    'Great Return Policy',
    'Affordable Fashion',
    'Unique Designer Pieces',
    'Polite Counter Staff',
  ],
  studio: [
    'Stunning Portrait Edits',
    'Professional Lighting',
    'Creative Poses',
    'Quick Album Delivery',
    'High Resolution Photos',
    'Punctual & Friendly Staff',
    'Huge Aesthetic Backdrops',
    'Patient Photographer',
    'Cinematic Videography',
    'Great Pre-Wedding Shots',
  ],
  automobile: [
    'Expert Vehicle Diagnostic',
    'Genuine Spare Parts',
    'Transparent Pricing',
    'Fast Delivery on Time',
    'Honest Mechanics',
    'Smooth Engine Tuning',
    'Clean Customer Lounge',
    'Excellent Car Wash',
    'Reasonable Labour Charge',
    'Detailed Job Card',
  ],
  hotel: [
    'Luxurious Rooms',
    'Comfortable Clean Beds',
    'Friendly Reception Staff',
    'Delicious Room Service',
    'Prime Location',
    'Hygienic Bathroom',
    'Fast Check-In Process',
    'Peaceful & Safe Stay',
    'Great Amenities',
    'Prompt Housekeeping',
    'Best Hospitality',
    'Highly Recommended Stay',
  ],
  medical: [
    'Experienced Doctor',
    'Accurate Diagnosis',
    'Polite & Caring Staff',
    'Hygienic Clinic & Lab',
    'Minimal Waiting Time',
    'Affordable Consultation',
    'Genuine Medicines',
    'Patient-Friendly Care',
    'Modern Equipment',
    'Clear Health Guidance',
    'Clean & Sanitized Ambience',
    'Highly Trusted Clinic',
  ],
};

export function detectCategory(name: string): string {
  const lower = (name || '').toLowerCase();

  // 1. Studio & Photography (checked before clothing so that "fashion shoot" / "studio" isn't misclassified)
  if (/photo|studio|photography|videography|shoot|lens|cameraman|photographer|cinematography|filming/.test(lower)) {
    return 'studio';
  }

  // 2. Automobile & Workshop (checked before coaching so "jeep" isn't matched by "jee")
  if (/jeep|auto|motor|car|bike|garage|workshop|tyre|tire|service center|mechanic|fourwheeler|four-wheeler|wheeler|spare part|parts of fourwheeler|vehicle|automobile/.test(lower)) {
    return 'automobile';
  }

  // 3. Coaching & Education (acronyms ias, neet, jee, upsc with word boundaries)
  if (/coaching|classes|academy|institute|tuition|school|tutorial|\b(ias|neet|jee|upsc)\b/.test(lower)) {
    return 'coaching';
  }

  // 4. Salon & Hair
  if (/salon|barber|hair|spa/.test(lower)) return 'salon';

  // 5. Beauty Parlour & Makeup
  if (/beauty|parlour|parlor|makeup|makeover|skin|nail|bridal/.test(lower)) return 'beauty';

  // 6. Cafe & Bakery
  if (/cafe|coffee|tea|chai|bakery|bake|brew/.test(lower)) return 'cafe';

  // 7. Hotel & Stay
  if (/hotel|resort|lodge|inn|motel|stay|guest house/.test(lower)) return 'hotel';

  // 8. Medical & Pharmacy
  if (/medical|clinic|hospital|doctor|pharmacy|chemist|dental|dentist|\bhealth\b|\bcare\b|diagnostic|pathology/.test(lower)) return 'medical';

  // 9. Restaurant & Dining
  if (/restaurant|dine|dining|food|dhaba|kitchen|sweets|pizza|burger|snack|grill/.test(lower)) return 'restaurant';

  // 10. Clothing & Fashion
  if (/clothing|fashion|boutique|garment|\bwear\b|saree|textile|apparel|tailor|suit/.test(lower)) return 'clothing';

  return 'general';
}

export function getShuffledCategoryTags(name: string, explicitCategory?: string): string[] {
  const category = explicitCategory && explicitCategory !== 'auto' && CATEGORY_TAGS[explicitCategory]
    ? explicitCategory
    : detectCategory(name);

  const pool = CATEGORY_TAGS[category] || CATEGORY_TAGS.general;

  // Clone pool and Fisher-Yates shuffle
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Return top 6 distinct shuffled highlights
  return shuffled.slice(0, 6);
}

/**
 * Picks an optimal slice of highlights (4, 5, or 6 items) based on sentence length,
 * keeping pinned selected tags visible and rotating fresh tags on shuffle.
 */
export function getOptimalHighlightSlice(
  allTags: string[],
  selected: string[] = [],
  exclude: string[] = []
): string[] {
  if (!allTags || allTags.length === 0) return [];
  if (allTags.length <= 4) return allTags;

  // Measure average character length of candidate sentences
  const avgLen = allTags.reduce((sum, t) => sum + t.length, 0) / allTags.length;

  // 4 for long (> 22 chars), 5 for medium (16-22 chars), 6 for short (< 16 chars)
  const targetCount = avgLen > 22 ? 4 : (avgLen >= 16 ? 5 : 6);

  // Keep any currently selected tags visible
  const pinnedSelected = selected.filter((t) => allTags.includes(t));

  // Exclude already shown unselected tags if shuffling
  const unselectedExclude = exclude.filter((t) => !pinnedSelected.includes(t));
  let availableCandidates = allTags.filter((t) => !pinnedSelected.includes(t) && !unselectedExclude.includes(t));

  // If not enough fresh unseen candidates to fill targetCount, fallback to all unselected candidates
  if (availableCandidates.length < (targetCount - pinnedSelected.length)) {
    availableCandidates = allTags.filter((t) => !pinnedSelected.includes(t));
  }

  // Shuffle available candidates
  const shuffled = [...availableCandidates].sort(() => Math.random() - 0.5);

  const result: string[] = [...pinnedSelected];
  for (const t of shuffled) {
    if (!result.includes(t)) {
      result.push(t);
    }
    if (result.length >= targetCount) break;
  }

  return result;
}

