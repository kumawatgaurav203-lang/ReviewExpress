import fs from 'fs';
import path from 'path';
import { ReviewLog } from './types';
import { DEMO_BUSINESSES } from './demo-data';
import { supabase, isSupabaseConfigured } from './supabase';

export interface DashboardComplaint {
  id: string;
  businessId: string;
  businessName: string;
  rating: number;
  customerFeedback: string;
  selectedTags: string[];
  createdAt: string;
  isResolved: boolean;
}

export interface ChannelStats {
  /** Total entries from this channel (scans + reviews + complaints) */
  total: number;
  /** Pure scan/tap events only (is_scan=true, rating=0) */
  scans: number;
  /** Reviews actually posted to Google Maps (3-5 stars) */
  posted: number;
  /** Reviews written/drafted (3-5 stars) but NOT posted to Google Maps */
  draftedUnposted: number;
  /** Scanned/tapped and left without rating or complaining */
  bounced: number;
  /** Complaints submitted (rating 1-2) */
  complaints: number;
}

export interface DashboardMetrics {
  totalTraffic: number;
  totalReviews: number;
  postedToGoogle: number;
  draftedUnposted: number;
  bouncedScans: number;
  interceptedComplaints: number;
  unpostedScans: number;
  averageRating: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  googleConversionRate: number;
  nfc: ChannelStats;
  qr: ChannelStats;
}

// Persistent reviews storage in data/reviews.json
const reviewsFilePath = path.join(process.cwd(), 'data', 'reviews.json');

function readReviewsFromFile(): Array<ReviewLog & { id: string; is_resolved?: boolean }> {
  try {
    if (fs.existsSync(reviewsFilePath)) {
      const content = fs.readFileSync(reviewsFilePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Failed to read reviews file:', err);
  }
  return [];
}

function writeReviewsToFile(logs: Array<ReviewLog & { id: string; is_resolved?: boolean }>) {
  try {
    const dir = path.dirname(reviewsFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(reviewsFilePath, JSON.stringify(logs, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write reviews file:', err);
  }
}

export function addRuntimeLog(log: ReviewLog): ReviewLog & { id: string; is_resolved?: boolean } {
  const currentLogs = readReviewsFromFile();
  const fullLog = {
    ...log,
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    is_resolved: false,
    created_at: log.created_at || new Date().toISOString(),
  };
  currentLogs.unshift(fullLog);
  writeReviewsToFile(currentLogs);
  return fullLog;
}

let lastPruneTime = 0;
export function getAllLogs(): Array<ReviewLog & { id: string; is_resolved?: boolean }> {
  const now = Date.now();
  if (now - lastPruneTime > 60 * 60 * 1000) {
    lastPruneTime = now;
    try {
      autoPruneResolvedComplaints(7);
    } catch (e) {
      // ignore
    }
  }
  return readReviewsFromFile();
}

export function filterLogsByPeriod(
  logs: Array<ReviewLog & { id: string; is_resolved?: boolean }>,
  period: 'day' | 'week' | 'month' | 'year' | 'all'
): Array<ReviewLog & { id: string; is_resolved?: boolean }> {
  const now = new Date();

  return logs.filter((log) => {
    const logDate = new Date(log.created_at || Date.now());
    const diffMs = now.getTime() - logDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    switch (period) {
      case 'day':
        return diffHours <= 24;
      case 'week':
        return diffHours <= 24 * 7;
      case 'month':
        return diffHours <= 24 * 30;
      case 'year':
        return diffHours <= 24 * 365;
      case 'all':
      default:
        return true;
    }
  });
}

export function calculateMetrics(
  logs: Array<ReviewLog & { id: string; is_resolved?: boolean; is_scan?: boolean }>,
  filterMode: 'all' | 'posted_only' | 'drafted_unposted' | 'bounced_scans' | 'unposted_scans' | 'complaints' = 'all'
): DashboardMetrics {
  const totalTraffic = logs.length;
  const postedLogs = logs.filter((l) => l.posted_to_google && l.rating >= 4);
  const draftedUnpostedLogs = logs.filter((l) => !l.posted_to_google && l.rating >= 4);
  const complaintLogs = logs.filter((l) => l.rating > 0 && l.rating <= 3);
  const bouncedLogs = logs.filter((l) => !l.posted_to_google && (!l.rating || l.rating === 0));

  const postedToGoogle = postedLogs.length;
  const draftedUnposted = draftedUnpostedLogs.length;
  const bouncedScans = bouncedLogs.length;
  const interceptedComplaints = complaintLogs.length;
  const unpostedScans = draftedUnposted + bouncedScans;

  // NFC vs QR channel separation — strictly by source field only
  const isNfcLog = (l: ReviewLog) => l.source === 'nfc';

  const nfcLogs = logs.filter(isNfcLog);
  const qrLogs = logs.filter((l) => !isNfcLog(l));

  // Build accurate per-channel stats with non-overlapping categories:
  // total = posted + draftedUnposted + bounced + complaints (exactly mutually exclusive!)
  const buildStats = (channelLogs: typeof logs): ChannelStats => {
    const postedCount = channelLogs.filter((l) => l.posted_to_google && l.rating >= 4).length;
    const draftedCount = channelLogs.filter((l) => !l.posted_to_google && l.rating >= 4).length;
    const complaintCount = channelLogs.filter((l) => l.rating > 0 && l.rating <= 3).length;
    const bouncedCount = channelLogs.filter((l) => !l.posted_to_google && (!l.rating || l.rating === 0)).length;

    return {
      total: channelLogs.length,
      scans: channelLogs.filter((l) => (l as any).is_scan === true).length,
      posted: postedCount,
      draftedUnposted: draftedCount,
      bounced: bouncedCount,
      complaints: complaintCount,
    };
  };

  const nfc: ChannelStats = buildStats(nfcLogs);
  const qr: ChannelStats = buildStats(qrLogs);

  // Completed reviews count (verified posted + complaints)
  const completedReviews = logs.filter((l) => l.posted_to_google || (l.rating > 0 && l.rating <= 3));
  const totalReviews = completedReviews.length;

  // Rating breakdown depends on filterMode
  const targetLogs = filterMode === 'posted_only'
    ? postedLogs
    : filterMode === 'drafted_unposted'
    ? draftedUnpostedLogs
    : filterMode === 'complaints'
    ? complaintLogs
    : completedReviews;

  const sumRatings = targetLogs.reduce((acc, curr) => acc + (curr.rating || 0), 0);
  const averageRating = targetLogs.length > 0 ? parseFloat((sumRatings / targetLogs.length).toFixed(1)) : 5.0;

  const ratingBreakdown = {
    5: targetLogs.filter((l) => l.rating === 5).length,
    4: targetLogs.filter((l) => l.rating === 4).length,
    3: targetLogs.filter((l) => l.rating === 3).length,
    2: targetLogs.filter((l) => l.rating === 2).length,
    1: targetLogs.filter((l) => l.rating === 1).length,
  };

  const googleConversionRate =
    totalTraffic > 0 ? parseFloat(((postedToGoogle / totalTraffic) * 100).toFixed(1)) : 0;

  return {
    totalTraffic,
    totalReviews: filterMode === 'posted_only' ? postedToGoogle : totalReviews,
    postedToGoogle,
    draftedUnposted,
    bouncedScans,
    interceptedComplaints,
    unpostedScans,
    averageRating,
    ratingBreakdown,
    googleConversionRate,
    nfc,
    qr,
  };
}

export function updateRuntimeLog(
  logId: string,
  updates: Partial<ReviewLog>
): (ReviewLog & { id: string; is_resolved?: boolean }) | null {
  const currentLogs = readReviewsFromFile();
  const index = currentLogs.findIndex((l) => l.id === logId);
  if (index !== -1) {
    currentLogs[index] = {
      ...currentLogs[index],
      ...updates,
    };
    writeReviewsToFile(currentLogs);
    return currentLogs[index];
  }
  return null;
}

export function findRecentScanLog(
  businessId: string,
  source: 'qr' | 'nfc',
  maxAgeSeconds = 300
): (ReviewLog & { id: string; is_resolved?: boolean }) | null {
  const currentLogs = readReviewsFromFile();
  const now = Date.now();
  const found = currentLogs.find((l) => {
    if (l.business_id !== businessId) return false;
    if (l.source !== source) return false;
    if (!l.is_scan) return false;
    const logTime = new Date(l.created_at || now).getTime();
    return now - logTime <= maxAgeSeconds * 1000;
  });
  return found || null;
}

export function toggleComplaintStatus(complaintId: string): boolean {
  const currentLogs = readReviewsFromFile();
  const log = currentLogs.find((l) => l.id === complaintId);
  if (log) {
    log.is_resolved = !log.is_resolved;
    writeReviewsToFile(currentLogs);
    return Boolean(log.is_resolved);
  }
  return false;
}

export const recordLiveReview = addRuntimeLog;

export function deleteBusinessData(businessId: string): void {
  const currentLogs = readReviewsFromFile();
  const rawId = businessId.replace(/^b-/, '');
  const prefixedId = 'b-' + rawId;
  const filtered = currentLogs.filter(
    (l) => l.business_id !== businessId && l.business_id !== rawId && l.business_id !== prefixedId
  );
  writeReviewsToFile(filtered);
}

/** Permanently delete an individual complaint from storage & database */
export function deleteComplaintLog(complaintId: string): boolean {
  const currentLogs = readReviewsFromFile();
  const initialLength = currentLogs.length;
  const filtered = currentLogs.filter((l) => l.id !== complaintId);

  if (filtered.length < initialLength) {
    writeReviewsToFile(filtered);
    if (isSupabaseConfigured()) {
      try {
        supabase.from('review_logs').delete().eq('id', complaintId).then(() => {});
      } catch (err) {
        console.error('Supabase delete complaint error:', err);
      }
    }
    return true;
  }
  return false;
}

/** Permanently delete all resolved complaints for a business to keep dashboard & storage clean */
export function clearResolvedComplaints(businessId: string): number {
  const currentLogs = readReviewsFromFile();
  const rawId = businessId.replace(/^b-/, '');
  const prefixedId = 'b-' + rawId;

  const toDeleteIds: string[] = [];
  const kept = currentLogs.filter((l) => {
    const isTargetBusiness =
      businessId === 'all' ||
      l.business_id === businessId ||
      l.business_id === rawId ||
      l.business_id === prefixedId;
    if (isTargetBusiness && l.is_resolved) {
      toDeleteIds.push(l.id);
      return false; // Remove
    }
    return true; // Keep
  });

  const deletedCount = currentLogs.length - kept.length;
  if (deletedCount > 0) {
    writeReviewsToFile(kept);
    if (isSupabaseConfigured() && toDeleteIds.length > 0) {
      try {
        supabase.from('review_logs').delete().in('id', toDeleteIds).then(() => {});
      } catch (err) {
        console.error('Supabase bulk delete complaints error:', err);
      }
    }
  }
  return deletedCount;
}

/** Automatically prune resolved complaints older than specified days (default: 7 days) */
export function autoPruneResolvedComplaints(olderThanDays = 7): number {
  const currentLogs = readReviewsFromFile();
  const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  const toDeleteIds: string[] = [];

  const kept = currentLogs.filter((l) => {
    if (l.is_resolved) {
      const itemTime = new Date(l.created_at || 0).getTime();
      if (itemTime < cutoffTime) {
        toDeleteIds.push(l.id);
        return false;
      }
    }
    return true;
  });

  const prunedCount = currentLogs.length - kept.length;
  if (prunedCount > 0) {
    writeReviewsToFile(kept);
    if (isSupabaseConfigured() && toDeleteIds.length > 0) {
      try {
        supabase.from('review_logs').delete().in('id', toDeleteIds).then(() => {});
      } catch (err) {
        console.error('Supabase auto-prune error:', err);
      }
    }
  }
  return prunedCount;
}

