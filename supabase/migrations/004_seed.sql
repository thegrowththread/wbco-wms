-- ============================================================
-- 004_seed.sql — Seed data
-- Run after 003_views.sql
-- ============================================================

-- ============================================================
-- WAREHOUSES (exact codes from SkuVault)
-- ============================================================
INSERT INTO warehouses (code, name, is_active) VALUES
  ('340',       '340 North Buckman (main floor)',  true),
  ('340U',      'Upstairs - 340 North Buckman',    true),
  ('340Z',      'CONTAINER',                        true),
  ('340G',      'Garage - 340 North Buckman',       false),
  ('FBAAMAZON', 'FBA (Amazon-managed)',              true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- PICK SESSION FILTERS (built-in saved filters)
-- ============================================================
INSERT INTO pick_session_filters (name, criteria) VALUES
  (
    '1-2 SKUs',
    '{
      "description": "Morning batch — orders with 1 or 2 SKUs, all items in stock, not in progress",
      "sku_count_min": 1,
      "sku_count_max": 2,
      "in_stock_only": true,
      "status": ["received"],
      "not_in_session": true
    }'::jsonb
  ),
  (
    'All In Stock - Ready',
    '{
      "description": "All ready-to-ship orders with all items in stock, not already in a session",
      "in_stock_only": true,
      "status": ["received"],
      "not_in_session": true
    }'::jsonb
  )
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- STAFF ACCOUNTS
-- After running this file, create each user in Supabase Auth:
--   Authentication > Users > Add user
-- Then run the INSERT below with the UUID from each auth user.
--
-- Staff:
--   Dana (admin):      danad57404@gmail.com
--   Sunshine Coleman (admin): sunshine's email
--   Ashley Johnson (picker)
--   Angela Robinson (picker)
--   PDWEmployee (picker)
--
-- Replace the UUIDs below with the ones Supabase Auth assigns.
-- ============================================================

-- EXAMPLE — uncomment and fill in real UUIDs after creating Auth accounts:
--
-- INSERT INTO users (id, email, name, role) VALUES
--   ('AUTH-UUID-HERE', 'danad57404@gmail.com', 'Dana', 'admin'),
--   ('AUTH-UUID-HERE', 'sunshine@email.com',   'Sunshine Coleman', 'admin'),
--   ('AUTH-UUID-HERE', 'ashley@email.com',      'Ashley Johnson',   'picker'),
--   ('AUTH-UUID-HERE', 'angela@email.com',       'Angela Robinson',  'picker'),
--   ('AUTH-UUID-HERE', 'pdwemployee@email.com',  'PDWEmployee',      'picker')
-- ON CONFLICT (id) DO NOTHING;
