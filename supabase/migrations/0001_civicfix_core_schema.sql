-- ============================================================================
-- CIVICFIX CORE DATABASE MIGRATION: 0001_civicfix_core_schema.sql
-- Target: Supabase PostgreSQL 15+ with PostGIS & pg_trgm
-- ============================================================================

-- 1. SCHEMA & EXTENSIONS SETUP
-- Install PostGIS into a dedicated 'extensions' schema per security best practices
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements SCHEMA extensions;

-- Ensure extensions schema is available in search path for spatial/trigram operators
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
ALTER DATABASE postgres SET search_path TO public, extensions;
SET search_path TO public, extensions;

-- 2. ENUMERATED TYPES
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM (
        'citizen',
        'community_org',
        'moderator',
        'admin'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.report_status AS ENUM (
        'Submitted',
        'Under review',
        'Accepted',
        'Assigned',
        'In progress',
        'Resolved',
        'Rejected',
        'Reopened'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.flag_reason AS ENUM (
        'potential_duplicate',
        'spam',
        'abusive_or_harassment',
        'privacy_or_pii',
        'false_allegation',
        'inaccurate_location',
        'malicious_media'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.flag_status AS ENUM (
        'pending',
        'confirmed',
        'dismissed'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. CORE TABLES

-- 3.1 PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 2 AND 80),
    role public.user_role NOT NULL DEFAULT 'citizen',
    organization_name TEXT CHECK (organization_name IS NULL OR char_length(organization_name) <= 120),
    jurisdiction_code TEXT,
    is_verified_authority BOOLEAN NOT NULL DEFAULT FALSE,
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 ISSUE CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.issue_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon_name TEXT NOT NULL DEFAULT 'alert-triangle',
    color_hex TEXT NOT NULL DEFAULT '#174EA6' CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
    duplicate_radius_meters INTEGER NOT NULL DEFAULT 100 CHECK (duplicate_radius_meters BETWEEN 10 AND 2000),
    duplicate_window_hours INTEGER NOT NULL DEFAULT 336 CHECK (duplicate_window_hours BETWEEN 1 AND 2160),
    is_sensitive_location BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3 REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_code TEXT NOT NULL UNIQUE,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    category_id UUID NOT NULL REFERENCES public.issue_categories(id) ON DELETE RESTRICT,
    title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 5 AND 140),
    description TEXT NOT NULL CHECK (char_length(trim(description)) BETWEEN 15 AND 4000),
    search_text TEXT GENERATED ALWAYS AS (lower(title || ' ' || description)) STORED,
    status public.report_status NOT NULL DEFAULT 'Submitted',
    -- Exact spherical coordinate stored as WGS84 Geography
    location extensions.geography(Point, 4326) NOT NULL,
    -- Latitude & Longitude generated columns for rapid JSON serialization
    latitude DOUBLE PRECISION GENERATED ALWAYS AS (extensions.ST_Y(location::extensions.geometry)) STORED,
    longitude DOUBLE PRECISION GENERATED ALWAYS AS (extensions.ST_X(location::extensions.geometry)) STORED,
    -- Publicly exposed coordinates (fuzzed to ~110m grid if sensitive or requested)
    public_latitude DOUBLE PRECISION NOT NULL,
    public_longitude DOUBLE PRECISION NOT NULL,
    is_location_fuzzed BOOLEAN NOT NULL DEFAULT FALSE,
    approximate_address TEXT CHECK (approximate_address IS NULL OR char_length(approximate_address) <= 250),
    canonical_report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
    duplicate_auto_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    max_duplicate_score NUMERIC(4,3) NOT NULL DEFAULT 0.000,
    upvotes_count INTEGER NOT NULL DEFAULT 0 CHECK (upvotes_count >= 0),
    reopen_count INTEGER NOT NULL DEFAULT 0 CHECK (reopen_count >= 0),
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    hidden_reason TEXT,
    authority_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    submitter_ip_hash TEXT,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_not_null_island CHECK (
        NOT (ABS(extensions.ST_X(location::extensions.geometry)) < 0.0001
         AND ABS(extensions.ST_Y(location::extensions.geometry)) < 0.0001)
    ),
    CONSTRAINT chk_no_self_canonical CHECK (canonical_report_id IS NULL OR canonical_report_id <> id)
);

-- 3.4 REPORT MEDIA TABLE
CREATE TABLE IF NOT EXISTS public.report_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    storage_path TEXT NOT NULL UNIQUE,
    public_url TEXT NOT NULL,
    mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes BETWEEN 1024 AND 5242880),
    width_px INTEGER CHECK (width_px IS NULL OR width_px BETWEEN 50 AND 8000),
    height_px INTEGER CHECK (height_px IS NULL OR height_px BETWEEN 50 AND 8000),
    sha256_checksum TEXT NOT NULL,
    exif_stripped BOOLEAN NOT NULL DEFAULT TRUE,
    is_flagged_graphic BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5 REPORT STATUS HISTORY TABLE (IMMUTABLE AUDIT LOG)
CREATE TABLE IF NOT EXISTS public.report_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    previous_status public.report_status,
    new_status public.report_status NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    public_rationale TEXT NOT NULL CHECK (char_length(trim(public_rationale)) BETWEEN 3 AND 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.6 REPORT UPDATES TABLE (SEPARATES PUBLIC UPDATES FROM PRIVATE ADMIN NOTES)
CREATE TABLE IF NOT EXISTS public.report_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_role public.user_role NOT NULL,
    body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 3 AND 2500),
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    is_official_response BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.7 REPORT FLAGS TABLE (DUPLICATE CANDIDATES & ABUSE REPORTS)
CREATE TABLE IF NOT EXISTS public.report_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    matched_report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
    flagged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason public.flag_reason NOT NULL,
    status public.flag_status NOT NULL DEFAULT 'pending',
    similarity_score NUMERIC(4,3) CHECK (similarity_score IS NULL OR (similarity_score BETWEEN 0 AND 1)),
    distance_meters NUMERIC(8,2) CHECK (distance_meters IS NULL OR distance_meters >= 0),
    details TEXT CHECK (details IS NULL OR char_length(details) <= 1000),
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.8 ADMIN ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.admin_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    department_name TEXT NOT NULL CHECK (char_length(trim(department_name)) BETWEEN 2 AND 120),
    external_ticket_ref TEXT CHECK (external_ticket_ref IS NULL OR char_length(external_ticket_ref) <= 80),
    priority_level INTEGER NOT NULL DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5),
    due_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.9 MODERATION EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.moderation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    flag_id UUID REFERENCES public.report_flags(id) ON DELETE SET NULL,
    moderator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'flag_dismissed',
        'marked_duplicate',
        'report_hidden',
        'report_restored',
        'media_redacted',
        'pii_scrubbed',
        'user_warned'
    )),
    action_notes TEXT NOT NULL CHECK (char_length(trim(action_notes)) BETWEEN 3 AND 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. HIGH-PERFORMANCE INDEXING STRATEGY
-- Spatial GiST indexes for ST_DWithin and bounding-box discovery
CREATE INDEX IF NOT EXISTS idx_reports_location_gist
    ON public.reports USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_reports_location_geom_gist
    ON public.reports USING GIST ((location::extensions.geometry))
    WHERE is_hidden = FALSE;

-- Trigram GIN index for deterministic fuzzy text duplicate detection
CREATE INDEX IF NOT EXISTS idx_reports_search_text_trgm_gin
    ON public.reports USING GIN (search_text extensions.gin_trgm_ops);

-- Composite B-tree indexes for filtering and lifecycle analytics
CREATE INDEX IF NOT EXISTS idx_reports_category_status_created
    ON public.reports (category_id, status, created_at DESC)
    WHERE is_hidden = FALSE;

CREATE INDEX IF NOT EXISTS idx_reports_reporter_created
    ON public.reports (reporter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_reference_code
    ON public.reports (reference_code);

CREATE INDEX IF NOT EXISTS idx_status_history_report_created
    ON public.report_status_history (report_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_report_flags_status_reason
    ON public.report_flags (status, reason, created_at DESC);

-- 5. HELPER FUNCTIONS & TRIGGERS

-- 5.1 Security Definer Role Resolver (Prevents RLS infinite recursion)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 5.2 Column-Level Privilege Escalation Guard on Profiles
CREATE OR REPLACE FUNCTION public.protect_profile_security_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Only service_role or postgres superuser can change role, is_banned, or is_verified_authority
    IF current_setting('role', true) NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Privilege escalation blocked: Users cannot modify their own role attribute.'
                USING ERRCODE = '42501';
        END IF;
        IF NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
            RAISE EXCEPTION 'Privilege escalation blocked: Users cannot modify ban state.'
                USING ERRCODE = '42501';
        END IF;
        IF NEW.is_verified_authority IS DISTINCT FROM OLD.is_verified_authority THEN
            RAISE EXCEPTION 'Privilege escalation blocked: Users cannot self-verify authority status.'
                USING ERRCODE = '42501';
        END IF;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_security ON public.profiles;
CREATE TRIGGER trg_protect_profile_security
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_security_columns();

-- 5.3 Unique Complaint Reference Generator & Coordinate Fuzzing on Insert
CREATE OR REPLACE FUNCTION public.before_insert_report_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_sensitive BOOLEAN;
    v_raw_lat DOUBLE PRECISION;
    v_raw_lng DOUBLE PRECISION;
    v_rate_count INTEGER;
BEGIN
    -- Sliding window rate limit check (max 5 reports per 15 minutes per user)
    IF NEW.reporter_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_rate_count
        FROM public.reports
        WHERE reporter_id = NEW.reporter_id
          AND created_at > NOW() - INTERVAL '15 minutes';
        IF v_rate_count >= 5 THEN
            RAISE EXCEPTION 'Rate limit exceeded: Maximum 5 reports allowed per 15-minute window.'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    -- Generate unique reference code: CF-YYYY-XXXXXX
    IF NEW.reference_code IS NULL OR trim(NEW.reference_code) = '' THEN
        NEW.reference_code := 'CF-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' ||
            UPPER(SUBSTRING(ENCODE(extensions.gen_random_bytes(4), 'hex') FROM 1 FOR 6));
    END IF;

    -- Force initial status to Submitted
    NEW.status := 'Submitted';

    -- Compute fuzzed vs exact public coordinates
    SELECT is_sensitive_location INTO v_sensitive
    FROM public.issue_categories
    WHERE id = NEW.category_id;

    v_raw_lat := extensions.ST_Y(NEW.location::extensions.geometry);
    v_raw_lng := extensions.ST_X(NEW.location::extensions.geometry);

    IF COALESCE(v_sensitive, FALSE) OR NEW.is_location_fuzzed THEN
        NEW.is_location_fuzzed := TRUE;
        NEW.public_latitude := ROUND(v_raw_lat::NUMERIC, 3)::DOUBLE PRECISION;
        NEW.public_longitude := ROUND(v_raw_lng::NUMERIC, 3)::DOUBLE PRECISION;
    ELSE
        NEW.public_latitude := ROUND(v_raw_lat::NUMERIC, 5)::DOUBLE PRECISION;
        NEW.public_longitude := ROUND(v_raw_lng::NUMERIC, 5)::DOUBLE PRECISION;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_before_insert_report ON public.reports;
CREATE TRIGGER trg_before_insert_report
    BEFORE INSERT ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION public.before_insert_report_defaults();

-- 5.4 Finite State Machine Validation Trigger on Report Status Updates
CREATE OR REPLACE FUNCTION public.enforce_report_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_role public.user_role;
    v_valid BOOLEAN := FALSE;
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        -- Verify actor is admin (or service_role)
        IF current_setting('role', true) NOT IN ('service_role', 'postgres') THEN
            v_actor_role := public.get_current_user_role();
            IF v_actor_role IS DISTINCT FROM 'admin' THEN
                RAISE EXCEPTION 'Unauthorized status transition: Only authorized administrators can change official report statuses.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;

        -- Validate state transition graph
        CASE OLD.status
            WHEN 'Submitted' THEN
                v_valid := NEW.status IN ('Under review', 'Rejected');
            WHEN 'Under review' THEN
                v_valid := NEW.status IN ('Accepted', 'Rejected');
            WHEN 'Accepted' THEN
                v_valid := NEW.status IN ('Assigned', 'In progress', 'Rejected');
            WHEN 'Assigned' THEN
                v_valid := NEW.status IN ('In progress', 'Accepted', 'Rejected');
            WHEN 'In progress' THEN
                v_valid := NEW.status IN ('Resolved', 'Assigned', 'Accepted');
            WHEN 'Resolved' THEN
                v_valid := NEW.status IN ('Reopened');
            WHEN 'Rejected' THEN
                v_valid := NEW.status IN ('Reopened', 'Under review');
            WHEN 'Reopened' THEN
                v_valid := NEW.status IN ('Under review', 'Accepted', 'Assigned', 'In progress', 'Rejected');
        END CASE;

        IF NOT v_valid THEN
            RAISE EXCEPTION 'Invalid lifecycle state transition from % to %.', OLD.status, NEW.status
                USING ERRCODE = '22023';
        END IF;

        -- Maintain lifecycle timestamps
        IF NEW.status = 'Resolved' THEN
            NEW.resolved_at := NOW();
            NEW.closed_at := NULL;
        ELSIF NEW.status = 'Rejected' THEN
            NEW.closed_at := NOW();
        ELSIF NEW.status = 'Reopened' THEN
            NEW.resolved_at := NULL;
            NEW.closed_at := NULL;
            NEW.reopen_count := OLD.reopen_count + 1;
        END IF;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_report_status ON public.reports;
CREATE TRIGGER trg_enforce_report_status
    BEFORE UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_report_status_transition();

-- 5.5 Genesis History Log & Automatic Deterministic Duplicate Detection After Insert
CREATE OR REPLACE FUNCTION public.after_insert_report_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_radius INTEGER;
    v_window_hours INTEGER;
    v_candidate RECORD;
    v_max_score NUMERIC(4,3) := 0.000;
    v_flagged BOOLEAN := FALSE;
BEGIN
    -- 1. Create Genesis Status History Record
    INSERT INTO public.report_status_history (
        report_id, previous_status, new_status, changed_by, public_rationale
    ) VALUES (
        NEW.id, NULL, 'Submitted', NEW.reporter_id,
        'Initial citizen report submitted and assigned reference ' || NEW.reference_code
    );

    -- 2. Execute Deterministic Duplicate Detection
    SELECT duplicate_radius_meters, duplicate_window_hours
    INTO v_radius, v_window_hours
    FROM public.issue_categories
    WHERE id = NEW.category_id;

    FOR v_candidate IN
        SELECT
            r.id AS candidate_id,
            ROUND(extensions.ST_Distance(r.location, NEW.location)::NUMERIC, 2) AS dist_m,
            GREATEST(
                extensions.similarity(r.search_text, NEW.search_text),
                CASE
                    WHEN LEAST(char_length(r.search_text), char_length(NEW.search_text)) < 12
                     AND (r.search_text ILIKE '%' || NEW.title || '%' OR NEW.search_text ILIKE '%' || r.title || '%')
                    THEN 0.50
                    ELSE 0.0
                END
            ) AS trgm_sim,
            EXTRACT(EPOCH FROM (NEW.created_at - r.created_at)) / 3600.0 AS age_hours
        FROM public.reports r
        WHERE r.id <> NEW.id
          AND r.category_id = NEW.category_id
          AND r.is_hidden = FALSE
          AND r.status NOT IN ('Rejected')
          AND r.created_at >= (NEW.created_at - (v_window_hours || ' hours')::INTERVAL)
          AND extensions.ST_DWithin(r.location, NEW.location, v_radius)
    LOOP
        DECLARE
            v_geo_score NUMERIC;
            v_time_score NUMERIC;
            v_composite NUMERIC(4,3);
        BEGIN
            v_geo_score := GREATEST(0, 1.0 - (v_candidate.dist_m / v_radius::NUMERIC));
            v_time_score := GREATEST(0, 1.0 - (v_candidate.age_hours / v_window_hours::NUMERIC));
            v_composite := ROUND(
                (0.45 * v_geo_score + 0.40 * v_candidate.trgm_sim + 0.15 * v_time_score)::NUMERIC,
                3
            );

            -- Flag if composite score >= 0.45 OR ultra-close within 15m and 24h in same category
            IF v_composite >= 0.450 OR (v_candidate.dist_m <= 15.0 AND v_candidate.age_hours <= 24.0) THEN
                v_flagged := TRUE;
                IF v_composite > v_max_score THEN
                    v_max_score := v_composite;
                END IF;

                INSERT INTO public.report_flags (
                    report_id, matched_report_id, flagged_by, reason, status,
                    similarity_score, distance_meters, details
                ) VALUES (
                    NEW.id,
                    v_candidate.candidate_id,
                    NULL,
                    'potential_duplicate',
                    'pending',
                    v_composite,
                    v_candidate.dist_m,
                    format(
                        'Automated deterministic flag: Composite=%s (TextSim=%s, Dist=%sm, DeltaHours=%s)',
                        v_composite, ROUND(v_candidate.trgm_sim::NUMERIC, 3),
                        v_candidate.dist_m, ROUND(v_candidate.age_hours::NUMERIC, 1)
                    )
                );
            END IF;
        END;
    END LOOP;

    IF v_flagged THEN
        UPDATE public.reports
        SET duplicate_auto_flagged = TRUE,
            max_duplicate_score = v_max_score
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_insert_report_lifecycle ON public.reports;
CREATE TRIGGER trg_after_insert_report_lifecycle
    AFTER INSERT ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION public.after_insert_report_lifecycle();

-- 6. GEOSPATIAL & ANALYTICS RPC FUNCTIONS

-- 6.1 Bounding-Box & Category Map Search RPC
CREATE OR REPLACE FUNCTION public.search_reports_in_bbox(
    p_west DOUBLE PRECISION,
    p_south DOUBLE PRECISION,
    p_east DOUBLE PRECISION,
    p_north DOUBLE PRECISION,
    p_category_slug TEXT DEFAULT NULL,
    p_status public.report_status DEFAULT NULL,
    p_limit INTEGER DEFAULT 250
)
RETURNS TABLE (
    id UUID,
    reference_code TEXT,
    title TEXT,
    description_excerpt TEXT,
    status public.report_status,
    category_slug TEXT,
    category_name TEXT,
    category_color TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_location_fuzzed BOOLEAN,
    approximate_address TEXT,
    upvotes_count INTEGER,
    duplicate_auto_flagged BOOLEAN,
    primary_photo_url TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
    SELECT
        r.id,
        r.reference_code,
        r.title,
        LEFT(r.description, 180) AS description_excerpt,
        r.status,
        c.slug AS category_slug,
        c.name AS category_name,
        c.color_hex AS category_color,
        r.public_latitude AS latitude,
        r.public_longitude AS longitude,
        r.is_location_fuzzed,
        r.approximate_address,
        r.upvotes_count,
        r.duplicate_auto_flagged,
        (
            SELECT m.public_url
            FROM public.report_media m
            WHERE m.report_id = r.id AND m.is_flagged_graphic = FALSE
            ORDER BY m.created_at ASC
            LIMIT 1
        ) AS primary_photo_url,
        r.created_at
    FROM public.reports r
    INNER JOIN public.issue_categories c ON c.id = r.category_id
    WHERE r.is_hidden = FALSE
      AND (r.location::extensions.geometry) && extensions.ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326)
      AND (p_category_slug IS NULL OR c.slug = p_category_slug)
      AND (p_status IS NULL OR r.status = p_status)
    ORDER BY r.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 500);
$$;

-- 6.2 Pre-Submission Interactive Duplicate Preview RPC
CREATE OR REPLACE FUNCTION public.preview_duplicate_candidates(
    p_category_id UUID,
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_title TEXT,
    p_description TEXT
)
RETURNS TABLE (
    candidate_id UUID,
    reference_code TEXT,
    title TEXT,
    status public.report_status,
    distance_meters NUMERIC(8,2),
    text_similarity NUMERIC(4,3),
    composite_score NUMERIC(4,3),
    created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
    WITH params AS (
        SELECT
            extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography AS pt,
            lower(trim(p_title) || ' ' || trim(p_description)) AS q_text,
            c.duplicate_radius_meters AS radius_m,
            c.duplicate_window_hours AS win_h
        FROM public.issue_categories c
        WHERE c.id = p_category_id
    )
    SELECT
        r.id AS candidate_id,
        r.reference_code,
        r.title,
        r.status,
        ROUND(extensions.ST_Distance(r.location, p.pt)::NUMERIC, 2) AS distance_meters,
        ROUND(extensions.similarity(r.search_text, p.q_text)::NUMERIC, 3) AS text_similarity,
        ROUND((
            0.45 * GREATEST(0, 1.0 - (extensions.ST_Distance(r.location, p.pt) / p.radius_m)) +
            0.40 * extensions.similarity(r.search_text, p.q_text) +
            0.15 * GREATEST(0, 1.0 - (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0 / p.win_h))
        )::NUMERIC, 3) AS composite_score,
        r.created_at
    FROM public.reports r
    CROSS JOIN params p
    WHERE r.category_id = p_category_id
      AND r.is_hidden = FALSE
      AND r.status <> 'Rejected'
      AND r.created_at >= NOW() - (p.win_h || ' hours')::INTERVAL
      AND extensions.ST_DWithin(r.location, p.pt, p.radius_m)
    ORDER BY composite_score DESC, distance_meters ASC
    LIMIT 5;
$$;

-- 6.3 Real-Time Public Analytics Aggregation RPC (Zero Fabricated Metrics)
CREATE OR REPLACE FUNCTION public.get_public_analytics()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'generated_at', NOW(),
        'summary', (
            SELECT jsonb_build_object(
                'total_reports', COUNT(*),
                'resolved_count', COUNT(*) FILTER (WHERE status = 'Resolved'),
                'closed_rejected_count', COUNT(*) FILTER (WHERE status = 'Rejected'),
                'pending_active_count', COUNT(*) FILTER (
                    WHERE status IN ('Submitted', 'Under review', 'Accepted', 'Assigned', 'In progress', 'Reopened')
                ),
                'avg_resolution_hours', ROUND(
                    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600.0)
                    FILTER (WHERE status = 'Resolved' AND resolved_at IS NOT NULL)::NUMERIC, 2
                ),
                'duplicate_flagged_count', COUNT(*) FILTER (WHERE duplicate_auto_flagged = TRUE)
            )
            FROM public.reports
            WHERE is_hidden = FALSE
        ),
        'by_category', COALESCE((
            SELECT jsonb_agg(cat_row ORDER BY total_count DESC)
            FROM (
                SELECT
                    c.slug,
                    c.name,
                    c.color_hex,
                    COUNT(r.id) AS total_count,
                    COUNT(r.id) FILTER (WHERE r.status = 'Resolved') AS resolved_count,
                    COUNT(r.id) FILTER (WHERE r.status = 'Rejected') AS closed_count,
                    COUNT(r.id) FILTER (
                        WHERE r.status IN ('Submitted', 'Under review', 'Accepted', 'Assigned', 'In progress', 'Reopened')
                    ) AS pending_count
                FROM public.issue_categories c
                LEFT JOIN public.reports r ON r.category_id = c.id AND r.is_hidden = FALSE
                WHERE c.is_active = TRUE
                GROUP BY c.id, c.slug, c.name, c.color_hex
            ) cat_row
        ), '[]'::jsonb),
        'by_status', COALESCE((
            SELECT jsonb_agg(stat_row)
            FROM (
                SELECT
                    s.status_label AS status,
                    COUNT(r.id) AS count
                FROM unnest(enum_range(NULL::public.report_status)) AS s(status_label)
                LEFT JOIN public.reports r ON r.status = s.status_label AND r.is_hidden = FALSE
                GROUP BY s.status_label
                ORDER BY s.status_label
            ) stat_row
        ), '[]'::jsonb),
        'geographic_clusters', COALESCE((
            SELECT jsonb_agg(geo_row)
            FROM (
                SELECT
                    ROUND(public_latitude::NUMERIC, 2) AS grid_lat,
                    ROUND(public_longitude::NUMERIC, 2) AS grid_lng,
                    COUNT(*) AS report_count,
                    COUNT(*) FILTER (WHERE status = 'Resolved') AS resolved_count
                FROM public.reports
                WHERE is_hidden = FALSE
                GROUP BY ROUND(public_latitude::NUMERIC, 2), ROUND(public_longitude::NUMERIC, 2)
                ORDER BY report_count DESC
                LIMIT 50
            ) geo_row
        ), '[]'::jsonb)
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- 7. ROW-LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_events ENABLE ROW LEVEL SECURITY;

-- 7.1 Profiles Policies
CREATE POLICY profiles_select_own_or_staff ON public.profiles
    FOR SELECT USING (
        auth.uid() = id
        OR public.get_current_user_role() IN ('admin', 'moderator')
    );

CREATE POLICY profiles_insert_self ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id AND role = 'citizen');

CREATE POLICY profiles_update_self ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 7.2 Issue Categories Policies
CREATE POLICY categories_select_public ON public.issue_categories
    FOR SELECT USING (is_active = TRUE OR public.get_current_user_role() = 'admin');

CREATE POLICY categories_manage_admin ON public.issue_categories
    FOR ALL USING (public.get_current_user_role() = 'admin');

-- 7.3 Reports Policies
CREATE POLICY reports_select_visible_or_owner_or_staff ON public.reports
    FOR SELECT USING (
        is_hidden = FALSE
        OR reporter_id = auth.uid()
        OR public.get_current_user_role() IN ('admin', 'moderator')
    );

CREATE POLICY reports_insert_authenticated ON public.reports
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND reporter_id = auth.uid()
        AND status = 'Submitted'
    );

-- Only admins and moderators can UPDATE reports (status trigger further restricts status changes to admins)
CREATE POLICY reports_update_staff_only ON public.reports
    FOR UPDATE USING (
        public.get_current_user_role() IN ('admin', 'moderator')
    );

-- Citizens can only delete their own report if it is still in 'Submitted' status; Admins can delete spam
CREATE POLICY reports_delete_restricted ON public.reports
    FOR DELETE USING (
        public.get_current_user_role() = 'admin'
        OR (reporter_id = auth.uid() AND status = 'Submitted')
    );

-- 7.4 Report Media Policies
CREATE POLICY media_select_public ON public.report_media
    FOR SELECT USING (
        is_flagged_graphic = FALSE
        OR uploaded_by = auth.uid()
        OR public.get_current_user_role() IN ('admin', 'moderator')
    );

CREATE POLICY media_insert_owner ON public.report_media
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND uploaded_by = auth.uid()
    );

-- 7.5 Status History Policies (Read-only for public; insert via trigger or admin)
CREATE POLICY status_history_select_public ON public.report_status_history
    FOR SELECT USING (TRUE);

CREATE POLICY status_history_insert_admin ON public.report_status_history
    FOR INSERT WITH CHECK (public.get_current_user_role() = 'admin');

-- 7.6 Report Updates Policies (Strictly separates public updates from private internal notes)
CREATE POLICY updates_select_visibility ON public.report_updates
    FOR SELECT USING (
        is_public = TRUE
        OR public.get_current_user_role() IN ('admin', 'moderator')
    );

CREATE POLICY updates_insert_authorized ON public.report_updates
    FOR INSERT WITH CHECK (
        auth.uid() = author_id
        AND (
            public.get_current_user_role() IN ('admin', 'moderator')
            OR (is_public = TRUE AND is_official_response = FALSE)
        )
    );

-- 7.7 Report Flags Policies
CREATE POLICY flags_select_staff_or_reporter ON public.report_flags
    FOR SELECT USING (
        flagged_by = auth.uid()
        OR public.get_current_user_role() IN ('admin', 'moderator')
    );

CREATE POLICY flags_insert_authenticated ON public.report_flags
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND flagged_by = auth.uid()
    );

CREATE POLICY flags_update_staff ON public.report_flags
    FOR UPDATE USING (public.get_current_user_role() IN ('admin', 'moderator'));

-- 7.8 Admin Assignments & Moderation Events (Strictly isolated to staff)
CREATE POLICY assignments_staff_only ON public.admin_assignments
    FOR ALL USING (public.get_current_user_role() IN ('admin', 'moderator'));

CREATE POLICY moderation_events_staff_only ON public.moderation_events
    FOR ALL USING (public.get_current_user_role() IN ('admin', 'moderator'));
