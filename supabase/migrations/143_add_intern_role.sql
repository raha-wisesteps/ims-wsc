-- Migration: WSC IMS Add Intern Role
-- Created: 2026-02-22

-- Update role constraint to include 'intern'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('super_admin', 'ceo', 'hr', 'employee', 'owner', 'intern'));
