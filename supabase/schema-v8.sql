-- ============================================================
-- schema-v8.sql — Separate dates for setup / rehearsal / dismantle
-- Run this in Supabase SQL Editor
-- ============================================================

-- Some shows need setup, rehearsal, or dismantle on a different day
-- than the show itself. These are optional — leave blank to mean
-- "same day as the show."
ALTER TABLE shows ADD COLUMN IF NOT EXISTS setup_date DATE;
ALTER TABLE shows ADD COLUMN IF NOT EXISTS rehearsal_date DATE;
ALTER TABLE shows ADD COLUMN IF NOT EXISTS teardown_date DATE;
