-- Migration: Add Admin update policy for daily_checkins
-- This fixes the issue where admins (CEO, Super Admin) cannot update late status of other users
-- Previous migrations (019) accidentally removed the admin_all policy

-- 1. Create a secure function to check for admin/HR privileges if it doesn't strictly exist for RLS context
-- (We rely on existing is_admin() or check directly)

CREATE OR REPLACE FUNCTION is_admin_or_super()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (
      job_level IN ('CEO', 'Super Admin', 'Director') 
      OR 
      job_title ILIKE '%CEO%' 
      OR 
      job_title ILIKE '%Director%'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add Policy for Admin Update on Daily Checkins
DROP POLICY IF EXISTS "Admins can do everything on checkins" ON daily_checkins;

CREATE POLICY "Admins can do everything on checkins"
ON daily_checkins
FOR ALL
USING (
  is_admin_or_super()
);
