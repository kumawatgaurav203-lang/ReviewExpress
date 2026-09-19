import { NextRequest, NextResponse } from 'next/server';
import { recordLiveReview } from '@/lib/dashboard-data';

// In-memory cache to deduplicate rapid scans from same IP/client within 60s
const recentScans = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId, source = 'qr' } = body;

    if (!businessId) {
      return NextResponse.json({ success: false, message: 'businessId is required' }, { status: 400 });
    }

    const channel = source === 'nfc' ? 'nfc' : 'qr';
    const forwardedFor = req.headers.get('x-forwarded-for') || 'local';
    const ip = forwardedFor.split(',')[0].trim();
    const dedupeKey = `${businessId}_${channel}_${ip}`;
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
      business_id: businessId,
      rating: 0,
      posted_to_google: false,
      is_scan: true,
      review_text: channel === 'nfc' ? 'NFC Chip Tapped' : 'QR Standee Scanned',
      source: channel,
    });

    return NextResponse.json({
      success: true,
      message: `${channel.toUpperCase()} visit logged`,
      logId: savedLog.id,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Error logging scan' }, { status: 500 });
  }
}
