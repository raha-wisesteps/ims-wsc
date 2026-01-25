-- Migration: Create Daily Tasks and Checkins Tables
-- Purpose: Fix persistence issues for Hero Slide 2 (Daily Plan) and Slide 1 (Checkins)

-- 1. Create daily_tasks table
CREATE TABLE IF NOT EXISTS daily_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    task_text TEXT NOT NULL,
    priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;

-- Policies for daily_tasks
CREATE POLICY "Users can view their own tasks" ON daily_tasks
    FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can view all tasks (Team Activity)" ON daily_tasks
    FOR SELECT USING (true); -- Needed for Team Activity feed

CREATE POLICY "Users can insert their own tasks" ON daily_tasks
    FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own tasks" ON daily_tasks
    FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own tasks" ON daily_tasks
    FOR DELETE USING (auth.uid() = profile_id);


-- 2. Create daily_checkins table
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

-- Enable RLS
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

-- Policies for daily_checkins
CREATE POLICY "Users can view all checkins" ON daily_checkins
    FOR SELECT USING (true); -- Needed for Team Status

CREATE POLICY "Users can insert their own checkins" ON daily_checkins
    FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own checkins" ON daily_checkins
    FOR UPDATE USING (auth.uid() = profile_id);

-- Grant access to authenticated users
GRANT ALL ON daily_tasks TO authenticated;
GRANT ALL ON daily_checkins TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
