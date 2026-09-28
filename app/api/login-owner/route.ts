import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnerLogin, getOwnerAccountByEmail, syncAccountsFromCloud } from '@/lib/accounts-store';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { createSessionToken, getSessionUserByEmail, logAuditEvent } from '@/lib/auth-server';
import { checkRateLimit, RATE_LIMITS, checkRequestSize, validateField, hasSQLInjection } from '@/lib/api-guard';

export async function POST(req: NextRequest) {
  try {
    // ── Request size guard ──────────────────────────────────────────
    const sizeError = checkRequestSize(req, 4 * 1024); // 4 KB max
    if (sizeError) return sizeError;

    // ── Rate Limiting: 10 login attempts per 15 minutes per IP ─────
    const rateCheck = checkRateLimit(req, 'login-owner', RATE_LIMITS.LOGIN);
    if (!rateCheck.allowed) return rateCheck.response;

    const body = await req.json();
    const { email, password } = body;

    // ── Input Validation + SQL Injection Guard ──────────────────────
    const emailError = validateField(email, 'Email', { isEmail: true, maxLength: 254 });
    if (emailError) return emailError;

    if (!password || typeof password !== 'string' || password.length !== 8) {
      return NextResponse.json(
        { success: false, message: 'Password must be exactly 8 characters / digits.' },
        { status: 400 }
      );
    }

    if (hasSQLInjection(password)) {
      return NextResponse.json({ success: false, message: 'Invalid characters in password.' }, { status: 400 });
    }

    const cleanEmail = (email as string).toLowerCase().trim();

    // 1. Check in Supabase users table first if configured
    let isAuthenticated = false;
    let userId = '';
    let userRole: 'admin' | 'owner' | 'staff' = 'owner';

    if (isSupabaseConfigured()) {
      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select('id, email, password_hash, role')
          .eq('email', cleanEmail)
          .single();

        if (dbUser && dbUser.password_hash === password) {
          isAuthenticated = true;
          userId = dbUser.id;
          userRole = dbUser.role as any;
        }
      } catch (err) {
        // Fallback to local accounts
      }
    }

    // 2. Fallback to local accounts store (sync from cloud vault first)
    await syncAccountsFromCloud().catch(() => {});
    let localAccount = getOwnerAccountByEmail(cleanEmail);
    if (!isAuthenticated) {
      const authResult = verifyOwnerLogin(cleanEmail, password);
      if (authResult.success && authResult.account) {
        isAuthenticated = true;
        localAccount = authResult.account;
        userId = authResult.account.id;
      }
    }

    if (!isAuthenticated) {
      await logAuditEvent('LOGIN_FAILED', {
        details: { email: cleanEmail, reason: 'Invalid credentials' },
        req,
      });

      return NextResponse.json(
        { success: false, message: 'Invalid credentials or account not found.' },
        { status: 401 }
      );
    }

    // 3. Resolve session user
    const sessionUser = await getSessionUserByEmail(cleanEmail);

    // 4. Check if store account has been deactivated by administrator
    const storeSlug = localAccount?.businessSlug || sessionUser?.businessSlug || '';
    const storeName = sessionUser?.businessName || localAccount?.businessName || 'Store';

    let isStoreDeactivated = localAccount?.is_active === false || localAccount?.status === 'deactivated';
    let deactivationReason = localAccount?.deactivationReason || 'Subscription / Renewal Due';
    let deactivationNote = localAccount?.deactivationNote || '';
    let deactivatedAt = localAccount?.deactivatedAt || '';

    if (isSupabaseConfigured() && storeSlug && storeSlug !== 'demo') {
      try {
        const { data: dbBiz } = await supabase
          .from('businesses')
          .select('is_active')
          .eq('slug', storeSlug)
          .maybeSingle();

        if (dbBiz && dbBiz.is_active === false) {
          isStoreDeactivated = true;
        }
      } catch {}
    }

    if (isStoreDeactivated) {
      await logAuditEvent('LOGIN_BLOCKED_DEACTIVATED', {
        userId: sessionUser?.userId || userId,
        details: { email: cleanEmail, slug: storeSlug, reason: deactivationReason },
        req,
      });

      return NextResponse.json(
        {
          success: false,
          isDeactivated: true,
          storeName,
          storeSlug,
          reason: deactivationReason,
          note: deactivationNote,
          deactivatedAt,
          message: 'Account Suspended: This store account has been temporarily deactivated by the administrator.',
        },
        { status: 403 }
      );
    }

    // 5. Create session token and authorized businesses
    const sessionToken = createSessionToken({
      userId: userId || sessionUser?.userId || ('u-' + Date.now()),
      email: cleanEmail,
      role: userRole || sessionUser?.role || 'owner',
      authorizedBusinessIds: sessionUser?.authorizedBusinessIds || (localAccount ? [localAccount.businessSlug, 'b-' + localAccount.businessSlug] : []),
      businessName: sessionUser?.businessName || localAccount?.businessName || 'Store',
      businessSlug: sessionUser?.businessSlug || localAccount?.businessSlug || 'store',
    });

    await logAuditEvent('LOGIN_SUCCESS', {
      userId: sessionUser?.userId || userId,
      details: { email: cleanEmail, role: userRole },
      req,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Login successful!',
      token: sessionToken,
      user: {
        id: sessionUser?.userId || userId,
        email: cleanEmail,
        role: userRole,
        businessName: sessionUser?.businessName || localAccount?.businessName || 'Store',
        businessSlug: sessionUser?.businessSlug || localAccount?.businessSlug || 'store',
        authorizedBusinessIds: sessionUser?.authorizedBusinessIds || [],
      },
    });

    // Set secure cookie as well
    response.cookies.set('rx_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error during login.' },
      { status: 500 }
    );
  }
}
