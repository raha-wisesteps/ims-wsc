-- Migration: Seed User Profiles for WSC IMS
-- Execute this AFTER 002_rls_policies.sql
-- Created: 2026-01-20

-- ============================================
-- STEP 1: Update existing profiles with role/employee_id
-- ============================================

-- Nalendra - CEO/Owner
UPDATE profiles SET 
  role = 'ceo',
  job_type = NULL,
  job_level = NULL,
  employee_id = 7,
  is_office_manager = false,
  full_name = 'Nalendra'
WHERE id = '2de107da-8a1f-43f1-9d85-0be1b76020cc';

-- Rahadian - Super Admin (Analyst L2 in job_type)
UPDATE profiles SET 
  role = 'super_admin',
  job_type = 'analyst',
  job_level = 'L2',
  employee_id = 2,
  is_office_manager = false,
  full_name = 'Rahadian Muhammad S.'
WHERE id = '42ec3448-801d-405f-ad56-7029b58d7df1';

-- Dwi - Employee + Office Manager flag (Analyst L3)
UPDATE profiles SET 
  role = 'employee',
  job_type = 'analyst',
  job_level = 'L3',
  employee_id = 3,
  is_office_manager = true,
  full_name = 'Annisa Dwi Febrianty'
WHERE id = '4cc828c6-5dcf-474b-af44-b30aaadc8aca';

-- Mila - Employee (Consultant III = Analyst with Consultant level)
UPDATE profiles SET 
  role = 'employee',
  job_type = 'analyst',
  job_level = 'Consultant III',
  employee_id = 4,
  is_office_manager = false,
  full_name = 'Milla Omarsaid'
WHERE id = 'd545de40-b3df-4c44-ab81-b62e2898599b';

-- Shafa - Employee (Analyst L1)
UPDATE profiles SET 
  role = 'employee',
  job_type = 'analyst',
  job_level = 'L1',
  employee_id = 1,
  is_office_manager = false,
  full_name = 'Shafa Nurfaizah'
WHERE id = '0d585282-8e20-4075-b480-eaa60cac62f5';

-- Sofyan - Employee (Analyst L3)
UPDATE profiles SET 
  role = 'employee',
  job_type = 'analyst',
  job_level = 'L3',
  employee_id = 6,
  is_office_manager = false,
  full_name = 'Muhammad Sofyan Hadi'
WHERE id = '4ada5363-065c-457e-b785-b4aa553ef58b';

-- Rifqi - Employee (Intern)
UPDATE profiles SET 
  role = 'employee',
  job_type = 'intern',
  job_level = NULL,
  employee_id = 5,
  is_office_manager = false,
  full_name = 'Rifqi'
WHERE id = '03e06c90-0164-4337-9ac3-d6c1fd8190a1';

-- Rega - Employee (BizDev L1, online-only)
UPDATE profiles SET 
  role = 'employee',
  job_type = 'bisdev',
  job_level = 'L1',
  employee_id = 101,
  is_office_manager = false,
  full_name = 'Rega Aldiaz Wahyundi'
WHERE id = 'fa621c9a-b36d-4caf-b24c-7ca550248497';

-- Selma - HR (Watcher, no employee_id)
UPDATE profiles SET 
  role = 'hr',
  job_type = 'hr',
  job_level = NULL,
  employee_id = NULL,
  is_office_manager = false,
  full_name = 'Selma Ana Asriani'
WHERE id = 'aa2b4130-a8c1-4282-9d25-476b478e23ad';

-- ============================================
-- STEP 2: Create leave_quotas for all users
-- ============================================

INSERT INTO leave_quotas (profile_id)
SELECT id FROM profiles WHERE is_active = true
ON CONFLICT (profile_id) DO NOTHING;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT id, full_name, role, job_type, job_level, employee_id, is_office_manager
FROM profiles
ORDER BY employee_id NULLS LAST;
