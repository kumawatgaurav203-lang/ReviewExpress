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

    let allLogs = getAllLogs();

    // Filter by business if not 'all'
    if (businessId !== 'all') {
      allLogs = allLogs.filter((l) => l.business_id === businessId);
    }

    // Filter by selected time period
    let periodLogs = filterLogsByPeriod(allLogs, period);

    // Calculate overall channel breakdown BEFORE channel filter
    const overallMetrics = calculateMetrics(periodLogs, filter);

    // Apply channel filter if requested ('nfc' or 'qr') — strictly by source field
    let filteredLogs = periodLogs;
    if (channel === 'nfc') {
      filteredLogs = periodLogs.filter((l) => l.source === 'nfc');
    } else if (channel === 'qr') {
      filteredLogs = periodLogs.filter((l) => l.source !== 'nfc');
    }

    // Calculate metrics on filteredLogs so top KPI cards reflect the selected channel accurately
    const metrics = calculateMetrics(filteredLogs, filter);
    // Preserve overall nfc and qr stats so channel hub and selector buttons always display correct totals
    metrics.nfc = overallMetrics.nfc;
    metrics.qr = overallMetrics.qr;

    // Helper to extract log channel — strictly by source field
    const getLogChannel = (l: any): 'nfc' | 'qr' => {
      return l.source === 'nfc' ? 'nfc' : 'qr';
    };

    // Filter complaints (ratings 1, 2, and 3 with customer feedback)
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

    // Drafted reviews stream (ratings 4-5 generated/written, but NOT confirmed posted on Google)
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

    // Combined unposted scans list (for backward compatibility)
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

    const rawSlug = businessId.startsWith('b-') ? businessId.slice(2) : businessId;
    const account = getAccountBySlug(rawSlug) || (businessId !== 'all' ? getAllOwnerAccounts().find(a => a.id === businessId || a.businessSlug === rawSlug) : undefined);
    const demoBiz = DEMO_BUSINESSES[rawSlug];
    const googleReviewLink = account?.googleReviewLink || demoBiz?.google_review_link || 'https://g.page/r/CYa03-0ngD2lEAE/review';
    const businessName = account?.businessName || demoBiz?.name || resolveBusinessName(businessId);

    const businessInfo = {
      name: businessName,
      slug: rawSlug,
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
    const body = await req.json();
    const { complaintId } = body;

    if (!complaintId) {
      return NextResponse.json(
        { success: false, message: 'complaintId is required' },
        { status: 400 }
      );
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

// DELETE endpoint to permanently remove solved/pruned complaints (saves database storage)
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { complaintId, businessId, clearAllResolved } = body;

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

