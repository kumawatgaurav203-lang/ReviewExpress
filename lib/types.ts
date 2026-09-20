export interface User {
  id: string; // Database UUID
  email: string;
  password_hash: string;
  role: 'admin' | 'owner' | 'staff';
  created_at?: string;
  updated_at?: string;
}

export interface Business {
  id: string; // Database UUID
  created_at?: string;
  updated_at?: string;
  name: string;
  slug: string;
  category?: string;
  google_review_link: string;
  tags: string[];
  status?: 'active' | 'inactive' | 'suspended';
  is_active: boolean;
  logo_url?: string;
}

export interface BusinessMember {
  id: string; // Database UUID
  business_id: string; // UUID references businesses(id)
  user_id: string; // UUID references users(id)
  role: 'owner' | 'admin' | 'manager' | 'staff';
  created_at?: string;
  updated_at?: string;
}

export interface AuditLog {
  id?: string;
  user_id?: string;
  business_id?: string;
  action: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

export interface SessionUser {
  userId: string;
  email: string;
  role: 'admin' | 'owner' | 'staff';
  authorizedBusinessIds: string[];
  businessName?: string;
  businessSlug?: string;
}

export interface ReviewLog {
  id?: string;
  business_id: string; // UUID
  created_at?: string;
  rating: number;
  selected_tags?: string[];
  review_text?: string;
  customer_phone?: string;
  customer_feedback?: string;
  posted_to_google: boolean;
  is_scan?: boolean;
  is_resolved?: boolean;
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
