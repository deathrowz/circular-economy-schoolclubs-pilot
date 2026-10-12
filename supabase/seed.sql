-- ============================================================================
-- SEED DATA: 15 PILOT SCHOOLS & STUDENT ENTERPRISE CLUBS
-- ============================================================================

INSERT INTO public.schools (code, name, district, city, campus_lat, campus_lng, campus_radius_meters, institutional_commitment_score, penalty_points_deducted, seed_funding_base_usd, seed_funding_topoff_usd)
VALUES
  ('SCH-01', 'Greenwood Technical High', 'North Metro District', 'Portland', 45.523062, -122.676482, 450, 94.0, 0, 1500, 3500),
  ('SCH-02', 'Cascade Eco-Academy', 'Cascade Valley', 'Seattle', 47.606209, -122.332071, 500, 91.0, 0, 1500, 3000),
  ('SCH-03', 'Pacific Crest Preparatory', 'Bay Innovation Zone', 'San Francisco', 37.774929, -122.419416, 400, 89.0, 0, 1500, 2500),
  ('SCH-04', 'Solstice Charter School', 'East Bay Unified', 'Oakland', 37.804363, -122.271111, 450, 87.0, 0, 1500, 2000),
  ('SCH-05', 'Redwood Polytechnic', 'Silicon Peninsula', 'San Jose', 37.338208, -121.886329, 550, 86.0, 0, 1500, 2000),
  ('SCH-06', 'Harborview Magnet High', 'Puget Sound District', 'Tacoma', 47.252877, -122.444291, 450, 84.0, 75, 1500, 1000),
  ('SCH-07', 'Summit Ridge STEM High', 'Front Range Unified', 'Denver', 39.739236, -104.990251, 500, 88.0, 0, 1500, 1500),
  ('SCH-08', 'Willamette Valley High', 'Mid-Valley District', 'Eugene', 44.052069, -123.086754, 500, 83.0, 0, 1500, 1500),
  ('SCH-09', 'Sierra Vista Sciences', 'Capitol Corridor', 'Sacramento', 38.581572, -121.494400, 450, 82.0, 0, 1500, 1000),
  ('SCH-10', 'Olympia Maritime & Trades', 'South Sound Unified', 'Olympia', 47.037874, -122.900695, 500, 85.0, 0, 1500, 1000),
  ('SCH-11', 'Columbia River Collegiate', 'Clark County District', 'Vancouver', 45.638728, -122.661486, 450, 80.0, 0, 1500, 500),
  ('SCH-12', 'Boulder Creek Innovation', 'Flatirons District', 'Boulder', 40.014986, -105.270546, 500, 86.0, 0, 1500, 1000),
  ('SCH-13', 'Spokane Falls Academy', 'Inland Northwest', 'Spokane', 47.658780, -117.426047, 500, 78.0, 0, 1500, 500),
  ('SCH-14', 'Marin Coastal High', 'North Bay District', 'San Rafael', 37.973535, -122.531087, 450, 79.0, 0, 1500, 0),
  ('SCH-15', 'Bellingham Bay Secondary', 'Whatcom Unified', 'Bellingham', 48.751911, -122.478685, 500, 74.0, 75, 1500, 0)
ON CONFLICT (code) DO NOTHING;
