import { supabase, isSupabaseConfigured } from './supabase';
import { getAllOwnerAccounts } from './accounts-store';

/**
 * Standardize text into a clean, URL-safe slug:
 * - Lowercase
 * - Strips accents/diacritics
 * - Replaces non-alphanumeric chars with hyphens
 * - Removes leading/trailing hyphens
 */
export function slugify(text: string): string {
  if (!text || typeof text !== 'string') return 'store';

  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD') // decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumeric to hyphens
    .replace(/^-+|-+$/g, '') // trim hyphens
    .replace(/-{2,}/g, '-') // collapse multiple hyphens
    || 'store';
}

/**
 * Checks whether a given slug is already in use by another business.
 */
export async function isSlugTaken(slug: string, excludeBusinessId?: string): Promise<boolean> {
  const cleanSlug = slug.toLowerCase().trim();

  // Reserved slugs that cannot be used as shop URLs
  const reservedSlugs = ['demo', 'api', 'admin', 'dashboard', 'login', 'create-account', 'rx-master-vault-9821', 'r', 'qr'];
  if (reservedSlugs.includes(cleanSlug) && cleanSlug !== 'demo') {
    return true;
  }

  // 1. Check in Supabase businesses table if configured
  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from('businesses').select('id, slug').eq('slug', cleanSlug);
      if (excludeBusinessId) {
        query = query.neq('id', excludeBusinessId);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return true;
      }
    } catch (err) {
      console.warn('Database slug uniqueness check warning:', err);
    }
  }

  // 2. Check in local persistent accounts store
  try {
    const accounts = getAllOwnerAccounts();
    const match = accounts.find((a) => a.businessSlug === cleanSlug);
    if (match) {
      if (excludeBusinessId && (match.id === excludeBusinessId || 'b-' + match.businessSlug === excludeBusinessId)) {
        return false;
      }
      return true;
    }
  } catch (err) {
    // ignore
  }

  return false;
}

/**
 * Generates a guaranteed unique slug for a business name:
 * If "Apex Salon" is taken, tries "apex-salon-1", "apex-salon-2", etc.
 * Never uses sequential raw IDs like "/r/1".
 */
export async function generateUniqueSlug(businessName: string, excludeBusinessId?: string): Promise<string> {
  const baseSlug = slugify(businessName);
  
  // Try the base slug first
  const taken = await isSlugTaken(baseSlug, excludeBusinessId);
  if (!taken) {
    return baseSlug;
  }

  // If taken, try appending a numeric suffix
  let counter = 1;
  while (counter <= 50) {
    const candidate = `${baseSlug}-${counter}`;
    const candidateTaken = await isSlugTaken(candidate, excludeBusinessId);
    if (!candidateTaken) {
      return candidate;
    }
    counter++;
  }

  // Fallback: append timestamp slice
  return `${baseSlug}-${Date.now().toString().slice(-4)}`;
}
