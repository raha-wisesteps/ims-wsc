-- Migration: Fix Status Logic v2
-- Purpose: 
-- 1. Add 'Lembur' to profile status constraint
-- 2. Fix refresh_profile_status to correctly handle:
--    - Slide 2: overtime -> 'Lembur', business_trip -> 'Dinas' (status changes)
--    - Slide 3: training, asset, reimburse, meeting -> NO status change
--    - Slide 1: WFH/WFA/Cuti/Izin/Sakit (already correct)
-- 3. Fix business_trips to check for approved status

-- 1. Update profile status constraint to include 'Lembur'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE profiles 
ADD CONSTRAINT profiles_status_check 
CHECK (status IN ('Office', 'Remote', 'WFH', 'WFA', 'Izin', 'Dinas', 'Cuti', 'Sakit', 'Lembur'));

-- 2. Update daily_checkins status constraint to include 'lembur'
ALTER TABLE daily_checkins DROP CONSTRAINT IF EXISTS daily_checkins_status_check;
ALTER TABLE daily_checkins 
ADD CONSTRAINT daily_checkins_status_check 
CHECK (status IN ('office', 'wfh', 'wfa', 'sick', 'leave', 'field', 'cuti', 'izin', 'lembur'));

-- 2.1 Update leave_requests leave_type constraint to include 'extra_leave'
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check;
ALTER TABLE leave_requests
ADD CONSTRAINT leave_requests_leave_type_check
CHECK (leave_type IN (
  'annual_leave', 'sick_leave', 'unpaid_leave', 'marriage', 'maternity', 'paternity', 'bereavement',
  'wfh', 'wfa', 'overtime', 'training', 'asset', 'reimburse', 'meeting',
  'menstrual_leave', 'self_marriage', 'child_marriage', 'wife_miscarriage', 'child_event',
  'family_death', 'household_death', 'sibling_death', 'hajj', 'government', 'disaster', 'other_permission',
  'extra_leave'
));

-- 3. Recreate the refresh_profile_status function with correct logic
CREATE OR REPLACE FUNCTION refresh_profile_status(target_profile_id UUID)
RETURNS VOID AS $$
DECLARE
    found_status TEXT;
    today_date DATE := CURRENT_DATE;
    emp_type TEXT;
BEGIN
    -- A. Check for APPROVED Business Trip (Highest Priority - Dinas)
    PERFORM 1 FROM business_trips 
    WHERE profile_id = target_profile_id 
    AND status = 'approved'  -- IMPORTANT: Only approved trips!
    AND today_date BETWEEN start_date AND end_date;
    
    IF FOUND THEN
        found_status := 'Dinas';
    ELSE
        -- B. Check for Approved Leave Requests
        -- Priority: Lembur > WFH/WFA > Sakit > Cuti > Izin
        -- EXCLUDE: training, asset, reimburse, meeting (these don't affect status)
        SELECT 
            CASE 
                -- Lembur (Overtime) - Slide 2
                WHEN leave_type = 'overtime' THEN 'Lembur'
                
                -- Remote Work - Slide 1
                WHEN leave_type = 'wfh' THEN 'WFH'
                WHEN leave_type = 'wfa' THEN 'WFA'
                
                -- Sakit - Slide 1
                WHEN leave_type = 'sick_leave' THEN 'Sakit'
                
                -- Cuti Group - Slide 1
                WHEN leave_type IN (
                    'annual_leave', 
                    'other_permission', 
                    'menstrual_leave', 
                    'maternity', 
                    'miscarriage',
                    'extra_leave'
                ) THEN 'Cuti'
                
                -- Izin Group - Slide 1
                WHEN leave_type IN (
                    'self_marriage', 
                    'child_marriage', 
                    'paternity', 
                    'wife_miscarriage', 
                    'child_event', 
                    'family_death', 
                    'household_death', 
                    'sibling_death', 
                    'hajj', 
                    'government', 
                    'disaster'
                ) THEN 'Izin'
                
                -- Slide 3 items (training, asset, reimburse, meeting) -> NULL (no status change)
                WHEN leave_type IN ('training', 'asset', 'reimburse', 'meeting') THEN NULL
                
                -- Fallback for any truly unknown types
                ELSE NULL
            END
        INTO found_status
        FROM leave_requests
        WHERE profile_id = target_profile_id
        AND status = 'approved'
        AND today_date BETWEEN start_date AND end_date
        -- Exclude Slide 3 items from affecting status
        AND leave_type NOT IN ('training', 'asset', 'reimburse', 'meeting')
        ORDER BY 
            -- Priority order: Lembur first, then WFH/WFA, then others
            CASE leave_type 
                WHEN 'overtime' THEN 1
                WHEN 'wfh' THEN 2
                WHEN 'wfa' THEN 2
                WHEN 'sick_leave' THEN 3
                ELSE 4
            END
        LIMIT 1;
        
        -- C. Fallback: Default based on Employee Type (only if no status-affecting request found)
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

-- 4. Re-run refresh for all users to apply new logic immediately
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM profiles LOOP
        PERFORM refresh_profile_status(r.id);
    END LOOP;
END;
$$;
