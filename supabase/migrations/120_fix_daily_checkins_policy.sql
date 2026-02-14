-- Migration: Allow HR (role or flag), CEO, Owner, Super Admin to manage daily_checkins
-- This fixes the issue where flag-only HR (e.g. Interns with is_hr=true) cannot upload attendance

-- 1. Drop existing restrictive admin policy
DROP POLICY IF EXISTS "Admins can do everything on checkins" ON daily_checkins;

-- 2. Create new comprehensive policy
CREATE POLICY "HR and Admins can manage checkins"
ON daily_checkins
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (
      role IN ('super_admin', 'ceo', 'hr', 'owner')
      OR is_hr = true
    )
  )
);
