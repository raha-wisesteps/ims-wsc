-- Verify & Fix Raha's Profile Role
-- Run this in Supabase Dashboard > SQL Editor

-- Step 1: Check current profile data for Raha
SELECT id, email, full_name, role, job_type, employee_id, is_office_manager
FROM profiles
WHERE id = '42ec3448-801d-405f-ad56-7029b58d7df1';

-- Step 2: If role is not 'super_admin', run this to fix:
UPDATE profiles 
SET role = 'super_admin',
    job_type = 'analyst',
    job_level = 'L2',
    employee_id = 2,
    full_name = 'Rahadian Muhammad S.'
WHERE id = '42ec3448-801d-405f-ad56-7029b58d7df1';

-- Step 3: Verify the update
SELECT id, email, full_name, role, job_type, employee_id
FROM profiles
WHERE id = '42ec3448-801d-405f-ad56-7029b58d7df1';
