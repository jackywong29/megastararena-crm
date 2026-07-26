-- MegaStar Arena CRM — Schema v15
-- Broadcasts: manual email announcements to the team. v1 delivery is via the
-- sender's own mail app (a mailto/BCC batch) — no email API, no credentials.
-- This table just stores the draft/sent history. Audience is team-only:
-- 'all' | 'dept:<key>' | 'role:<role>'. No CHECK constraints on the text
-- columns (keeps enum-style values flexible; who can send is UI-enforced).
--
-- Run this whole file in Supabase → SQL Editor. Safe to re-run.

CREATE TABLE IF NOT EXISTS broadcasts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject         TEXT NOT NULL,
  body            TEXT NOT NULL,
  audience        TEXT NOT NULL DEFAULT 'all',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'draft',
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_created_at ON broadcasts(created_at DESC);

-- Row Level Security — permissive like the rest of the app. WHO can compose /
-- send (admin + department heads) is enforced in the UI via canSendBroadcasts.
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view broadcasts"   ON broadcasts;
DROP POLICY IF EXISTS "Authenticated can insert broadcasts" ON broadcasts;
DROP POLICY IF EXISTS "Authenticated can update broadcasts" ON broadcasts;
DROP POLICY IF EXISTS "Authenticated can delete broadcasts" ON broadcasts;

CREATE POLICY "Authenticated can view broadcasts"   ON broadcasts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert broadcasts" ON broadcasts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update broadcasts" ON broadcasts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete broadcasts" ON broadcasts FOR DELETE TO authenticated USING (true);
