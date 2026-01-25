-- Migration: Fix All Persistence Issues (Status & Daily Plan)
-- Purpose: Ensure all necessary columns and tables exist and are writable.

-- 1. Fix 'profiles' table (Add status_message)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status_message TEXT;

-- 2. Ensure 'daily_tasks' exists
CREATE TABLE IF NOT EXISTS daily_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    task_text TEXT NOT NULL,
    priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Ensure 'daily_checkins' exists
CREATE TABLE IF NOT EXISTS daily_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    checkin_date DATE DEFAULT CURRENT_DATE,
    status TEXT NOT NULL,
    source TEXT DEFAULT 'web',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(profile_id, checkin_date)
);

-- 4. FORCE RE-APPLY RLS (Safeguard)
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts, then re-create
DROP POLICY IF EXISTS "Users can view their own tasks" ON daily_tasks;
DROP POLICY IF EXISTS "Users can view all tasks (Team Activity)" ON daily_tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON daily_tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON daily_tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON daily_tasks;

CREATE POLICY "Users can view their own tasks" ON daily_tasks FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can view all tasks (Team Activity)" ON daily_tasks FOR SELECT USING (true);
CREATE POLICY "Users can insert their own tasks" ON daily_tasks FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update their own tasks" ON daily_tasks FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete their own tasks" ON daily_tasks FOR DELETE USING (auth.uid() = profile_id);

-- Checkins Policies
DROP POLICY IF EXISTS "Users can view all checkins" ON daily_checkins;
DROP POLICY IF EXISTS "Users can insert their own checkins" ON daily_checkins;
DROP POLICY IF EXISTS "Users can update their own checkins" ON daily_checkins;

CREATE POLICY "Users can view all checkins" ON daily_checkins FOR SELECT USING (true);
CREATE POLICY "Users can insert their own checkins" ON daily_checkins FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update their own checkins" ON daily_checkins FOR UPDATE USING (auth.uid() = profile_id);

-- 5. Grant Permissions
GRANT ALL ON daily_tasks TO authenticated;
GRANT ALL ON daily_checkins TO authenticated;
