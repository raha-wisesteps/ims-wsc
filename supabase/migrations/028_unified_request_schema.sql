-- Migration: Unified Request Schema & Approval Logic (Re-apply)
-- Purpose: Consolidate request types and implement approval workflow
-- Created: 2026-01-22

-- 1. Update leave_requests table structure
-- First, ensure we start clean by dropping the constraint if it exists (from previous partial attempts)
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check;

-- Add new columns if they don't exist
ALTER TABLE leave_requests
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME,
ADD COLUMN IF NOT EXISTS total_hours NUMERIC,
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS compensation_type TEXT CHECK (compensation_type IN ('paid', 'leave', 'none'));

-- Apply the expanded check constraint for all request types
ALTER TABLE leave_requests
ADD CONSTRAINT leave_requests_leave_type_check
CHECK (leave_type IN (
  -- Original types
  'annual_leave', 'sick_leave', 'unpaid_leave', 'marriage', 'maternity', 'paternity', 'bereavement',
  -- New unified types
  'wfh', 'wfa', 'overtime', 'training', 'asset', 'reimburse', 'meeting'
));

-- 2. Create the Approval Function
CREATE OR REPLACE FUNCTION approve_leave_request(
  request_id UUID,
  approver_id UUID,
  new_status TEXT DEFAULT 'approved',
  rejection_note TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  req_record RECORD;
  user_quota_id UUID;
  days_count INTEGER;
BEGIN
  -- Get request details
  SELECT * INTO req_record FROM leave_requests WHERE id = request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  -- Ensure request is pending
  IF req_record.status != 'pending' THEN
    RAISE EXCEPTION 'Request is already processed';
  END IF;

  -- Update status
  UPDATE leave_requests
  SET 
    status = new_status,
    manager_id = approver_id, -- Assuming manager_id column exists (from 015 schema it wasn't there! Let's check 015 again carefully or add it)
    manager_note = rejection_note, -- In 015 it's called manager_note
    updated_at = NOW()
  WHERE id = request_id;

  -- Logic for Approved requests
  IF new_status = 'approved' THEN
    
    -- Calculate days (inclusive)
    days_count := (req_record.end_date - req_record.start_date) + 1;

    -- Update Quotas based on type
    -- We need to find the quota record for the user
    SELECT id INTO user_quota_id FROM leave_quotas WHERE profile_id = req_record.profile_id;
    
    IF user_quota_id IS NOT NULL THEN
        -- Annual Leave
        IF req_record.leave_type = 'annual_leave' THEN
           UPDATE leave_quotas 
           SET annual_leave_used = annual_leave_used + days_count 
           WHERE id = user_quota_id;
        END IF;

        -- WFH
        IF req_record.leave_type = 'wfh' THEN
           UPDATE leave_quotas
           SET wfh_weekly_used = wfh_weekly_used + days_count 
           WHERE id = user_quota_id;
        END IF;

        -- WFA
        IF req_record.leave_type = 'wfa' THEN
           UPDATE leave_quotas
           SET wfa_used = wfa_used + days_count 
           WHERE id = user_quota_id;
        END IF;
    END IF;

    -- NOTE: Ideally we would also insert into daily_checkins for "Auto Attendance" here, 
    -- but that logic might be complex due to date ranges. 
    -- For now, we rely on the daily cron or manual check-in that checks approved requests.
    
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Add manager_id column if it was missing (015 didn't show it explicitly only manager_note)
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES profiles(id);

-- 4. Policies for Approval Page
-- Drop existing policies first (for re-runs)
DROP POLICY IF EXISTS "Managers view all requests" ON leave_requests;
DROP POLICY IF EXISTS "Managers update requests" ON leave_requests;

-- Managers need to view ALL requests to approve them
CREATE POLICY "Managers view all requests" ON leave_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (role IN ('super_admin', 'ceo', 'hr', 'owner') OR is_office_manager = true)
  )
);

-- Managers need to update requests (to approve/reject)
CREATE POLICY "Managers update requests" ON leave_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (role IN ('super_admin', 'ceo', 'hr', 'owner') OR is_office_manager = true)
  )
);

