-- ============================================================================
-- SIMPLIFY GAMIFICATION: TRACK-LEVEL & MILESTONE BADGES ARCHITECTURE
-- Migration: 20261016_simplify_gamification_architecture.sql
-- Target: Supabase Frankfurt (eu-central-1)
-- ============================================================================

-- 1. REFACTOR BADGE DEFINITIONS SCHEMA
DO $$ BEGIN
    CREATE TYPE badge_type AS ENUM ('track', 'milestone');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DROP TABLE IF EXISTS public.badge_definitions CASCADE;

CREATE TABLE public.badge_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    badge_key TEXT UNIQUE NOT NULL,       -- e.g. 'track_waste_to_value', 'milestone_1000_pts'
    type badge_type NOT NULL,
    name TEXT NOT NULL,                  -- Display title
    track TEXT,                          -- Populated for 'track' badges; NULL for aggregate milestones
    required_points INTEGER NOT NULL,    -- Threshold to unlock or upgrade
    description TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. SEED: 6 CORE TRACKS + PLATFORM MILESTONES
INSERT INTO public.badge_definitions (badge_key, type, name, track, required_points, description, icon_name) VALUES
-- The 6 Core Track Badges (Base unlock threshold)
('track_waste_to_value', 'track', 'Waste-to-Value Champion', 'waste_to_value', 0, 'Circular recycling, composting, and material recovery on campus.', 'recycle'),
('track_school_enterprise', 'track', 'School Enterprise Star', 'school_enterprise', 0, 'Commercial viability, seedling sales, and bookshop revenue.', 'trending-up'),
('track_action_ready', 'track', 'Action Ready Club', 'action_ready', 0, 'Operational discipline, equipment maintenance, and weekly updates.', 'check-circle'),
('track_student_leader', 'track', 'Student Eco-Leader', 'student_leader', 0, 'Student autonomy, shift coordination, and peer-to-peer mentoring.', 'users'),
('track_clean_community', 'track', 'Clean Green Community', 'clean_community', 0, 'Off-campus cleanups, shramadana campaigns, and community engagement.', 'globe'),
('track_green_charter', 'track', 'Green Charter School', 'green_charter', 0, 'Institutional commitment, principal endorsements, and canteen eco-rules.', 'medal'),

-- Cross-Track Milestone Badges
('milestone_first_action', 'milestone', 'First Footprint', NULL, 25, 'Submitted first verified green activity to the platform.', 'footprints'),
('milestone_500_club', 'milestone', 'Green Seedling (500 pts)', NULL, 500, 'Earned 500 cumulative points across school initiatives.', 'sprout'),
('milestone_1000_club', 'milestone', 'Century Grove (1,000 pts)', NULL, 1000, 'Crossed the 1,000 cumulative points milestone.', 'tree'),
('milestone_2500_club', 'milestone', 'National Pilot Vanguard', NULL, 2500, 'Achieved elite enterprise status across the 15 pilot schools.', 'crown');

-- 3. RESTRUCTURE USER BADGE PROGRESS & UNLOCKS
DROP TABLE IF EXISTS public.badge_progress CASCADE;
DROP TABLE IF EXISTS public.user_milestones CASCADE;

-- Track Progress Table (Maintains track scores and calculated tier level 1-4)
CREATE TABLE public.badge_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id TEXT NOT NULL,
    school_id TEXT NOT NULL,
    track TEXT NOT NULL,
    current_points INTEGER DEFAULT 0 NOT NULL,
    tier_level INTEGER DEFAULT 1 NOT NULL, -- 1: Novice, 2: Active, 3: Advanced, 4: Master
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (profile_id, track)
);

-- Milestone Unlocks Table
CREATE TABLE public.user_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id TEXT NOT NULL,
    school_id TEXT NOT NULL,
    badge_definition_id UUID NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (profile_id, badge_definition_id)
);

-- Enable RLS
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badge definitions viewable by authenticated"
    ON public.badge_definitions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users read own school track progress"
    ON public.badge_progress FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.auth_user_id = auth.uid()
            AND (p.role IN ('expert', 'admin', 'expert_admin', 'super_admin') OR p.school_id = badge_progress.school_id)
        )
    );

CREATE POLICY "Users read milestones"
    ON public.user_milestones FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.auth_user_id = auth.uid()
            AND (p.role IN ('expert', 'admin', 'expert_admin', 'super_admin') OR p.school_id = user_milestones.school_id)
        )
    );

-- 4. SIMPLIFIED POINT & MILESTONE TRIGGER
CREATE OR REPLACE FUNCTION public.process_submission_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_track_points INTEGER;
    v_new_tier INTEGER;
    v_total_points INTEGER;
    v_milestone RECORD;
BEGIN
    IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') AND NEW.score_points > 0 THEN
        
        -- 1. Ledger Entry
        INSERT INTO public.point_ledger (
            profile_id, school_id, submission_id, track, points_awarded, awarded_by
        ) VALUES (
            NEW.student_id, NEW.school_id, NEW.id, NEW.track, NEW.score_points, NEW.reviewed_by
        );

        -- 2. Upsert Track Progress
        INSERT INTO public.badge_progress (profile_id, school_id, track, current_points, tier_level, updated_at)
        VALUES (NEW.student_id, NEW.school_id, NEW.track, NEW.score_points, 1, now())
        ON CONFLICT (profile_id, track)
        DO UPDATE SET
            current_points = badge_progress.current_points + NEW.score_points,
            updated_at = now()
        RETURNING current_points INTO v_track_points;

        -- 3. Calculate Tier Level (Level 1: 0-100, Level 2: 101-300, Level 3: 301-700, Level 4: 701+)
        v_new_tier := CASE 
            WHEN v_track_points >= 701 THEN 4
            WHEN v_track_points >= 301 THEN 3
            WHEN v_track_points >= 101 THEN 2
            ELSE 1
        END;

        UPDATE public.badge_progress
        SET tier_level = v_new_tier
        WHERE profile_id = NEW.student_id AND track = NEW.track;

        -- 4. Check & Unlock Cumulative Milestones
        SELECT COALESCE(SUM(current_points), 0)
        INTO v_total_points
        FROM public.badge_progress
        WHERE profile_id = NEW.student_id;

        FOR v_milestone IN 
            SELECT id, required_points 
            FROM public.badge_definitions 
            WHERE type = 'milestone' AND required_points <= v_total_points
        LOOP
            INSERT INTO public.user_milestones (profile_id, school_id, badge_definition_id)
            VALUES (NEW.student_id, NEW.school_id, v_milestone.id)
            ON CONFLICT (profile_id, badge_definition_id) DO NOTHING;
        END LOOP;

    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_on_submission_approval ON public.submissions;
CREATE TRIGGER trigger_on_submission_approval
    AFTER UPDATE OF status ON public.submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.process_submission_approval();
