-- Migration: Add employee_type column and create business_trips table
-- Purpose: Support different attendance logic for office vs remote employees
--          and track business trips for status display

-- 1. Add employee_type column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
  employee_type text DEFAULT 'employee' CHECK (employee_type IN ('employee', 'remote_employee'));

-- 2. Create business_trips table
CREATE TABLE IF NOT EXISTS business_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  destination text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  purpose text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE business_trips ENABLE ROW LEVEL SECURITY;

-- Policies for business_trips
-- 1. HR/Admin can view all trips
CREATE POLICY "HR and Admin can view all trips" ON business_trips
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (role IN ('CEO', 'Super Admin') OR job_type = 'hr')
    )
  );

-- 2. Users can view their own trips
CREATE POLICY "Users can view own trips" ON business_trips
  FOR SELECT
  USING (profile_id = auth.uid());

-- 3. HR/Admin can insert trips
CREATE POLICY "HR and Admin can insert trips" ON business_trips
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (role IN ('CEO', 'Super Admin') OR job_type = 'hr')
    )
  );

-- 4. HR/Admin can update trips
CREATE POLICY "HR and Admin can update trips" ON business_trips
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (role IN ('CEO', 'Super Admin') OR job_type = 'hr')
    )
  );

-- 5. HR/Admin can delete trips
CREATE POLICY "HR and Admin can delete trips" ON business_trips
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (role IN ('CEO', 'Super Admin') OR job_type = 'hr')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_trips_profile ON business_trips(profile_id);
CREATE INDEX IF NOT EXISTS idx_business_trips_dates ON business_trips(start_date, end_date);

-- Grant access
GRANT ALL ON business_trips TO authenticated;
