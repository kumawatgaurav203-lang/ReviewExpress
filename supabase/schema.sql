-- ==============================================================================
-- ReviewXpress Multi-Business / Shop Data Architecture Schema
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Table: users
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

-- 2. Table: businesses
CREATE TABLE IF NOT EXISTS businesses (
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

CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses (LOWER(slug));
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses (status, is_active);

-- 3. Table: business_members
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

-- 4. Table: review_logs
CREATE TABLE IF NOT EXISTS review_logs (
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

CREATE INDEX IF NOT EXISTS idx_review_logs_business_created ON review_logs (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_logs_rating ON review_logs (rating);

-- 5. Table: audit_logs
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

-- 6. Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active businesses"
    ON businesses FOR SELECT
    USING (status = 'active' AND is_active = true);

CREATE POLICY "Authenticated users manage businesses"
    ON businesses FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow members access"
    ON business_members FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow users access"
    ON users FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Public insert review logs"
    ON review_logs FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Manage review logs"
    ON review_logs FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Manage audit logs"
    ON audit_logs FOR ALL
    USING (true)
    WITH CHECK (true);
