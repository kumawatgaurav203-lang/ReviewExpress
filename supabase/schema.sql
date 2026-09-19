-- ==============================================================================
-- AI-Powered NFC Google Review Growth SaaS - Database Schema
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Table: businesses
CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    google_review_link TEXT NOT NULL,
    tags TEXT[] DEFAULT ARRAY['Fast Service', 'Polite Staff', 'Clean Ambience', 'Great Quality', 'Value for Money']::TEXT[],
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Table: review_logs (Reviews, Taps & Complaints)
CREATE TABLE IF NOT EXISTS review_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL,
    rating INT NOT NULL,
    selected_tags TEXT[] DEFAULT '{}'::TEXT[],
    review_text TEXT,
    customer_phone TEXT,
    customer_feedback TEXT,
    posted_to_google BOOLEAN DEFAULT false NOT NULL,
    source TEXT DEFAULT 'qr',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Indexes for ultra-fast performance
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses (slug);
CREATE INDEX IF NOT EXISTS idx_review_logs_business_created ON review_logs (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_logs_rating ON review_logs (rating);

-- 4. Enable Row Level Security (RLS) & Policies
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to businesses"
    ON businesses FOR SELECT USING (true);

CREATE POLICY "Allow public insert to businesses"
    ON businesses FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to businesses"
    ON businesses FOR UPDATE USING (true);

CREATE POLICY "Allow public delete to businesses"
    ON businesses FOR DELETE USING (true);

CREATE POLICY "Allow public read access to review_logs"
    ON review_logs FOR SELECT USING (true);

CREATE POLICY "Allow public insert to review_logs"
    ON review_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to review_logs"
    ON review_logs FOR UPDATE USING (true);

CREATE POLICY "Allow public delete to review_logs"
    ON review_logs FOR DELETE USING (true);

-- ------------------------------------------------------------------------------
-- 5. Seed Real Local Businesses (Jaipur Rajasthan Locations)
-- ------------------------------------------------------------------------------
INSERT INTO businesses (name, slug, google_review_link, tags, is_active)
VALUES
    (
        'Photify Studios',
        'photify-studios',
        'https://g.page/r/CYa03-0ngD2lEAE/review',
        ARRAY['Stunning Portrait Edits', 'Professional Lighting', 'Creative Poses', 'Punctual & Friendly Staff', 'Quick Album Delivery', 'High Resolution Photos'],
        true
    ),
    (
        'Jeep Center & Hind Automobile',
        'jeep-center',
        'https://www.google.com/search?q=Jeep+Center+Hind+Automobile+Jaipur#lrd=0x396db3004a1a681b:0xd1b9c6126c2ca10b,3,,,',
        ARRAY['Expert Diagnostic & Repair', 'Genuine Spare Parts', 'Transparent Estimates', 'Fast Vehicle Delivery', 'Honest Mechanics', 'Smooth Engine Tuning'],
        true
    ),
    (
        'Butterfly Bangles',
        'butterfly-bangles',
        'https://www.google.com/search?q=Butterfly+Bangles+Jaipur#lrd=0x396db3ff08717c23:0x4eec92bec04effc9,3,,,',
        ARRAY['Authentic Jaipur Lac Bangles', 'Exquisite Color Variety', 'Reasonable Wholesale Prices', 'Humble & Polite Owner', 'Durable Handcrafting', 'Best Traditional Designs'],
        true
    )
ON CONFLICT (slug) DO UPDATE
SET
    name = EXCLUDED.name,
    google_review_link = EXCLUDED.google_review_link,
    tags = EXCLUDED.tags,
    is_active = EXCLUDED.is_active;
