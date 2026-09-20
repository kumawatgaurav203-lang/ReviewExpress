import { NextRequest, NextResponse } from 'next/server';
import { GenerateReviewRequest, GenerateReviewResponse } from '@/lib/types';
import { checkRateLimit, RATE_LIMITS, checkRequestSize, sanitizeString, validateField } from '@/lib/api-guard';

// In-memory review cache to conserve Gemini API quota and provide instantaneous responses
interface CachedReviewItem {
  reviews: string[];
  lastUpdated: number;
}
const reviewCache = new Map<string, CachedReviewItem>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(req: NextRequest) {
  try {
    // ── Request size guard ─────────────────────────────────────────
    const sizeError = checkRequestSize(req, 8 * 1024); // 8 KB max
    if (sizeError) return sizeError;

    // ── Rate Limiting: 30 generations per 5 minutes per IP ────────
    const rateCheck = checkRateLimit(req, 'generate-review', RATE_LIMITS.GENERATE_REVIEW);
    if (!rateCheck.allowed) return rateCheck.response;

    const body: GenerateReviewRequest = await req.json();
    const { businessName, tags = [], rating = 5, currentReview = '', regenerate = false } = body;

    // ── Input Validation + Sanitization ───────────────────────────
    const nameError = validateField(businessName, 'Business name', {
      minLength: 1,
      maxLength: 100,
      checkSQLInjection: true,
    });
    if (nameError) return nameError;

    // Sanitize all string inputs to prevent prompt injection
    const safeBusinessName = sanitizeString(String(businessName), 100);
    const safeTags = Array.isArray(tags)
      ? tags.slice(0, 10).map((t) => sanitizeString(String(t), 80))
      : [];
    const safeRating = typeof rating === 'number' && rating >= 1 && rating <= 5 ? rating : 5;
    const safeCurrentReview = sanitizeString(String(currentReview || ''), 500);


    const apiKey = process.env.GEMINI_API_KEY;
    const sortedTags = [...safeTags].sort();
    const tagsString = sortedTags.length > 0 ? sortedTags.join(', ') : 'overall experience and hospitality';
    const cacheKey = `${safeBusinessName.toLowerCase().trim()}_${sortedTags.join('_').toLowerCase()}_${safeRating}`;
    const isRegenerate = Boolean(regenerate);

    // 1. Quota Saver: Check in-memory cache if not regenerating
    if (!isRegenerate) {
      const cachedEntry = reviewCache.get(cacheKey);
      if (cachedEntry && Date.now() - cachedEntry.lastUpdated < CACHE_TTL_MS && cachedEntry.reviews.length > 0) {
        const differentReviews = cachedEntry.reviews.filter((r) => r !== safeCurrentReview);
        const pool = differentReviews.length > 0 ? differentReviews : cachedEntry.reviews;
        const randomReview = pool[Math.floor(Math.random() * pool.length)];
        return NextResponse.json({
          review: randomReview,
          source: 'gemini',
          cached: true,
        });
      }
    }

    // 2. Query Gemini API with ultra-fast timeout (1.9 seconds)
    if (apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey.trim().length > 0) {
      try {
        const prompt = `You are a genuine customer in India writing a 5-star Google review for a local business named "${safeBusinessName}".
The customer specifically loved: ${tagsString}.
Rating: ${safeRating}/5 stars.
${safeCurrentReview ? `IMPORTANT: Do NOT repeat this previous review draft: "${safeCurrentReview}". Write a fresh, distinctly different review.` : ''}

Instructions:
1. Write a natural, highly realistic 2-sentence review in casual, conversational Indian English.
2. Incorporate the highlighted features naturally.
3. Keep it warm, authentic, and believable.
4. Output ONLY the 2-sentence review text. Do NOT include quotes, bullet points, greetings, or hashtags.`;


        const fastModel = 'gemini-3.1-flash-lite';
        let generatedReview = '';

        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${fastModel}:generateContent`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey.trim(),
              },
              signal: AbortSignal.timeout(1900),
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: isRegenerate ? 0.95 : 0.8,
                  maxOutputTokens: 80,
                },
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (text && text !== currentReview) {
              generatedReview = text.replace(/^["']|["']$/g, '').trim();
            }
          }
        } catch (fastErr) {
          // Instant fallback to local pool if API is slow or timed out
        }

        if (generatedReview) {
          // Cache the review to conserve quota on repeated visits
          const existing = reviewCache.get(cacheKey);
          if (existing) {
            if (!existing.reviews.includes(generatedReview)) {
              existing.reviews.push(generatedReview);
            }
            existing.lastUpdated = Date.now();
          } else {
            reviewCache.set(cacheKey, { reviews: [generatedReview], lastUpdated: Date.now() });
          }

          // Clean up cache if it grows beyond 200 items
          if (reviewCache.size > 200) {
            const cutoff = Date.now() - CACHE_TTL_MS;
            reviewCache.forEach((val, k) => {
              if (val.lastUpdated < cutoff) reviewCache.delete(k);
            });
          }

          const resData: GenerateReviewResponse = {
            review: generatedReview,
            source: 'gemini',
          };
          return NextResponse.json(resData);
        }
      } catch (geminiErr) {
        console.warn('Gemini API notice:', geminiErr);
      }
    }

    // 10+ Hyper-realistic, diverse 5-star customer reviews tailored to store & tags
    const fallbackReviews = [
      `Had a wonderful experience at ${safeBusinessName}! Really appreciated the ${tagsString}, definitely visiting again soon.`,
      `Visited ${safeBusinessName} recently and was thoroughly impressed. The ${tagsString} made all the difference, highly recommended!`,
      `Outstanding quality and vibe at ${safeBusinessName}! The ${tagsString} stood out the most, keep up the fantastic work.`,
      `Super happy with my visit to ${safeBusinessName}. Everything around ${tagsString} was handled smoothly and professionally!`,
      `Truly a 5-star visit to ${safeBusinessName}! Loved how attentive they were with ${tagsString}, will recommend to friends and family.`,
      `Excellent service at ${safeBusinessName}! The attention to ${tagsString} exceeded all my expectations.`,
      `One of the best places in town! ${safeBusinessName} really excels when it comes to ${tagsString}, 5/5 stars from my side.`,
      `Amazing experience from start to finish at ${safeBusinessName}. The ${tagsString} was top-notch, definitely coming back!`,
      `Great hospitality and atmosphere at ${safeBusinessName}. Especially impressed by their ${tagsString}, keep it up!`,
      `Highly impressed with ${safeBusinessName}. The focus on ${tagsString} is truly commendable, a well-deserved 5-star review.`,
    ];

    const differentFallbacks = fallbackReviews.filter((r) => r !== safeCurrentReview);
    const pool = differentFallbacks.length > 0 ? differentFallbacks : fallbackReviews;
    const randomIndex = Math.floor(Math.random() * pool.length);
    const fallbackReview = pool[randomIndex];

    const fallbackResponse: GenerateReviewResponse = {
      review: fallbackReview,
      source: 'fallback',
    };

    return NextResponse.json(fallbackResponse);

  } catch (error: any) {
    console.error('Error generating review:', error);
    return NextResponse.json(
      {
        review: 'Had an amazing experience! Great service and quality, highly recommended to everyone.',
        source: 'fallback',
      },
      { status: 200 }
    );
  }
}
