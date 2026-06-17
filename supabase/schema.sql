-- MegaStar Arena CRM — Database Schema
-- Run this entire file in Supabase → SQL Editor

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  department  TEXT CHECK (department IN ('management','finance','operations','tech','sales')),
  role        TEXT CHECK (role IN ('admin','department_head')) DEFAULT 'department_head',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shows (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title                TEXT NOT NULL,
  client_name          TEXT NOT NULL,
  client_contact       TEXT,
  client_email         TEXT,
  client_phone         TEXT,
  event_type           TEXT CHECK (event_type IN ('concert','corporate','private_function','other')) NOT NULL DEFAULT 'concert',
  stage                TEXT CHECK (stage IN ('inquiry','confirmed','day_of','done')) NOT NULL DEFAULT 'inquiry',
  show_date            DATE,
  setup_time           TIME,
  show_time            TIME,
  teardown_time        TIME,
  expected_attendance  INTEGER,
  notes                TEXT,
  internal_notes       TEXT,
  created_by           UUID REFERENCES profiles(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id      UUID REFERENCES shows(id) ON DELETE CASCADE NOT NULL,
  name         TEXT NOT NULL,
  file_url     TEXT NOT NULL,
  file_size    BIGINT,
  file_type    TEXT,
  category     TEXT CHECK (category IN ('tech_rider','venue_spec','contract','quotation','invoice','site_visit','other')) DEFAULT 'other',
  uploaded_by  UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id      UUID REFERENCES shows(id) ON DELETE CASCADE NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  department   TEXT CHECK (department IN ('management','finance','operations','tech','sales')) NOT NULL,
  assigned_to  UUID REFERENCES profiles(id),
  status       TEXT CHECK (status IN ('pending','in_progress','done')) DEFAULT 'pending',
  due_date     DATE,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title            TEXT NOT NULL,
  message          TEXT NOT NULL,
  type             TEXT CHECK (type IN ('show_update','task_assigned','document_uploaded','stage_change')) NOT NULL,
  related_show_id  UUID REFERENCES shows(id) ON DELETE SET NULL,
  read             BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id   UUID REFERENCES shows(id) ON DELETE CASCADE NOT NULL,
  user_id   UUID REFERENCES profiles(id),
  action    TEXT NOT NULL,
  details   JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE shows         ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log  ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile"              ON profiles;
DROP POLICY IF EXISTS "Users can update own profile"              ON profiles;
CREATE POLICY "Authenticated users can view all profiles"  ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile"               ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile"               ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Shows
DROP POLICY IF EXISTS "Authenticated users can view shows"   ON shows;
DROP POLICY IF EXISTS "Authenticated users can create shows" ON shows;
DROP POLICY IF EXISTS "Authenticated users can update shows" ON shows;
DROP POLICY IF EXISTS "Authenticated users can delete shows" ON shows;
CREATE POLICY "Authenticated users can view shows"         ON shows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create shows"       ON shows FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update shows"       ON shows FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete shows"       ON shows FOR DELETE TO authenticated USING (true);

-- Documents
DROP POLICY IF EXISTS "Authenticated users can view documents"   ON documents;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON documents;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON documents;
CREATE POLICY "Authenticated users can view documents"     ON documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can upload documents"   ON documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete documents"   ON documents FOR DELETE TO authenticated USING (true);

-- Tasks
DROP POLICY IF EXISTS "Authenticated users can view tasks"   ON tasks;
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON tasks;
CREATE POLICY "Authenticated users can view tasks"         ON tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create tasks"       ON tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update tasks"       ON tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete tasks"       ON tasks FOR DELETE TO authenticated USING (true);

-- Notifications
DROP POLICY IF EXISTS "Users can view own notifications"       ON notifications;
DROP POLICY IF EXISTS "Authenticated can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications"     ON notifications;
CREATE POLICY "Users can view own notifications"           ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Authenticated can create notifications"     ON notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own notifications"         ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Activity log
DROP POLICY IF EXISTS "Authenticated users can view activity" ON activity_log;
DROP POLICY IF EXISTS "Authenticated users can log activity"  ON activity_log;
CREATE POLICY "Authenticated users can view activity"      ON activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can log activity"       ON activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- TRIGGER: Auto-create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload"         ON storage.objects;
DROP POLICY IF EXISTS "Public can view documents"              ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own files" ON storage.objects;

CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Public can view documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can delete own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents');

-- ============================================================
-- REALTIME
-- Enable realtime for notifications
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'activity_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
  END IF;
END $$;
