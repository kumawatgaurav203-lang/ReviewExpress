import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { SessionUser, AuditLog, BusinessMember } from './types';
import { supabase, isSupabaseConfigured } from './supabase';
import { getAllOwnerAccounts, getOwnerAccountByEmail } from './accounts-store';

// Server-side signing secret
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.RESEND_API_KEY || 'reviewxpress-secure-salt-2026-xyz';

// Local audit logs file
const auditLogsPath = path.join(process.cwd(), 'data', 'audit_logs.json');
const membershipsPath = path.join(process.cwd(), 'data', 'memberships.json');

// Read memberships from local storage
function readMembershipsFromFile(): BusinessMember[] {
  try {
    if (fs.existsSync(membershipsPath)) {
      return JSON.parse(fs.readFileSync(membershipsPath, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to read memberships file:', err);
  }
  return [];
}

function writeMembershipsToFile(members: BusinessMember[]) {
  try {
    const dir = path.dirname(membershipsPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(membershipsPath, JSON.stringify(members, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write memberships file:', err);
  }
}

// Generate signed token
export function createSessionToken(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify({
    ...user,
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  })).toString('base64url');

  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

// Verify signed token
export function verifySessionToken(token: string): SessionUser | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', AUTH_SECRET)
      .update(payload)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && Date.now() > data.exp) {
      return null;
    }

    return {
      userId: data.userId,
      email: data.email,
      role: data.role,
      authorizedBusinessIds: data.authorizedBusinessIds || [],
      businessName: data.businessName,
      businessSlug: data.businessSlug,
    };
  } catch (err) {
    return null;
  }
}

// Extract session user from request
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  // 1. Check Authorization header
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const verified = verifySessionToken(token);
    if (verified) return verified;
  }

  // 2. Check custom session header
  const customHeader = req.headers.get('x-rx-session');
  if (customHeader) {
    const verified = verifySessionToken(customHeader);
    if (verified) return verified;

    // Backward compatibility for JSON session in header
    try {
      const parsed = JSON.parse(customHeader);
      if (parsed.email) {
        return getSessionUserByEmail(parsed.email);
      }
    } catch (e) {}
  }

  // 3. Check cookies
  const cookie = req.cookies.get('rx_token')?.value;
  if (cookie) {
    const verified = verifySessionToken(cookie);
    if (verified) return verified;
  }

  return null;
}

// Resolve user by email and load memberships
export async function getSessionUserByEmail(email: string): Promise<SessionUser | null> {
  const cleanEmail = email.toLowerCase().trim();

  // Admin special handling
  if (cleanEmail === 'admin@reviewxpress.in') {
    return {
      userId: 'u0000000-0000-4000-8000-000000000001',
      email: cleanEmail,
      role: 'admin',
      authorizedBusinessIds: ['*'], // wildcard for all
      businessName: 'System Admin',
    };
  }

  const authorizedBusinessIds: string[] = [];
  let userId = '';
  let businessName = '';
  let businessSlug = '';

  // 1. Check in Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      // Find user
      const { data: dbUser } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('email', cleanEmail)
        .single();

      if (dbUser) {
        userId = dbUser.id;
        // Find business memberships
        const { data: members } = await supabase
          .from('business_members')
          .select('business_id, role, businesses(id, name, slug)')
          .eq('user_id', dbUser.id);

        if (members && members.length > 0) {
          members.forEach((m: any) => {
            if (m.business_id) authorizedBusinessIds.push(m.business_id);
            if (m.businesses?.id) authorizedBusinessIds.push(m.businesses.id);
            if (m.businesses?.slug) {
              authorizedBusinessIds.push(m.businesses.slug);
              authorizedBusinessIds.push('b-' + m.businesses.slug);
              if (!businessSlug) {
                businessSlug = m.businesses.slug;
                businessName = m.businesses.name;
              }
            }
          });
        }
      }
    } catch (err) {
      console.warn('Database user session resolution note:', err);
    }
  }

  // 2. Local accounts store
  const localAccount = getOwnerAccountByEmail(cleanEmail);
  if (localAccount) {
    if (!userId) userId = localAccount.id;
    if (!businessName) businessName = localAccount.businessName;
    if (!businessSlug) businessSlug = localAccount.businessSlug;

    const slugId = 'b-' + localAccount.businessSlug;
    if (!authorizedBusinessIds.includes(localAccount.businessSlug)) {
      authorizedBusinessIds.push(localAccount.businessSlug);
    }
    if (!authorizedBusinessIds.includes(slugId)) {
      authorizedBusinessIds.push(slugId);
    }
  }

  // Check local memberships file
  const localMembers = readMembershipsFromFile().filter(
    (m) => m.user_id === userId || (localAccount && m.user_id === localAccount.id)
  );
  localMembers.forEach((m) => {
    if (!authorizedBusinessIds.includes(m.business_id)) {
      authorizedBusinessIds.push(m.business_id);
    }
  });

  if (!userId && !localAccount) {
    return null;
  }

  return {
    userId: userId || ('u-' + Date.now()),
    email: cleanEmail,
    role: 'owner',
    authorizedBusinessIds,
    businessName,
    businessSlug,
  };
}

/**
 * Anti-IDOR Authorization Check:
 * Enforces that a user can access only businesses they are explicitly authorized for.
 */
export async function authorizeBusinessAccess(
  sessionUser: SessionUser | null,
  requestedBusinessId: string
): Promise<{ authorized: boolean; reason?: string }> {
  if (!sessionUser) {
    return { authorized: false, reason: 'Unauthorized: Authentication required.' };
  }

  // Admins can access everything
  if (sessionUser.role === 'admin' || sessionUser.authorizedBusinessIds.includes('*')) {
    return { authorized: true };
  }

  // Demo portal is accessible to all
  if (
    requestedBusinessId === 'b0000000-0000-4000-8000-000000000000' ||
    requestedBusinessId === 'demo' ||
    requestedBusinessId === 'b-demo'
  ) {
    return { authorized: true };
  }

  // Clean requested ID
  const cleanReq = requestedBusinessId.trim();
  const slugFromB = cleanReq.startsWith('b-') ? cleanReq.slice(2) : cleanReq;

  // Direct match in user's authorized IDs
  if (
    sessionUser.authorizedBusinessIds.includes(cleanReq) ||
    sessionUser.authorizedBusinessIds.includes(slugFromB) ||
    sessionUser.authorizedBusinessIds.includes('b-' + slugFromB)
  ) {
    return { authorized: true };
  }

  // Check Supabase business_members in real time
  if (isSupabaseConfigured() && sessionUser.userId) {
    try {
      // Check if requestedBusinessId is a UUID or slug
      const { data: biz } = await supabase
        .from('businesses')
        .select('id, slug')
        .or(`id.eq.${cleanReq},slug.eq.${slugFromB}`)
        .single();

      if (biz) {
        const { data: member } = await supabase
          .from('business_members')
          .select('id')
          .eq('business_id', biz.id)
          .eq('user_id', sessionUser.userId)
          .single();

        if (member) {
          return { authorized: true };
        }
      }
    } catch (err) {
      // ignore
    }
  }

  return {
    authorized: false,
    reason: `Access Denied: You do not have permission to view or manage store '${requestedBusinessId}'.`,
  };
}

/**
 * Link user to a business in local storage (fallback)
 */
export function addLocalMembership(businessId: string, userId: string, role: 'owner' | 'admin' = 'owner') {
  const members = readMembershipsFromFile();
  const exists = members.find((m) => m.business_id === businessId && m.user_id === userId);
  if (!exists) {
    members.push({
      id: 'bm-' + Date.now(),
      business_id: businessId,
      user_id: userId,
      role,
      created_at: new Date().toISOString(),
    });
    writeMembershipsToFile(members);
  }
}

/**
 * Record a security event in audit_logs
 */
export async function logAuditEvent(
  action: string,
  meta: {
    userId?: string;
    businessId?: string;
    details?: Record<string, any>;
    req?: NextRequest;
  }
): Promise<void> {
  const ip = meta.req
    ? (meta.req.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim()
    : '127.0.0.1';
  const ua = meta.req ? meta.req.headers.get('user-agent') || 'system' : 'system';

  const logEntry: AuditLog = {
    user_id: meta.userId,
    business_id: meta.businessId,
    action,
    details: meta.details || {},
    ip_address: ip,
    user_agent: ua,
    created_at: new Date().toISOString(),
  };

  // 1. Persist to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('audit_logs').insert([logEntry]);
    } catch (err) {
      // non-blocking
    }
  }

  // 2. Persist to local JSON
  try {
    const dir = path.dirname(auditLogsPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    let existingLogs: AuditLog[] = [];
    if (fs.existsSync(auditLogsPath)) {
      existingLogs = JSON.parse(fs.readFileSync(auditLogsPath, 'utf8'));
    }
    existingLogs.unshift(logEntry);
    if (existingLogs.length > 50) existingLogs = existingLogs.slice(0, 50);
    fs.writeFileSync(auditLogsPath, JSON.stringify(existingLogs), 'utf8');
  } catch (err) {
    // non-blocking
  }
}

/**
 * Resolve any business identifier (slug or UUID) to its canonical UUID
 */
export async function resolveBusinessUuid(idOrSlug: string): Promise<string> {
  const clean = (idOrSlug || '').trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(clean)) return clean;

  const rawSlug = clean.startsWith('b-') ? clean.slice(2) : clean;

  if (rawSlug === 'demo') {
    return 'b0000000-0000-4000-8000-000000000000';
  }

  if (rawSlug === 'photify-studio' || rawSlug === 'photify-studios') {
    return 'b1000000-0000-4000-8000-000000000001';
  }

  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from('businesses')
        .select('id')
        .eq('slug', rawSlug)
        .single();
      if (data?.id) return data.id;
    } catch (e) {}
  }

  return clean;
}
