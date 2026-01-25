-- Migration: Create Workload Items Table
-- Created: 2026-01-20

-- ============================================
-- STEP 1: Create workload_items table
-- ============================================

CREATE TABLE IF NOT EXISTS workload_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('Project', 'Proposal', 'Presentation', 'Support', 'Etc')),
  intensity text NOT NULL CHECK (intensity IN ('High', 'Medium', 'Low', 'Fixed', 'Custom')),
  slots integer NOT NULL DEFAULT 1,
  color text, -- Optional, can be derived from category on frontend but good to store if custom
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- STEP 2: Enable RLS and Policies
-- ============================================

ALTER TABLE workload_items ENABLE ROW LEVEL SECURITY;

-- Everyone can view workload (transparency)
CREATE POLICY workload_select_all ON workload_items
  FOR SELECT USING (true);

-- Only Admin or Owner can manage (insert/update/delete)
-- Assuming users can't edit their own workload unless they are admin/HR? 
-- For now, let's allow users to edit their OWN workload + Admins
CREATE POLICY workload_insert_own ON workload_items
  FOR INSERT WITH CHECK (auth.uid() = profile_id OR is_hr_or_admin());

CREATE POLICY workload_update_own ON workload_items
  FOR UPDATE USING (auth.uid() = profile_id OR is_hr_or_admin());

CREATE POLICY workload_delete_own ON workload_items
  FOR DELETE USING (auth.uid() = profile_id OR is_hr_or_admin());

-- ============================================
-- STEP 3: Seed Initial Data (Optional)
-- ============================================
-- You could seed some data here if needed using the profiles found in 003_seed_users.sql
