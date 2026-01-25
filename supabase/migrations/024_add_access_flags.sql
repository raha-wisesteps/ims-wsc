-- Migration: Add access flags and drop unused table
-- Purpose: Add is_busdev and is_hr flags for page access control

-- 1. Add is_busdev flag (for CRM access)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_busdev boolean DEFAULT false;

-- 2. Add is_hr flag (for limited HR page access)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_hr boolean DEFAULT false;

-- 3. Drop unused team_activities table
-- (status_message is in profiles, daily tasks in daily_tasks)
DROP TABLE IF EXISTS team_activities;
