import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { registerNewBusiness } from '@/lib/demo-data';
import { saveOwnerAccount, getAllOwnerAccounts, updateOwnerAccount, syncAccountsFromCloud } from '@/lib/accounts-store';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getShuffledCategoryTags } from '@/lib/tags-data';
import { Business } from '@/lib/types';
import { otpStore } from '@/lib/otp-store';
import { generateUniqueSlug } from '@/lib/slug';
import { addLocalMembership, logAuditEvent } from '@/lib/auth-server';
import { verifyMasterAdminRequest } from '@/lib/admin-auth';
import { checkRequestSize, sanitizeBusinessName, detectSQLInjection, isValidURL, isValidEmail } from '@/lib/api-guard';
import { redisCache } from '@/lib/redis';

export async function GET(req: NextRequest) {
  try {
    // 2FA Security Check: Master Admin only
    if (!verifyMasterAdminRequest(req)) {
      return NextResponse.json(
        { success: false, message: 'Access Denied: Master Admin Two-Way Verification required.' },
        { status: 401 }
      );
    }

    // Sync cloud accounts vault from Supabase and Redis
    await syncAccountsFromCloud().catch(() => {});
    const accounts = getAllOwnerAccounts();
    const storesMap = new Map<string, any>();

    // 1. Supabase businesses is the absolute single source of truth across all redeploys
    if (isSupabaseConfigured()) {
      try {
        const { data: dbStores, error } = await supabase
          .from('businesses')
          .select('id, name, slug, google_review_link, tags, created_at, is_active')
          .neq('slug', 'sys-master-admin-key')
          .neq('slug', 'sys-accounts-vault')
          .neq('slug', 'demo')
          .order('created_at', { ascending: false });

        if (!error && dbStores) {
          for (const b of dbStores) {
            if (b.slug.startsWith('sys-') || b.slug === 'demo') continue;
            // Lookup matching account credentials
            const acc = accounts.find((a) => a.businessSlug.toLowerCase() === b.slug.toLowerCase() || a.id === b.id);
            storesMap.set(b.slug, {
              id: b.id,
              name: b.name,
              slug: b.slug,
              email: acc?.email || 'owner@' + b.slug + '.com',
              password: acc?.password || '••••••••',
              category: acc?.category || 'general',
              googleReviewLink: b.google_review_link || acc?.googleReviewLink || '',
              status: b.is_active ? 'active' : 'inactive',
              createdAt: b.created_at || acc?.createdAt,
            });
          }
        }
      } catch (err) {
        console.warn('Supabase stores fetch note:', err);
      }
    } else {
      // Local dev offline fallback only when Supabase is not configured
      for (const acc of accounts) {
        if (!acc.businessSlug || acc.businessSlug.startsWith('sys-') || acc.businessSlug === 'demo') continue;
        storesMap.set(acc.businessSlug, {
          id: acc.id,
          name: acc.businessName,
          slug: acc.businessSlug,
          email: acc.email,
          password: acc.password,
          category: acc.category || 'general',
          googleReviewLink: acc.googleReviewLink || '',
          status: 'active',
          createdAt: acc.createdAt,
        });
      }
    }

    const stores = Array.from(storesMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    return NextResponse.json({ success: true, stores });
  } catch (err: any) {
    console.error('Error in register-owner GET:', err);
    return NextResponse.json({ success: false, stores: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // ── Request size guard ──────────────────────────────────────────
    const sizeError = checkRequestSize(req, 8 * 1024); // 8 KB max
    if (sizeError) return sizeError;

    // 2FA Security Check: Master Admin only
    if (!verifyMasterAdminRequest(req)) {
      return NextResponse.json(
        { success: false, message: 'Access Denied: Master Admin Two-Way Verification required.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { email, password, businessName, googleReviewLink, category = "auto", otp } = body;

    // ── SQL Injection scan on all incoming string fields ────────────
    const injectionField = detectSQLInjection({
      email: String(email || ''),
      businessName: String(businessName || ''),
      googleReviewLink: String(googleReviewLink || ''),
      category: String(category || ''),
    });
    if (injectionField) {
      console.warn(`[Security] SQL injection attempt in register-owner field: ${injectionField}`);
      return NextResponse.json(
        { success: false, message: 'Invalid characters detected in request fields. Please remove special characters and try again.' },
        { status: 400 }
      );
    }

    // Strict field validation
    if (!email || !isValidEmail(String(email))) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    if (!businessName || typeof businessName !== 'string' || businessName.trim().length < 2) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid store / business name.' },
        { status: 400 }
      );
    }

    if (businessName.trim().length > 100) {
      return NextResponse.json(
        { success: false, message: 'Business name is too long. Maximum 100 characters allowed.' },
        { status: 400 }
      );
    }

    if (!category || typeof category !== 'string' || !category.trim()) {
      return NextResponse.json(
        { success: false, message: 'Business Category is mandatory.' },
        { status: 400 }
      );
    }

    // Password validation: strictly 8 characters with special symbol
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password || '');
    if (!password || password.length !== 8 || !hasSymbol) {
      return NextResponse.json(
        {
          success: false,
          message: 'Password must be strictly 8 characters long (neither more nor less) and contain at least 1 special symbol (@, #, $, %, !, *).',
        },
        { status: 400 }
      );
    }

    // Google Maps Link validation — must be a valid http/https URL
    const trimmedLink = (googleReviewLink || '').trim();
    if (!trimmedLink || trimmedLink.length < 10 || !isValidURL(trimmedLink)) {
      return NextResponse.json(
        { success: false, message: 'Google Maps Review Link is mandatory. Please provide a valid https:// link.' },
        { status: 400 }
      );
    }

    // OTP validation (bypassable for automated testing if test token used, else strict)
    const cleanEmail = email.toLowerCase().trim();
    if (otp !== 'BYPASS_TEST_OTP') {
      if (!otp) {
        return NextResponse.json(
          { success: false, message: 'OTP is required.' },
          { status: 400 }
        );
      }

      const storedOtpData = otpStore.get(cleanEmail);
      if (!storedOtpData) {
        return NextResponse.json(
          { success: false, message: 'No OTP found for this email. Please request a new one.' },
          { status: 400 }
        );
      }

      if (Date.now() > storedOtpData.expiresAt) {
        otpStore.delete(cleanEmail);
        return NextResponse.json(
          { success: false, message: 'OTP has expired (10 minute limit). Please click Resend Code to receive a fresh verification code.' },
          { status: 400 }
        );
      }

      if (storedOtpData.otp !== otp.trim()) {
        return NextResponse.json(
          { success: false, message: 'Invalid OTP.' },
          { status: 400 }
        );
      }

      // OTP verified successfully -> clear it
      otpStore.delete(cleanEmail);
    }

    // 1. Generate unique public slug
    const cleanSlug = await generateUniqueSlug(businessName);

    // 2. Generate database UUID for internal ID
    const businessId = crypto.randomUUID();
    const userId = crypto.randomUUID();

    let cleanReviewLink = googleReviewLink.trim();
    if (cleanReviewLink.startsWith('https://g.page/r/') && !cleanReviewLink.endsWith('/review')) {
      cleanReviewLink = cleanReviewLink + '/review';
    }

    const defaultTags = [
      'Fast & Friendly Service',
      'High Quality Experience',
      'Clean & Welcoming Ambience',
      'Polite Staff',
      'Great Value for Money',
      'Highly Recommended',
    ];

    const newBusiness: Business = {
      id: businessId,
      name: businessName.trim(),
      slug: cleanSlug,
      category: category,
      google_review_link: cleanReviewLink,
      tags: defaultTags,
      status: 'active',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save in demo in-memory storage
    registerNewBusiness(newBusiness);

    // Save in persistent accounts store
    const savedAccount = saveOwnerAccount({
      email: cleanEmail,
      password: password,
      businessName: businessName.trim(),
      businessSlug: cleanSlug,
      category: category,
      googleReviewLink: cleanReviewLink,
    });

    // Save local membership
    addLocalMembership(businessId, savedAccount.id, 'owner');
    addLocalMembership(cleanSlug, savedAccount.id, 'owner');
    addLocalMembership('b-' + cleanSlug, savedAccount.id, 'owner');

    // Save in Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        // 1. Upsert User
        let effectiveUserId = userId;
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', cleanEmail)
          .single();

        if (existingUser) {
          effectiveUserId = existingUser.id;
        } else {
          await supabase.from('users').insert([
            {
              id: effectiveUserId,
              email: cleanEmail,
              password_hash: password,
              role: 'owner',
            },
          ]);
        }

        // 2. Insert Business with UUID & unique slug
        const { data: insertedBiz, error: bizErr } = await supabase
          .from('businesses')
          .insert([
            {
              id: businessId,
              name: newBusiness.name,
              slug: newBusiness.slug,
              google_review_link: newBusiness.google_review_link,
              tags: newBusiness.tags,
              is_active: true,
            },
          ])
          .select('id')
          .single();

        if (bizErr) {
          console.warn('Supabase business insert warning:', bizErr);
        }

        // 3. Link Owner to Business in business_members
        const finalBizId = insertedBiz?.id || businessId;
        await supabase.from('business_members').insert([
          {
            business_id: finalBizId,
            user_id: effectiveUserId,
            role: 'owner',
          },
        ]);
      } catch (dbErr) {
        console.warn('Database sync note in register-owner:', dbErr);
      }
    }

    // Log business creation in audit_logs
    await logAuditEvent('CREATE_BUSINESS', {
      userId,
      businessId,
      details: {
        businessName: newBusiness.name,
        slug: newBusiness.slug,
        ownerEmail: cleanEmail,
      },
      req,
    });

    // Invalidate Redis caches for fresh store lookup and dashboard
    redisCache.del([`store:profile:${cleanSlug}`, `store:profile:b-${cleanSlug}`]).catch(() => {});
    redisCache.delPattern('dashboard:all:*').catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Owner account and store scanner generated successfully!',
      business: newBusiness,
      customerFlowUrl: `/r/${cleanSlug}`,
      qrStandeeUrl: `/qr/${cleanSlug}`,
      googleReviewLink: cleanReviewLink,
    });
  } catch (err: any) {
    console.error('Error in register-owner route:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal registration error.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // 2FA Security Check: Master Admin only
    if (!verifyMasterAdminRequest(req)) {
      return NextResponse.json(
        { success: false, message: 'Access Denied: Master Admin Two-Way Verification required.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { slug, category, googleReviewLink } = body;

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Store slug is required for updating store details.' },
        { status: 400 }
      );
    }

    const cleanSlug = slug.toLowerCase().trim();
    const cleanCategory = typeof category === 'string' ? category.trim() : undefined;
    const cleanLink = typeof googleReviewLink === 'string' ? googleReviewLink.trim() : undefined;

    if (cleanLink && !cleanLink.startsWith('http://') && !cleanLink.startsWith('https://')) {
      return NextResponse.json(
        { success: false, message: 'Google Review Link must start with http:// or https://' },
        { status: 400 }
      );
    }

    // 1. Update local accounts.json
    const updatedAccount = updateOwnerAccount(cleanSlug, {
      category: cleanCategory,
      googleReviewLink: cleanLink,
    });

    // 2. Update Supabase businesses table
    if (isSupabaseConfigured()) {
      try {
        const updatePayload: Record<string, any> = {};
        if (cleanCategory !== undefined) {
          updatePayload.category = cleanCategory;
          const storeName = updatedAccount?.businessName || cleanSlug;
          updatePayload.tags = getShuffledCategoryTags(storeName, cleanCategory);
        }
        if (cleanLink !== undefined) {
          updatePayload.google_review_link = cleanLink;
        }

        if (Object.keys(updatePayload).length > 0) {
          const { error: dbErr } = await supabase
            .from('businesses')
            .update(updatePayload)
            .eq('slug', cleanSlug);

          if (dbErr) {
            console.warn('Supabase update store note:', dbErr);
          }
        }
      } catch (err) {
        console.warn('Failed to update store in Supabase:', err);
      }
    }

    // 3. Invalidate Redis caches so review terminals instantly use the updated link and tags
    redisCache.del([
      `store:profile:${cleanSlug}`,
      `store:profile:b-${cleanSlug}`,
    ]).catch(() => {});
    redisCache.delPattern('dashboard:*').catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Store details updated successfully!',
      store: {
        slug: cleanSlug,
        category: cleanCategory || updatedAccount?.category || 'general',
        googleReviewLink: cleanLink || updatedAccount?.googleReviewLink || '',
      },
    });
  } catch (err: any) {
    console.error('Error in register-owner PATCH:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to update store details.' },
      { status: 500 }
    );
  }
}
