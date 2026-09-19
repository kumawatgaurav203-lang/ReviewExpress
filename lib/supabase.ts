import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(rawUrl) &&
    rawUrl.startsWith('https://') &&
    !rawUrl.includes('your-project') &&
    !rawUrl.includes('placeholder') &&
    Boolean(rawKey) &&
    rawKey !== 'placeholder-anon-key' &&
    rawKey !== 'your_supabase_anon_key_here'
  );
};

// Safe client instantiation: avoids throw during build or when env is missing
const safeUrl = isSupabaseConfigured() ? rawUrl : 'https://placeholder.supabase.co';
const safeKey = isSupabaseConfigured() ? rawKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
