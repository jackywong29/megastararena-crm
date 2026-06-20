-- ============================================================
-- schema-v7.sql — Notifications expansion, public holidays
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. notifications.type CHECK constraint only allowed the original 4
-- values — extend it to include leave_update and new_post (same
-- mismatch class as the 'event' department issue in schema-v6).
DO $$
DECLARE con record;
BEGIN
  FOR con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'notifications'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('show_update', 'task_assigned', 'document_uploaded', 'stage_change', 'leave_update', 'new_post'));

-- 2. Public holidays table (read-only reference data)
CREATE TABLE IF NOT EXISTS public_holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, name)
);

ALTER TABLE public_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "holidays_select" ON public_holidays FOR SELECT TO authenticated USING (true);

-- 3. Seed: Malaysia / Federal Territory of Kuala Lumpur public holidays
-- Source: publicholidays.com.my and qppstudio.net (cross-checked), June 2026.
-- Fixed-date holidays (New Year, Labour Day, Federal Territory Day,
-- Merdeka Day, Malaysia Day, Christmas) are reliable as gazetted.
-- Islamic/lunar/Hindu-calendar holidays (Hari Raya, Hari Raya Haji,
-- Awal Muharram, Prophet Muhammad's Birthday, Thaipusam, Chinese New
-- Year, Wesak Day, Deepavali, Nuzul Al-Quran) for 2027 are best-available
-- estimates pending official JAKIM/government gazette confirmation —
-- double-check closer to the date and update if they shift by a day.
INSERT INTO public_holidays (date, name) VALUES
  ('2026-01-01', 'New Year''s Day'),
  ('2026-02-01', 'Thaipusam'),
  ('2026-02-01', 'Federal Territory Day'),
  ('2026-02-02', 'Thaipusam (replacement)'),
  ('2026-02-03', 'Federal Territory Day (replacement)'),
  ('2026-02-17', 'Chinese New Year'),
  ('2026-02-18', 'Chinese New Year (2nd day)'),
  ('2026-03-07', 'Nuzul Al-Quran'),
  ('2026-03-21', 'Hari Raya Aidilfitri'),
  ('2026-03-22', 'Hari Raya Aidilfitri (2nd day)'),
  ('2026-03-23', 'Hari Raya Aidilfitri (replacement)'),
  ('2026-05-01', 'Labour Day'),
  ('2026-05-27', 'Hari Raya Haji'),
  ('2026-05-31', 'Wesak Day'),
  ('2026-06-01', 'Agong''s Birthday'),
  ('2026-06-02', 'Wesak Day (replacement)'),
  ('2026-06-17', 'Awal Muharram'),
  ('2026-08-25', 'Prophet Muhammad''s Birthday'),
  ('2026-08-31', 'Merdeka Day'),
  ('2026-09-16', 'Malaysia Day'),
  ('2026-11-08', 'Deepavali'),
  ('2026-11-09', 'Deepavali (replacement)'),
  ('2026-12-25', 'Christmas Day'),
  ('2027-01-01', 'New Year''s Day'),
  ('2027-01-22', 'Thaipusam'),
  ('2027-02-01', 'Federal Territory Day'),
  ('2027-02-06', 'Chinese New Year'),
  ('2027-02-07', 'Chinese New Year (2nd day)'),
  ('2027-02-08', 'Chinese New Year (replacement)'),
  ('2027-02-24', 'Nuzul Al-Quran'),
  ('2027-03-10', 'Hari Raya Aidilfitri'),
  ('2027-03-11', 'Hari Raya Aidilfitri (2nd day)'),
  ('2027-05-01', 'Labour Day'),
  ('2027-05-17', 'Hari Raya Haji'),
  ('2027-05-20', 'Wesak Day'),
  ('2027-06-06', 'Awal Muharram'),
  ('2027-06-07', 'Agong''s Birthday'),
  ('2027-08-15', 'Prophet Muhammad''s Birthday'),
  ('2027-08-16', 'Prophet Muhammad''s Birthday (replacement)'),
  ('2027-08-31', 'Merdeka Day'),
  ('2027-09-16', 'Malaysia Day'),
  ('2027-10-28', 'Deepavali'),
  ('2027-12-25', 'Christmas Day')
ON CONFLICT (date, name) DO NOTHING;
