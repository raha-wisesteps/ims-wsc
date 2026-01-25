-- Migration: Ensure Leave Quotas and Fix Birthday for Testing
-- Created: 2026-01-20

-- ============================================
-- STEP 1: Ensure Leave Quotas Exist for All Active Profiles
-- ============================================
INSERT INTO leave_quotas (profile_id)
SELECT id FROM profiles
WHERE id NOT IN (SELECT profile_id FROM leave_quotas)
ON CONFLICT (profile_id) DO NOTHING;

-- ============================================
-- STEP 2: Update Rahadian's Birth Date to TODAY (Jan 20) for Testing
-- ============================================
-- Based on logs, today is Jan 20, but DB has Jan 21. User wants to see "Today" banner.
UPDATE profiles 
SET birth_date = '2000-01-20' 
WHERE full_name LIKE '%Rahadian%';

-- ============================================
-- STEP 3: Re-seed Extra Leave for Rahadian (Ensure it exists)
-- ============================================
DO $$
DECLARE
    rahadian_id uuid;
BEGIN
    SELECT id INTO rahadian_id FROM profiles WHERE full_name LIKE '%Rahadian%' LIMIT 1;

    IF rahadian_id IS NOT NULL THEN
        -- Check if grant already exists, if not insert
        IF NOT EXISTS (SELECT 1 FROM extra_leave_grants WHERE profile_id = rahadian_id AND reason = 'Reward for High Performance (Testing)') THEN
            INSERT INTO extra_leave_grants (
                profile_id,
                days_granted,
                days_remaining,
                reason,
                granted_at,
                expires_at,
                granted_by
            ) VALUES (
                rahadian_id,
                1,
                1,
                'Reward for High Performance (Testing)',
                '2026-01-18 09:00:00+07', 
                '2026-02-18 09:00:00+07', 
                rahadian_id
            );
        END IF;
    END IF;
END $$;
