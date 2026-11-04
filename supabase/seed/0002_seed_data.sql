-- ============================================================================
-- CIVICFIX SEED DATA: 0002_seed_data.sql
-- Populates categories, synthetic reports, status histories, and duplicate pairs
-- ============================================================================

SET search_path TO public, extensions;

-- 1. SEED ISSUE CATEGORIES
INSERT INTO public.issue_categories (
    id, slug, name, description, icon_name, color_hex,
    duplicate_radius_meters, duplicate_window_hours, is_sensitive_location, display_order
) VALUES
    ('11111111-1111-4111-8111-111111111101', 'potholes', 'Potholes', 'Deep surface cavities, asphalt cratering, and hazardous pavement depressions.', 'circle-dot', '#174EA6', 75, 336, FALSE, 1),
    ('11111111-1111-4111-8111-111111111102', 'damaged-roads', 'Damaged Roads', 'Cracked carriageways, subsided curbing, faded lane markings, and guardrails.', 'construction', '#1E3A8A', 120, 504, FALSE, 2),
    ('11111111-1111-4111-8111-111111111103', 'garbage-accumulation', 'Garbage Accumulation', 'Overflowing communal bins, uncollected street waste, and illegal fly-tipping.', 'trash-2', '#D93025', 100, 168, TRUE, 3),
    ('11111111-1111-4111-8111-111111111104', 'water-leakage', 'Water Leakage', 'Burst municipal supply pipes, leaking hydrants, and continuous clean water runoff.', 'droplets', '#12B5CB', 150, 168, FALSE, 4),
    ('11111111-1111-4111-8111-111111111105', 'drainage-problems', 'Drainage Problems', 'Blocked storm grates, silted culverts, and localized street waterlogging.', 'waves', '#0D9488', 150, 336, FALSE, 5),
    ('11111111-1111-4111-8111-111111111106', 'broken-streetlights', 'Broken Streetlights', 'Non-functional luminaires, flickering poles, or exposed electrical junction boxes.', 'lightbulb-off', '#FA903E', 80, 504, FALSE, 6),
    ('11111111-1111-4111-8111-111111111107', 'damaged-public-infrastructure', 'Damaged Public Infrastructure', 'Broken bus shelters, vandalized park benches, damaged pedestrian footbridges, or signage.', 'landmark', '#4285F4', 100, 720, FALSE, 7),
    ('11111111-1111-4111-8111-111111111108', 'other-civic-issues', 'Other Supported Civic Issues', 'General public right-of-way hazards not covered by primary infrastructure categories.', 'help-circle', '#575B5F', 100, 336, TRUE, 8)
ON CONFLICT (slug) DO NOTHING;

-- 2. SEED SYNTHETIC REPORTS ACROSS LIFECYCLE STATES
-- Report 1: Pothole (Canonical Report — In progress)
INSERT INTO public.reports (
    id, reference_code, category_id, title, description,
    location, public_latitude, public_longitude, approximate_address, created_at
) VALUES (
    '22222222-2222-4222-8222-222222222201',
    'CF-2026-A10001',
    '11111111-1111-4111-8111-111111111101',
    'Severe crater pothole in northbound bus lane near central junction',
    'A 60cm wide and 15cm deep pothole has formed directly in the northbound bus and cyclist lane approaching the Central Avenue traffic signal, causing two-wheelers to swerve suddenly.',
    extensions.ST_SetSRID(extensions.ST_MakePoint(80.33187, 26.44992), 4326)::extensions.geography,
    26.44992, 80.33187,
    'Central Avenue Northbound, 40m south of Mall Road Intersection',
    NOW() - INTERVAL '4 days'
) ON CONFLICT (id) DO NOTHING;

-- Report 2: Near-Duplicate Pothole (22 meters away, high trigram overlap -> Triggers auto-flag!)
INSERT INTO public.reports (
    id, reference_code, category_id, title, description,
    location, public_latitude, public_longitude, approximate_address, created_at
) VALUES (
    '22222222-2222-4222-8222-222222222202',
    'CF-2026-A10002',
    '11111111-1111-4111-8111-111111111101',
    'Deep pothole crater in northbound bus lane at Central Avenue signal',
    'Large asphalt crater in the northbound bus lane right before the Central Avenue traffic signal. Cyclists and scooters are swerving into fast traffic to avoid it.',
    extensions.ST_SetSRID(extensions.ST_MakePoint(80.33195, 26.45008), 4326)::extensions.geography,
    26.45008, 80.33195,
    'Near Mall Road & Central Avenue Traffic Light',
    NOW() - INTERVAL '3 days'
) ON CONFLICT (id) DO NOTHING;

-- Report 3: Water Leakage (Resolved with complete history)
INSERT INTO public.reports (
    id, reference_code, category_id, title, description,
    location, public_latitude, public_longitude, approximate_address, created_at
) VALUES (
    '22222222-2222-4222-8222-222222222203',
    'CF-2026-W20409',
    '11111111-1111-4111-8111-111111111104',
    'Main feeder water pipe burst flooding pedestrian walkway',
    'Pressurized clean drinking water is gushing continuously from a fractured cast-iron valve joint beneath the eastern sidewalk, eroding the brick paving.',
    extensions.ST_SetSRID(extensions.ST_MakePoint(80.32450, 26.46120), 4326)::extensions.geography,
    26.46120, 80.32450,
    'Swaroop Nagar Main Road, Opposite Metro Pillar 14',
    NOW() - INTERVAL '6 days'
) ON CONFLICT (id) DO NOTHING;

-- Report 4: Broken Streetlight (Under review)
INSERT INTO public.reports (
    id, reference_code, category_id, title, description,
    location, public_latitude, public_longitude, approximate_address, created_at
) VALUES (
    '22222222-2222-4222-8222-222222222204',
    'CF-2026-L30811',
    '11111111-1111-4111-8111-111111111106',
    'Three consecutive LED streetlights dark along pedestrian overpass',
    'Poles #SL-402 through #SL-404 have been completely dark for five nights, leaving the pedestrian staircase and bus stop pitch black after 6:30 PM.',
    extensions.ST_SetSRID(extensions.ST_MakePoint(80.34810, 26.43850), 4326)::extensions.geography,
    26.43850, 80.34810,
    'Station Road Pedestrian Footbridge West Approach',
    NOW() - INTERVAL '2 days'
) ON CONFLICT (id) DO NOTHING;

-- Report 5: Garbage Accumulation (Sensitive Location -> Automatically coordinate-fuzzed)
INSERT INTO public.reports (
    id, reference_code, category_id, title, description,
    location, public_latitude, public_longitude, approximate_address, created_at
) VALUES (
    '22222222-2222-4222-8222-222222222205',
    'CF-2026-G50112',
    '11111111-1111-4111-8111-111111111103',
    'Uncollected construction debris and municipal waste blocking secondary lane',
    'Mixed plastic waste and dumped masonry rubble have accumulated around the secondary collection point for over a week, obstructing storm water runoff.',
    extensions.ST_SetSRID(extensions.ST_MakePoint(80.31984, 26.47219), 4326)::extensions.geography,
    26.472, 80.320,
    'Civil Lines Ward 12 Secondary Transfer Point',
    NOW() - INTERVAL '36 hours'
) ON CONFLICT (id) DO NOTHING;
