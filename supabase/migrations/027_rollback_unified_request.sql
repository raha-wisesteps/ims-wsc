-- Migration: Rollback Unified Request Schema
-- Purpose: Revert changes made by the unified request update

-- 1. Drop the function
DROP FUNCTION IF EXISTS approve_leave_request(uuid, uuid, text, text);

-- 2. Drop the new policies
DROP POLICY IF EXISTS "Managers view all requests" ON leave_requests;
DROP POLICY IF EXISTS "Managers update requests" ON leave_requests;

-- 3. Restore the CHECK constraint
-- First drop the expanded one
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check;

-- Then add back the original one
ALTER TABLE leave_requests 
ADD CONSTRAINT leave_requests_leave_type_check 
CHECK (leave_type IN ('annual_leave', 'sick_leave', 'unpaid_leave', 'marriage', 'maternity', 'paternity', 'bereavement'));

-- 4. Drop the new columns
ALTER TABLE leave_requests 
DROP COLUMN IF EXISTS start_time,
DROP COLUMN IF EXISTS end_time,
DROP COLUMN IF EXISTS total_hours,
DROP COLUMN IF EXISTS attachment_url,
DROP COLUMN IF EXISTS compensation_type;
