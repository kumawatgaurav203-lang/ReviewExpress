import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { SubmitFeedbackRequest, SubmitFeedbackResponse } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body: SubmitFeedbackRequest = await req.json();
    const {
      businessId,
      rating,
      selectedTags = [],
      reviewText = '',
      customerPhone = '',
      customerFeedback = '',
      postedToGoogle = false,
    } = body;

    if (!businessId || rating === undefined || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, message: 'Invalid payload: businessId and valid rating (1-5) are required' },
        { status: 400 }
      );
    }

    // If Supabase is connected, persist to review_logs table
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('review_logs')
          .insert([
            {
              business_id: businessId,
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
          });
        }

        return NextResponse.json<SubmitFeedbackResponse>({
          success: true,
          message: 'Feedback successfully logged',
          logId: data?.id,
        });
      } catch (dbErr) {
        console.error('Database connection exception:', dbErr);
      }
    }

    // Supabase demo / unconfigured mode
    return NextResponse.json<SubmitFeedbackResponse>({
      success: true,
      message: 'Feedback received in demo mode',
    });
  } catch (error: any) {
    console.error('Submit feedback route exception:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
