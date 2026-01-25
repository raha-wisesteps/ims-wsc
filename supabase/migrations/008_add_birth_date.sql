-- Migration: Add birth_date and update Intern Quotas
-- Execute this in Supabase Dashboard > SQL Editor
-- Created: 2026-01-20

-- ============================================
-- STEP 1: Add birth_date to profiles
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date date;

-- ============================================
-- STEP 2: Update WFH Quota for Interns
-- ============================================

-- Set WFH limit to 2 for all users with job_type 'intern'
UPDATE leave_quotas
SET wfh_weekly_limit = 2
FROM profiles
WHERE leave_quotas.profile_id = profiles.id
AND profiles.job_type = 'intern';

-- Ensure other roles (Analyst, etc.) stay at 1 (default) or whatever was set
-- Optional: Enforce default for others if needed, but safe to leave as is.

-- ============================================
-- STEP 3: Seed Birth Dates (Initial Data)
-- ============================================

-- Nalendra (Founder)
UPDATE profiles SET birth_date = '1985-05-10' WHERE full_name LIKE '%Nalendra%';

-- Milla (Senior Consultant)
UPDATE profiles SET birth_date = '1988-03-15' WHERE full_name LIKE '%Milla%';

-- Rega (BisDev)
UPDATE profiles SET birth_date = '1992-08-20' WHERE full_name LIKE '%Rega%';

-- Sofyan (Senior Analyst)
UPDATE profiles SET birth_date = '1991-01-05' WHERE full_name LIKE '%Sofyan%';

-- Annisa (Senior Analyst)
UPDATE profiles SET birth_date = '1993-02-14' WHERE full_name LIKE '%Annisa%';

-- Rahadian (Smart Tourism Data Analyst)
UPDATE profiles SET birth_date = '1994-06-22' WHERE full_name LIKE '%Rahadian%';

-- Shafa (Analyst)
UPDATE profiles SET birth_date = '1998-11-08' WHERE full_name LIKE '%Shafa%';

-- Selma (HR)
UPDATE profiles SET birth_date = '1995-04-12' WHERE full_name LIKE '%Selma%';

-- Seprian (Marketing)
UPDATE profiles SET birth_date = '1996-09-30' WHERE full_name LIKE '%Seprian%';

-- Rifqi (Intern) - Set arbitrary date or real if known
UPDATE profiles SET birth_date = '2000-01-01' WHERE full_name LIKE '%Rifqi%';

-- ============================================
-- VERIFICATION
-- ============================================

SELECT p.full_name, p.job_type, p.birth_date, lq.wfh_weekly_limit
FROM profiles p
JOIN leave_quotas lq ON p.id = lq.profile_id
ORDER BY p.job_type, p.full_name;
