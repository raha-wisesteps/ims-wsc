-- Migration: Fix CEO Status Reset Logic (v3)
-- Purpose: Prevent refresh_profile_status from overwriting CEO's manually set status.
-- Logic:
-- 1. Business Trips (Approved) -> Dinas
-- 2. Leave Requests (Approved) -> Cuti, Sakit, etc.
-- 3. Daily Checkins (Manual) ->
--    - If 'dinas' -> USE IT (Everyone)
--    - If CEO -> USE IT (Any status)
-- 4. Defaults -> Time-based Office/Away (Skipped if status found above)

CREATE OR REPLACE FUNCTION refresh_profile_status(target_profile_id UUID)
RETURNS VOID AS $$
DECLARE
    found_status TEXT;
    checkin_status TEXT; -- Status from daily_checkins
    today_date DATE := CURRENT_DATE;
    -- Convert to Jakarta time for accurate hourly checks
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
        -- This handles the case where CEO (or others) sets status manually via UI
        IF found_status IS NULL THEN
            SELECT LOWER(status) INTO checkin_status
            FROM daily_checkins
            WHERE profile_id = target_profile_id
            AND checkin_date = today_date
            ORDER BY created_at DESC -- Get latest status if multiple
            LIMIT 1;

            IF checkin_status IS NOT NULL THEN
                -- LOGIC:
                -- 1. If 'dinas', always respect it (checking in as Dinas implies full day usually).
                -- 2. If CEO, always respect their manual input (Office, WFH, etc).
                -- 3. If others, we ONLY respect special statuses?
                --    - Actually, let's keep it simple: If 'dinas', use it.
                --    - If CEO, use whatever it is.
                --    - If standard employee sets 'office', we let it fall through to Time Logic (Step D)
                --      so that 'Auto Away' at 5pm still works for them.
                
                IF checkin_status = 'dinas' OR user_role = 'ceo' THEN
                    found_status := checkin_status;
                END IF;
            END IF;
        END IF;

        -- D. Fallback: Default based on Employee Type (Working Hours)
        -- Logic: If it is working hours (08-17), and no specific status found...
        IF found_status IS NULL THEN
            IF (current_time_val BETWEEN '08:00:00'::time AND '17:00:00'::time) AND NOT is_weekend THEN
                -- WORKING HOURS LOGIC
                
                IF user_role = 'ceo' THEN
                     -- CEO EXCEPTION:
                     -- If CEO has no checkin and no request, do NOT force default.
                     -- Keep NULL -> No update.
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

    -- E. Default -> away (Outside hours, Weekends, etc)
    IF found_status IS NULL THEN
        -- If found_status is still NULL at this point:
        -- 1. No Business Trip
        -- 2. No Leave Request
        -- 3. No Manual Checkin (that we respected)
        -- 4. Not Working Hours (or CEO skipped working hours default)
        
        IF user_role = 'ceo' THEN
            -- CEO: Never force 'away'.
            found_status := NULL;
        ELSE
            found_status := 'away';
        END IF;
    END IF;

    -- Final Update
    -- Only update if we calculated a new status
    IF found_status IS NOT NULL THEN
        UPDATE profiles SET status = found_status WHERE id = target_profile_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-run refresh for all users to apply new logic immediately
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM profiles LOOP
        PERFORM refresh_profile_status(r.id);
    END LOOP;
END;
$$;
