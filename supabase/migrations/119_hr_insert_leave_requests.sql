-- Migration: Allow HR to insert leave requests on behalf of employees
-- Purpose: Enable HR role to submit sick leave for employees who cannot report themselves
-- The request will be created with 'pending' status for CEO/super_admin approval

-- Drop if exists for idempotency
DROP POLICY IF EXISTS "HR can insert leaves for others" ON leave_requests;

-- Allow HR, CEO, Owner, Super Admin to insert leave requests for any profile_id
CREATE POLICY "HR can insert leaves for others" ON leave_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role IN ('super_admin', 'ceo', 'hr', 'owner'))
  )
);
