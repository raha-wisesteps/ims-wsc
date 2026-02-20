-- Migration: Fix CEO Morning Away Override
-- Purpose: Prevent refresh_profile_status from overriding CEO's manually set status
--          during MORNING hours (before 08:00).
--
-- Current Bug:
--   Step E in the function forces 'away' for ALL users (including CEO) when
--   current_time < 08:00 or > 17:00 or weekend.
--   This overwrites the CEO's manually set status from daily_checkins.
--
-- Fix:
--   CEO should be forced 'away' ONLY:
--     - After 17:00 (jam pulang)
--     - On weekends
--   CEO should NOT be forced 'away':
--     - Before 08:00 on weekdays (pagi sebelum jam masuk) — respect manual status
--
-- Logic Priority (unchanged):
--   1. Business Trips (Dinas) → highest
--   2. Leave Requests (Lembur > WFH/WFA > Sakit > Cuti > Izin)
--   3. Daily Checkins (Manual — CEO always respected)
--   4. Working Hours Default (08-17 weekday, CEO skipped)
--   5. Night/Weekend Override (CEO: only after 17:00 + weekends)

CREATE OR REPLACE FUNCTION refresh_profile_status(target_profile_id UUID)
RETURNS VOID AS $$
DECLARE
    found_status TEXT;
    checkin_status TEXT;
    today_date DATE := CURRENT_DATE;
    current_time_val TIME := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::TIME;
    emp_type TEXT;
    user_role TEXT;
    is_weekend BOOLEAN;
BEGIN
    -- 0. Setup
    is_weekend := EXTRACT(ISODOW FROM today_date) IN (6, 7);
    
    -- Get Role
    SELECT role INTO user_role FROM profiles WHERE id = target_profile_id;

    -- A. Check for APPROVED Business Trip (Highest Priority - dinas)
    PERFORM 1 FROM business_trips 
    WHERE profile_id = target_profile_id 
    AND status = 'approved'
    AND today_date BETWEEN start_date AND end_date;
    
    IF FOUND THEN
        found_status := 'dinas';
    ELSE
        -- B. Check for Approved Leave Requests
        -- Priority: Lembur > WFH/WFA > Sakit > Cuti > Izin
        SELECT 
            CASE 
                WHEN leave_type = 'overtime' THEN 'lembur'
                WHEN leave_type = 'wfh' THEN 'wfh'
                WHEN leave_type = 'wfa' THEN 'wfa'
                WHEN leave_type = 'sick_leave' THEN 'sakit'
                WHEN leave_type IN ('annual_leave', 'other_permission', 'menstrual_leave', 'maternity', 'miscarriage', 'extra_leave') THEN 'cuti'
                WHEN leave_type IN ('self_marriage', 'child_marriage', 'paternity', 'wife_miscarriage', 'child_event', 'family_death', 'household_death', 'sibling_death', 'hajj', 'government', 'disaster') THEN 'izin'
                ELSE NULL
            END
        INTO found_status
        FROM leave_requests
        WHERE profile_id = target_profile_id
        AND status = 'approved'
        AND today_date BETWEEN start_date AND end_date
        AND leave_type NOT IN ('training', 'asset', 'reimburse', 'meeting', 'one_on_one')
        ORDER BY 
            CASE leave_type 
                WHEN 'overtime' THEN 1
                WHEN 'wfh' THEN 2
                WHEN 'wfa' THEN 2
                WHEN 'sick_leave' THEN 3
                ELSE 4
            END
        LIMIT 1;
        
        -- C. Check Daily Checkins (Manual Override)
        IF found_status IS NULL THEN
            SELECT LOWER(status) INTO checkin_status
            FROM daily_checkins
            WHERE profile_id = target_profile_id
            AND checkin_date = today_date
            ORDER BY created_at DESC
            LIMIT 1;

            IF checkin_status IS NOT NULL THEN
                -- Respect 'dinas' checkin or any CEO manual input
                IF checkin_status = 'dinas' OR user_role = 'ceo' THEN
                    found_status := checkin_status;
                END IF;
            END IF;
        END IF;

        -- D. Fallback: Default based on Employee Type (Working Hours 08-17)
        IF found_status IS NULL THEN
            IF (current_time_val BETWEEN '08:00:00'::time AND '17:00:00'::time) AND NOT is_weekend THEN
                IF user_role = 'ceo' THEN
                     -- CEO: No default office force
                     found_status := NULL;
                ELSE
                    -- Standard Employee: Force Office/Remote
                    SELECT employee_type INTO emp_type FROM profiles WHERE id = target_profile_id;
                    IF emp_type = 'remote_employee' THEN
                        found_status := 'remote';
                    ELSE
                        found_status := 'office';
                    END IF;
                END IF;
            END IF;
        END IF;
    END IF;

    -- E. NIGHT / WEEKEND OVERRIDE
    -- Force 'away' outside working hours, with CEO-specific logic:
    --   - CEO: Force 'away' ONLY after 17:00 and on weekends (NOT before 08:00 on weekdays)
    --   - Others: Force 'away' for all off-hours (before 08:00, after 17:00, weekends)
    -- EXCEPTION for all: 'lembur', 'cuti', 'sakit', 'izin' always persist

    IF user_role = 'ceo' THEN
        -- CEO LOGIC:
        -- Only force 'away' after jam pulang (17:00+) or on weekends
        -- Before 08:00 on weekdays → respect CEO's manual status (from Step C)
        IF (current_time_val >= '17:00:00'::time) OR is_weekend THEN
            -- Still protect lembur/cuti/sakit/izin
            IF found_status IS NULL OR found_status NOT IN ('lembur', 'cuti', 'sakit', 'izin') THEN
                found_status := 'away';
            END IF;
        ELSE
            -- Before 08:00 on weekday for CEO:
            -- If CEO has a manual status from Step C, keep it (don't override)
            -- If CEO has no status at all, leave NULL → no update (preserve existing profiles.status)
            NULL; -- Explicitly do nothing, preserve found_status from Step C
        END IF;
    ELSE
        -- STANDARD EMPLOYEE LOGIC (unchanged):
        -- Force 'away' for all off-hours
        IF (current_time_val >= '17:00:00'::time) OR (current_time_val < '08:00:00'::time) OR is_weekend THEN
            IF found_status IS NULL OR found_status NOT IN ('lembur', 'cuti', 'sakit', 'izin') THEN
                found_status := 'away';
            END IF;
        ELSIF found_status IS NULL THEN
            -- Failsafe: if somehow NULL during working hours for standard employee
            found_status := 'away';
        END IF;
    END IF;

    -- Final Update
    IF found_status IS NOT NULL THEN
        UPDATE profiles SET status = found_status WHERE id = target_profile_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the new logic immediately for all users
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM profiles LOOP
        PERFORM refresh_profile_status(r.id);
    END LOOP;
END;
$$;
