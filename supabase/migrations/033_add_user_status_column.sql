-- Migration: Add User Status Column & Auto-Update Logic
-- Purpose: Centralize user status (Office, Remote, WFH, WFA, etc.) in profiles table and auto-update based on requests.

-- 1. Add status column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS status TEXT 
DEFAULT 'Office'
CHECK (status IN ('Office', 'Remote', 'WFH', 'WFA', 'Izin', 'Dinas', 'Cuti', 'Sakit'));

-- 2. Create Function to Refresh Profile Status
CREATE OR REPLACE FUNCTION refresh_profile_status(target_profile_id UUID)
RETURNS VOID AS $$
DECLARE
    found_status TEXT;
    today_date DATE := CURRENT_DATE;
    emp_type TEXT;
BEGIN
    -- A. Check for Business Trip (Highest Priority - Dinas)
    PERFORM 1 FROM business_trips 
    WHERE profile_id = target_profile_id 
    AND today_date BETWEEN start_date AND end_date;
    
    IF FOUND THEN
        found_status := 'Dinas';
    ELSE
        -- B. Check for Approved Leave Requests
        SELECT 
            CASE 
                WHEN leave_type = 'wfh' THEN 'WFH'
                WHEN leave_type = 'wfa' THEN 'WFA'
                WHEN leave_type = 'sick_leave' THEN 'Sakit'
                WHEN leave_type = 'annual_leave' THEN 'Cuti'
                WHEN leave_type = 'unpaid_leave' THEN 'Cuti'
                WHEN leave_type = 'maternity' THEN 'Cuti'
                WHEN leave_type = 'paternity' THEN 'Cuti'
                WHEN leave_type = 'marriage' THEN 'Cuti' -- legacy
                WHEN leave_type = 'self_marriage' THEN 'Cuti'
                WHEN leave_type = 'child_marriage' THEN 'Cuti'
                WHEN leave_type = 'bereavement' THEN 'Cuti' -- legacy
                WHEN leave_type = 'family_death' THEN 'Cuti'
                ELSE 'Izin' -- Default for training, asset, reimburse, meeting, etc if they ever get dates
            END
        INTO found_status
        FROM leave_requests
        WHERE profile_id = target_profile_id
        AND status = 'approved'
        AND today_date BETWEEN start_date AND end_date
        LIMIT 1;
        
        -- C. Fallback: Default based on Employee Type
        IF found_status IS NULL THEN
            SELECT employee_type INTO emp_type FROM profiles WHERE id = target_profile_id;
            
            IF emp_type = 'remote_employee' THEN
                found_status := 'Remote';
            ELSE
                found_status := 'Office';
            END IF;
        END IF;
    END IF;

    -- Update the profile
    UPDATE profiles SET status = found_status WHERE id = target_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Triggers to Call Refresh Function

-- Trigger for Leave Requests (Insert/Update/Delete)
CREATE OR REPLACE FUNCTION trigger_refresh_status_from_leave()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM refresh_profile_status(OLD.profile_id);
    ELSE
        PERFORM refresh_profile_status(NEW.profile_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_status_leave ON leave_requests;
CREATE TRIGGER trg_refresh_status_leave
AFTER INSERT OR UPDATE OR DELETE ON leave_requests
FOR EACH ROW EXECUTE FUNCTION trigger_refresh_status_from_leave();

-- Trigger for Business Trips (Insert/Update/Delete)
CREATE OR REPLACE FUNCTION trigger_refresh_status_from_trip()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM refresh_profile_status(OLD.profile_id);
    ELSE
        PERFORM refresh_profile_status(NEW.profile_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_status_trip ON business_trips;
CREATE TRIGGER trg_refresh_status_trip
AFTER INSERT OR UPDATE OR DELETE ON business_trips
FOR EACH ROW EXECUTE FUNCTION trigger_refresh_status_from_trip();

-- Trigger for Profile Changes (e.g. employee_type change)
CREATE OR REPLACE FUNCTION trigger_refresh_status_from_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Only if employee_type changes or if we are just initializing
    IF (NEW.employee_type IS DISTINCT FROM OLD.employee_type) THEN
        PERFORM refresh_profile_status(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_status_profile ON profiles;
CREATE TRIGGER trg_refresh_status_profile
AFTER UPDATE OF employee_type ON profiles
FOR EACH ROW EXECUTE FUNCTION trigger_refresh_status_from_profile();

-- 4. Initial Population (Run once for all users)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM profiles LOOP
        PERFORM refresh_profile_status(r.id);
    END LOOP;
END;
$$;
