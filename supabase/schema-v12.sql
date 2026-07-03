-- MegaStar Arena CRM — Schema v12
-- Adds the per-show "Meeting Info" spec sheet (a single JSON blob on shows).
-- Shape: { "fields": { "<template_key>": "<value>" }, "extras": [ { "id", "label", "value" } ] }
-- The field template lives in code (lib/meetingInfo.ts); this column just stores the values,
-- plus any per-show extra items the Sales team adds.
-- Run this entire file in Supabase → SQL Editor. Safe to re-run.

ALTER TABLE shows ADD COLUMN IF NOT EXISTS meeting_info JSONB;
