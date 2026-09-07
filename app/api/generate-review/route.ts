import { NextRequest, NextResponse } from 'next/server';
import { GenerateReviewRequest, GenerateReviewResponse } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body: GenerateReviewRequest = await req.json();
    const { businessName, tags = [], rating = 5 } = body;

    if (!businessName) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const tagsString = tags.length > 0 ? tags.join(', ') : 'overall experience and hospitality';

    // Check if Gemini API key is configured
    if (apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey.trim().length > 0) {
      try {
        const prompt = `You are a genuine customer in India writing a 5-star Google review for a local business named "${businessName}".
The customer specifically loved: ${tagsString}.
Rating: ${rating}/5 stars.

Instructions:
1. Write a natural, highly realistic 2-sentence review in casual, conversational Indian English.
2. Incorporate the highlighted features naturally.
3. Keep it warm, authentic, and believable.
4. Output ONLY the 2-sentence review text. Do NOT include quotes, bullet points, greetings, or hashtags.`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: prompt }],
                },
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 120,
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

          if (generatedText) {
            // Clean up any stray wrapping quotes or formatting
            const cleanedReview = generatedText.replace(/^["']|["']$/g, '').trim();
            const resData: GenerateReviewResponse = {
              review: cleanedReview,
              source: 'gemini',
            };
            return NextResponse.json(resData);
          }
        } else {
          console.warn('Gemini API responded with status:', response.status);
        }
      } catch (geminiErr) {
        console.error('Gemini API fetch error:', geminiErr);
      }
    }

    // Safe and natural fallback review generator
    const fallbackReviews = [
      `Had a wonderful experience at ${businessName}. Really appreciated the ${tagsString}, definitely visiting again!`,
      `Visited ${businessName} recently and was thoroughly impressed. The ${tagsString} made all the difference, highly recommended!`,
      `Outstanding quality and vibe at ${businessName}! The ${tagsString} stood out the most, keep up the great work.`,
    ];

    const randomIndex = Math.floor(Math.random() * fallbackReviews.length);
    const fallbackReview = fallbackReviews[randomIndex];

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
