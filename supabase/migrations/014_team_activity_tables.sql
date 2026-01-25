-- Migration: Team Activity & Daily Tasks
-- Purpose: Support "Team Activity" section with real data (status messages, daily tasks).

-- 1. Add 'status_message' to profiles for the custom "💬" message
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status_message text;

-- 2. Create 'daily_tasks' table for the "Daily Plan" todo list
-- This replaces the local 'dailyPlan' state in the dashboard
CREATE TABLE IF NOT EXISTS daily_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  task_text text NOT NULL,
  priority text CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_tasks
-- Users can manage their own tasks
CREATE POLICY "tasks_manage_own" ON daily_tasks
  FOR ALL
  USING (auth.uid() = profile_id);

-- Everyone can view everyone's tasks (for the Team Activity feed)
CREATE POLICY "tasks_view_all" ON daily_tasks
  FOR SELECT
  USING (true);

-- 3. (Optional) Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_tasks_profile ON daily_tasks(profile_id);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_created ON daily_tasks(created_at);
