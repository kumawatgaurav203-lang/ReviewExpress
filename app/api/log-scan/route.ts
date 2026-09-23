import { NextRequest, NextResponse } from 'next/server';
import { recordLiveReview } from '@/lib/dashboard-data';
import { checkRateLimit, RATE_LIMITS, checkRequestSize, sanitizeBusinessId, isValidBusinessId, getClientIP } from '@/lib/api-guard';
import { redisCache } from '@/lib/redis';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { resolveBusinessUuid } from '@/lib/auth-server';

// In-memory cache to deduplicate rapid scans from same IP/client within 60s
const recentScans = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    // ── Request size guard ──────────────────────────────────────────
    const sizeError = checkRequestSize(req, 2 * 1024); // 2 KB max
    if (sizeError) return sizeError;

    // ── Rate Limiting: 60 scan logs per minute per IP ───────────────
    const rateCheck = checkRateLimit(req, 'log-scan', RATE_LIMITS.LOG_SCAN);
    if (!rateCheck.allowed) return rateCheck.response;

    const body = await req.json();
    const { businessId, source = 'qr' } = body;

    // ── Input Validation ────────────────────────────────────────────
    if (!businessId || !isValidBusinessId(String(businessId))) {
      return NextResponse.json({ success: false, message: 'Valid businessId is required.' }, { status: 400 });
    }

    const safeBusinessId = sanitizeBusinessId(String(businessId));
    const channel = source === 'nfc' ? 'nfc' : 'qr';
    const ip = getClientIP(req);

    const dedupeKey = `${safeBusinessId}_${channel}_${ip}`;
    const now = Date.now();
    const lastScanTime = recentScans.get(dedupeKey);

    // If scanned within last 60 seconds from same IP & channel, deduplicate
    if (lastScanTime && now - lastScanTime < 60000) {
      return NextResponse.json({ success: true, message: 'Scan already counted (deduplicated)' });
    }
    recentScans.set(dedupeKey, now);

    // Clean up old entries older than 5 minutes
    if (recentScans.size > 500) {
      recentScans.forEach((time, k) => {
        if (now - time > 300000) recentScans.delete(k);
      });
    }

    const savedLog = recordLiveReview({
      business_id: safeBusinessId,
      rating: 0,
      posted_to_google: false,
      is_scan: true,
      review_text: channel === 'nfc' ? 'NFC Chip Tapped' : 'QR Standee Scanned',
      source: channel,
    });

    // Also persist scan visit to Supabase review_logs so scan counts never reset on redeploy
    if (isSupabaseConfigured()) {
      try {
        const canonicalBusinessId = await resolveBusinessUuid(safeBusinessId);
        supabase
          .from('review_logs')
          .insert([
            {
              business_id: canonicalBusinessId,
              rating: 0,
              posted_to_google: false,
              review_text: channel === 'nfc' ? 'NFC Chip Tapped' : 'QR Standee Scanned',
              source: channel,
            },
          ])
          .then(() => {});
      } catch (dbErr) {
        // non-blocking
      }
    }

    // Invalidate dashboard metrics cache so owner sees real-time visit
    redisCache.delPattern(`dashboard:${safeBusinessId}:*`).catch(() => {});
    redisCache.delPattern('dashboard:all:*').catch(() => {});


    return NextResponse.json({
      success: true,
      message: `${channel.toUpperCase()} visit logged`,
      logId: savedLog.id,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Error logging scan' }, { status: 500 });
  }
}
