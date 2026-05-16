-- ============================================================
-- Fix: Remove recursive RLS policies on profiles
-- The "Teacher sees all profiles" policy was querying the
-- profiles table itself, causing infinite recursion.
-- ============================================================

-- Drop the recursive policies
DROP POLICY IF EXISTS "Teacher sees all profiles" ON profiles;
DROP POLICY IF EXISTS "Teacher manages campaigns" ON qr_campaigns;
DROP POLICY IF EXISTS "Teacher sees all scans" ON qr_scans;
DROP POLICY IF EXISTS "Teacher sees all discounts" ON student_discounts;
DROP POLICY IF EXISTS "Teacher manages all sessions" ON sessions;
DROP POLICY IF EXISTS "Teacher manages all homework" ON homework;

-- Replace with policies that check auth.users metadata instead
-- Teacher role is stored in raw_user_meta_data->>'role'
CREATE POLICY "Teacher sees all profiles"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'teacher'
    )
  );

CREATE POLICY "Teacher manages campaigns"
  ON qr_campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'teacher'
    )
  );

CREATE POLICY "Teacher sees all scans"
  ON qr_scans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'teacher'
    )
  );

CREATE POLICY "Teacher sees all discounts"
  ON student_discounts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'teacher'
    )
  );

CREATE POLICY "Teacher manages all sessions"
  ON sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'teacher'
    )
  );

CREATE POLICY "Teacher manages all homework"
  ON homework FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'teacher'
    )
  );
