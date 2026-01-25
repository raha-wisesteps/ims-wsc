-- Migration: Create Leave Requests Table
-- Purpose: Store leave requests for team activity tracking

CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type text NOT NULL CHECK (leave_type IN ('annual_leave', 'sick_leave', 'unpaid_leave', 'marriage', 'maternity', 'paternity', 'bereavement')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  manager_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Users can view their own requests
CREATE POLICY "Users can view own leaves" ON leave_requests
  FOR SELECT
  USING (auth.uid() = profile_id);

-- 2. Everyone can view APPROVED requests (for Team Activity Dashboard)
CREATE POLICY "View approved leaves" ON leave_requests
  FOR SELECT
  USING (status = 'approved');

-- 3. Users can insert their own requests
CREATE POLICY "Users can insert own leaves" ON leave_requests
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- 4. Users can update their own PENDING requests (e.g. cancel)
CREATE POLICY "Users can update own pending leaves" ON leave_requests
  FOR UPDATE
  USING (auth.uid() = profile_id AND status = 'pending');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_profile ON leave_requests(profile_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
