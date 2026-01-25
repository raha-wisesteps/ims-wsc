-- Fix RLS Policies for Profiles Table
-- Run this in Supabase Dashboard > SQL Editor

-- Step 1: Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Step 2: Check existing policies
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Step 3: Drop conflicting policies and recreate
DROP POLICY IF EXISTS profiles_select_active ON profiles;
DROP POLICY IF EXISTS profiles_update_own ON profiles;
DROP POLICY IF EXISTS profiles_admin_all ON profiles;

-- Step 4: Create proper SELECT policy - authenticated users can read all active profiles
CREATE POLICY profiles_select_authenticated ON profiles
  FOR SELECT 
  TO authenticated
  USING (is_active = true);

-- Step 5: Create UPDATE policy - users can update their own profile
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Step 6: Verify policies
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Step 7: Test - this should return your profile
SELECT id, full_name, role, job_type FROM profiles WHERE id = auth.uid();
