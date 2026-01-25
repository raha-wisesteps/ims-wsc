-- Migration: Fix Business Trip RLS Policies
-- Purpose: Allow authenticated users to create (INSERT) and manage (UPDATE/DELETE) their own business trip requests.

-- 1. Add policy for INSERT (Users can create their own trips)
CREATE POLICY "Users can create own business trips" ON business_trips
FOR INSERT
WITH CHECK (
  auth.uid() = profile_id
);

-- 2. Add policy for UPDATE (Users can update their own trips)
CREATE POLICY "Users can update own business trips" ON business_trips
FOR UPDATE
USING (
  auth.uid() = profile_id
);

-- 3. Add policy for DELETE (Users can delete their own trips)
CREATE POLICY "Users can delete own business trips" ON business_trips
FOR DELETE
USING (
  auth.uid() = profile_id
);

-- Note: SELECT policies already exist in 023_employee_type_and_business_trips.sql
-- "HR and Admin can view all trips"
-- "Users can view own trips"
