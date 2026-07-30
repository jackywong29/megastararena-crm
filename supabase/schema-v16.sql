-- MegaStar Arena CRM — Schema v16
-- BUGFIX: SOP checklist items were being seeded twice ("double data").
--
-- Cause: the show-detail page seeds the template with a check-then-insert
-- ("no items yet? → insert all 26"). Two concurrent requests for the same show
-- (two tabs, a refresh mid-load, route prefetch racing the real navigation)
-- both saw an empty checklist and both inserted the full template. Nothing in
-- the schema prevented it.
--
-- Fix: de-duplicate what's already there, then add a unique index so any repeat
-- insert is silently ignored (the app now upserts with ignoreDuplicates).
--
-- Run this whole file in Supabase → SQL Editor. Safe to re-run.

-- 1. Remove duplicate rows, keeping the most "valuable" copy of each item:
--    a row that's been ticked / marked N/A / has a note or attachment wins;
--    otherwise the earliest-created one. So no completed work is lost.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY show_id, section, title
           ORDER BY
             (is_done OR is_na OR note IS NOT NULL OR document_id IS NOT NULL) DESC,
             created_at ASC,
             id ASC
         ) AS rn
  FROM show_checklist_items
)
DELETE FROM show_checklist_items
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2. Prevent it happening again. A show can't hold the same checklist line
--    twice within a section — the app's insert now no-ops on conflict.
CREATE UNIQUE INDEX IF NOT EXISTS uq_checklist_show_section_title
  ON show_checklist_items (show_id, section, title);
