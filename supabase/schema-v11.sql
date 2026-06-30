-- MegaStar Arena CRM — Schema v11
-- @mentions: new 'mention' notification type + mention lists on posts/comments.
-- Run this entire file in Supabase → SQL Editor. Safe to re-run.

-- 1) Allow the new 'mention' notification type.
-- notifications.type has a CHECK constraint — drop it by introspection (its name
-- can vary), then recreate with the full set incl. 'mention'. (Same safe pattern
-- as schema-v6/v7.)
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'notifications'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'show_update','task_assigned','document_uploaded',
    'stage_change','leave_update','new_post','mention'
  ));

-- 2) Store which users were @mentioned, so notifications/highlighting are exact.
ALTER TABLE posts         ADD COLUMN IF NOT EXISTS mentions UUID[] DEFAULT '{}';
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS mentions UUID[] DEFAULT '{}';
