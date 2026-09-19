import { NextRequest, NextResponse } from 'next/server';
import { getOwnerAccountByEmail, deleteOwnerAccount } from '@/lib/accounts-store';
import { deleteBusiness } from '@/lib/demo-data';
import { deleteBusinessData } from '@/lib/dashboard-data';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
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

    // 3. Delete all feedback/complaints data
    deleteBusinessData(businessId);
    deleteBusinessData(businessSlug);

    // 4. Delete from Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const [delLogsRes1, delLogsRes2, delBizRes] = await Promise.all([
          supabase.from('review_logs').delete().eq('business_id', businessId),
          supabase.from('review_logs').delete().eq('business_id', businessSlug),
          supabase.from('businesses').delete().eq('slug', businessSlug),
        ]);

        if (delLogsRes1.error || delLogsRes2.error || delBizRes.error) {
          console.warn('Supabase store delete partial notice:', {
            logs1: delLogsRes1.error,
            logs2: delLogsRes2.error,
            biz: delBizRes.error,
          });
        }
      } catch (dbErr) {
        console.error('Supabase delete error in delete-store:', dbErr);
      }
    }

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
