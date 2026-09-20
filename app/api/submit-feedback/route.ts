import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { SubmitFeedbackRequest, SubmitFeedbackResponse } from '@/lib/types';
import { recordLiveReview, updateRuntimeLog, findRecentScanLog } from '@/lib/dashboard-data';
import { resolveBusinessUuid } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  try {
    const body: SubmitFeedbackRequest = await req.json();
    const {
      logId,
      businessId,
      rating,
      selectedTags = [],
      reviewText = '',
      customerPhone = '',
      customerFeedback = '',
      postedToGoogle = false,
      source = 'qr',
    } = body;

    if (!businessId || rating === undefined || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, message: 'Invalid payload: businessId and valid rating (1-5) are required' },
        { status: 400 }
      );
    }

    const channel = source === 'nfc' ? 'nfc' : 'qr';
    let savedLogId = logId;

    if (logId) {
      const updated = updateRuntimeLog(logId, {
        rating,
        selected_tags: selectedTags,
        review_text: reviewText,
        customer_phone: customerPhone,
        customer_feedback: customerFeedback,
        posted_to_google: postedToGoogle,
        source: channel,
        is_scan: false,
      });
      if (!updated) {
        const created = recordLiveReview({
          business_id: businessId,
          rating,
          selected_tags: selectedTags,
          review_text: reviewText,
          customer_phone: customerPhone,
          customer_feedback: customerFeedback,
          posted_to_google: postedToGoogle,
          source: channel,
          is_scan: false,
        });
        savedLogId = created.id;
      }
    } else {
      // Check if there is a recent scan log from this visit to adopt rather than creating duplicate
      const recentScan = findRecentScanLog(businessId, channel, 30);
      if (recentScan) {
        updateRuntimeLog(recentScan.id, {
          rating,
          selected_tags: selectedTags,
          review_text: reviewText,
          customer_phone: customerPhone,
          customer_feedback: customerFeedback,
          posted_to_google: postedToGoogle,
          source: channel,
          is_scan: false,
        });
        savedLogId = recentScan.id;
      } else {
        const created = recordLiveReview({
          business_id: businessId,
          rating,
          selected_tags: selectedTags,
          review_text: reviewText,
          customer_phone: customerPhone,
          customer_feedback: customerFeedback,
          posted_to_google: postedToGoogle,
          source: channel,
          is_scan: false,
        });
        savedLogId = created.id;
      }
    }

    // If Supabase is connected, persist to review_logs table
    if (isSupabaseConfigured()) {
      try {
        const canonicalBusinessId = await resolveBusinessUuid(businessId);
        const { data, error } = await supabase
          .from('review_logs')
          .insert([
            {
              business_id: canonicalBusinessId,
              rating,
              selected_tags: selectedTags,
              review_text: reviewText,
              customer_phone: customerPhone,
              customer_feedback: customerFeedback,
              posted_to_google: postedToGoogle,
            },
          ])
          .select('id')
          .single();

        if (error) {
          console.error('Supabase insert error in review_logs:', error);
          // Return success even if DB insert failed so customer experience is not blocked
          return NextResponse.json<SubmitFeedbackResponse>({
            success: true,
            message: 'Feedback received (fallback logged)',
            logId: savedLogId,
          });
        }

        if (data?.id && savedLogId) {
          updateRuntimeLog(savedLogId, { id: data.id } as any);
        }

        return NextResponse.json<SubmitFeedbackResponse>({
          success: true,
          message: 'Feedback successfully logged',
          logId: data?.id || savedLogId,
        });
      } catch (dbErr) {
        console.error('Database connection exception:', dbErr);
      }
    }

    // Supabase demo / unconfigured mode
    return NextResponse.json<SubmitFeedbackResponse>({
      success: true,
      message: 'Feedback received in demo mode',
      logId: savedLogId,
    });
  } catch (error: any) {
    console.error('Submit feedback route exception:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
