-- Migration: Final Status Logic & Attendance Automation
-- Purpose: 
-- 1. Automate daily_checkins for "Full Day" events (Cuti, Sakit, Dinas, Izin)
-- 2. Enforce strict status priority: 
--    Lembur (Time-based) > 24h Events (Dinas, Cuti, etc) > Working Hours (Office/WFH) > Away

-- 1. UTILITY: Function to generate daily checkins for a date range
CREATE OR REPLACE FUNCTION generate_daily_checkins(
    target_profile_id UUID,
    start_d DATE,
    end_d DATE,
    attendance_status TEXT, -- 'cuti', 'sakit', 'dinas', 'izin'
    notes_text TEXT
) RETURNS VOID AS $$
DECLARE
    curr_date DATE := start_d;
BEGIN
    WHILE curr_date <= end_d LOOP
        -- Skip weekends (Saturday=6, Sunday=7)
        IF EXTRACT(ISODOW FROM curr_date) IN (6, 7) THEN
            curr_date := curr_date + 1;
            CONTINUE;
        END IF;

        -- Insert template checkin (08:00 - 17:00)
        INSERT INTO daily_checkins (
            profile_id, 
            checkin_date, 
            clock_in_time, 
            clock_out_time, 
            status, 
            is_late, 
            notes, 
            source
        ) VALUES (
            target_profile_id,
            curr_date,
            (curr_date || ' 08:00:00')::timestamptz, -- Template Start
            (curr_date || ' 17:00:00')::timestamptz, -- Template End
            attendance_status,
            FALSE, -- Not late (template)
            notes_text,
            'system_auto'
        )
        ON CONFLICT (profile_id, checkin_date) 
        DO UPDATE SET 
            status = excluded.status,
            clock_in_time = excluded.clock_in_time,
            clock_out_time = excluded.clock_out_time,
            notes = excluded.notes;

        curr_date := curr_date + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. TRIGGER: Auto-populate Attendance on Leave Approval
CREATE OR REPLACE FUNCTION handle_leave_approval_attendance()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when status changes to 'approved'
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        
        -- Logic: Auto-populate for NON-Clock-In types (Cuti, Sakit, Izin)
        -- Exclude: WFH, WFA (Manual Clock-in), Overtime (No Checkin), etc.
        
        IF NEW.leave_type IN ('annual_leave', 'extra_leave', 'other_permission', 'menstrual_leave', 'maternity', 'miscarriage', 'self_marriage', 'child_marriage', 'paternity', 'wife_miscarriage', 'child_event', 'family_death', 'household_death', 'sibling_death', 'hajj', 'government', 'disaster', 'sick_leave') THEN
            
            -- Map leave_type to simple status
            DECLARE
                simple_status TEXT;
            BEGIN
                IF NEW.leave_type = 'sick_leave' THEN simple_status := 'sick';
                ELSIF NEW.leave_type IN ('annual_leave', 'extra_leave', 'maternity', 'menstrual_leave') THEN simple_status := 'cuti';
                ELSE simple_status := 'izin'; -- Default for others
                END IF;

                PERFORM generate_daily_checkins(NEW.profile_id, NEW.start_date, NEW.end_date, simple_status, 'System Auto-Populate: ' || NEW.leave_type);
            END;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_leave_approval_attendance ON leave_requests;
CREATE TRIGGER on_leave_approval_attendance
AFTER UPDATE ON leave_requests
FOR EACH ROW EXECUTE FUNCTION handle_leave_approval_attendance();


-- 3. TRIGGER: Auto-populate Attendance on Business Trip Approval
CREATE OR REPLACE FUNCTION handle_trip_approval_attendance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        PERFORM generate_daily_checkins(NEW.profile_id, NEW.start_date, NEW.end_date, 'dinas', 'System Auto-Populate: Business Trip to ' || NEW.destination);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_trip_approval_attendance ON business_trips;
CREATE TRIGGER on_trip_approval_attendance
AFTER UPDATE ON business_trips
FOR EACH ROW EXECUTE FUNCTION handle_trip_approval_attendance();


-- 4. REFRESH STATUS LOGIC (Final)
-- Ensure 'Away' is in constraints
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE profiles 
ADD CONSTRAINT profiles_status_check 
CHECK (status IN ('Office', 'Remote', 'WFH', 'WFA', 'Izin', 'Dinas', 'Cuti', 'Sakit', 'Lembur', 'Away'));

-- Priority Logic:
-- 1. Lembur (Overtime) - Time-based, persists outside 08-17
-- 2. Full Day Status (Cuti, Sakit, Izin, Dinas) - Persists 24h
-- 3. Working Hours (08:00 - 17:00, Mon-Fri):
--    - WFH/WFA (if approved)
--    - Office (Default)
-- 4. Outside Hours -> Away

CREATE OR REPLACE FUNCTION refresh_profile_status(target_profile_id UUID)
RETURNS VOID AS $$
DECLARE
    found_status TEXT;
    emp_type TEXT;
    today_date DATE := CURRENT_DATE;
    current_time_val TIME := CURRENT_TIME;
BEGIN
    -- 1. Check Overtime (Highest Priority - Time Specific)
    -- Only if currently within the approved window
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
    -- A. Business Trip (Dinas)
    PERFORM 1 FROM business_trips 
    WHERE profile_id = target_profile_id 
    AND status = 'approved'
    AND today_date BETWEEN start_date AND end_date;
    
    IF FOUND THEN
        UPDATE profiles SET status = 'Dinas' WHERE id = target_profile_id;
        RETURN;
    END IF;

    -- B. Full Day Leaves (Cuti, Sakit, Izin)
    -- Exclude WFH, WFA, Overtime here
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

    -- 3. Working Hours Logic (08:00 - 17:00, Mon-Fri ONLY)
    -- EXTRACT(ISODOW) returns 1=Monday...7=Sunday. We want 1-5.
    IF (EXTRACT(ISODOW FROM today_date) BETWEEN 1 AND 5) AND 
       (current_time_val BETWEEN '08:00:00'::time AND '17:00:00'::time) THEN
        -- Check for WFH / WFA (that require manual clock in, but status shows WFH/WFA during work hours)
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

        IF found_status IS NULL THEN
             SELECT employee_type INTO emp_type FROM profiles WHERE id = target_profile_id;
             found_status := CASE WHEN emp_type = 'remote_employee' THEN 'Remote' ELSE 'Office' END;
        END IF;
    ELSE
        -- 4. Outside Hours -> Away
        found_status := 'Away';
    END IF;

    -- Final Update
    UPDATE profiles SET status = found_status WHERE id = target_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
