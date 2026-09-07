export interface Business {
  id: string;
  created_at?: string;
  name: string;
  slug: string;
  google_review_link: string;
  tags: string[];
  is_active: boolean;
  logo_url?: string;
}

export interface ReviewLog {
  id?: string;
  business_id: string;
  created_at?: string;
  rating: number;
  selected_tags?: string[];
  review_text?: string;
  customer_phone?: string;
  customer_feedback?: string;
  posted_to_google: boolean;
}

export interface GenerateReviewRequest {
  businessName: string;
  tags: string[];
  rating: number;
}

export interface GenerateReviewResponse {
  review: string;
  source?: 'gemini' | 'fallback';
}

export interface SubmitFeedbackRequest {
  businessId: string;
  rating: number;
  selectedTags?: string[];
  reviewText?: string;
  customerPhone?: string;
  customerFeedback?: string;
  postedToGoogle: boolean;
}

export interface SubmitFeedbackResponse {
  success: boolean;
  message: string;
  logId?: string;
}
