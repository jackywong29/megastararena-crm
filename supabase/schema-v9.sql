-- MegaStar Arena CRM — Schema v9
-- Adds: (1) shows.client_address  (2) Sales SOP / booking checklist per show
-- Run this entire file in Supabase → SQL Editor. Safe to re-run.

-- ============================================================
-- 1) Company address on shows
-- ============================================================
ALTER TABLE shows ADD COLUMN IF NOT EXISTS client_address TEXT;

-- ============================================================
-- 2) Per-show SOP / checklist items
-- ============================================================
CREATE TABLE IF NOT EXISTS show_checklist_items (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id      UUID REFERENCES shows(id) ON DELETE CASCADE NOT NULL,
  section      TEXT NOT NULL CHECK (section IN ('booking_sop','pre_event','doc_checklist','after_event')),
  title        TEXT NOT NULL,
  position     INTEGER NOT NULL DEFAULT 0,
  is_done      BOOLEAN NOT NULL DEFAULT FALSE,
  is_na        BOOLEAN NOT NULL DEFAULT FALSE,
  allow_na     BOOLEAN NOT NULL DEFAULT FALSE,
  note         TEXT,
  due_date     DATE,
  relative_due TEXT,                                  -- 'event_minus_2months' | 'event_minus_2weeks' | NULL
  document_id  UUID REFERENCES documents(id) ON DELETE SET NULL,  -- optional link to an uploaded file (future)
  done_by      UUID REFERENCES profiles(id),
  done_at      TIMESTAMPTZ,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_show ON show_checklist_items(show_id);

-- ============================================================
-- 3) Row Level Security
-- Permissive like the rest of the app — who can EDIT (admin + Sales)
-- is enforced in the UI (canEditSop), matching tasks/documents.
-- ============================================================
ALTER TABLE show_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view checklist"   ON show_checklist_items;
DROP POLICY IF EXISTS "Authenticated can insert checklist" ON show_checklist_items;
DROP POLICY IF EXISTS "Authenticated can update checklist" ON show_checklist_items;
DROP POLICY IF EXISTS "Authenticated can delete checklist" ON show_checklist_items;

CREATE POLICY "Authenticated can view checklist"   ON show_checklist_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert checklist" ON show_checklist_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update checklist" ON show_checklist_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete checklist" ON show_checklist_items FOR DELETE TO authenticated USING (true);
