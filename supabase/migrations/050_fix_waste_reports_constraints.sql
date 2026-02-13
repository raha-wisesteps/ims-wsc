-- Fix for Waste Reports Upsert Issue
-- 1. Add Unique Constraint on week_start to allow UPSERT onConflict
-- 2. Add UPDATE policy to allow modifying existing reports

-- 1. Add Unique Constraint
-- First, ensure no duplicates exist (keep the latest submitted one, or just any)
-- This is a simple deduplication if any exist
DELETE FROM waste_weekly_reports a USING waste_weekly_reports b
WHERE a.id < b.id AND a.week_start = b.week_start;

ALTER TABLE waste_weekly_reports 
ADD CONSTRAINT waste_weekly_reports_week_start_key UNIQUE (week_start);

-- 2. Add UPDATE Policy
-- Previously we only added SELECT and INSERT. Upsert requires UPDATE permission.
CREATE POLICY "Enable update access for all users" ON waste_weekly_reports 
FOR UPDATE USING (auth.role() = 'authenticated');
