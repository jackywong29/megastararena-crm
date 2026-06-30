-- MegaStar Arena CRM — Schema v10
-- Adds an optional "next meeting" date/time to shows (shown on the home hero card).
-- Run this entire file in Supabase → SQL Editor. Safe to re-run.

ALTER TABLE shows ADD COLUMN IF NOT EXISTS meeting_date DATE;
ALTER TABLE shows ADD COLUMN IF NOT EXISTS meeting_time TIME;
