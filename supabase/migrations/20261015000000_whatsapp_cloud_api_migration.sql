-- ============================================================================
-- MIGRATION: Pivot from Telegram to WhatsApp Cloud API (Graph API v20.0+)
-- Haritha Pasal (Green Schools) • GIZ Sri Lanka Pilot
-- Storage: Supabase Frankfurt (eu-central-1) private bucket: haritha-proofs
-- Execution Target: Vercel Frankfurt (fra1) Next.js 15 App Route Handlers
-- Zero Singapore OCI (168.107.65.183) routing — strictly EU GDPR / AVV compliant
-- ============================================================================

-- 1. Create Private Storage Bucket 'haritha-proofs' if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'haritha-proofs',
    'haritha-proofs',
    false,
    26214400, -- 25 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 26214400,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

-- 2. Storage RLS Policies for haritha-proofs
DO $$ BEGIN
    CREATE POLICY "Service Role Full Access haritha-proofs"
    ON storage.objects FOR ALL
    USING (bucket_id = 'haritha-proofs')
    WITH CHECK (bucket_id = 'haritha-proofs');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Add Phone Number & WhatsApp Columns to user_profiles
ALTER TABLE IF EXISTS public.user_profiles
    ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30),
    ADD COLUMN IF NOT EXISTS whatsapp_verified BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_user_profiles_phone_number ON public.user_profiles (phone_number);

-- 4. Create public.profiles view pointing to user_profiles for E.164 identity resolution
CREATE OR REPLACE VIEW public.profiles AS
SELECT 
    id,
    auth_user_id,
    email,
    login_code,
    full_name,
    role,
    organization,
    school_id,
    school_name,
    school_code,
    club_id,
    club_name,
    phone_number,
    whatsapp_verified,
    created_at
FROM public.user_profiles;

-- 5. Add Phone Number & WhatsApp Columns to impact_logs
ALTER TABLE IF EXISTS public.impact_logs
    ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30),
    ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT,
    ADD COLUMN IF NOT EXISTS media_storage_path TEXT,
    ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
    ADD COLUMN IF NOT EXISTS scored_via_whatsapp BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS whatsapp_dossier_sent_to_experts BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_impact_logs_whatsapp_message_id ON public.impact_logs (whatsapp_message_id);
CREATE INDEX IF NOT EXISTS idx_impact_logs_phone_number ON public.impact_logs (phone_number);

-- 6. Create public.submissions table for direct WhatsApp webhook ingestion
CREATE TABLE IF NOT EXISTS public.submissions (
    id TEXT PRIMARY KEY,
    phone_number VARCHAR(30) NOT NULL,
    whatsapp_message_id TEXT UNIQUE NOT NULL,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    school_id TEXT NOT NULL,
    school_name TEXT NOT NULL,
    school_code TEXT NOT NULL,
    club_id TEXT NOT NULL,
    club_name TEXT NOT NULL,
    activity_title TEXT NOT NULL,
    description TEXT,
    media_storage_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size_bytes BIGINT DEFAULT 0,
    exif_lat NUMERIC(10, 6),
    exif_lng NUMERIC(10, 6),
    exif_timestamp TIMESTAMPTZ,
    campus_distance_meters NUMERIC(12, 2) DEFAULT 0.00,
    on_campus_verified BOOLEAN DEFAULT true,
    waste_kg NUMERIC(10, 2) DEFAULT 0.00,
    revenue_usd NUMERIC(10, 2) DEFAULT 0.00,
    co2_saved_kg NUMERIC(10, 2) DEFAULT 0.00,
    transaction_type TEXT DEFAULT 'micro',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Public read submissions" ON public.submissions FOR SELECT USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow writes submissions" ON public.submissions FOR ALL USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
