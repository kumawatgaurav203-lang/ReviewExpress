export interface Business {
  id: string;
  created_at?: string;
  name: string;
  slug: string;
  category?: string;
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
  is_scan?: boolean;
  source?: 'qr' | 'nfc';
}

export interface GenerateReviewRequest {
  businessName: string;
  tags: string[];
  rating: number;
  currentReview?: string;
  regenerate?: boolean;
}

export interface GenerateReviewResponse {
  review: string;
  source?: 'gemini' | 'fallback';
  cached?: boolean;
}

export interface SubmitFeedbackRequest {
  logId?: string;
  businessId: string;
  rating: number;
  selectedTags?: string[];
  reviewText?: string;
  customerPhone?: string;
  customerFeedback?: string;
  postedToGoogle: boolean;
  source?: 'qr' | 'nfc';
}

export interface SubmitFeedbackResponse {
  success: boolean;
  message: string;
  logId?: string;
}
