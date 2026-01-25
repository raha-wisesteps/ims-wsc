-- Migration: Seed Extra Leave for Super Admin
-- Created: 2026-01-20

-- Find Rahadian's Profile ID (Super Admin) and insert extra leave
DO $$
DECLARE
    rahadian_id uuid;
BEGIN
    -- Get Profile ID for Rahadian (assuming email or name, but using role 'super_admin' and name 'Rahadian' to be safe)
    SELECT id INTO rahadian_id FROM profiles WHERE role = 'super_admin' LIMIT 1;

    IF rahadian_id IS NOT NULL THEN
        -- Insert Extra Leave Grant
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
            '2026-01-18 09:00:00+07', -- Granted Jan 18, 2026
            '2026-02-18 09:00:00+07', -- Expires in 30 days
            rahadian_id -- Self-granted for testing
        );
    END IF;
END $$;
