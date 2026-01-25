-- 039_fix_quota_and_trigger.sql

-- Purpose:
-- 1. Fix Quota Deduction for Extra Leave & Other Permissions
-- 2. Consolidate Auto-Attendance trigger
-- 3. Ensure Status Case Sensitivity ('Sakit', 'Cuti', 'Izin')

CREATE OR REPLACE FUNCTION handle_leave_approval_final()
RETURNS TRIGGER AS $$
DECLARE
    duration INT;
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- Calculate Duration (inclusive)
        duration := (NEW.end_date - NEW.start_date) + 1;

        -- A. Auto-Attendance for Full Day Leaves
        IF NEW.leave_type IN ('annual_leave', 'extra_leave', 'sick_leave', 'menstrual_leave', 'maternity', 'miscarriage', 'paternity', 'self_marriage', 'child_marriage', 'wife_miscarriage', 'child_event', 'family_death', 'household_death', 'sibling_death', 'hajj', 'government', 'disaster', 'other_permission') THEN
             DECLARE
                simple_status TEXT;
            BEGIN
                IF NEW.leave_type = 'sick_leave' THEN simple_status := 'Sakit'; -- Capitalized
                ELSIF NEW.leave_type IN ('annual_leave', 'extra_leave', 'maternity', 'menstrual_leave') THEN simple_status := 'Cuti';
                ELSE simple_status := 'Izin'; 
                END IF;
                
                PERFORM generate_daily_checkins(NEW.profile_id, NEW.start_date, NEW.end_date, simple_status, 'System Auto: ' || NEW.leave_type);
            END;
        END IF;

        -- B. Quota Deduction logic
        
        -- 1. Deduct Annual Leave Quota
        -- Includes 'annual_leave' and specific permission types that consume annual quota
        IF NEW.leave_type = 'annual_leave' OR NEW.leave_type IN ('other_permission') THEN
            UPDATE profiles 
            SET leave_quota = leave_quota - duration 
            WHERE id = NEW.profile_id;
        END IF;

        -- 2. Deduct Extra Leave Quota
        IF NEW.leave_type = 'extra_leave' THEN
            UPDATE profiles 
            SET extra_leave_quota = GREATEST(0, extra_leave_quota - duration) 
            WHERE id = NEW.profile_id;
        END IF;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-assign Trigger
DROP TRIGGER IF EXISTS on_leave_approval_attendance ON leave_requests;
DROP TRIGGER IF EXISTS on_leave_approval_final ON leave_requests;

CREATE TRIGGER on_leave_approval_final
AFTER UPDATE ON leave_requests
FOR EACH ROW EXECUTE FUNCTION handle_leave_approval_final();
