-- Migration: Fix RLS Conflicts by Dropping and Re-creating Policies
-- Created: 2026-01-20

-- ============================================
-- PROFILES Policies
-- ============================================
DROP POLICY IF EXISTS profiles_select_active ON profiles;
DROP POLICY IF EXISTS profiles_update_own ON profiles;
DROP POLICY IF EXISTS profiles_admin_all ON profiles;

CREATE POLICY profiles_select_active ON profiles FOR SELECT USING (is_active = true);
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_admin_all ON profiles FOR ALL USING (is_admin());

-- ============================================
-- LEAVE_QUOTAS Policies
-- ============================================
DROP POLICY IF EXISTS leave_quotas_select_own ON leave_quotas;
DROP POLICY IF EXISTS leave_quotas_select_admin ON leave_quotas;
DROP POLICY IF EXISTS leave_quotas_admin_all ON leave_quotas;

CREATE POLICY leave_quotas_select_own ON leave_quotas FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY leave_quotas_select_admin ON leave_quotas FOR SELECT USING (is_hr_or_admin());
CREATE POLICY leave_quotas_admin_all ON leave_quotas FOR ALL USING (is_admin());

-- ============================================
-- EXTRA_LEAVE_GRANTS Policies
-- ============================================
DROP POLICY IF EXISTS extra_leave_select_own ON extra_leave_grants;
DROP POLICY IF EXISTS extra_leave_select_admin ON extra_leave_grants;
DROP POLICY IF EXISTS extra_leave_admin_all ON extra_leave_grants;

CREATE POLICY extra_leave_select_own ON extra_leave_grants FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY extra_leave_select_admin ON extra_leave_grants FOR SELECT USING (is_hr_or_admin());
CREATE POLICY extra_leave_admin_all ON extra_leave_grants FOR ALL USING (is_admin());

-- ============================================
-- DAILY_CHECKINS Policies
-- ============================================
DROP POLICY IF EXISTS checkins_select_all ON daily_checkins;
DROP POLICY IF EXISTS checkins_insert_own ON daily_checkins;
DROP POLICY IF EXISTS checkins_update_own ON daily_checkins;
DROP POLICY IF EXISTS checkins_admin_all ON daily_checkins;

CREATE POLICY checkins_select_all ON daily_checkins FOR SELECT USING (true);
CREATE POLICY checkins_insert_own ON daily_checkins FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY checkins_update_own ON daily_checkins FOR UPDATE USING (auth.uid() = profile_id AND checkin_date = CURRENT_DATE);
CREATE POLICY checkins_admin_all ON daily_checkins FOR ALL USING (is_admin());

-- ============================================
-- TEAM_ACTIVITIES Policies
-- ============================================
DROP POLICY IF EXISTS activities_select_all ON team_activities;
DROP POLICY IF EXISTS activities_insert_own ON team_activities;
DROP POLICY IF EXISTS activities_modify_own ON team_activities;
DROP POLICY IF EXISTS activities_delete_own ON team_activities;
DROP POLICY IF EXISTS activities_admin_all ON team_activities;

CREATE POLICY activities_select_all ON team_activities FOR SELECT USING (true);
CREATE POLICY activities_insert_own ON team_activities FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY activities_modify_own ON team_activities FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY activities_delete_own ON team_activities FOR DELETE USING (auth.uid() = profile_id);
CREATE POLICY activities_admin_all ON team_activities FOR ALL USING (is_admin());

-- ============================================
-- KPI_SCORES Policies
-- ============================================
DROP POLICY IF EXISTS kpi_select_own ON kpi_scores;
DROP POLICY IF EXISTS kpi_select_admin ON kpi_scores;
DROP POLICY IF EXISTS kpi_admin_all ON kpi_scores;

CREATE POLICY kpi_select_own ON kpi_scores FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY kpi_select_admin ON kpi_scores FOR SELECT USING (is_hr_or_admin());
CREATE POLICY kpi_admin_all ON kpi_scores FOR ALL USING (is_admin());
