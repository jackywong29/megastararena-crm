-- MegaStar Arena CRM — Schema v2
-- Run this in Supabase → SQL Editor (new additions only)

-- ============================================================
-- POSTS TABLE (Home feed)
-- ============================================================

CREATE TABLE IF NOT EXISTS posts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content     TEXT NOT NULL,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view posts"    ON posts;
DROP POLICY IF EXISTS "Authenticated users can create posts"  ON posts;
DROP POLICY IF EXISTS "Users can update own posts"            ON posts;
DROP POLICY IF EXISTS "Users can delete own posts or admins"  ON posts;

CREATE POLICY "Authenticated users can view posts"
  ON posts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own posts or admins"
  ON posts FOR DELETE TO authenticated USING (
    auth.uid() = created_by OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- COMPANY FILES TABLE (Company Hub)
-- ============================================================

CREATE TABLE IF NOT EXISTS company_files (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  file_url     TEXT NOT NULL,
  file_size    BIGINT,
  file_type    TEXT,
  uploaded_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE company_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view company files"      ON company_files;
DROP POLICY IF EXISTS "Department heads can upload company files"       ON company_files;
DROP POLICY IF EXISTS "Users can delete own company files or admins"    ON company_files;

CREATE POLICY "Authenticated users can view company files"
  ON company_files FOR SELECT TO authenticated USING (true);

CREATE POLICY "Department heads can upload company files"
  ON company_files FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can delete own company files or admins"
  ON company_files FOR DELETE TO authenticated USING (
    auth.uid() = uploaded_by OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- STORAGE BUCKET: avatars (profile photos)
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars"                ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars"           ON storage.objects;

CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Public can view avatars"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');

-- ============================================================
-- STORAGE BUCKET: company-files (company hub)
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-files', 'company-files', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload company-files storage" ON storage.objects;
DROP POLICY IF EXISTS "Public can view company-files storage"                ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete company-files storage" ON storage.objects;

CREATE POLICY "Authenticated users can upload company-files storage"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-files');

CREATE POLICY "Public can view company-files storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'company-files');

CREATE POLICY "Authenticated users can delete company-files storage"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'company-files');
