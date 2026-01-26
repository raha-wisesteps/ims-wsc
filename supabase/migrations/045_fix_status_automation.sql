-- 045_fix_status_automation_v2.sql

-- Purpose:
-- Fix timezone issue: Server thinks it's 2 AM (UTC), so no one is in "office".
-- We need to convert CURRENT_TIME to 'Asia/Jakarta' (GMT+7).

CREATE OR REPLACE FUNCTION public.refresh_profile_status(target_profile_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    found_status TEXT;
    emp_type TEXT;
    
    -- CONVERT TIME TO JAKARTA (GMT+7)
    today_date DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::DATE;
    current_time_val TIME := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::TIME;
    
    is_weekend BOOLEAN;
BEGIN
    -- 0. Determine if it's weekend (Saturday=6, Sunday=7)
    is_weekend := EXTRACT(ISODOW FROM today_date) IN (6, 7);

    -- 1. Check Overtime (Highest Priority - Time Specific)
    -- Must be approved and currently within time window
    PERFORM 1 FROM leave_requests 
    WHERE profile_id = target_profile_id 
    AND leave_type = 'overtime'
    AND status = 'approved'
    AND start_date = today_date
    AND current_time_val BETWEEN start_time::time AND end_time::time;
    
    IF FOUND THEN
        UPDATE profiles SET status = 'lembur' WHERE id = target_profile_id;
        RETURN;
    END IF;

    -- 2. Check Full Day Events (24h Persistence)
    -- A. Business Trip (Dinas)
    PERFORM 1 FROM leave_requests 
    WHERE profile_id = target_profile_id 
    AND (leave_type = 'business_trip')
    AND status = 'approved'
    AND today_date BETWEEN start_date AND end_date;
    
    IF FOUND THEN
        UPDATE profiles SET status = 'dinas' WHERE id = target_profile_id;
        RETURN;
    END IF;

    -- B. Full Day Leaves (Cuti, Sakit, Izin)
    SELECT 
        CASE 
            WHEN leave_type = 'sick_leave' THEN 'sakit'
            WHEN leave_type IN ('annual_leave', 'extra_leave', 'menstrual_leave', 'maternity', 'miscarriage') THEN 'cuti'
            ELSE 'izin' 
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

    -- 3. Working Hours Logic (08:00 - 17:00 WIB)
    -- Only active during working hours
    IF (current_time_val BETWEEN '08:00:00'::time AND '17:00:00'::time) THEN
        
        -- A. Check for approved WFH / WFA (Specific dates)
        SELECT 
            CASE 
                WHEN leave_type = 'wfh' THEN 'wfh'
                WHEN leave_type = 'wfa' THEN 'wfa'
                ELSE NULL
            END
        INTO found_status
        FROM leave_requests
        WHERE profile_id = target_profile_id
        AND status = 'approved'
        AND today_date BETWEEN start_date AND end_date
        AND leave_type IN ('wfh', 'wfa')
        LIMIT 1;

        -- B. If no specific WFH/WFA request, check User Type (Only on Weekdays)
        IF found_status IS NULL AND NOT is_weekend THEN
             -- CORRECTED LOGIC: Check employee_type for 'remote_employee'
             SELECT employee_type INTO emp_type FROM profiles WHERE id = target_profile_id;
             
             IF emp_type = 'remote_employee' THEN
                found_status := 'remote';
             ELSE
                found_status := 'office';
             END IF;
        END IF;
    END IF;

    -- 4. Default -> Away (Outside hours, Weekends without events, etc)
    IF found_status IS NULL THEN
        found_status := 'away';
    END IF;

    -- Final Update
    UPDATE profiles SET status = found_status WHERE id = target_profile_id;
END;
$function$;
