import { NextRequest, NextResponse } from 'next/server';
import { getOwnerAccountByEmail, deleteOwnerAccount } from '@/lib/accounts-store';
import { deleteBusiness } from '@/lib/demo-data';
import { deleteBusinessData } from '@/lib/dashboard-data';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { logAuditEvent } from '@/lib/auth-server';
import { verifyMasterAdminRequest } from '@/lib/admin-auth';

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
    const account = getOwnerAccountByEmail(cleanEmail);

    if (!account) {
      return NextResponse.json({
        success: false,
        message: 'No store account found for this email address.',
      }, { status: 404 });
    }

    // Verify current account password
    if (account.password !== password) {
      return NextResponse.json({ 
        success: false, 
        message: 'Incorrect current password. You must enter the exact current password for this account.' 
      }, { status: 400 });
    }

    const businessSlug = account.businessSlug;
    const businessId = 'b-' + businessSlug;
    const storeName = account.businessName;

    // 1. Delete from persistent storage (accounts.json)
    deleteOwnerAccount(cleanEmail);

    // 2. Delete from in-memory businesses
    deleteBusiness(businessSlug);

    // 3. Delete all feedback/complaints data locally
    deleteBusinessData(businessId);
    deleteBusinessData(businessSlug);

    // 4. Delete from Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        // Find business UUID
        const { data: dbBiz } = await supabase
          .from('businesses')
          .select('id')
          .eq('slug', businessSlug)
          .single();

        const targets = [businessId, businessSlug];
        if (dbBiz?.id) targets.push(dbBiz.id);

        await Promise.all([
          supabase.from('review_logs').delete().in('business_id', targets),
          supabase.from('businesses').delete().eq('slug', businessSlug),
          supabase.from('users').delete().eq('email', cleanEmail),
        ]);
      } catch (dbErr) {
        console.error('Supabase delete error in delete-store:', dbErr);
      }
    }

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
