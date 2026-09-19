export const CATEGORY_TAGS: Record<string, string[]> = {
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
  general: [
    'Super Fast Service',
    'Friendly & Polite Staff',
    'Clean & Welcoming Ambience',
    'Top-Notch Quality',
    'Great Value for Money',
    'Highly Recommended',
    'Honest & Transparent',
    'Quick Response',
    'Hassle-Free Experience',
    '100% Reliable',
  ],
};

export function detectCategory(name: string): string {
  const lower = name.toLowerCase();
  if (/coaching|classes|academy|institute|tuition|school|tutorial|ias|neet|jee/.test(lower)) return 'coaching';
  if (/salon|barber|hair|spa/.test(lower)) return 'salon';
  if (/beauty|parlour|parlor|makeup|makeover|skin|nail|bridal/.test(lower)) return 'beauty';
  if (/cafe|coffee|tea|chai|bakery|bake|brew/.test(lower)) return 'cafe';
  if (/hotel|resort|lodge|inn|motel|stay|guest house/.test(lower)) return 'hotel';
  if (/medical|clinic|hospital|doctor|pharmacy|chemist|dental|dentist|health|care|diagnostic|pathology/.test(lower)) return 'medical';
  if (/restaurant|dine|dining|food|dhaba|kitchen|sweets|pizza|burger|snack|grill/.test(lower)) return 'restaurant';
  if (/clothing|fashion|boutique|garment|wear|saree|textile|apparel|tailor|suit/.test(lower)) return 'clothing';
  if (/photo|studio|photography|media|films|video|lens/.test(lower)) return 'studio';
  if (/auto|motor|car|bike|garage|workshop|tyre|tire|service center|mechanic/.test(lower)) return 'automobile';
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
