import fs from 'fs';
import path from 'path';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { redisCache } from '@/lib/redis';

export interface OwnerAccount {
  id: string;
  email: string;
  password: string; // Exactly 8 characters
  businessName: string;
  businessSlug: string;
  category?: string;
  googleReviewLink: string;
  createdAt: string;
}

const dataFilePath = path.join(process.cwd(), 'data', 'accounts.json');

// In-memory cache with TTL to eliminate unnecessary disk I/O
let accountsCache: OwnerAccount[] | null = null;
let lastAccountsReadTime = 0;
let lastCloudSyncTime = 0;
const CLOUD_SYNC_TTL = 30 * 1000; // 30 seconds

// Tombstone set of deleted slugs/emails - populated dynamically when stores are deleted via delete-store
const deletedIdentifiers = new Set<string>();

// Read from JSON file with tombstone filtering
function readAccountsFromFile(): OwnerAccount[] {
  const now = Date.now();
  if (accountsCache && now - lastAccountsReadTime < 15000) {
    return accountsCache;
  }
  try {
    if (fs.existsSync(dataFilePath)) {
      const content = fs.readFileSync(dataFilePath, 'utf8');
      const parsed: OwnerAccount[] = JSON.parse(content);
      accountsCache = (parsed || []).filter(
        (a) =>
          !deletedIdentifiers.has(a.businessSlug.toLowerCase()) &&
          !deletedIdentifiers.has(a.email.toLowerCase())
      );
      lastAccountsReadTime = now;
      return accountsCache;
    }
  } catch (err) {
    console.error('Failed to read accounts file:', err);
  }
  accountsCache = [];
  return [];
}

// Write to JSON file (compact to save disk space)
function writeAccountsToFile(accounts: OwnerAccount[]) {
  try {
    const dir = path.dirname(dataFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filtered = accounts.filter(
      (a) =>
        !deletedIdentifiers.has(a.businessSlug.toLowerCase()) &&
        !deletedIdentifiers.has(a.email.toLowerCase())
    );
    accountsCache = filtered;
    lastAccountsReadTime = Date.now();
    fs.writeFileSync(dataFilePath, JSON.stringify(filtered, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write accounts file:', err);
  }
}

// Asynchronously sync the accounts store from Supabase vault and Redis
export async function syncAccountsFromCloud(force = false): Promise<OwnerAccount[]> {
  const now = Date.now();
  if (!force && accountsCache && now - lastCloudSyncTime < CLOUD_SYNC_TTL) {
    return accountsCache;
  }

  try {
    // 1. Try Redis first (fastest, <2ms)
    try {
      const fromRedis = await redisCache.get<string>('sys:accounts-vault');
      if (fromRedis && typeof fromRedis === 'string') {
        const parsed: OwnerAccount[] = JSON.parse(fromRedis);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(
            (a) =>
              !deletedIdentifiers.has(a.businessSlug.toLowerCase()) &&
              !deletedIdentifiers.has(a.email.toLowerCase())
          );
          accountsCache = valid;
          lastCloudSyncTime = now;
          writeAccountsToFile(valid);
          return valid;
        }
      }
    } catch {}

    // 2. Try Supabase sys-accounts-vault row
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('businesses')
        .select('google_review_link')
        .eq('slug', 'sys-accounts-vault')
        .maybeSingle();

      if (!error && data?.google_review_link) {
        const parsed: OwnerAccount[] = JSON.parse(data.google_review_link);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(
            (a) =>
              !deletedIdentifiers.has(a.businessSlug.toLowerCase()) &&
              !deletedIdentifiers.has(a.email.toLowerCase())
          );
          accountsCache = valid;
          lastCloudSyncTime = now;
          writeAccountsToFile(valid);
          // Mirror to Redis
          redisCache.set('sys:accounts-vault', JSON.stringify(valid), 0).catch(() => {});
          return valid;
        }
      }
    }
  } catch (syncErr) {
    console.warn('Sync accounts from cloud notice:', syncErr);
  }

  const fallback = readAccountsFromFile();
  lastCloudSyncTime = now;
  return fallback;
}

// Asynchronously persist all accounts to Cloud (Supabase + Redis)
export async function persistAccountsToCloud(accounts: OwnerAccount[]): Promise<void> {
  const filtered = accounts.filter(
    (a) =>
      !deletedIdentifiers.has(a.businessSlug.toLowerCase()) &&
      !deletedIdentifiers.has(a.email.toLowerCase())
  );

  const serialized = JSON.stringify(filtered);

  // 1. Mirror to Redis
  try {
    await redisCache.set('sys:accounts-vault', serialized, 0);
  } catch {}

  // 2. Persist permanently to Supabase businesses vault
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('businesses').upsert(
        [
          {
            id: '00000000-0000-4000-a000-000000000002',
            name: 'Merchant Accounts Vault',
            slug: 'sys-accounts-vault',
            google_review_link: serialized,
            is_active: false,
          },
        ],
        { onConflict: 'slug' }
      );
    } catch (e) {
      console.warn('Supabase persist accounts notice:', e);
    }
  }
}

export function saveOwnerAccount(account: Omit<OwnerAccount, 'id' | 'createdAt'>): OwnerAccount {
  const cleanEmail = account.email.toLowerCase().trim();
  const cleanSlug = account.businessSlug.toLowerCase().trim();
  deletedIdentifiers.delete(cleanEmail);
  deletedIdentifiers.delete(cleanSlug);

  accountsCache = readAccountsFromFile();
  
  const existingIdx = accountsCache.findIndex(
    (a) => a.email.toLowerCase() === cleanEmail || a.businessSlug.toLowerCase() === cleanSlug
  );

  const newAccount: OwnerAccount = {
    id: 'acc-' + Date.now(),
    ...account,
    email: cleanEmail,
    businessSlug: cleanSlug,
    createdAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    accountsCache[existingIdx] = newAccount;
  } else {
    accountsCache.unshift(newAccount);
  }

  writeAccountsToFile(accountsCache);
  persistAccountsToCloud(accountsCache).catch(() => {});
  return newAccount;
}

export function getAllOwnerAccounts(): OwnerAccount[] {
  accountsCache = readAccountsFromFile();
  return accountsCache;
}

export function getOwnerAccountByEmail(email: string): OwnerAccount | undefined {
  accountsCache = readAccountsFromFile();
  const cleanEmail = email.toLowerCase().trim();
  if (deletedIdentifiers.has(cleanEmail)) return undefined;
  return accountsCache.find((a) => a.email.toLowerCase() === cleanEmail);
}

export function verifyOwnerLogin(email: string, password: string): { success: boolean; account?: OwnerAccount; message?: string } {
  accountsCache = readAccountsFromFile();
  const cleanEmail = email.toLowerCase().trim();
  if (deletedIdentifiers.has(cleanEmail)) {
    return { success: false, message: 'This store account has been permanently deleted.' };
  }
  const account = accountsCache.find((a) => a.email.toLowerCase() === cleanEmail);

  if (!account) {
    return { success: false, message: 'Account not found. Please create an account in the Agency Onboarding Panel first.' };
  }

  if (account.password !== password) {
    return { success: false, message: 'Incorrect 8-character password. Please check and try again.' };
  }

  return { success: true, account };
}

export function getAccountBySlug(slug: string): OwnerAccount | undefined {
  accountsCache = readAccountsFromFile();
  const cleanSlug = slug.toLowerCase().trim();
  if (deletedIdentifiers.has(cleanSlug)) return undefined;
  return accountsCache.find((a) => a.businessSlug.toLowerCase() === cleanSlug);
}

export function updateOwnerPassword(email: string, newPassword: string): boolean {
  accountsCache = readAccountsFromFile();
  const existingIdx = accountsCache.findIndex(
    (a) => a.email.toLowerCase() === email.toLowerCase().trim()
  );

  if (existingIdx >= 0) {
    accountsCache[existingIdx].password = newPassword;
    writeAccountsToFile(accountsCache);
    persistAccountsToCloud(accountsCache).catch(() => {});
    return true;
  }
  return false;
}

export function deleteOwnerAccount(emailOrSlug: string): boolean {
  const target = emailOrSlug.toLowerCase().trim();
  deletedIdentifiers.add(target);

  accountsCache = readAccountsFromFile();
  const initialLength = accountsCache.length;
  accountsCache = accountsCache.filter(
    (a) => a.email.toLowerCase() !== target && a.businessSlug.toLowerCase() !== target
  );
  
  writeAccountsToFile(accountsCache);
  persistAccountsToCloud(accountsCache).catch(() => {});

  // Clean individual keys in Redis
  try {
    redisCache.del([`account:${target}`, `account:email:${target}`]).catch(() => {});
  } catch {}

  return accountsCache.length < initialLength;
}

export function updateOwnerAccount(
  slugOrEmail: string,
  updates: Partial<Pick<OwnerAccount, 'category' | 'googleReviewLink' | 'businessName'>>
): OwnerAccount | null {
  accountsCache = readAccountsFromFile();
  const cleanTarget = slugOrEmail.toLowerCase().trim();
  const existingIdx = accountsCache.findIndex(
    (a) => a.businessSlug.toLowerCase() === cleanTarget || a.email.toLowerCase() === cleanTarget
  );

  if (existingIdx >= 0) {
    if (updates.category !== undefined) {
      accountsCache[existingIdx].category = updates.category;
    }
    if (updates.googleReviewLink !== undefined) {
      accountsCache[existingIdx].googleReviewLink = updates.googleReviewLink;
    }
    if (updates.businessName !== undefined) {
      accountsCache[existingIdx].businessName = updates.businessName;
    }
    writeAccountsToFile(accountsCache);
    persistAccountsToCloud(accountsCache).catch(() => {});
    return accountsCache[existingIdx];
  }
  return null;
}
