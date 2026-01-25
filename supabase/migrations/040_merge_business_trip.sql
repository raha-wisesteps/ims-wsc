-- 040_merge_business_trip.sql

-- Purpose:
-- 1. Add 'business_trip' to permitted leave_type in leave_requests
-- 2. Update trigger to handle 'business_trip' (set status to 'Dinas', no annual quota deduction)

-- 1. Update Constraint
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check;

ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_leave_type_check CHECK (
    leave_type IN (
        -- Standard leaves
        'annual_leave', 'sick_leave', 'unpaid_leave', 'marriage', 'maternity', 'paternity', 'bereavement', 
        'menstrual_leave', 'self_marriage', 'child_marriage', 'wife_miscarriage', 'child_event', 
        'family_death', 'household_death', 'sibling_death', 'hajj', 'government', 'disaster', 
        'other_permission', 'extra_leave',
        -- Remote work
        'wfh', 'wfa',
        -- Time-based
        'overtime',
        -- Misc
        'training', 'asset', 'reimburse', 'meeting',
        -- MERGED
        'business_trip'
    )
);

-- 2. Update Trigger Function
CREATE OR REPLACE FUNCTION handle_leave_approval_final()
RETURNS TRIGGER AS $$
DECLARE
    duration INT;
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- Calculate Duration (inclusive)
        duration := (NEW.end_date - NEW.start_date) + 1;

        -- A. Auto-Attendance for Full Day Leaves & Business Trips
        IF NEW.leave_type IN ('annual_leave', 'extra_leave', 'sick_leave', 'menstrual_leave', 'maternity', 'miscarriage', 'paternity', 
                              'self_marriage', 'child_marriage', 'wife_miscarriage', 'child_event', 'family_death', 'household_death', 
                              'sibling_death', 'hajj', 'government', 'disaster', 'other_permission', 'business_trip') THEN
             DECLARE
                simple_status TEXT;
            BEGIN
                IF NEW.leave_type = 'sick_leave' THEN simple_status := 'Sakit';
                ELSIF NEW.leave_type IN ('annual_leave', 'extra_leave', 'maternity', 'menstrual_leave') THEN simple_status := 'Cuti';
                ELSIF NEW.leave_type = 'business_trip' THEN simple_status := 'Dinas';
                ELSE simple_status := 'Izin'; 
                END IF;
                
                PERFORM generate_daily_checkins(NEW.profile_id, NEW.start_date, NEW.end_date, simple_status, 'System Auto: ' || NEW.leave_type);
            END;
        END IF;

        -- B. Quota Deduction logic
        
        -- 1. Deduct Annual Leave Quota
        -- Note: 'business_trip' does NOT deduct quota
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
