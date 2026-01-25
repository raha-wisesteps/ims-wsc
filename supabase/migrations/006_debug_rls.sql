-- Debug & Fix RLS for Profiles
-- Run each step in Supabase Dashboard > SQL Editor

-- ============================================
-- STEP 1: Check current RLS status and policies
-- ============================================
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual::text as policy_condition
FROM pg_policies 
WHERE tablename = 'profiles';

-- ============================================
-- STEP 2: Check if RLS is enabled
-- ============================================
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname = 'profiles';

-- ============================================
-- STEP 3: QUICK FIX - Temporarily disable RLS for testing
-- (This will allow all reads - only for development!)
-- ============================================
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ============================================
-- After testing, if it works, re-enable with proper policy:
-- ============================================
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- 
-- DROP POLICY IF EXISTS profiles_select_authenticated ON profiles;
-- CREATE POLICY profiles_select_authenticated ON profiles
--   FOR SELECT 
--   TO authenticated
--   USING (true);  -- Allow all authenticated users to read all profiles
