-- Migration: Move Daily Tasks to Profiles Table
-- Purpose: Simplify persistence by storing tasks directly on the profile row (JSONB)

-- 1. Add daily_plan column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS daily_plan JSONB DEFAULT '[]'::jsonb;

-- 2. Drop separate daily_tasks table if it exists
DROP TABLE IF EXISTS daily_tasks CASCADE;

-- 3. Ensure daily_checkins still exists (Hero Slide 1 depends on it)
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

-- 4. Enable RLS on daily_checkins (just in case)
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

-- 5. Grant update on profiles.daily_plan (effectively update on profiles)
-- Profiles policies usually allow users to update their own row. 
-- We ensure specific column permission isn't blocked, but row-level is key.
-- (No specific extra grant needed if profiles update policy exists)
