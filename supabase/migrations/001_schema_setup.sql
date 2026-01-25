-- Migration: WSC IMS Schema Setup
-- Execute this in Supabase Dashboard > SQL Editor
-- Created: 2026-01-20

-- ============================================
-- STEP 1: Modify profiles table
-- ============================================

-- Add employee_id column for Fingerspot machine sync
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employee_id integer UNIQUE;

-- Add is_office_manager flag for add-on permission
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_office_manager boolean DEFAULT false;

-- Update role constraint to include all role types
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('super_admin', 'ceo', 'hr', 'employee', 'owner'));

-- ============================================
-- STEP 2: Create leave_quotas table
-- ============================================

CREATE TABLE IF NOT EXISTS leave_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  wfh_weekly_used integer DEFAULT 0,
  wfh_weekly_limit integer DEFAULT 1,
  annual_leave_used integer DEFAULT 0,
  annual_leave_total integer DEFAULT 15,
  wfa_used integer DEFAULT 0,
  wfa_total integer DEFAULT 30,
  quota_period_start date DEFAULT '2026-03-01',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE leave_quotas ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Create extra_leave_grants table
-- ============================================

CREATE TABLE IF NOT EXISTS extra_leave_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  days_granted integer NOT NULL,
  days_remaining integer NOT NULL,
  reason text,
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  granted_by uuid REFERENCES profiles(id),
  is_expired boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index for quick lookup of active grants
CREATE INDEX IF NOT EXISTS idx_extra_leave_active 
  ON extra_leave_grants(profile_id, is_expired) 
  WHERE is_expired = false;

-- Enable RLS
ALTER TABLE extra_leave_grants ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: Create daily_checkins table
-- ============================================

CREATE TABLE IF NOT EXISTS daily_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id integer,
  checkin_date date NOT NULL DEFAULT CURRENT_DATE,
  status text CHECK (status IN ('office', 'wfh', 'wfa', 'sick', 'leave', 'field', 'cuti', 'izin')),
  clock_in_time timestamptz,
  clock_out_time timestamptz,
  is_late boolean DEFAULT false,
  source text DEFAULT 'web',
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, checkin_date)
);

-- Enable RLS
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: Create team_activities table
-- ============================================

CREATE TABLE IF NOT EXISTS team_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text CHECK (type IN ('status_update', 'daily_plan', 'check_in', 'workload_update')),
  content text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE team_activities ENABLE ROW LEVEL SECURITY;

-- Enable Realtime for team_activities
ALTER PUBLICATION supabase_realtime ADD TABLE team_activities;

-- ============================================
-- STEP 6: Create kpi_scores table
-- ============================================

CREATE TABLE IF NOT EXISTS kpi_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  period text NOT NULL,
  score_knowledge integer CHECK (score_knowledge BETWEEN 1 AND 5),
  score_people integer CHECK (score_people BETWEEN 1 AND 5),
  score_service integer CHECK (score_service BETWEEN 1 AND 5),
  score_business integer CHECK (score_business BETWEEN 1 AND 5),
  score_leadership integer CHECK (score_leadership BETWEEN 1 AND 5),
  weighted_score numeric(4,2),
  scored_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, period)
);

-- Enable RLS
ALTER TABLE kpi_scores ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION: Check all tables created
-- ============================================

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
