import { NextRequest, NextResponse } from 'next/server';
import { getOwnerAccountByEmail, deleteOwnerAccount } from '@/lib/accounts-store';
import { deleteBusiness } from '@/lib/demo-data';
import { deleteBusinessData } from '@/lib/dashboard-data';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { logAuditEvent } from '@/lib/auth-server';
import { verifyMasterAdminRequest } from '@/lib/admin-auth';
import { redisCache } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    // 2FA Security Check: Master Admin only
    if (!verifyMasterAdminRequest(req)) {
      return NextResponse.json(
        { success: false, message: 'Access Denied: Master Admin Two-Way Verification required.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { email, password, confirmPassword } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ success: false, message: 'Valid email is required.' }, { status: 400 });
    }

    if (!password || !confirmPassword) {
      return NextResponse.json({ success: false, message: 'Please enter and confirm the current password.' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ success: false, message: 'Passwords do not match. Please re-enter.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    let account = getOwnerAccountByEmail(cleanEmail);
    let businessSlug = account?.businessSlug || '';
    let storeName = account?.businessName || '';

    // If account not in local memory, check Supabase businesses table
    if (!account && isSupabaseConfigured()) {
      try {
        const potentialSlug = cleanEmail.split('@')[0].replace(/^owner-|^owner@/, '').replace(/\.com$/, '');
        const { data: matchedBiz } = await supabase
          .from('businesses')
          .select('id, name, slug')
          .or(`slug.eq.${potentialSlug},slug.eq.${cleanEmail}`)
          .maybeSingle();

        if (matchedBiz) {
          businessSlug = matchedBiz.slug;
          storeName = matchedBiz.name;
        }
      } catch {}
    }

    if (!account && !businessSlug) {
      return NextResponse.json({
        success: false,
        message: 'No store account found for this email address.',
      }, { status: 404 });
    }

    // Verify current account password if password is set on account
    if (account && account.password && account.password !== password) {
      return NextResponse.json({ 
        success: false, 
        message: 'Incorrect current password. You must enter the exact current password for this account.' 
      }, { status: 400 });
    }

    const effectiveSlug = businessSlug || account?.businessSlug || '';
    const businessId = 'b-' + effectiveSlug;
    if (!storeName) storeName = account?.businessName || effectiveSlug;

    // 1. Delete from persistent storage (accounts.json & cloud vault)
    deleteOwnerAccount(cleanEmail);
    if (effectiveSlug) {
      deleteOwnerAccount(effectiveSlug);
    }

    // 2. Delete from in-memory businesses
    deleteBusiness(effectiveSlug);

    // 3. Delete all feedback/complaints data locally
    deleteBusinessData(businessId);
    deleteBusinessData(effectiveSlug);

    // 4. Delete permanently from Supabase businesses and review_logs
    if (isSupabaseConfigured() && effectiveSlug) {
      try {
        // Find business UUID
        const { data: dbBiz } = await supabase
          .from('businesses')
          .select('id')
          .eq('slug', effectiveSlug)
          .maybeSingle();

        const targets = [businessId, effectiveSlug];
        if (dbBiz?.id) targets.push(dbBiz.id);

        // Delete review logs first
        await supabase.from('review_logs').delete().in('business_id', targets);

        // Delete business from businesses table
        await supabase.from('businesses').delete().eq('slug', effectiveSlug);
        if (dbBiz?.id) {
          await supabase.from('businesses').delete().eq('id', dbBiz.id);
        }
      } catch (dbErr) {
        console.error('Supabase delete error in delete-store:', dbErr);
      }
    }

    // 5. Invalidate Redis Caches & Tombstones
    redisCache.del([
      `store:profile:${effectiveSlug}`,
      `store:profile:b-${effectiveSlug}`,
      `account:${effectiveSlug}`,
      `account:email:${cleanEmail}`,
    ]).catch(() => {});
    redisCache.delPattern(`dashboard:${effectiveSlug}:*`).catch(() => {});
    redisCache.delPattern(`dashboard:${businessId}:*`).catch(() => {});
    redisCache.delPattern('dashboard:all:*').catch(() => {});

    await logAuditEvent('DELETE_BUSINESS', {
      details: {
        storeName,
        businessSlug,
        ownerEmail: cleanEmail,
      },
      req,
    });

    console.log(`[Store Deleted] Permanently deleted store: ${storeName} (${cleanEmail})`);

    return NextResponse.json({ 
      success: true, 
      message: `Store "${storeName}" and all associated data have been permanently deleted.` 
    });
  } catch (error: any) {
    console.error('Error in delete-store:', error);
    return NextResponse.json({ success: false, message: 'Server error while deleting store account.' }, { status: 500 });
  }
}
