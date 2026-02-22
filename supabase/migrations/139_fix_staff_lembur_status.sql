-- Migration: Fix Staff Lembur Status Override
-- Purpose: Allow non-CEO staff to retain protected statuses (lembur, sakit, izin, cuti, dinas)
--          from daily_checkins, even on weekends and outside working hours.
--
-- Current Bug (in migration 138):
--   Step C only preserves daily_checkins status for CEO or 'dinas':
--     IF checkin_status = 'dinas' OR user_role = 'ceo' THEN
--       found_status := checkin_status;
--   This means a staff member who clocks in with 'lembur' has it IGNORED,
--   then Step E forces 'away' on weekends/off-hours.
--
-- Fix:
--   Step C should preserve ANY protected status (lembur, sakit, izin, cuti, dinas)
--   from daily_checkins for ALL users, not just CEO.
--   CEO additionally gets ALL statuses preserved (office, wfh, etc).

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
        -- FIX: Preserve protected statuses for ALL users, not just CEO
        IF found_status IS NULL THEN
            SELECT LOWER(status) INTO checkin_status
            FROM daily_checkins
            WHERE profile_id = target_profile_id
            AND checkin_date = today_date
            ORDER BY created_at DESC
            LIMIT 1;

            IF checkin_status IS NOT NULL THEN
                IF user_role = 'ceo' THEN
                    -- CEO: Always respect manual status
                    found_status := checkin_status;
                ELSIF checkin_status IN ('lembur', 'sakit', 'izin', 'cuti', 'dinas') THEN
                    -- Non-CEO: Respect protected statuses from manual checkin
                    found_status := checkin_status;
                END IF;
                -- Non-CEO with non-protected status (office, wfh, etc): 
                -- Let Step D/E handle based on time/day rules
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
        IF (current_time_val >= '17:00:00'::time) OR is_weekend THEN
            IF found_status IS NULL OR found_status NOT IN ('lembur', 'cuti', 'sakit', 'izin', 'dinas') THEN
                found_status := 'away';
            END IF;
        ELSE
            NULL; -- Before 08:00 on weekday: preserve CEO's manual status
        END IF;
    ELSE
        -- STANDARD EMPLOYEE LOGIC:
        IF (current_time_val >= '17:00:00'::time) OR (current_time_val < '08:00:00'::time) OR is_weekend THEN
            IF found_status IS NULL OR found_status NOT IN ('lembur', 'cuti', 'sakit', 'izin', 'dinas') THEN
                found_status := 'away';
            END IF;
        ELSIF found_status IS NULL THEN
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
