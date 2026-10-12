-- ============================================================================
-- CIRCULAR-ECONOMY STUDENT ENTERPRISE PLATFORM (15-SCHOOL PILOT)
-- Supabase PostgreSQL Schema, RBAC (RLS), Validation Triggers & Audit Engine
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'teacher', 'expert_admin', 'mentor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_tier AS ENUM ('micro', 'macro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE impact_log_status AS ENUM (
        'pending',
        'approved',
        'pending_expert_review',
        'rejected',
        'flagged',
        'fraud_revoked'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_review_status AS ENUM (
        'not_selected',
        'pending_audit',
        'audit_passed',
        'fraud_confirmed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. GAMIFICATION CONFIGURATION TABLE (Singleton managed by Expert Panel / Admin)
CREATE TABLE IF NOT EXISTS public.gamification_config (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    relevance_weight NUMERIC(5,2) NOT NULL DEFAULT 0.15,
    business_weight NUMERIC(5,2) NOT NULL DEFAULT 0.20,
    feasibility_weight NUMERIC(5,2) NOT NULL DEFAULT 0.15,
    student_ownership_weight NUMERIC(5,2) NOT NULL DEFAULT 0.20,
    sustainability_weight NUMERIC(5,2) NOT NULL DEFAULT 0.20,
    institutional_commitment_weight NUMERIC(5,2) NOT NULL DEFAULT 0.10,
    macro_revenue_threshold_usd NUMERIC(10,2) NOT NULL DEFAULT 50.00,
    micro_audit_sample_rate NUMERIC(5,4) NOT NULL DEFAULT 0.1000,
    fraud_penalty_points NUMERIC(10,2) NOT NULL DEFAULT 75.00,
    env_to_fin_normalization_ratio NUMERIC(10,2) NOT NULL DEFAULT 12.50,
    updated_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.gamification_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 3. SCHOOLS TABLE (15 Pilot Schools with Campus Geofence Coordinates)
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    district TEXT NOT NULL,
    city TEXT NOT NULL,
    campus_lat DOUBLE PRECISION NOT NULL,
    campus_lng DOUBLE PRECISION NOT NULL,
    campus_radius_meters INTEGER NOT NULL DEFAULT 500,
    institutional_commitment_score NUMERIC(5,2) NOT NULL DEFAULT 80.00,
    penalty_points_deducted NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    seed_funding_base_usd NUMERIC(10,2) NOT NULL DEFAULT 1500.00,
    seed_funding_topoff_usd NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CLUBS TABLE (Student-Led Circular Enterprises)
CREATE TABLE IF NOT EXISTS public.clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    tagline TEXT NOT NULL,
    circular_sector TEXT NOT NULL,
    business_model_canvas JSONB NOT NULL DEFAULT '{}'::jsonb,
    org_chart JSONB NOT NULL DEFAULT '[]'::jsonb,
    approved_milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
    criteria_baseline JSONB NOT NULL DEFAULT '{
        "relevance": 75,
        "business": 70,
        "feasibility": 75,
        "student_ownership": 80,
        "sustainability": 80,
        "institutional_commitment": 80
    }'::jsonb,
    active_members_count INTEGER NOT NULL DEFAULT 8,
    last_submission_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. USERS / PROFILES TABLE (RBAC Linked to Supabase Auth & Telegram)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
    telegram_user_id BIGINT UNIQUE,
    telegram_username TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. MENTOR ASSIGNMENTS TABLE (Scoping Mentor Read-Only Access)
CREATE TABLE IF NOT EXISTS public.mentor_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (mentor_id, club_id)
);

-- 7. IMPACT LOGS TABLE (Core Student Submissions & Validation State Machine)
CREATE TABLE IF NOT EXISTS public.impact_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,

    -- Telegram & S3 Uncompressed Document Evidence
    telegram_message_id TEXT,
    telegram_file_id TEXT,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
    is_uncompressed_document BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_uncompressed_document = TRUE),
    s3_url TEXT NOT NULL,
    s3_key TEXT NOT NULL,

    -- Mandatory EXIF Data (Rejects submission if missing)
    exif_timestamp TIMESTAMPTZ NOT NULL,
    exif_lat DOUBLE PRECISION NOT NULL,
    exif_lng DOUBLE PRECISION NOT NULL,
    exif_device_make TEXT,
    exif_device_model TEXT,
    campus_distance_meters DOUBLE PRECISION NOT NULL DEFAULT 0,
    on_campus_verified BOOLEAN NOT NULL DEFAULT TRUE,

    -- Contextual Impact & Financial Data
    activity_title TEXT NOT NULL,
    activity_category TEXT NOT NULL,
    description TEXT NOT NULL,
    waste_kg NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (waste_kg >= 0),
    revenue_usd NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (revenue_usd >= 0),
    co2_saved_kg NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (co2_saved_kg >= 0),
    is_final_pitch BOOLEAN NOT NULL DEFAULT FALSE,

    -- Validation & Routing State Machine
    transaction_type transaction_tier NOT NULL DEFAULT 'micro',
    status impact_log_status NOT NULL DEFAULT 'pending',

    -- Tier 1: Supervising Teacher Local Audit
    teacher_reviewer_id UUID REFERENCES public.users(id),
    teacher_reviewed_at TIMESTAMPTZ,
    teacher_notes TEXT,

    -- Tier 2: Safeguard Random 10% Micro-Audit & Macro Expert Adjudication
    random_audit_selected BOOLEAN NOT NULL DEFAULT FALSE,
    audit_status audit_review_status NOT NULL DEFAULT 'not_selected',
    audit_flagged_fraud BOOLEAN NOT NULL DEFAULT FALSE,
    expert_reviewer_id UUID REFERENCES public.users(id),
    expert_reviewed_at TIMESTAMPTZ,
    expert_notes TEXT,
    criteria_scores JSONB,

    -- Gamification Points & Penalties
    points_awarded NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    penalty_points NUMERIC(10,2) NOT NULL DEFAULT 0.00,

    -- Step 5: Resolution Loop (Single Resubmission Enforcement)
    rejection_reason TEXT,
    resubmission_count INTEGER NOT NULL DEFAULT 0 CHECK (resubmission_count <= 1),
    parent_log_id UUID REFERENCES public.impact_logs(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. AUDIT LOGS TABLE (Populated via PostgreSQL Triggers)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    impact_log_id UUID NOT NULL REFERENCES public.impact_logs(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.users(id),
    actor_role user_role,
    action_type TEXT NOT NULL,
    previous_status impact_log_status,
    new_status impact_log_status NOT NULL,
    points_delta NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    reason_or_notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- HELPER FUNCTIONS FOR RBAC & HAVERSINE DISTANCE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_app_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT role FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_app_user_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT school_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Haversine distance in meters between EXIF GPS and School Campus coordinates
CREATE OR REPLACE FUNCTION public.calculate_distance_meters(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    r CONSTANT DOUBLE PRECISION := 6371000; -- Earth radius in meters
    dlat DOUBLE PRECISION;
    dlon DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
BEGIN
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    a := sin(dlat / 2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2)^2;
    c := 2 * atan2(sqrt(a), sqrt(1 - a));
    RETURN ROUND((r * c)::numeric, 2);
END;
$$;

-- ============================================================================
-- VALIDATION LOOP & GAMIFICATION ROUTING TRIGGER (BEFORE INSERT OR UPDATE)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_enforce_validation_and_routing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config public.gamification_config%ROWTYPE;
    v_school public.schools%ROWTYPE;
    v_actor_role user_role;
    v_actor_school UUID;
BEGIN
    SELECT * INTO v_config FROM public.gamification_config WHERE id = 1;
    SELECT * INTO v_school FROM public.schools WHERE id = NEW.school_id;

    -- 1. Enforce Metadata Constraint (Must be uncompressed Document with valid EXIF)
    IF NEW.is_uncompressed_document IS NOT TRUE THEN
        RAISE EXCEPTION 'METADATA_CONSTRAINT_VIOLATION: Photos must be sent as uncompressed Documents/Files to preserve EXIF.';
    END IF;

    IF NEW.exif_timestamp IS NULL OR NEW.exif_lat IS NULL OR NEW.exif_lng IS NULL THEN
        RAISE EXCEPTION 'EXIF_MISSING: Submission rejected because EXIF timestamp or GPS coordinates are missing.';
    END IF;

    -- 2. Calculate Campus Geofence Distance
    IF v_school.id IS NOT NULL THEN
        NEW.campus_distance_meters := public.calculate_distance_meters(
            NEW.exif_lat, NEW.exif_lng, v_school.campus_lat, v_school.campus_lng
        );
        NEW.on_campus_verified := (NEW.campus_distance_meters <= v_school.campus_radius_meters);
    END IF;

    -- 3. Auto-compute CO2 saved if not explicitly set (~2.4 kg CO2e per kg circular material)
    IF NEW.co2_saved_kg IS NULL OR NEW.co2_saved_kg = 0 THEN
        NEW.co2_saved_kg := ROUND((NEW.waste_kg * 2.4)::numeric, 2);
    END IF;

    -- 4. Classify Transaction Tier (Micro vs Macro)
    IF NEW.revenue_usd > COALESCE(v_config.macro_revenue_threshold_usd, 50.00)
       OR NEW.is_final_pitch = TRUE
       OR NEW.activity_category IN ('final_funding_pitch', 'capital_equipment_sale') THEN
        NEW.transaction_type := 'macro';
    ELSE
        NEW.transaction_type := 'micro';
    END IF;

    -- 5. On INSERT: Ensure initial status is 'pending' and update club's last_submission_at
    IF TG_OP = 'INSERT' THEN
        NEW.status := 'pending';
        NEW.points_awarded := 0;
        NEW.penalty_points := 0;
        UPDATE public.clubs SET last_submission_at = NOW() WHERE id = NEW.club_id;
        RETURN NEW;
    END IF;

    -- 6. On UPDATE: Enforce RBAC & Threshold Routing State Machine
    NEW.updated_at := NOW();
    v_actor_role := public.current_app_user_role();
    v_actor_school := public.current_app_user_school_id();

    -- If running under authenticated user context, enforce strict Teacher school isolation
    IF v_actor_role = 'teacher' THEN
        IF v_actor_school IS DISTINCT FROM OLD.school_id THEN
            RAISE EXCEPTION 'RBAC_VIOLATION: Supervising Teachers can only review submissions belonging to their assigned school.';
        END IF;
    END IF;

    -- STEP 3: Threshold Routing when Teacher Approves a 'pending' submission
    IF OLD.status = 'pending' AND NEW.status = 'approved' AND NEW.expert_reviewer_id IS NULL THEN
        IF NEW.transaction_type = 'macro' THEN
            -- Macro-Transactions CANNOT be finalized by Teacher alone -> Route to Expert Panel
            NEW.status := 'pending_expert_review';
            NEW.points_awarded := 0;
        ELSE
            -- Micro-Transaction -> Automatically award micro points & roll 10% Random Audit
            NEW.status := 'approved';
            NEW.points_awarded := ROUND(
                (15.0 + LEAST(NEW.waste_kg * 1.8, 35.0) + LEAST(NEW.revenue_usd * 0.4, 20.0))::numeric,
                2
            );
            IF random() < COALESCE(v_config.micro_audit_sample_rate, 0.10) THEN
                NEW.random_audit_selected := TRUE;
                NEW.audit_status := 'pending_audit';
            ELSE
                NEW.random_audit_selected := FALSE;
                NEW.audit_status := 'not_selected';
            END IF;
        END IF;
    END IF;

    -- STEP 5: Resolution Loop - Rejection requires explicit reason
    IF NEW.status = 'rejected' AND (NEW.rejection_reason IS NULL OR length(trim(NEW.rejection_reason)) < 3) THEN
        RAISE EXCEPTION 'RESOLUTION_LOOP_VIOLATION: A specific rejection_reason is required when rejecting a submission.';
    END IF;

    -- PENALTY MECHANICS: Expert Panel flags a random-audited Micro-Transaction as Fraudulent
    IF OLD.audit_flagged_fraud = FALSE AND NEW.audit_flagged_fraud = TRUE THEN
        NEW.status := 'fraud_revoked';
        NEW.audit_status := 'fraud_confirmed';
        NEW.points_awarded := 0;
        NEW.penalty_points := COALESCE(v_config.fraud_penalty_points, 75.00);

        UPDATE public.schools
        SET penalty_points_deducted = penalty_points_deducted + NEW.penalty_points
        WHERE id = NEW.school_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_validation_and_routing ON public.impact_logs;
CREATE TRIGGER trg_enforce_validation_and_routing
BEFORE INSERT OR UPDATE ON public.impact_logs
FOR EACH ROW
EXECUTE FUNCTION public.fn_enforce_validation_and_routing();

-- ============================================================================
-- AUDIT LOGGING TRIGGER (AFTER INSERT OR UPDATE ON impact_logs)
-- Appends an immutable record to audit_logs every time status or audit state changes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_log_impact_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role user_role;
    v_action_type TEXT;
    v_points_delta NUMERIC(10,2) := 0;
    v_reason TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_actor_id := NEW.student_id;
        v_actor_role := 'student';
        v_action_type := CASE
            WHEN NEW.resubmission_count > 0 THEN 'STUDENT_RESUBMISSION'
            ELSE 'STUDENT_SUBMISSION_CREATED'
        END;
        v_reason := 'Submitted via Telegram Bot with verified EXIF document';

        INSERT INTO public.audit_logs (
            impact_log_id, club_id, school_id, actor_id, actor_role,
            action_type, previous_status, new_status, points_delta, reason_or_notes, metadata
        ) VALUES (
            NEW.id, NEW.club_id, NEW.school_id, v_actor_id, v_actor_role,
            v_action_type, NULL, NEW.status, 0, v_reason,
            jsonb_build_object(
                'transaction_type', NEW.transaction_type,
                'revenue_usd', NEW.revenue_usd,
                'waste_kg', NEW.waste_kg,
                'exif_lat', NEW.exif_lat,
                'exif_lng', NEW.exif_lng,
                'on_campus_verified', NEW.on_campus_verified
            )
        );
        RETURN NEW;
    END IF;

    -- Only append audit log when status, audit_status, fraud flag, or points change
    IF OLD.status IS DISTINCT FROM NEW.status
       OR OLD.audit_status IS DISTINCT FROM NEW.audit_status
       OR OLD.audit_flagged_fraud IS DISTINCT FROM NEW.audit_flagged_fraud
       OR OLD.points_awarded IS DISTINCT FROM NEW.points_awarded
       OR OLD.penalty_points IS DISTINCT FROM NEW.penalty_points THEN

        v_actor_id := COALESCE(NEW.expert_reviewer_id, NEW.teacher_reviewer_id, public.current_app_user_id(), NEW.student_id);
        SELECT role INTO v_actor_role FROM public.users WHERE id = v_actor_id;

        v_points_delta := (NEW.points_awarded - OLD.points_awarded) - (NEW.penalty_points - OLD.penalty_points);

        IF NEW.audit_flagged_fraud = TRUE AND OLD.audit_flagged_fraud = FALSE THEN
            v_action_type := 'EXPERT_AUDIT_FRAUD_PENALTY';
            v_reason := COALESCE(NEW.expert_notes, 'Flagged fraudulent during 10% random micro-transaction audit');
        ELSIF NEW.audit_status = 'audit_passed' AND OLD.audit_status = 'pending_audit' THEN
            v_action_type := 'EXPERT_AUDIT_PASSED';
            v_reason := COALESCE(NEW.expert_notes, 'Random 10% micro-transaction audit verified clean');
        ELSIF NEW.status = 'pending_expert_review' AND OLD.status = 'pending' THEN
            v_action_type := 'TEACHER_ENDORSED_MACRO_ROUTED';
            v_reason := COALESCE(NEW.teacher_notes, 'Teacher endorsed macro-transaction; routed to Expert Panel');
        ELSIF NEW.status = 'approved' AND OLD.status = 'pending' THEN
            v_action_type := 'TEACHER_APPROVED_MICRO';
            v_reason := COALESCE(NEW.teacher_notes, 'Teacher approved micro-transaction; points released to Leaderboard');
        ELSIF NEW.status = 'approved' AND OLD.status = 'pending_expert_review' THEN
            v_action_type := 'EXPERT_APPROVED_MACRO';
            v_reason := COALESCE(NEW.expert_notes, 'Expert Panel scored 6 criteria and released macro points');
        ELSIF NEW.status = 'rejected' THEN
            v_action_type := 'SUBMISSION_REJECTED_RESOLUTION_LOOP';
            v_reason := NEW.rejection_reason;
        ELSIF NEW.status = 'flagged' THEN
            v_action_type := 'SUBMISSION_FLAGGED_FOR_INVESTIGATION';
            v_reason := COALESCE(NEW.teacher_notes, NEW.expert_notes, 'Flagged for anomalous metrics');
        ELSE
            v_action_type := 'STATUS_UPDATED';
            v_reason := COALESCE(NEW.expert_notes, NEW.teacher_notes, NEW.rejection_reason);
        END IF;

        INSERT INTO public.audit_logs (
            impact_log_id, club_id, school_id, actor_id, actor_role,
            action_type, previous_status, new_status, points_delta, reason_or_notes, metadata
        ) VALUES (
            NEW.id, NEW.club_id, NEW.school_id, v_actor_id, v_actor_role,
            v_action_type, OLD.status, NEW.status, v_points_delta, v_reason,
            jsonb_build_object(
                'transaction_type', NEW.transaction_type,
                'random_audit_selected', NEW.random_audit_selected,
                'audit_status', NEW.audit_status,
                'audit_flagged_fraud', NEW.audit_flagged_fraud,
                'points_awarded', NEW.points_awarded,
                'penalty_points', NEW.penalty_points,
                'resubmission_count', NEW.resubmission_count
            )
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_impact_logs_status_audit ON public.impact_logs;
CREATE TRIGGER trg_impact_logs_status_audit
AFTER INSERT OR UPDATE ON public.impact_logs
FOR EACH ROW
EXECUTE FUNCTION public.fn_log_impact_status_change();

-- ============================================================================
-- ROW LEVEL SECURITY (RBAC ENFORCEMENT AT DATABASE LEVEL)
-- ============================================================================

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_config ENABLE ROW LEVEL SECURITY;

-- Public read access for Leaderboard & Club Profiles (schools, clubs, gamification_config)
CREATE POLICY "Public read access to schools"
    ON public.schools FOR SELECT USING (true);

CREATE POLICY "Public read access to clubs"
    ON public.clubs FOR SELECT USING (true);

CREATE POLICY "Public read access to gamification_config"
    ON public.gamification_config FOR SELECT USING (true);

-- Expert Admin can update gamification_config and schools
CREATE POLICY "Expert Admin update gamification_config"
    ON public.gamification_config FOR UPDATE
    USING (public.current_app_user_role() = 'expert_admin')
    WITH CHECK (public.current_app_user_role() = 'expert_admin');

-- IMPACT_LOGS RLS POLICIES:
-- 1. Public/Authenticated can view approved logs; roles see scoped logs
CREATE POLICY "Scoped read access to impact_logs"
    ON public.impact_logs FOR SELECT
    USING (
        status = 'approved'
        OR public.current_app_user_role() = 'expert_admin'
        OR (public.current_app_user_role() = 'teacher' AND school_id = public.current_app_user_school_id())
        OR (public.current_app_user_role() = 'student' AND student_id = public.current_app_user_id())
        OR (
            public.current_app_user_role() = 'mentor'
            AND EXISTS (
                SELECT 1 FROM public.mentor_assignments ma
                WHERE ma.mentor_id = public.current_app_user_id()
                  AND ma.club_id = public.impact_logs.club_id
            )
        )
    );

-- 2. Student Entrepreneur: Can INSERT data for their own school/club as pending, cannot approve
CREATE POLICY "Students can insert pending impact_logs"
    ON public.impact_logs FOR INSERT
    WITH CHECK (
        public.current_app_user_role() = 'student'
        AND student_id = public.current_app_user_id()
        AND school_id = public.current_app_user_school_id()
        AND status = 'pending'
        AND is_uncompressed_document = TRUE
        AND resubmission_count <= 1
    );

-- 3. Supervising Teacher (Tier 1): Can ONLY update logs belonging to their school
--    Cannot directly award arbitrary macro points or alter another school's logs
CREATE POLICY "Teachers can update status of logs in their school only"
    ON public.impact_logs FOR UPDATE
    USING (
        public.current_app_user_role() = 'teacher'
        AND school_id = public.current_app_user_school_id()
    )
    WITH CHECK (
        public.current_app_user_role() = 'teacher'
        AND school_id = public.current_app_user_school_id()
        AND status IN ('approved', 'pending_expert_review', 'rejected', 'flagged')
    );

-- 4. Expert Panel / Admin (Tier 2): Full adjudication & audit authority across all 15 schools
CREATE POLICY "Expert Admins have full adjudication update access"
    ON public.impact_logs FOR UPDATE
    USING (public.current_app_user_role() = 'expert_admin')
    WITH CHECK (public.current_app_user_role() = 'expert_admin');

-- 5. Audit Logs: Read-only for Teachers (own school) and Expert Admins (all schools); no direct UPDATE/DELETE
CREATE POLICY "Read access to audit_logs"
    ON public.audit_logs FOR SELECT
    USING (
        public.current_app_user_role() = 'expert_admin'
        OR (public.current_app_user_role() = 'teacher' AND school_id = public.current_app_user_school_id())
    );
