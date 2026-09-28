import { NextRequest, NextResponse } from 'next/server';
import { toggleStoreActiveStatus, getAccountBySlug, getOwnerAccountByEmail } from '@/lib/accounts-store';
import { updateBusinessStatus } from '@/lib/demo-data';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { logAuditEvent } from '@/lib/auth-server';
import { verifyMasterAdminRequest } from '@/lib/admin-auth';
import { redisCache } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    // 1. Two-Way 2FA Security Guard: Master Admin only
    if (!verifyMasterAdminRequest(req)) {
      return NextResponse.json(
        { success: false, message: 'Access Denied: Master Admin Two-Way Verification required.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { slug, email, isActive, reason, note } = body;

    if (isActive === undefined || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'Invalid payload: isActive (boolean) is required.' },
        { status: 400 }
      );
    }

    const cleanSlug = String(slug || '').toLowerCase().trim();
    const cleanEmail = String(email || '').toLowerCase().trim();

    if (!cleanSlug && !cleanEmail) {
      return NextResponse.json(
        { success: false, message: 'Please provide either store slug or owner email.' },
        { status: 400 }
      );
    }

    const target = cleanSlug || cleanEmail;
    let existingAccount = cleanSlug ? getAccountBySlug(cleanSlug) : getOwnerAccountByEmail(cleanEmail);

    // 2. Persist to Supabase businesses table if configured
    if (isSupabaseConfigured() && (cleanSlug || existingAccount?.businessSlug)) {
      const dbSlug = cleanSlug || existingAccount?.businessSlug;
      try {
        await supabase
          .from('businesses')
          .update({
            is_active: Boolean(isActive),
          })
          .eq('slug', dbSlug);
      } catch (err) {
        console.warn('Supabase store status toggle notice:', err);
      }
    }

    // 3. Update persistent local accounts store and sync to Redis cloud vault
    const updatedAccount = toggleStoreActiveStatus(
      target,
      Boolean(isActive),
      reason || (isActive ? undefined : 'Subscription / Renewal Due'),
      note || ''
    );

    // 4. Update in-memory registry if loaded
    if (cleanSlug) {
      updateBusinessStatus(cleanSlug, Boolean(isActive));
    }
    if (existingAccount?.businessSlug) {
      updateBusinessStatus(existingAccount.businessSlug, Boolean(isActive));
    }

    // 5. Invalidate caches instantly (<2ms)
    try {
      const keysToClear = [
        `store:profile:${cleanSlug}`,
        `account:${cleanSlug}`,
        `account:email:${cleanEmail}`,
        'sys:accounts-vault',
      ];
      if (existingAccount?.businessSlug) {
        keysToClear.push(`store:profile:${existingAccount.businessSlug}`);
      }
      await redisCache.del(keysToClear);
      if (cleanSlug) {
        await redisCache.delPattern(`dashboard:${cleanSlug}:*`);
      }
    } catch (e) {}

    // 6. Record security audit log
    await logAuditEvent(isActive ? 'REACTIVATE_STORE' : 'DEACTIVATE_STORE', {
      businessId: cleanSlug || existingAccount?.businessSlug,
      details: {
        slug: cleanSlug,
        email: cleanEmail,
        isActive: Boolean(isActive),
        reason: reason || (isActive ? 'Reactivated by Admin' : 'Deactivated by Admin'),
        note: note || '',
      },
      req,
    });

    const storeName = updatedAccount?.businessName || existingAccount?.businessName || cleanSlug;

    return NextResponse.json({
      success: true,
      isActive: Boolean(isActive),
      slug: cleanSlug,
      storeName,
      message: isActive
        ? `Store "${storeName}" has been successfully reactivated.`
        : `Store "${storeName}" has been temporarily deactivated.`,
    });
  } catch (error: any) {
    console.error('Error toggling store status:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error while toggling store status.' },
      { status: 500 }
    );
  }
}
