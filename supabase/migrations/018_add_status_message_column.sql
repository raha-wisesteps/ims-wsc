-- Migration: Add status_message to profiles
-- Purpose: Fix 'Status Message' feature in Hero Slide 2

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'status_message') THEN
        ALTER TABLE profiles ADD COLUMN status_message TEXT;
    END IF;
END $$;

-- Verify policy allows update (usually profiles policies are already set, but ensuring update on own profile)
-- Note: Assuming existing 'profiles_update_own' or similar policy exists. 
-- If not, you might need to add:
-- CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
