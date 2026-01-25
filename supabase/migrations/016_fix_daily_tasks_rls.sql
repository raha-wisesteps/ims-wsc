-- Migration: Fix Daily Tasks RLS and Seed Verification Data
-- Purpose: Ensure RLS policies are explicit and verify DB write access

-- 1. Ensure pgcrypto is enabled (for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Refine RLS for daily_tasks (Split FOR ALL into granular policies)
DROP POLICY IF EXISTS "tasks_manage_own" ON daily_tasks;
DROP POLICY IF EXISTS "tasks_view_all" ON daily_tasks;
DROP POLICY IF EXISTS "tasks_select_all" ON daily_tasks;
DROP POLICY IF EXISTS "tasks_insert_own" ON daily_tasks;
DROP POLICY IF EXISTS "tasks_update_own" ON daily_tasks;
DROP POLICY IF EXISTS "tasks_delete_own" ON daily_tasks;

-- Explicit SELECT: Everyone can view all tasks (needed for Team Activity feed)
CREATE POLICY "tasks_select_all" ON daily_tasks
  FOR SELECT
  USING (true);

-- Explicit INSERT: Users can insert their own tasks
CREATE POLICY "tasks_insert_own" ON daily_tasks
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Explicit UPDATE: Users can update their own tasks
CREATE POLICY "tasks_update_own" ON daily_tasks
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Explicit DELETE: Users can delete their own tasks
CREATE POLICY "tasks_delete_own" ON daily_tasks
  FOR DELETE
  USING (auth.uid() = profile_id);

-- 3. Verify 'status_message' column exists on profiles (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'status_message') THEN
        ALTER TABLE profiles ADD COLUMN status_message text;
    END IF;
END $$;

-- 4. Seed a Test Task for the current user
INSERT INTO daily_tasks (profile_id, task_text, priority, is_completed)
SELECT id, 'System Verify: Database Connected ', 'high', false
FROM profiles
WHERE id = '42ec3448-801d-405f-ad56-7029b58d7df1'
AND NOT EXISTS (
    SELECT 1 FROM daily_tasks 
    WHERE profile_id = '42ec3448-801d-405f-ad56-7029b58d7df1' 
    AND task_text = 'System Verify: Database Connected '
);

-- 5. Force Update Status Message for verification
UPDATE profiles
SET status_message = 'System Ready '
WHERE id = '42ec3448-801d-405f-ad56-7029b58d7df1';

