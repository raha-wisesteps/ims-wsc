-- Migration: Add position column to daily_tasks
-- Purpose: Enable custom ordering of tasks in the Daily Plan

ALTER TABLE daily_tasks 
ADD COLUMN IF NOT EXISTS "position" INTEGER DEFAULT 0;

-- Optional: Initialize position based on id ordering for existing tasks
WITH ranked_tasks AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY profile_id ORDER BY id) - 1 as new_pos
  FROM daily_tasks
)
UPDATE daily_tasks
SET "position" = ranked_tasks.new_pos
FROM ranked_tasks
WHERE daily_tasks.id = ranked_tasks.id;
