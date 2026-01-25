-- Migration: Fix Status Logic Mapping
-- Purpose: Refine the refresh_profile_status function to correctly map granular leave types to Cuti/Izin/Sakit.

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
        -- Check logic priority: WFH/WFA > Sakit > Cuti > Izin
        SELECT 
            CASE 
                -- Remote Work
                WHEN leave_type = 'wfh' THEN 'WFH'
                WHEN leave_type = 'wfa' THEN 'WFA'
                
                -- Sakit
                WHEN leave_type = 'sick_leave' THEN 'Sakit'
                
                -- Cuti Group (Deducts quota or specific leave entitlement)
                WHEN leave_type IN (
                    'annual_leave', 
                    'other_permission', 
                    'menstrual_leave', 
                    'maternity', 
                    'miscarriage'
                ) THEN 'Cuti'
                
                -- Izin Group (Specific permissions)
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
                
                -- Fallback for any unknown types
                ELSE 'Izin' 
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
