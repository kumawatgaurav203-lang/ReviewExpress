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

    // 3. Resolve session and authorized businesses
    const sessionUser = await getSessionUserByEmail(cleanEmail);
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
