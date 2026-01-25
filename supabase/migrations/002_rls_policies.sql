-- Migration: RLS Policies for WSC IMS
-- Execute this AFTER 001_schema_setup.sql
-- Created: 2026-01-20

-- ============================================
-- Helper function to check admin roles
-- ============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'ceo', 'owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_hr_or_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'ceo', 'owner', 'hr')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PROFILES Policies
-- ============================================

-- Everyone can view active profiles (for team list)
CREATE POLICY profiles_select_active ON profiles
  FOR SELECT USING (is_active = true);

-- Users can update their own profile (limited fields)
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can do anything
CREATE POLICY profiles_admin_all ON profiles
  FOR ALL USING (is_admin());

-- ============================================
-- LEAVE_QUOTAS Policies
-- ============================================

-- Users can view their own quotas
CREATE POLICY leave_quotas_select_own ON leave_quotas
  FOR SELECT USING (auth.uid() = profile_id);

-- HR/Admin can view all quotas
CREATE POLICY leave_quotas_select_admin ON leave_quotas
  FOR SELECT USING (is_hr_or_admin());

-- Only admin can insert/update/delete
CREATE POLICY leave_quotas_admin_all ON leave_quotas
  FOR ALL USING (is_admin());

-- ============================================
-- EXTRA_LEAVE_GRANTS Policies
-- ============================================

-- Users can view their own grants
CREATE POLICY extra_leave_select_own ON extra_leave_grants
  FOR SELECT USING (auth.uid() = profile_id);

-- HR/Admin can view all grants
CREATE POLICY extra_leave_select_admin ON extra_leave_grants
  FOR SELECT USING (is_hr_or_admin());

-- Only admin can manage grants
CREATE POLICY extra_leave_admin_all ON extra_leave_grants
  FOR ALL USING (is_admin());

-- ============================================
-- DAILY_CHECKINS Policies
-- ============================================

-- Everyone can view team checkins (for team status feed)
CREATE POLICY checkins_select_all ON daily_checkins
  FOR SELECT USING (true);

-- Users can insert their own checkin
CREATE POLICY checkins_insert_own ON daily_checkins
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Users can update their own checkin (same day only)
CREATE POLICY checkins_update_own ON daily_checkins
  FOR UPDATE USING (
    auth.uid() = profile_id 
    AND checkin_date = CURRENT_DATE
  );

-- Admin can do anything
CREATE POLICY checkins_admin_all ON daily_checkins
  FOR ALL USING (is_admin());

-- ============================================
-- TEAM_ACTIVITIES Policies
-- ============================================

-- Everyone can view activities (feed is public to team)
CREATE POLICY activities_select_all ON team_activities
  FOR SELECT USING (true);

-- Users can insert their own activities
CREATE POLICY activities_insert_own ON team_activities
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Users can update/delete their own activities
CREATE POLICY activities_modify_own ON team_activities
  FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY activities_delete_own ON team_activities
  FOR DELETE USING (auth.uid() = profile_id);

-- Admin can do anything
CREATE POLICY activities_admin_all ON team_activities
  FOR ALL USING (is_admin());

-- ============================================
-- KPI_SCORES Policies
-- ============================================

-- Users can view their own KPI scores
CREATE POLICY kpi_select_own ON kpi_scores
  FOR SELECT USING (auth.uid() = profile_id);

-- HR/Admin can view all scores
CREATE POLICY kpi_select_admin ON kpi_scores
  FOR SELECT USING (is_hr_or_admin());

-- Only CEO/Admin can manage KPI scores
CREATE POLICY kpi_admin_all ON kpi_scores
  FOR ALL USING (is_admin());

-- ============================================
-- VERIFICATION
-- ============================================

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public';
