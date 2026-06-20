-- ============================================================
-- schema-v5.sql — Invite-only access, rehearsal slot, stage cleanup
-- Run this in Supabase SQL Editor (after schema-v4.sql)
-- ============================================================

-- 1. Rehearsal time slot on shows
ALTER TABLE shows ADD COLUMN IF NOT EXISTS rehearsal_time TIME;

-- 2. Retire the "Show Day" stage — move any existing rows to Confirmed
UPDATE shows SET stage = 'confirmed' WHERE stage = 'day_of';

-- 3. Account activation flag (offboarding)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
UPDATE profiles SET is_active = true WHERE is_active IS NULL;

-- 4. Allow the new 'staff' role (only if your profiles table has a role CHECK)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'department_head', 'staff'));

-- 5. Invite allowlist — only emails listed here can sign in
CREATE TABLE IF NOT EXISTS allowed_emails (
  email TEXT PRIMARY KEY,
  full_name TEXT,
  department TEXT,
  role TEXT DEFAULT 'staff',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allowed_select" ON allowed_emails;
CREATE POLICY "allowed_select" ON allowed_emails FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "allowed_admin_insert" ON allowed_emails;
CREATE POLICY "allowed_admin_insert" ON allowed_emails FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "allowed_admin_update" ON allowed_emails;
CREATE POLICY "allowed_admin_update" ON allowed_emails FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "allowed_admin_delete" ON allowed_emails;
CREATE POLICY "allowed_admin_delete" ON allowed_emails FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. Let admins manage any profile (deactivate / change role + dept)
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
CREATE POLICY "profiles_admin_update" ON profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- 7. Let a user create their own profile on first login (invite flow)
DROP POLICY IF EXISTS "profiles_self_insert" ON profiles;
CREATE POLICY "profiles_self_insert" ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- 8. Backfill: keep everyone currently in the system authorised
INSERT INTO allowed_emails (email, full_name, department, role)
  SELECT email, full_name, department, role FROM profiles
  ON CONFLICT (email) DO NOTHING;

-- 9. Safety net — make sure the owner can never be locked out
UPDATE profiles SET is_active = true, role = 'admin'
  WHERE email = 'jackywong0004@gmail.com';
INSERT INTO allowed_emails (email, full_name, role)
  VALUES ('jackywong0004@gmail.com', 'Jacky', 'admin')
  ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- ============================================================
-- To invite a new staff member, use the in-app Staff page,
-- or run:
--   INSERT INTO allowed_emails (email, full_name, department, role)
--   VALUES ('newstaff@gmail.com', 'Their Name', 'event', 'staff');
-- To offboard someone instantly:
--   UPDATE profiles SET is_active = false WHERE email = 'them@gmail.com';
--   DELETE FROM allowed_emails WHERE email = 'them@gmail.com';
-- ============================================================
