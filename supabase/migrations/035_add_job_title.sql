-- Migration: Add job_title column to profiles
-- Purpose: Add a distinct Job Title field (separate from system role) for display purposes.

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS job_title TEXT DEFAULT 'Tourism Analyst';

-- Update existing records to have the default value if they are null (just in case, though DEFAULT handles new ones)
UPDATE profiles
SET job_title = 'Tourism Analyst'
WHERE job_title IS NULL;
