/**
 * lib/api-guard.ts
 * ─────────────────────────────────────────────────────────────
 * Centralized API Security Module for ReviewXpress SaaS
 *
 * Provides:
 *  1. Rate Limiting       — per-IP, per-action limits (in-memory, zero storage)
 *  2. Input Sanitization  — strip HTML/script tags, limit lengths
 *  3. SQL Injection Guard — detect & reject injection payloads
 *  4. Email Validation    — strict RFC-like regex
 *  5. Slug / ID Sanitizer — safe alphanumeric slug validation
 *  6. Request Size Guard  — reject oversized payloads early
 * ─────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server';

// ─── Singleton rate limit store (zero-DB, zero-storage) ────────────────────
interface RateLimitEntry {
  count: number;
  resetAt: number;
  blockedUntil?: number;
}

// Global map persisted across hot-reloads in dev via globalThis pattern
const globalAny = global as any;
if (!globalAny.__rxRateStore) globalAny.__rxRateStore = new Map<string, RateLimitEntry>();
const rateLimitStore: Map<string, RateLimitEntry> = globalAny.__rxRateStore;

// Auto-cleanup every 10 minutes to avoid memory creep
if (!globalAny.__rxRateCleanupScheduled) {
  globalAny.__rxRateCleanupScheduled = true;
  setInterval(() => {
    const now = Date.now();
    rateLimitStore.forEach((entry, key) => {
      if (now > entry.resetAt && (!entry.blockedUntil || now > entry.blockedUntil)) {
        rateLimitStore.delete(key);
      }
    });
  }, 10 * 60 * 1000);
}

// ─── Rate Limit Configurations ─────────────────────────────────────────────
export interface RateLimitConfig {
  /** Max requests allowed in windowMs */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Block duration after limit exceeded (default: windowMs) */
  blockMs?: number;
  /** Human-readable label for error messages */
  label?: string;
}

/** Pre-built configs for common routes */
export const RATE_LIMITS = {
  /** OTP send: max 5 per 10 minutes per IP */
  SEND_OTP: { limit: 5, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000, label: 'OTP request' },
  /** Login: max 10 per 15 minutes per IP */
  LOGIN: { limit: 10, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000, label: 'Login' },
  /** Forgot password: max 5 per 15 minutes per IP */
  FORGOT_PASSWORD: { limit: 5, windowMs: 15 * 60 * 1000, blockMs: 20 * 60 * 1000, label: 'Password reset' },
  /** Feedback submission: max 20 per 5 minutes per IP */
  SUBMIT_FEEDBACK: { limit: 20, windowMs: 5 * 60 * 1000, blockMs: 5 * 60 * 1000, label: 'Feedback submit' },
  /** Review generation: max 30 per 5 minutes per IP */
  GENERATE_REVIEW: { limit: 30, windowMs: 5 * 60 * 1000, blockMs: 5 * 60 * 1000, label: 'Review generation' },
  /** Log scan: max 60 per minute per IP (NFC/QR scans can be fast) */
  LOG_SCAN: { limit: 60, windowMs: 60 * 1000, blockMs: 60 * 1000, label: 'Scan log' },
} as const;

/**
 * Extracts the real client IP from request headers.
 * Handles Render/Cloudflare proxy forwarding.
 */
export function getClientIP(req: NextRequest): string {
  const cfIP = req.headers.get('cf-connecting-ip');
  if (cfIP) return cfIP.trim();

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  const realIP = req.headers.get('x-real-ip');
  if (realIP) return realIP.trim();

  return 'unknown';
}

/**
 * Checks rate limit for an IP + action key.
 * Returns { allowed: true } or { allowed: false, retryAfterSeconds, response }
 */
export function checkRateLimit(
  req: NextRequest,
  action: string,
  config: RateLimitConfig
): { allowed: true } | { allowed: false; retryAfterSeconds: number; response: NextResponse } {
  const ip = getClientIP(req);
  const key = `${action}:${ip}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // If block period is active
  if (entry?.blockedUntil && now < entry.blockedUntil) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
    return {
      allowed: false,
      retryAfterSeconds: retryAfter,
      response: NextResponse.json(
        {
          success: false,
          message: `Too many ${config.label || 'requests'}. Please wait ${Math.ceil(retryAfter / 60)} minute(s) before trying again.`,
          retryAfterSeconds: retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(config.limit),
            'X-RateLimit-Remaining': '0',
          },
        }
      ),
    };
  }

  // Reset window if expired
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + config.windowMs };
    rateLimitStore.set(key, entry);
  }

  entry.count++;

  if (entry.count > config.limit) {
    // Block the IP
    entry.blockedUntil = now + (config.blockMs ?? config.windowMs);
    rateLimitStore.set(key, entry);

    const retryAfter = Math.ceil((config.blockMs ?? config.windowMs) / 1000);
    return {
      allowed: false,
      retryAfterSeconds: retryAfter,
      response: NextResponse.json(
        {
          success: false,
          message: `Too many ${config.label || 'requests'}. Please wait ${Math.ceil(retryAfter / 60)} minute(s) before trying again.`,
          retryAfterSeconds: retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(config.limit),
            'X-RateLimit-Remaining': '0',
          },
        }
      ),
    };
  }

  const remaining = Math.max(0, config.limit - entry.count);
  return { allowed: true };
}

// ─── SQL Injection Detection ────────────────────────────────────────────────

/** Common SQL injection patterns to detect and reject */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|HAVING|GROUP\s+BY)\b)/i,
  /(--|;|\/\*|\*\/|xp_|WAITFOR|SLEEP\s*\(|BENCHMARK\s*\()/i,
  /('(\s*)(OR|AND)(\s*)'|\b1\s*=\s*1\b|\b1\s*=\s*'1'\b)/i,
  /(CHAR\s*\(|NCHAR\s*\(|VARCHAR\s*\(|CONVERT\s*\(|CAST\s*\()/i,
  /(%27|%3D|%2D%2D|%3B)/i,   // URL-encoded SQL chars
  /(\\\x27|\\\x22)/i,         // escaped quotes
];

/**
 * Checks if a string contains SQL injection patterns.
 * Returns true if injection detected.
 */
export function hasSQLInjection(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Checks an object's string values for SQL injection.
 * Returns the first key that contains injection, or null if clean.
 */
export function detectSQLInjection(obj: Record<string, unknown>): string | null {
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string' && hasSQLInjection(val)) {
      return key;
    }
  }
  return null;
}

// ─── XSS / HTML Sanitization ───────────────────────────────────────────────

/** Strips HTML tags and dangerous characters from a string */
export function sanitizeString(input: string, maxLength = 500): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .slice(0, maxLength)                          // enforce max length
    .replace(/<[^>]*>/g, '')                      // strip HTML tags
    .replace(/javascript\s*:/gi, '')              // strip JS protocol
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // strip event handlers
    .trim();
}

/** Sanitizes a business name: allows letters, numbers, spaces, hyphens, apostrophes */
export function sanitizeBusinessName(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .slice(0, 100)
    .replace(/[<>{}[\]\\\/|^~`]/g, '') // strip dangerous chars
    .replace(/\s+/g, ' ')              // collapse whitespace
    .trim();
}

// ─── Email Validation ───────────────────────────────────────────────────────

/** Strict email regex — rejects clearly malformed emails */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false;  // RFC 5321 max
  if (email.length < 5) return false;
  return EMAIL_REGEX.test(email.trim());
}

// ─── Slug / BusinessID Validation ──────────────────────────────────────────

/** Valid slug: only lowercase letters, numbers, hyphens. No spaces, no special chars. */
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,99}$/;
/** With optional 'b-' prefix */
const BUSINESS_ID_REGEX = /^(b-)?[a-z0-9][a-z0-9-]{0,99}$/;

export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  return SLUG_REGEX.test(slug.trim());
}

export function isValidBusinessId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  // Allow UUIDs too
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (UUID_REGEX.test(id.trim())) return true;
  return BUSINESS_ID_REGEX.test(id.trim());
}

/**
 * Sanitizes a businessId for safe use in Supabase .or() queries.
 * Removes characters that could break query syntax.
 */
export function sanitizeBusinessId(id: string): string {
  if (!id || typeof id !== 'string') return '';
  // Remove anything that's not alphanumeric, hyphen, or dash
  return id.replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 120);
}

// ─── URL Validation ─────────────────────────────────────────────────────────

/** Validates that a string is a safe HTTP/HTTPS URL */
export function isValidURL(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  if (url.length > 2048) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// ─── Request Size Guard ─────────────────────────────────────────────────────

/** Default max request body size: 50 KB */
const DEFAULT_MAX_BODY_BYTES = 50 * 1024;

/**
 * Checks if the Content-Length header exceeds the limit.
 * Returns a 413 response if too large, or null if OK.
 *
 * NOTE: Content-Length can be spoofed — this is a fast pre-check.
 * The actual body read enforces real limits via JSON parsing timeouts.
 */
export function checkRequestSize(
  req: NextRequest,
  maxBytes = DEFAULT_MAX_BODY_BYTES
): NextResponse | null {
  const contentLength = req.headers.get('content-length');
  if (contentLength) {
    const bytes = parseInt(contentLength, 10);
    if (!isNaN(bytes) && bytes > maxBytes) {
      return NextResponse.json(
        { success: false, message: `Request body too large. Maximum allowed size is ${Math.round(maxBytes / 1024)} KB.` },
        { status: 413 }
      );
    }
  }
  return null;
}

// ─── Convenience: Validate & Reject ────────────────────────────────────────

/**
 * All-in-one guard for string fields.
 * Returns an error response if validation fails, or null if OK.
 */
export function validateField(
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    patternMessage?: string;
    isEmail?: boolean;
    isSlug?: boolean;
    isURL?: boolean;
    checkSQLInjection?: boolean;
  } = {}
): NextResponse | null {
  const {
    required = true,
    minLength = 1,
    maxLength = 500,
    pattern,
    patternMessage,
    isEmail: checkEmail = false,
    isSlug: checkSlug = false,
    isURL: checkURL = false,
    checkSQLInjection = true,
  } = options;

  if (!value && required) {
    return NextResponse.json(
      { success: false, message: `${fieldName} is required.` },
      { status: 400 }
    );
  }
  if (!value && !required) return null;

  if (typeof value !== 'string') {
    return NextResponse.json(
      { success: false, message: `${fieldName} must be a text value.` },
      { status: 400 }
    );
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    return NextResponse.json(
      { success: false, message: `${fieldName} must be at least ${minLength} character(s) long.` },
      { status: 400 }
    );
  }

  if (trimmed.length > maxLength) {
    return NextResponse.json(
      { success: false, message: `${fieldName} is too long. Maximum ${maxLength} characters allowed.` },
      { status: 400 }
    );
  }

  if (checkEmail && !isValidEmail(trimmed)) {
    return NextResponse.json(
      { success: false, message: `${fieldName}: Please enter a valid email address.` },
      { status: 400 }
    );
  }

  if (checkSlug && !isValidSlug(trimmed)) {
    return NextResponse.json(
      { success: false, message: `${fieldName} contains invalid characters.` },
      { status: 400 }
    );
  }

  if (checkURL && !isValidURL(trimmed)) {
    return NextResponse.json(
      { success: false, message: `${fieldName}: Please enter a valid https:// URL.` },
      { status: 400 }
    );
  }

  if (pattern && !pattern.test(trimmed)) {
    return NextResponse.json(
      { success: false, message: patternMessage || `${fieldName} format is invalid.` },
      { status: 400 }
    );
  }

  if (checkSQLInjection && hasSQLInjection(trimmed)) {
    console.warn(`[Security] SQL injection attempt detected in field "${fieldName}": ${trimmed.slice(0, 80)}`);
    return NextResponse.json(
      { success: false, message: 'Invalid characters detected in request. Please remove special characters and try again.' },
      { status: 400 }
    );
  }

  return null;
}
