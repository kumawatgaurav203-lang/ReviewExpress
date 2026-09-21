import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ============================================================================
// CONFIGURATION & SECRETS
// ============================================================================
export const MASTER_ADMIN_EMAIL =
  process.env.MASTER_ADMIN_EMAIL?.trim().toLowerCase() || 'reviewxpressindia@gmail.com';

const configFilePath = path.join(process.cwd(), 'data', 'admin-config.json');
let cachedAdminKey: string | null = null;

// Synchronously get the key (memory cache -> local file -> default)
export function getMasterAdminKey(): string {
  if (cachedAdminKey) return cachedAdminKey;

  try {
    if (fs.existsSync(configFilePath)) {
      const content = fs.readFileSync(configFilePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed?.masterKey && typeof parsed.masterKey === 'string' && parsed.masterKey.trim()) {
        const key = parsed.masterKey.trim();
        cachedAdminKey = key;
        return key;
      }
    }
  } catch (err) {
    console.warn('Failed to read admin-config.json:', err);
  }

  const envKey = process.env.MASTER_ADMIN_KEY?.trim();
  if (envKey) {
    cachedAdminKey = envKey;
    return envKey;
  }

  const defaultKey = 'Admin@ReviewXpress2026!';
  cachedAdminKey = defaultKey;
  return defaultKey;
}

import { redisCache } from '@/lib/redis';

// Asynchronously sync the master key from Redis and Supabase DB (guarantees persistence across Render restarts)
export async function syncMasterAdminKeyWithDb(): Promise<string> {
  // 1. Try Redis (Render Key Value)
  try {
    const fromRedis = await redisCache.get<string>('sys:master-admin-key');
    if (fromRedis && typeof fromRedis === 'string' && fromRedis.trim().length >= 8) {
      cachedAdminKey = fromRedis.trim();
      return cachedAdminKey;
    }
  } catch {}

  // 2. Try Supabase businesses table (sys-master-admin-key vault row)
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('google_review_link')
        .eq('slug', 'sys-master-admin-key')
        .maybeSingle();

      if (!error && data?.google_review_link && typeof data.google_review_link === 'string' && data.google_review_link.trim().length >= 8) {
        const keyFromDb = data.google_review_link.trim();
        cachedAdminKey = keyFromDb;
        // Mirror to Redis for instant lookup
        redisCache.set('sys:master-admin-key', keyFromDb, 0).catch(() => {});
        return keyFromDb;
      }
    } catch (e) {
      console.warn('Sync master key with db error:', e);
    }
  }

  return getMasterAdminKey();
}

export async function setMasterAdminKey(newKey: string): Promise<boolean> {
  try {
    const trimmed = newKey.trim();
    if (!trimmed || trimmed.length < 8) return false;

    // 1. Immediately cache in-memory
    cachedAdminKey = trimmed;

    // 2. Persist to Redis (survives container redeploys)
    try {
      await redisCache.set('sys:master-admin-key', trimmed, 0);
    } catch (rErr) {
      console.warn('Redis key persist notice:', rErr);
    }

    // 3. Persist permanently to Supabase DB (businesses table)
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('businesses').upsert(
          [
            {
              id: '00000000-0000-4000-a000-000000000001',
              name: 'Master Admin Key Vault',
              slug: 'sys-master-admin-key',
              google_review_link: trimmed,
              is_active: false,
            },
          ],
          { onConflict: 'slug' }
        );
      } catch (dbErr) {
        console.warn('Supabase key persist notice:', dbErr);
      }
    }

    // 4. Persist locally to data/admin-config.json
    try {
      const dir = path.dirname(configFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        configFilePath,
        JSON.stringify({ masterKey: trimmed, updatedAt: new Date().toISOString() }, null, 2),
        'utf-8'
      );
    } catch (fsErr) {
      console.warn('Local fs save notice:', fsErr);
    }

    return true;
  } catch (err) {
    console.error('Failed to write master key:', err);
    return false;
  }
}

export const MASTER_ADMIN_KEY = getMasterAdminKey();

const SIGNING_SECRET =
  process.env.RESEND_API_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'rx_ultra_secure_master_signing_secret_2026';

export const COOKIE_NAME = 'rx_master_admin_session';
// Session auto-locks after exactly 15 minutes as requested by user
export const SESSION_MAX_AGE_SECONDS = 15 * 60; // 15 minutes


// ============================================================================
// IN-MEMORY ZERO-STORAGE STORES (Ultra-lightweight, <10KB RAM)
// ============================================================================
interface OtpEntry {
  otp: string;
  expiresAt: number;
  attempts: number;
}

interface RateLimitEntry {
  attempts: number;
  lockedUntil: number;
}

const globalAny: any = global;
const adminOtpStore: Map<string, OtpEntry> = globalAny.adminOtpStore || new Map();
if (!globalAny.adminOtpStore) globalAny.adminOtpStore = adminOtpStore;

const rateLimitStore: Map<string, RateLimitEntry> = globalAny.adminRateLimitStore || new Map();
if (!globalAny.adminRateLimitStore) globalAny.adminRateLimitStore = rateLimitStore;

// Clean up expired items every 5 minutes to prevent any memory bloat
setInterval(() => {
  const now = Date.now();
  adminOtpStore.forEach((val, key) => {
    if (now > val.expiresAt) adminOtpStore.delete(key);
  });
  rateLimitStore.forEach((val, ip) => {
    if (now > val.lockedUntil && val.attempts === 0) rateLimitStore.delete(ip);
  });
}, 5 * 60 * 1000);

// ============================================================================
// RATE LIMITING & BRUTE FORCE SHIELD
// ============================================================================
export function checkRateLimit(ip: string): { allowed: boolean; remainingLockoutSeconds?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry) return { allowed: true };

  if (entry.lockedUntil > now) {
    const remaining = Math.ceil((entry.lockedUntil - now) / 1000);
    return { allowed: false, remainingLockoutSeconds: remaining };
  }

  // If lockout expired, reset attempts
  if (entry.lockedUntil > 0 && entry.lockedUntil <= now) {
    rateLimitStore.delete(ip);
  }

  return { allowed: true };
}

export function recordFailedAttempt(ip: string): { locked: boolean; remainingAttempts: number; lockoutSeconds: number } {
  const now = Date.now();
  let entry = rateLimitStore.get(ip);
  if (!entry) {
    entry = { attempts: 0, lockedUntil: 0 };
    rateLimitStore.set(ip, entry);
  }

  entry.attempts += 1;
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
    return { locked: true, remainingAttempts: 0, lockoutSeconds: 15 * 60 };
  }

  return {
    locked: false,
    remainingAttempts: MAX_ATTEMPTS - entry.attempts,
    lockoutSeconds: 0,
  };
}

export function resetRateLimit(ip: string): void {
  rateLimitStore.delete(ip);
}

// ============================================================================
// TWO-FACTOR OTP GENERATOR & VERIFIER
// ============================================================================
export function generateAdminOtp(): string {
  // Cryptographically secure 6-digit random number
  const otp = crypto.randomInt(100000, 1000000).toString();
  adminOtpStore.set(MASTER_ADMIN_EMAIL, {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    attempts: 0,
  });
  return otp;
}

export function verifyAdminOtp(inputOtp: string): { success: boolean; message: string } {
  const entry = adminOtpStore.get(MASTER_ADMIN_EMAIL);
  if (!entry) {
    return { success: false, message: 'No active OTP found. Please request a new verification code.' };
  }

  if (Date.now() > entry.expiresAt) {
    adminOtpStore.delete(MASTER_ADMIN_EMAIL);
    return { success: false, message: 'Verification OTP has expired (5 minute limit). Please request a new code.' };
  }

  entry.attempts += 1;
  if (entry.attempts > 3) {
    adminOtpStore.delete(MASTER_ADMIN_EMAIL);
    return { success: false, message: 'Too many incorrect OTP attempts. Please request a fresh code.' };
  }

  if (entry.otp !== inputOtp.trim()) {
    const remaining = 3 - entry.attempts;
    return {
      success: false,
      message: `Invalid OTP code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Code invalidated.'}`,
    };
  }

  // OTP verified successfully! Delete immediately to prevent replay
  adminOtpStore.delete(MASTER_ADMIN_EMAIL);
  return { success: true, message: 'OTP verified successfully.' };
}

// Helper to mask email for UI display: rev*********@gmail.com
export function getMaskedAdminEmail(): string {
  const [user, domain] = MASTER_ADMIN_EMAIL.split('@');
  if (!user || !domain) return '***@***.com';
  const visible = user.slice(0, 3);
  return `${visible}******@${domain}`;
}

// ============================================================================
// STATELESS HMAC-SHA256 SESSION TOKEN (0 Bytes DB Storage)
// ============================================================================
interface TokenPayload {
  role: 'master_admin';
  email: string;
  iat: number;
  exp: number;
}

export function createMasterAdminToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    role: 'master_admin',
    email: MASTER_ADMIN_EMAIL,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SIGNING_SECRET + getMasterAdminKey())
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

export function verifyMasterAdminToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payloadB64, signature] = parts;

  // Re-create expected signature
  const expectedSignature = crypto
    .createHmac('sha256', SIGNING_SECRET + getMasterAdminKey())
    .update(payloadB64)
    .digest('base64url');

  // Constant-time comparison against timing attacks
  const sigBuffer = Buffer.from(signature);
  const expBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    return false;
  }

  try {
    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload: TokenPayload = JSON.parse(payloadJson);

    if (payload.role !== 'master_admin' || payload.email !== MASTER_ADMIN_EMAIL) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    if (now > payload.exp) {
      return false; // Token expired
    }

    return true;
  } catch {
    return false;
  }
}

// Helper to verify request directly from NextRequest (via cookie or header)
export function verifyMasterAdminRequest(req: NextRequest): boolean {
  // 1. Check in Cookies
  const cookieToken = req.cookies.get(COOKIE_NAME)?.value;
  if (cookieToken && verifyMasterAdminToken(cookieToken)) {
    return true;
  }

  // 2. Check Authorization Header (Bearer token)
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const headerToken = authHeader.substring(7).trim();
    if (verifyMasterAdminToken(headerToken)) {
      return true;
    }
  }

  // 3. Check custom header x-master-admin-token
  const customHeader = req.headers.get('x-master-admin-token');
  if (customHeader && verifyMasterAdminToken(customHeader)) {
    return true;
  }

  return false;
}
