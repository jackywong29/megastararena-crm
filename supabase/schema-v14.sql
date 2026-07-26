-- MegaStar Arena CRM — Schema v14
-- Auto-archive: move a Confirmed show to Past Events ('done') once its event has
-- fully passed. Keyed off the last event day — dismantle date if set, else the
-- show date — in Malaysia time, so a multi-day run doesn't disappear mid-event
-- and a show happening *today* stays Confirmed. Only Confirmed shows are touched
-- (an expired Inquiry is a dead lead, handled separately by the team).
--
-- Run this whole file in Supabase → SQL Editor.
-- If step 2 errors with a permissions message, enable pg_cron first via
-- Dashboard → Database → Extensions (toggle on "pg_cron"), then re-run.
-- Safe to re-run: step 1 is idempotent, step 3 upserts the job by name.

-- 1. One-time immediate sweep (so any already-past Confirmed shows move now,
--    rather than waiting for tonight's run).
update shows
set stage = 'done', updated_at = now()
where stage = 'confirmed'
  and coalesce(teardown_date, show_date) < (now() at time zone 'Asia/Kuala_Lumpur')::date;

-- 2. Enable the scheduler.
create extension if not exists pg_cron;

-- 3. Nightly job at 18:00 UTC = 02:00 Asia/Kuala_Lumpur.
select cron.schedule(
  'archive-past-confirmed-shows',
  '0 18 * * *',
  $$
    update shows
    set stage = 'done', updated_at = now()
    where stage = 'confirmed'
      and coalesce(teardown_date, show_date) < (now() at time zone 'Asia/Kuala_Lumpur')::date
  $$
);
