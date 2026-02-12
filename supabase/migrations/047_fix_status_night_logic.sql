-- Migration: Fix Status Automation Night Logic (v4)
-- Purpose: Enforce 'away' status after 17:00 for everyone (including CEO, Dinas, WFH) unless 'lembur'.

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
        IF found_status IS NULL THEN
            SELECT LOWER(status) INTO checkin_status
            FROM daily_checkins
            WHERE profile_id = target_profile_id
            AND checkin_date = today_date
            ORDER BY created_at DESC
            LIMIT 1;

            IF checkin_status IS NOT NULL THEN
                -- Respect 'dinas' or CEO manual inputs during the day
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

    -- E. NIGHT / WEEKEND OVERRIDE (New Logic)
    -- If outside working hours (Before 8 or After 17, or Weekend)
    -- FORCE 'away' logic, overriding Dinas/WFH/Office/CEO statuses.
    -- EXCEPTION: 'lembur', 'cuti', 'sakit', 'izin' persist.
    
    IF (current_time_val >= '17:00:00'::time) OR (current_time_val < '08:00:00'::time) OR is_weekend THEN
        IF found_status IS NULL OR found_status NOT IN ('lembur', 'cuti', 'sakit', 'izin') THEN
            found_status := 'away';
        END IF;
    -- F. If during working hours, and found_status is still NULL (e.g. CEO with no input), don't force 'away' yet?
    -- Actually, if it's working hours and we are here, it means we skipped Step D (CEO).
    -- If found_status is NULL during the day for CEO, we leave it alone (preserve whatever is there? or allow manual updates to stay?)
    -- But 'refresh' is called to *set* the status. If we return NULL, we just check step G.
    ELSIF found_status IS NULL THEN
         -- Standard employee would have been set in D.
         -- CEO might be NULL here.
         -- If CEO is NULL during the day, do we want to force 'away'? 
         -- No, User said: "Reset issue... CEO manually set status". 
         -- If CEO manually set it, it's caught in step C.
         -- If CEO did NOT set it, and no request, then NULL is correct (don't touch).
         -- But wait, if found_status is NULL, we enter Step G logic below in original script.
         -- Let's see original Step E logic.
         
         IF user_role != 'ceo' THEN
            found_status := 'away'; -- Default for standard employees if logic fails
         END IF;
    END IF;

    -- Final Update
    IF found_status IS NOT NULL THEN
        UPDATE profiles SET status = found_status WHERE id = target_profile_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-run refresh for all users to apply new night logic immediately
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM profiles LOOP
        PERFORM refresh_profile_status(r.id);
    END LOOP;
END;
$$;
