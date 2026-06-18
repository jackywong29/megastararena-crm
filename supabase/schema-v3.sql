-- ============================================================
-- schema-v3.sql — Leave Management System
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add can_approve_leave flag to profiles
--    Set this to true for Finance Head and Operations Head
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_approve_leave BOOLEAN DEFAULT false;

-- 2. Leave applications table
CREATE TABLE IF NOT EXISTS leave_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('annual', 'medical', 'emergency')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Staff see their own; admins and approvers see all
CREATE POLICY "leave_select"
  ON leave_applications FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (role = 'admin' OR can_approve_leave = true)
    )
  );

-- Staff can apply leave for themselves
CREATE POLICY "leave_insert"
  ON leave_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Staff can withdraw pending own leaves; approvers can update status
CREATE POLICY "leave_update"
  ON leave_applications FOR UPDATE TO authenticated
  USING (
    (auth.uid() = user_id AND status = 'pending') OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (role = 'admin' OR can_approve_leave = true)
    )
  );

-- Staff can delete their own pending leaves
CREATE POLICY "leave_delete"
  ON leave_applications FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

-- ============================================================
-- After running: to grant leave approval to Finance/Ops head,
-- find their profile id and run:
--   UPDATE profiles SET can_approve_leave = true WHERE id = '<uuid>';
-- ============================================================
