-- 042_fix_weekend_status_priority.sql

-- Purpose:
-- 1. Fix WFH/WFA visibility on weekends if an approved request exists for today.
-- 2. Consolidate Business Trip logic to use leave_requests table (legacy business_trips table cleanup).
-- 3. Ensure "Away" status only applies if no active "working" request exists during weekends.

CREATE OR REPLACE FUNCTION public.refresh_profile_status(target_profile_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    found_status TEXT;
    emp_type TEXT;
    today_date DATE := CURRENT_DATE;
    current_time_val TIME := CURRENT_TIME;
BEGIN
    -- 1. Check Overtime (Highest Priority - Time Specific)
    PERFORM 1 FROM leave_requests 
    WHERE profile_id = target_profile_id 
    AND leave_type = 'overtime'
    AND status = 'approved'
    AND start_date = today_date
    AND current_time_val BETWEEN start_time::time AND end_time::time;
    
    IF FOUND THEN
        UPDATE profiles SET status = 'Lembur' WHERE id = target_profile_id;
        RETURN;
    END IF;

    -- 2. Check Full Day Events (24h Persistence)
    -- A. Business Trip (Dinas) - Now including leave_requests type 'business_trip'
    PERFORM 1 FROM leave_requests 
    WHERE profile_id = target_profile_id 
    AND (leave_type = 'business_trip')
    AND status = 'approved'
    AND today_date BETWEEN start_date AND end_date;
    
    IF FOUND THEN
        UPDATE profiles SET status = 'Dinas' WHERE id = target_profile_id;
        RETURN;
    END IF;

    -- B. Full Day Leaves (Cuti, Sakit, Izin)
    SELECT 
        CASE 
            WHEN leave_type = 'sick_leave' THEN 'Sakit'
            WHEN leave_type IN ('annual_leave', 'extra_leave', 'menstrual_leave', 'maternity', 'miscarriage') THEN 'Cuti'
            ELSE 'Izin' 
        END
    INTO found_status
    FROM leave_requests
    WHERE profile_id = target_profile_id
    AND status = 'approved'
    AND today_date BETWEEN start_date AND end_date
    AND leave_type NOT IN ('wfh', 'wfa', 'overtime', 'training', 'asset', 'reimburse', 'meeting', 'one_on_one')
    LIMIT 1;

    IF found_status IS NOT NULL THEN
        UPDATE profiles SET status = found_status WHERE id = target_profile_id;
        RETURN;
    END IF;

    -- 3. Working Hours Logic (08:00 - 17:00)
    IF (current_time_val BETWEEN '08:00:00'::time AND '17:00:00'::time) THEN
        -- Check for approved WFH / WFA for specific date (Regardless of Day of Week)
        SELECT 
            CASE 
                WHEN leave_type = 'wfh' THEN 'WFH'
                WHEN leave_type = 'wfa' THEN 'WFA'
                ELSE NULL
            END
        INTO found_status
        FROM leave_requests
        WHERE profile_id = target_profile_id
        AND status = 'approved'
        AND today_date BETWEEN start_date AND end_date
        AND leave_type IN ('wfh', 'wfa')
        LIMIT 1;

        -- If no WFH/WFA, check if it's regular Mon-Fri working hours
        IF found_status IS NULL AND (EXTRACT(ISODOW FROM today_date) BETWEEN 1 AND 5) THEN
             SELECT job_type INTO emp_type FROM profiles WHERE id = target_profile_id;
             found_status := CASE WHEN emp_type = 'remote' THEN 'Remote' ELSE 'Office' END;
        END IF;
    END IF;

    -- 4. Default -> Away (Outside hours OR weekend without specific WFH/WFA request)
    IF found_status IS NULL THEN
        found_status := 'Away';
    END IF;

    -- Final Update
    UPDATE profiles SET status = found_status WHERE id = target_profile_id;
END;
$function$;
