import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { SubmitFeedbackRequest, SubmitFeedbackResponse } from '@/lib/types';
import { recordLiveReview, updateRuntimeLog, findRecentScanLog } from '@/lib/dashboard-data';
import { resolveBusinessUuid } from '@/lib/auth-server';
import { checkRateLimit, RATE_LIMITS, checkRequestSize, sanitizeString, sanitizeBusinessId, isValidBusinessId } from '@/lib/api-guard';
import { redisCache } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    // ── Request size guard ─────────────────────────────────────────
    const sizeError = checkRequestSize(req, 16 * 1024); // 16 KB max
    if (sizeError) return sizeError;

    // ── Rate Limiting: 20 feedbacks per 5 minutes per IP ──────────
    const rateCheck = checkRateLimit(req, 'submit-feedback', RATE_LIMITS.SUBMIT_FEEDBACK);
    if (!rateCheck.allowed) return rateCheck.response;

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

    // ── Input Validation ───────────────────────────────────────────
    if (!businessId || !isValidBusinessId(String(businessId))) {
      return NextResponse.json(
        { success: false, message: 'Invalid payload: businessId is missing or invalid.' },
        { status: 400 }
      );
    }

    if (rating === undefined || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, message: 'Invalid payload: rating must be a number between 1 and 5.' },
        { status: 400 }
      );
    }

    // ── Sanitize all text fields to prevent injection ──────────────
    const safeBusinessId = sanitizeBusinessId(String(businessId));
    const safeReviewText = sanitizeString(reviewText, 2000);
    const safeCustomerPhone = sanitizeString(customerPhone, 20);
    const safeCustomerFeedback = sanitizeString(customerFeedback, 2000);
    const safeSource = source === 'nfc' ? 'nfc' : 'qr';
    const safeTags = Array.isArray(selectedTags)
      ? selectedTags.slice(0, 20).map((t) => sanitizeString(String(t), 100))
      : [];

    let savedLogId = logId;
    const channel = safeSource;

    if (logId) {
      const updated = updateRuntimeLog(logId, {
        rating,
        selected_tags: safeTags,
        review_text: safeReviewText,
        customer_phone: safeCustomerPhone,
        customer_feedback: safeCustomerFeedback,
        posted_to_google: Boolean(postedToGoogle),
        source: channel,
        is_scan: false,
      });
      if (!updated) {
        const created = recordLiveReview({
          business_id: safeBusinessId,
          rating,
          selected_tags: safeTags,
          review_text: safeReviewText,
          customer_phone: safeCustomerPhone,
          customer_feedback: safeCustomerFeedback,
          posted_to_google: Boolean(postedToGoogle),
          source: channel,
          is_scan: false,
        });
        savedLogId = created.id;
      }
    } else {
      // Check if there is a recent scan log from this visit to adopt rather than creating duplicate
      const recentScan = findRecentScanLog(safeBusinessId, channel, 30);
      if (recentScan) {
        updateRuntimeLog(recentScan.id, {
          rating,
          selected_tags: safeTags,
          review_text: safeReviewText,
          customer_phone: safeCustomerPhone,
          customer_feedback: safeCustomerFeedback,
          posted_to_google: Boolean(postedToGoogle),
          source: channel,
          is_scan: false,
        });
        savedLogId = recentScan.id;
      } else {
        const created = recordLiveReview({
          business_id: safeBusinessId,
          rating,
          selected_tags: safeTags,
          review_text: safeReviewText,
          customer_phone: safeCustomerPhone,
          customer_feedback: safeCustomerFeedback,
          posted_to_google: Boolean(postedToGoogle),
          source: channel,
          is_scan: false,
        });
        savedLogId = created.id;
      }
    }

    // If Supabase is connected, persist to review_logs table
    if (isSupabaseConfigured()) {
      try {
        const canonicalBusinessId = await resolveBusinessUuid(safeBusinessId);
        const { data, error } = await supabase
          .from('review_logs')
          .insert([
            {
              business_id: canonicalBusinessId,
              rating,
              selected_tags: safeTags,
              review_text: safeReviewText,
              customer_phone: safeCustomerPhone,
              customer_feedback: safeCustomerFeedback,
              posted_to_google: Boolean(postedToGoogle),
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

        // Invalidate dashboard metrics and complaints cache
        redisCache.delPattern(`dashboard:${safeBusinessId}:*`).catch(() => {});
        redisCache.delPattern('dashboard:all:*').catch(() => {});

        return NextResponse.json<SubmitFeedbackResponse>({
          success: true,
          message: 'Feedback successfully logged',
          logId: data?.id || savedLogId,
        });
      } catch (dbErr) {
        console.error('Database connection exception:', dbErr);
      }
    }

    // Invalidate dashboard cache in demo / local mode
    redisCache.delPattern(`dashboard:${safeBusinessId}:*`).catch(() => {});
    redisCache.delPattern('dashboard:all:*').catch(() => {});

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
