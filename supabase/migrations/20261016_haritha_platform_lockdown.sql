-- ============================================================================
-- HARITHA PASAL (GREEN SCHOOLS) PLATFORM LOCKDOWN & GAMIFICATION SCHEMA
-- Migration: 20261016_haritha_platform_lockdown.sql
-- Target: Supabase Frankfurt (eu-central-1)
-- ============================================================================

-- 1. EXTENSIONS & TYPES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'teacher', 'expert', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. CORE PLATFORM TABLES & EXTENSIONS
CREATE TABLE IF NOT EXISTS public.schools (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    division TEXT NOT NULL DEFAULT 'Western',
    enterprise_name TEXT NOT NULL DEFAULT '',
    code TEXT,
    district TEXT,
    city TEXT,
    campus_lat NUMERIC,
    campus_lng NUMERIC,
    campus_radius_meters INTEGER DEFAULT 500,
    institutional_commitment_score NUMERIC DEFAULT 85,
    penalty_points_deducted NUMERIC DEFAULT 0,
    seed_funding_base_usd NUMERIC DEFAULT 500,
    seed_funding_topoff_usd NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure enterprise_name and division exist on existing schools
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS division TEXT DEFAULT 'Western';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS enterprise_name TEXT DEFAULT '';

-- Submissions schema extension
CREATE TABLE IF NOT EXISTS public.submissions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    student_id TEXT NOT NULL,
    school_id TEXT NOT NULL,
    track TEXT NOT NULL DEFAULT 'waste_to_value',
    quantity_numeric NUMERIC(8,2) DEFAULT 1.0,
    unit TEXT DEFAULT 'units',
    media_storage_path TEXT NOT NULL,
    receipt_storage_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewed_by TEXT,
    score_points INTEGER DEFAULT 0,
    reviewed_at TIMESTAMPTZ,
    whatsapp_message_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.submissions 
    ADD COLUMN IF NOT EXISTS track TEXT DEFAULT 'waste_to_value',
    ADD COLUMN IF NOT EXISTS quantity_numeric NUMERIC(8,2) DEFAULT 1.0,
    ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'units',
    ADD COLUMN IF NOT EXISTS receipt_storage_path TEXT,
    ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
    ADD COLUMN IF NOT EXISTS score_points INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- 3. GAMIFICATION TABLES
CREATE TABLE IF NOT EXISTS public.badge_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track TEXT NOT NULL,
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
    name TEXT NOT NULL,
    required_points INTEGER NOT NULL,
    description TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    UNIQUE (track, level)
);

CREATE TABLE IF NOT EXISTS public.badge_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id TEXT NOT NULL,
    school_id TEXT NOT NULL,
    track TEXT NOT NULL,
    current_points INTEGER DEFAULT 0 NOT NULL,
    current_level INTEGER DEFAULT 1 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (profile_id, track)
);

CREATE TABLE IF NOT EXISTS public.point_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id TEXT NOT NULL,
    school_id TEXT NOT NULL,
    submission_id TEXT,
    track TEXT NOT NULL,
    points_awarded INTEGER NOT NULL,
    awarded_by TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ROW-LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_ledger ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Authenticated users can read schools"
        ON public.schools FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Badge definitions readable"
        ON public.badge_definitions FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Badge progress view policy"
        ON public.badge_progress FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.auth_user_id = auth.uid()
                AND (p.role IN ('expert', 'admin', 'expert_admin', 'super_admin') OR p.school_id = badge_progress.school_id)
            )
        );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Point ledger view policy"
        ON public.point_ledger FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.auth_user_id = auth.uid()
                AND (p.role IN ('expert', 'admin', 'expert_admin', 'super_admin') OR p.school_id = point_ledger.school_id)
            )
        );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 5. AUTOMATED POINT AWARDING & LEVEL-UP TRIGGER
CREATE OR REPLACE FUNCTION public.process_submission_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_points INTEGER;
    v_new_level INTEGER;
BEGIN
    -- Execute only on status transition to 'approved' with positive score points
    IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') AND NEW.score_points > 0 THEN
        
        -- 1. Insert immutable point audit record
        INSERT INTO public.point_ledger (
            profile_id,
            school_id,
            submission_id,
            track,
            points_awarded,
            awarded_by
        ) VALUES (
            NEW.student_id,
            NEW.school_id,
            NEW.id,
            NEW.track,
            NEW.score_points,
            NEW.reviewed_by
        );

        -- 2. Upsert badge progress for student
        INSERT INTO public.badge_progress (profile_id, school_id, track, current_points, current_level, updated_at)
        VALUES (NEW.student_id, NEW.school_id, NEW.track, NEW.score_points, 1, now())
        ON CONFLICT (profile_id, track)
        DO UPDATE SET
            current_points = badge_progress.current_points + NEW.score_points,
            updated_at = now()
        RETURNING current_points INTO v_new_points;

        -- 3. Calculate highest unlocked level based on badge definitions
        SELECT COALESCE(MAX(level), 1)
        INTO v_new_level
        FROM public.badge_definitions
        WHERE track = NEW.track
          AND required_points <= v_new_points;

        -- 4. Update the achieved level
        UPDATE public.badge_progress
        SET current_level = v_new_level
        WHERE profile_id = NEW.student_id AND track = NEW.track;

    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_on_submission_approval ON public.submissions;
CREATE TRIGGER trigger_on_submission_approval
    AFTER UPDATE OF status ON public.submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.process_submission_approval();

-- 6. SRI LANKA LOCALIZED SEED DATA
DELETE FROM public.badge_definitions;

INSERT INTO public.badge_definitions (track, level, name, required_points, description, icon_name) VALUES
-- 1. Waste-to-Value Champion (Circular Economy)
('waste_to_value', 1, 'Green Sorter', 0, 'Learned sorting routines for recyclables and garden waste.', 'leaf'),
('waste_to_value', 2, 'Compost Maker', 101, 'Cured and harvested clean compost batches for garden beds.', 'shovel'),
('waste_to_value', 3, 'Upcycle Pro', 301, 'Made usable products out of scrap and discarded paper or plastic.', 'recycle'),
('waste_to_value', 4, 'Zero-Waste Champion', 701, 'Maintained full campus waste diversion across the entire term.', 'trophy'),

-- 2. School Enterprise Star (Business & Revenue)
('school_enterprise', 1, 'First Sale', 0, 'Logged first sale receipt through the bookshop or school fair.', 'tag'),
('school_enterprise', 2, 'Market Grower', 101, 'Earned over Rs. 5,000 from plant seedlings and recycled goods.', 'trending-up'),
('school_enterprise', 3, 'Green Shop Lead', 351, 'Supplying 2 regular eco-friendly products for school use.', 'store'),
('school_enterprise', 4, 'Self-Reliant Club', 801, 'Sales revenue fully pays for seeds and enterprise supplies.', 'award'),

-- 3. Action Ready Club (Feasibility & Readiness)
('action_ready', 1, 'Ground Ready', 0, 'Set up sorting bins and yard workspace on school grounds.', 'check-circle'),
('action_ready', 2, 'Steady Keeper', 76, '4 consecutive weeks of active logs without delays.', 'calendar'),
('action_ready', 3, 'Tool Care Specialist', 251, 'Kept compost bins, shredders, and tools in prime condition.', 'tool'),
('action_ready', 4, 'Model Unit', 601, 'Organized a dependable setup ready to demonstrate to peers.', 'star'),

-- 4. Student Eco-Leader (Ownership & Leadership)
('student_leader', 1, 'Active Member', 0, 'Completed 5 practical afternoon shifts with the club.', 'user'),
('student_leader', 2, 'Team Organizer', 101, 'Managed weekly collection tasks leading a group of 5+ peers.', 'users'),
('student_leader', 3, 'Green Mentor', 301, 'Trained junior students to handle daily composting and sorting.', 'user-check'),
('student_leader', 4, 'Senior Eco-Leader', 651, 'Successfully guided and handed over duties to the next batch.', 'shield'),

-- 5. Clean Green Community (Sustainability & Wider Impact)
('clean_community', 1, 'Campus Cleaner', 0, 'Participated in school tree planting and boundary cleanups.', 'tree'),
('clean_community', 2, 'Neighborhood Helper', 101, 'Carried out a shramadana campaign along school borders.', 'map-pin'),
('clean_community', 3, 'Nature Guardian', 351, 'Led an off-campus cleanup at a beach, canal, or roadside.', 'globe'),
('clean_community', 4, 'Community Shield', 751, 'Kept over 1 ton of recyclables out of neighborhood dumps.', 'sun'),

-- 6. Green Charter School (Institutional Commitment)
('green_charter', 1, 'Green Club Supporter', 0, 'School principal authorized club registration and activities.', 'file-text'),
('green_charter', 2, 'Clean Canteen Supporter', 101, 'Supported school rules against lunch sheets and single-use wrappers.', 'shield-alert'),
('green_charter', 3, 'Eco Campus', 251, 'Green work integrated into weekly school activity time.', 'book-open'),
('green_charter', 4, 'Model Green School', 501, 'School set aside annual funds to keep the project active.', 'medal');
