-- Migration: Update Workload RLS for Staff Permissions
-- Purpose: Allow all staff (non-interns) to manage workload items (insert, update, delete).
-- Interns remain read-only (enforced by UI and RLS).

-- 1. Create helper function for generic Staff check
-- Returns true if the user is NOT an intern (so includes Admins, HR, and regular Staff)
CREATE OR REPLACE FUNCTION is_staff()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND NOT (role = 'employee' AND job_type = 'intern')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing restrictive policies (which limited to own profile or admin)
DROP POLICY IF EXISTS "workload_insert_own" ON workload_items;
DROP POLICY IF EXISTS "workload_update_own" ON workload_items;
DROP POLICY IF EXISTS "workload_delete_own" ON workload_items;

-- 3. Create new inclusive policies (Staff + Admin)
-- Note: 'is_staff()' returns true for Admins/HR as well, so we don't need 'OR is_hr_or_admin()' explicitly,
-- but logic holds: "Staff and above".

-- Insert: Staff can insert items (for themselves or others)
CREATE POLICY "workload_insert_staff" ON workload_items
  FOR INSERT
  WITH CHECK ( is_staff() );

-- Update: Staff can update any workload item
CREATE POLICY "workload_update_staff" ON workload_items
  FOR UPDATE
  USING ( is_staff() );

-- Delete: Staff can delete any workload item
CREATE POLICY "workload_delete_staff" ON workload_items
  FOR DELETE
  USING ( is_staff() );
