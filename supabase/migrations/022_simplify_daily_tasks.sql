-- Migration: Simplify Daily Tasks (v3)
-- Purpose: Remove tracking columns as per user request ("focus on simple storage")

-- 1. Drop columns
ALTER TABLE daily_tasks
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS created_at,
DROP COLUMN IF EXISTS completed_at,
DROP COLUMN IF EXISTS updated_at;
