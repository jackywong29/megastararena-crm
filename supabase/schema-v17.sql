-- MegaStar Arena CRM — Schema v17
-- Company Hub folders. Files can now live inside a folder (Google-Drive style),
-- with folders nestable via parent_id. A NULL folder_id means the file sits at
-- the top level, so every existing file keeps working untouched.
--
-- Run this whole file in Supabase → SQL Editor. Safe to re-run.

CREATE TABLE IF NOT EXISTS company_folders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  parent_id  UUID REFERENCES company_folders(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_folders_parent ON company_folders(parent_id);

-- Deleting a folder leaves its files in place, moved back to the top level.
ALTER TABLE company_files
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES company_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_company_files_folder ON company_files(folder_id);

-- RLS — permissive like the rest of the app; who can upload/manage is
-- enforced in the UI (admin + department heads).
ALTER TABLE company_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view folders"   ON company_folders;
DROP POLICY IF EXISTS "Authenticated can insert folders" ON company_folders;
DROP POLICY IF EXISTS "Authenticated can update folders" ON company_folders;
DROP POLICY IF EXISTS "Authenticated can delete folders" ON company_folders;

CREATE POLICY "Authenticated can view folders"   ON company_folders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert folders" ON company_folders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update folders" ON company_folders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete folders" ON company_folders FOR DELETE TO authenticated USING (true);
