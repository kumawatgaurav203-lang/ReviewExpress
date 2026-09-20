import { NextRequest, NextResponse } from 'next/server';
import {
  getAllLogs,
  filterLogsByPeriod,
  calculateMetrics,
  toggleComplaintStatus,
  deleteComplaintLog,
  clearResolvedComplaints,
} from '@/lib/dashboard-data';
import { DEMO_BUSINESSES } from '@/lib/demo-data';
import { getAllOwnerAccounts, getAccountBySlug } from '@/lib/accounts-store';
import { getSessionUser, authorizeBusinessAccess, logAuditEvent } from '@/lib/auth-server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

function resolveBusinessName(businessId: string): string {
  const b = Object.values(DEMO_BUSINESSES).find((biz) => biz.id === businessId);
  if (b) return b.name;

  try {
    const accounts = getAllOwnerAccounts();
    const acc = accounts.find(
      (a) => 'b-' + a.businessSlug === businessId || a.businessSlug === businessId || a.id === businessId
    );
    if (acc) return acc.businessName;

    if (businessId.startsWith('b-')) {
      const slug = businessId.slice(2);
      const bySlug = getAccountBySlug(slug);
      if (bySlug) return bySlug.businessName;
      return slug.charAt(0).toUpperCase() + slug.slice(1);
    }
  } catch (e) {
    // fallback
  }
  return 'Store';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = (searchParams.get('period') || 'month') as 'day' | 'week' | 'month' | 'year' | 'all';
    const businessId = searchParams.get('businessId') || 'all';
    const filter = (searchParams.get('filter') || 'all') as 'all' | 'posted_only' | 'unposted_scans' | 'complaints';
    const channel = (searchParams.get('channel') || 'all') as 'all' | 'nfc' | 'qr';

    // --------------------------------------------------------------------------
    // 1. Anti-IDOR Authorization Enforcement
    // --------------------------------------------------------------------------
    const sessionUser = await getSessionUser(req);
    const isDemoQuery = businessId === 'demo' || businessId === 'b-demo' || businessId === 'b0000000-0000-4000-8000-000000000000';

    if (!sessionUser && !isDemoQuery) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to access dashboard data.' },
        { status: 401 }
      );
    }

    if (sessionUser && !isDemoQuery) {
      if (businessId === 'all') {
        if (sessionUser.role !== 'admin') {
          await logAuditEvent('ACCESS_DENIED_CROSS_TENANT', {
            userId: sessionUser.userId,
            details: { requestedScope: 'all', userEmail: sessionUser.email },
            req,
          });
          return NextResponse.json(
            { success: false, message: 'Access Denied: Only administrators may view aggregated cross-store metrics.' },
            { status: 403 }
          );
        }
      } else {
        const authCheck = await authorizeBusinessAccess(sessionUser, businessId);
        if (!authCheck.authorized) {
          await logAuditEvent('ACCESS_DENIED_CROSS_TENANT', {
            userId: sessionUser.userId,
            businessId,
            details: {
              requestedBusinessId: businessId,
              userEmail: sessionUser.email,
              reason: authCheck.reason,
            },
            req,
          });

          return NextResponse.json(
            { success: false, message: authCheck.reason || 'Access Denied: You are not authorized to view this shop.' },
            { status: 403 }
          );
        }
      }
    }

    // --------------------------------------------------------------------------
    // 2. Fetch & Filter Logs for the Authorized Business
    // --------------------------------------------------------------------------
    let allLogs = getAllLogs();

    // If Supabase is connected, merge real-time review logs
    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('review_logs').select('*');
        if (businessId !== 'all') {
          const rawSlug = businessId.startsWith('b-') ? businessId.slice(2) : businessId;
          query = query.or(`business_id.eq.${businessId},business_id.eq.b-${rawSlug},business_id.eq.${rawSlug}`);
        }
        const { data: dbLogs, error: dbErr } = await query;
        if (!dbErr && dbLogs && dbLogs.length > 0) {
          // Merge unique logs from db
          const existingIds = new Set(allLogs.map((l) => l.id));
          dbLogs.forEach((dbLog: any) => {
            if (!existingIds.has(dbLog.id)) {
              allLogs.push(dbLog);
            }
          });
        }
      } catch (err) {
        // non-blocking fallback
      }
    }

    // Filter by business if not 'all'
    if (businessId !== 'all') {
      const cleanTarget = businessId.trim();
      const slugTarget = cleanTarget.startsWith('b-') ? cleanTarget.slice(2) : cleanTarget;
      const prefixedTarget = 'b-' + slugTarget;

      allLogs = allLogs.filter((l) => {
        return (
          l.business_id === cleanTarget ||
          l.business_id === slugTarget ||
          l.business_id === prefixedTarget
        );
      });
    }

    // Filter by selected time period
    let periodLogs = filterLogsByPeriod(allLogs, period);

    // Calculate overall channel breakdown BEFORE channel filter
    const overallMetrics = calculateMetrics(periodLogs, filter);

    // Apply channel filter if requested ('nfc' or 'qr')
    let filteredLogs = periodLogs;
    if (channel === 'nfc') {
      filteredLogs = periodLogs.filter((l) => l.source === 'nfc');
    } else if (channel === 'qr') {
      filteredLogs = periodLogs.filter((l) => l.source !== 'nfc');
    }

    // Calculate metrics on filteredLogs
    const metrics = calculateMetrics(filteredLogs, filter);
    metrics.nfc = overallMetrics.nfc;
    metrics.qr = overallMetrics.qr;

    const getLogChannel = (l: any): 'nfc' | 'qr' => {
      return l.source === 'nfc' ? 'nfc' : 'qr';
    };

    // Filter complaints (ratings 1-3 with customer feedback)
    const complaints = filteredLogs
      .filter((l) => l.rating > 0 && l.rating <= 3 && l.customer_feedback)
      .map((l) => {
        return {
          id: l.id,
          businessId: l.business_id,
          businessName: resolveBusinessName(l.business_id),
          rating: l.rating,
          customerFeedback: l.customer_feedback || 'No written feedback provided',
          selectedTags: l.selected_tags || [],
          createdAt: l.created_at || new Date().toISOString(),
          isResolved: Boolean(l.is_resolved),
          source: getLogChannel(l),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Positive Google reviews stream (ratings 4-5 confirmed posted to Google)
    const recentGoogleReviews = filteredLogs
      .filter((l) => l.posted_to_google && l.rating >= 4)
      .slice(0, 35)
      .map((l) => {
        return {
          id: l.id,
          businessName: resolveBusinessName(l.business_id),
          rating: l.rating,
          reviewText: l.review_text || 'Completed Review posted to Google Maps',
          selectedTags: l.selected_tags || [],
          createdAt: l.created_at,
          source: getLogChannel(l),
        };
      });

    // Drafted reviews stream (ratings 4-5 generated, but NOT confirmed posted on Google)
    const draftedUnpostedReviews = filteredLogs
      .filter((l) => !l.posted_to_google && l.rating >= 4)
      .slice(0, 35)
      .map((l) => {
        return {
          id: l.id,
          businessName: resolveBusinessName(l.business_id),
          rating: l.rating,
          reviewText: l.review_text || 'Review written/drafted but not confirmed on Google',
          selectedTags: l.selected_tags || [],
          createdAt: l.created_at,
          source: getLogChannel(l),
        };
      });

    // Bounced scans stream (scanned QR or tapped NFC, but left without writing or rating)
    const bouncedScansList = filteredLogs
      .filter((l) => !l.posted_to_google && (!l.rating || l.rating === 0))
      .slice(0, 35)
      .map((l) => {
        const itemChannel = getLogChannel(l);
        return {
          id: l.id,
          businessName: resolveBusinessName(l.business_id),
          rating: 0,
          createdAt: l.created_at,
          source: itemChannel,
          status: itemChannel === 'nfc' ? 'NFC Tapped & Left (No Review)' : 'QR Scanned & Left (No Review)',
        };
      });

    // Combined unposted scans list
    const unpostedScansList = filteredLogs
      .filter((l) => !l.posted_to_google && (!l.rating || l.rating > 2))
      .slice(0, 35)
      .map((l) => {
        const itemChannel = getLogChannel(l);
        return {
          id: l.id,
          businessName: resolveBusinessName(l.business_id),
          rating: l.rating || 0,
          createdAt: l.created_at,
          source: itemChannel,
          status: itemChannel === 'nfc' ? 'NFC Tapped / Not Posted' : 'QR Scanned / Not Posted',
        };
      });

    let businessName = resolveBusinessName(businessId);
    let businessSlug = businessId.startsWith('b-') ? businessId.slice(2) : businessId;
    let googleReviewLink = 'https://g.page/r/CYa03-0ngD2lEAE/review';

    // 1. Resolve from Supabase businesses table
    if (isSupabaseConfigured() && businessId !== 'all') {
      try {
        const { data: dbBiz } = await supabase
          .from('businesses')
          .select('id, name, slug, google_review_link')
          .or(`id.eq.${businessId},slug.eq.${businessSlug}`)
          .single();
        if (dbBiz) {
          businessName = dbBiz.name;
          businessSlug = dbBiz.slug;
          googleReviewLink = dbBiz.google_review_link;
        }
      } catch (e) {}
    }

    // 2. Resolve from local accounts store
    if (businessName === 'Store' || businessSlug === businessId) {
      const allAccs = getAllOwnerAccounts();
      const acc = allAccs.find(a => a.id === businessId || a.businessSlug === businessSlug || 'b-' + a.businessSlug === businessId);
      if (acc) {
        businessName = acc.businessName;
        businessSlug = acc.businessSlug;
        googleReviewLink = acc.googleReviewLink;
      }
    }

    // 3. Demo fallback
    if (DEMO_BUSINESSES[businessSlug]) {
      const demoBiz = DEMO_BUSINESSES[businessSlug];
      if (businessName === 'Store') businessName = demoBiz.name;
      googleReviewLink = demoBiz.google_review_link;
    }

    const businessInfo = {
      name: businessName,
      slug: businessSlug,
      googleReviewLink,
    };

    return NextResponse.json({
      success: true,
      period,
      filter,
      channel,
      businessId,
      businessInfo,
      metrics,
      complaints,
      recentGoogleReviews,
      draftedUnpostedReviews,
      bouncedScansList,
      unpostedScansList,
    });
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

// PATCH endpoint to toggle complaint resolved status
export async function PATCH(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    const body = await req.json();
    const { complaintId, businessId } = body;

    if (!complaintId) {
      return NextResponse.json(
        { success: false, message: 'complaintId is required' },
        { status: 400 }
      );
    }

    if (businessId && sessionUser) {
      const auth = await authorizeBusinessAccess(sessionUser, businessId);
      if (!auth.authorized) {
        return NextResponse.json({ success: false, message: 'Access Denied.' }, { status: 403 });
      }
    }

    const newStatus = toggleComplaintStatus(complaintId);

    return NextResponse.json({
      success: true,
      complaintId,
      isResolved: newStatus,
      message: 'Complaint marked as ' + (newStatus ? 'Resolved' : 'Pending'),
    });
  } catch (error: any) {
    console.error('Error updating complaint status:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update complaint' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to permanently remove solved complaints
export async function DELETE(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    const body = await req.json();
    const { complaintId, businessId, clearAllResolved } = body;

    if (businessId && sessionUser) {
      const auth = await authorizeBusinessAccess(sessionUser, businessId);
      if (!auth.authorized) {
        return NextResponse.json({ success: false, message: 'Access Denied.' }, { status: 403 });
      }
    }

    if (clearAllResolved && businessId) {
      const deletedCount = clearResolvedComplaints(businessId);
      return NextResponse.json({
        success: true,
        deletedCount,
        message: `Successfully cleared ${deletedCount} resolved complaints from database.`,
      });
    }

    if (complaintId) {
      const deleted = deleteComplaintLog(complaintId);
      if (deleted) {
        return NextResponse.json({
          success: true,
          complaintId,
          message: 'Complaint permanently removed from database.',
        });
      }
      return NextResponse.json(
        { success: false, message: 'Complaint not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'complaintId or (businessId and clearAllResolved) is required' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error deleting complaint:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete complaint' },
      { status: 500 }
    );
  }
}
