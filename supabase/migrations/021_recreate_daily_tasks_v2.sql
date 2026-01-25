-- Migration: Recreate Daily Tasks Table (v2)
-- Purpose: Structured storage for tasks with analytics capability (tracking creation vs completion time)

-- 1. Drop daily_tasks if it exists (it might from my previous attempt or be gone from step 190)
DROP TABLE IF EXISTS daily_tasks;

-- 2. Create proper daily_tasks table
CREATE TABLE daily_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    task_text TEXT NOT NULL,
    priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
    status TEXT CHECK (status IN ('ongoing', 'completed')) DEFAULT 'ongoing',
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ, -- Null until finished
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Users can View their own tasks
CREATE POLICY "Users can view own daily tasks" ON daily_tasks
    FOR SELECT USING (auth.uid() = profile_id);

-- Team members can view others' ONGOING tasks (for the dashboard team activity feed)
-- If we want to show completed ones too for history, we can remove the status check, 
-- but usually dashboard shows "what are they doing now".
-- Let's allow viewing all for transparency in team activity.
CREATE POLICY "Users can view team daily tasks" ON daily_tasks
    FOR SELECT USING (true); 

-- Users can Insert their own tasks
CREATE POLICY "Users can insert own daily tasks" ON daily_tasks
    FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Users can Update their own tasks (mark as completed, fix typo)
CREATE POLICY "Users can update own daily tasks" ON daily_tasks
    FOR UPDATE USING (auth.uid() = profile_id);

-- Users can Delete their own tasks (if they made a mistake)
CREATE POLICY "Users can delete own daily tasks" ON daily_tasks
    FOR DELETE USING (auth.uid() = profile_id);

-- 5. Cleanup profiles table (optional, but clean)
-- We remove the 'daily_plan' column we added in step 190 as it's no longer the source of truth
ALTER TABLE profiles DROP COLUMN IF EXISTS daily_plan;
