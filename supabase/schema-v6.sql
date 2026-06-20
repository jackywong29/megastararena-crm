-- ============================================================
-- schema-v6.sql — Fix: 'event' department rejected by old CHECK constraints
-- Run this in Supabase SQL Editor
-- ============================================================

-- profiles.department — drop whatever the existing department CHECK is
-- named (even if not exactly "profiles_department_check") and replace it
DO $$
DECLARE con record;
BEGIN
  FOR con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'profiles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%department%'
  LOOP
    EXECUTE format('ALTER TABLE profiles DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE profiles ADD CONSTRAINT profiles_department_check
  CHECK (department IN ('management', 'finance', 'operations', 'tech', 'sales', 'event'));

-- tasks.department — same fix (tasks almost certainly has the same constraint)
DO $$
DECLARE con record;
BEGIN
  FOR con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'tasks'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%department%'
  LOOP
    EXECUTE format('ALTER TABLE tasks DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE tasks ADD CONSTRAINT tasks_department_check
  CHECK (department IN ('management', 'finance', 'operations', 'tech', 'sales', 'event'));
