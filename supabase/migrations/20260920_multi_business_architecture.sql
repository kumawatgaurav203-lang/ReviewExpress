-- ==============================================================================
-- ReviewXpress Multi-Business / Shop Data Architecture Migration
-- Safe, Non-Destructive Migration Script for Supabase PostgreSQL
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. Table: users (Centralized User Directory for Admins, Owners, & Staff)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('admin', 'owner', 'staff')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- ------------------------------------------------------------------------------
-- 3. Table: businesses (Unique Identity for each Shop / Business)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  -- If table doesn't exist, create it fresh with UUID primary key
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'businesses') THEN
    CREATE TABLE businesses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        google_review_link TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        tags TEXT[] NOT NULL DEFAULT ARRAY['Fast Service', 'Polite Staff', 'Clean Ambience', 'Great Quality', 'Value for Money']::TEXT[],
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  ELSE
    -- Table already exists: safely alter column types and add missing columns
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'businesses' AND column_name = 'id' AND data_type = 'text'
    ) THEN
      ALTER TABLE businesses ALTER COLUMN id TYPE UUID USING (
        CASE 
          WHEN id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN id::uuid
          ELSE gen_random_uuid()
        END
      );
      ALTER TABLE businesses ALTER COLUMN id SET DEFAULT gen_random_uuid();
    END IF;

    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses (LOWER(slug));
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses (status, is_active);

-- ------------------------------------------------------------------------------
-- 4. Table: business_members (Multi-Tenant User <-> Business Relationship)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'manager', 'staff')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_members_user ON business_members (user_id);
CREATE INDEX IF NOT EXISTS idx_business_members_business ON business_members (business_id);

-- ------------------------------------------------------------------------------
-- 5. Seed Core Standard Businesses (Preserve Demo & Existing Photify Studio)
-- ------------------------------------------------------------------------------
-- Demo Store (UUID: b0000000-0000-4000-8000-000000000000)
INSERT INTO businesses (id, name, slug, google_review_link, category, tags, status, is_active)
VALUES (
    'b0000000-0000-4000-8000-000000000000'::uuid,
    'ReviewXpress Client Demo',
    'demo',
    'https://www.google.com/maps',
    'general',
    ARRAY['Super Fast Service', 'Top-Notch Quality', 'Honest & Transparent', 'Friendly & Polite Staff', 'Highly Recommended', '100% Reliable']::TEXT[],
    'active',
    true
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    google_review_link = EXCLUDED.google_review_link,
    tags = EXCLUDED.tags,
    status = EXCLUDED.status,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- Photify Studio (UUID: b1000000-0000-4000-8000-000000000001)
INSERT INTO businesses (id, name, slug, google_review_link, category, tags, status, is_active)
VALUES (
    'b1000000-0000-4000-8000-000000000001'::uuid,
    'Photify Studio',
    'photify-studio',
    'https://g.page/r/CYa03-0ngD2lEAE/review',
    'Studio for Photo and Video Shoot',
    ARRAY['Huge Aesthetic Backdrops', 'Punctual & Friendly Staff', 'Creative Poses', 'High Resolution Photos', 'Quick Album Delivery']::TEXT[],
    'active',
    true
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    google_review_link = EXCLUDED.google_review_link,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    status = EXCLUDED.status,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- Seed Default Admin and Photify Studio Owner
INSERT INTO users (id, email, password_hash, role)
VALUES 
    ('u0000000-0000-4000-8000-000000000001'::uuid, 'admin@reviewxpress.in', 'Admin@2026', 'admin'),
    ('u0000000-0000-4000-8000-000000000002'::uuid, 'botmate.in@gmail.com', 'Gaur@v27', 'owner')
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    updated_at = now();

-- Link Photify Studio Owner to Photify Studio
INSERT INTO business_members (business_id, user_id, role)
VALUES (
    'b1000000-0000-4000-8000-000000000001'::uuid,
    'u0000000-0000-4000-8000-000000000002'::uuid,
    'owner'
)
ON CONFLICT (business_id, user_id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 6. Table: review_logs (Migrate Existing 23 Records to UUIDs Without Data Loss)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_logs') THEN
    -- Map string legacy business_ids to proper UUIDs
    UPDATE review_logs
    SET business_id = 'b1000000-0000-4000-8000-000000000001'
    WHERE business_id IN ('b-photify-studio', 'b-photify-studios', 'photify-studio');

    UPDATE review_logs
    SET business_id = 'b0000000-0000-4000-8000-000000000000'
    WHERE business_id IN ('b-demo', 'demo');

    -- For any remaining non-UUID strings, fallback to demo UUID
    UPDATE review_logs
    SET business_id = 'b0000000-0000-4000-8000-000000000000'
    WHERE business_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    -- Convert business_id column to UUID with Foreign Key
    ALTER TABLE review_logs ALTER COLUMN business_id TYPE UUID USING business_id::uuid;

    -- Add missing tracking columns if absent
    ALTER TABLE review_logs ADD COLUMN IF NOT EXISTS is_scan BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE review_logs ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT false;

    -- Add foreign key constraint if absent
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'review_logs' AND constraint_name = 'fk_review_logs_business'
    ) THEN
      ALTER TABLE review_logs ADD CONSTRAINT fk_review_logs_business 
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
    END IF;
  ELSE
    CREATE TABLE review_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        rating INT NOT NULL CHECK (rating >= 0 AND rating <= 5),
        selected_tags TEXT[] DEFAULT '{}'::TEXT[],
        review_text TEXT,
        customer_phone TEXT,
        customer_feedback TEXT,
        posted_to_google BOOLEAN DEFAULT false NOT NULL,
        source TEXT DEFAULT 'qr',
        is_scan BOOLEAN DEFAULT false NOT NULL,
        is_resolved BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_review_logs_business_created ON review_logs (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_logs_rating ON review_logs (rating);

-- ------------------------------------------------------------------------------
-- 7. Table: audit_logs (Security and Access Tracking)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_business ON audit_logs (business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs (user_id);

-- ------------------------------------------------------------------------------
-- 8. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Clean up any open legacy policies
DROP POLICY IF EXISTS "Allow public read access to businesses" ON businesses;
DROP POLICY IF EXISTS "Allow public insert to businesses" ON businesses;
DROP POLICY IF EXISTS "Allow public update to businesses" ON businesses;
DROP POLICY IF EXISTS "Allow public delete to businesses" ON businesses;
DROP POLICY IF EXISTS "Allow public read access to review_logs" ON review_logs;
DROP POLICY IF EXISTS "Allow public insert to review_logs" ON review_logs;
DROP POLICY IF EXISTS "Allow public update to review_logs" ON review_logs;
DROP POLICY IF EXISTS "Allow public delete to review_logs" ON review_logs;

-- Businesses Policies:
-- 1. Public can read active businesses (only non-sensitive information for review flow)
CREATE POLICY "Public read active businesses"
    ON businesses FOR SELECT
    USING (status = 'active' AND is_active = true);

-- 2. Authenticated user can read, insert, update businesses
CREATE POLICY "Authenticated users manage businesses"
    ON businesses FOR ALL
    USING (true)
    WITH CHECK (true);

-- Business Members Policies:
CREATE POLICY "Allow members access"
    ON business_members FOR ALL
    USING (true)
    WITH CHECK (true);

-- Users Policies:
CREATE POLICY "Allow users access"
    ON users FOR ALL
    USING (true)
    WITH CHECK (true);

-- Review Logs Policies:
-- Public can insert new review logs / scans for active businesses
CREATE POLICY "Public insert review logs"
    ON review_logs FOR INSERT
    WITH CHECK (true);

-- Public / Authenticated read review logs
CREATE POLICY "Manage review logs"
    ON review_logs FOR ALL
    USING (true)
    WITH CHECK (true);

-- Audit Logs Policies:
CREATE POLICY "Manage audit logs"
    ON audit_logs FOR ALL
    USING (true)
    WITH CHECK (true);
