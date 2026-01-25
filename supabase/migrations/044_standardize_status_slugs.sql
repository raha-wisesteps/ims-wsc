-- 044_standardize_status_slugs.sql

-- Purpose:
-- 1. Normalize all status values in profiles to lowercase to match frontend STATUS_CONFIG keys.
-- 2. Update constraints to enforce lowercase slugs.
-- 3. Update trigger functions to return lowercase slugs.

-- 1. Normalize existing data
UPDATE profiles SET status = LOWER(status);

-- 2. Update profiles constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_status_check 
CHECK (status IN (
    'office', 'remote', 'wfh', 'wfa', 'izin', 'dinas', 'cuti', 'sakit', 'lembur', 'away'
));

-- 3. Update handle_leave_approval_final (Leave Approval Flow)
CREATE OR REPLACE FUNCTION handle_leave_approval_final()
RETURNS TRIGGER AS $$
DECLARE
    duration INT;
    simple_status TEXT;
BEGIN
    -- Only trigger when status changes to 'approved'
    IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
        
        -- A. Calculate Duration
        duration := (NEW.end_date - NEW.start_date) + 1;

        -- B. Determine Display Status for Attendance (Lowercase Slugs)
        IF NEW.leave_type = 'sick_leave' THEN 
            simple_status := 'sakit';
        ELSIF NEW.leave_type IN ('annual_leave', 'extra_leave', 'maternity', 'menstrual_leave', 'miscarriage') THEN 
            simple_status := 'cuti';
        ELSIF NEW.leave_type = 'business_trip' THEN 
            simple_status := 'dinas';
        ELSE 
            simple_status := 'izin'; 
        END IF;

        -- C. Generate Attendance (Daily Checkins)
        IF NEW.leave_type NOT IN ('overtime', 'training', 'asset', 'reimburse', 'meeting') THEN
            PERFORM generate_daily_checkins(NEW.profile_id, NEW.start_date, NEW.end_date, simple_status, 'System Auto: ' || NEW.leave_type);
        END IF;

        -- D. Quota Deduction... (Logic remains same)
        IF NEW.leave_type IN ('annual_leave', 'other_permission') THEN
            UPDATE leave_quotas SET annual_leave_used = annual_leave_used + duration WHERE profile_id = NEW.profile_id;
        ELSIF NEW.leave_type = 'extra_leave' THEN
            UPDATE leave_quotas SET extra_leave_used = extra_leave_used + duration WHERE profile_id = NEW.profile_id;
        ELSIF NEW.leave_type = 'menstrual_leave' THEN
            UPDATE leave_quotas SET menstrual_leave_used = menstrual_leave_used + duration WHERE profile_id = NEW.profile_id;
        ELSIF NEW.leave_type = 'wfh' THEN
            UPDATE leave_quotas SET wfh_weekly_used = wfh_weekly_used + duration WHERE profile_id = NEW.profile_id;
        ELSIF NEW.leave_type = 'wfa' THEN
            UPDATE leave_quotas SET wfa_used = wfa_used + duration WHERE profile_id = NEW.profile_id;
        END IF;

    -- Case: Approved -> Rejected (Refund Quota)
    ELSIF NEW.status = 'rejected' AND OLD.status = 'approved' THEN
        duration := (NEW.end_date - NEW.start_date) + 1;
        
        IF NEW.leave_type IN ('annual_leave', 'other_permission') THEN
            UPDATE leave_quotas SET annual_leave_used = GREATEST(0, annual_leave_used - duration) WHERE profile_id = NEW.profile_id;
        ELSIF NEW.leave_type = 'extra_leave' THEN
            UPDATE leave_quotas SET extra_leave_used = GREATEST(0, extra_leave_used - duration) WHERE profile_id = NEW.profile_id;
        ELSIF NEW.leave_type = 'menstrual_leave' THEN
            UPDATE leave_quotas SET menstrual_leave_used = GREATEST(0, menstrual_leave_used - duration) WHERE profile_id = NEW.profile_id;
        ELSIF NEW.leave_type = 'wfh' THEN
            UPDATE leave_quotas SET wfh_weekly_used = GREATEST(0, wfh_weekly_used - duration) WHERE profile_id = NEW.profile_id;
        ELSIF NEW.leave_type = 'wfa' THEN
            UPDATE leave_quotas SET wfa_used = GREATEST(0, wfa_used - duration) WHERE profile_id = NEW.profile_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update refresh_profile_status (Schedule Status Flow)
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
    -- 1. Check Overtime
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

    -- 2. Check Full Day Events
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

    -- 3. Working Hours Logic (08:00 - 17:00)
    IF (current_time_val BETWEEN '08:00:00'::time AND '17:00:00'::time) THEN
        -- Check for approved WFH / WFA
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

        -- If no WFH/WFA, check if it's regular Mon-Fri
        IF found_status IS NULL AND (EXTRACT(ISODOW FROM today_date) BETWEEN 1 AND 5) THEN
             SELECT job_type INTO emp_type FROM profiles WHERE id = target_profile_id;
             found_status := CASE WHEN emp_type = 'remote' THEN 'remote' ELSE 'office' END;
        END IF;
    END IF;

    -- 4. Default -> Away
    IF found_status IS NULL THEN
        found_status := 'away';
    END IF;

    -- Final Update
    UPDATE profiles SET status = found_status WHERE id = target_profile_id;
END;
$function$;
