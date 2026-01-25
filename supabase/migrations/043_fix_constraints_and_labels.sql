-- 043_fix_constraints_and_labels.sql

-- Purpose:
-- 1. Add missing 'miscarriage' to leave_requests_leave_type_check.
-- 2. Update daily_checkins_status_check to support capitalized labels used by the system.

-- 1. Update leave_requests constraint
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
        -- Merged
        'business_trip',
        -- MISSING
        'miscarriage'
    )
);

-- 2. Update daily_checkins constraint
ALTER TABLE daily_checkins DROP CONSTRAINT IF EXISTS daily_checkins_status_check;

ALTER TABLE daily_checkins ADD CONSTRAINT daily_checkins_status_check CHECK (
    status IN (
        'Office', 'WFH', 'WFA', 'Sakit', 'Cuti', 'Izin', 'Dinas', 'Lembur', 'Remote', 'Field',
        -- Maintain lowercase compatibility if any exists
        'office', 'wfh', 'wfa', 'sick', 'leave', 'field', 'cuti', 'izin', 'lembur'
    )
);

-- 3. Update Trigger Function to ensure mapping for miscarriage
CREATE OR REPLACE FUNCTION handle_leave_approval_final()
RETURNS TRIGGER AS $$
DECLARE
    duration INT;
    simple_status TEXT;
BEGIN
    -- Only trigger when status changes to 'approved'
    IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
        
        -- A. Calculate Duration (inclusive)
        duration := (NEW.end_date - NEW.start_date) + 1;

        -- B. Determine Display Status for Attendance
        IF NEW.leave_type = 'sick_leave' THEN 
            simple_status := 'Sakit';
        ELSIF NEW.leave_type IN ('annual_leave', 'extra_leave', 'maternity', 'menstrual_leave', 'miscarriage') THEN 
            simple_status := 'Cuti';
        ELSIF NEW.leave_type = 'business_trip' THEN 
            simple_status := 'Dinas';
        ELSE 
            simple_status := 'Izin'; 
        END IF;

        -- C. Generate Attendance (Daily Checkins)
        IF NEW.leave_type NOT IN ('overtime', 'training', 'asset', 'reimburse', 'meeting') THEN
            PERFORM generate_daily_checkins(NEW.profile_id, NEW.start_date, NEW.end_date, simple_status, 'System Auto: ' || NEW.leave_type);
        END IF;

        -- D. Quota Deduction (Increment Used) in leave_quotas table
        IF NEW.leave_type IN ('annual_leave', 'other_permission') THEN
            UPDATE leave_quotas 
            SET annual_leave_used = annual_leave_used + duration 
            WHERE profile_id = NEW.profile_id;
            
        ELSIF NEW.leave_type = 'extra_leave' THEN
            UPDATE leave_quotas 
            SET extra_leave_used = extra_leave_used + duration 
            WHERE profile_id = NEW.profile_id;
            
        ELSIF NEW.leave_type = 'menstrual_leave' THEN
            UPDATE leave_quotas 
            SET menstrual_leave_used = menstrual_leave_used + duration 
            WHERE profile_id = NEW.profile_id;
            
        ELSIF NEW.leave_type = 'wfh' THEN
            UPDATE leave_quotas 
            SET wfh_weekly_used = wfh_weekly_used + duration 
            WHERE profile_id = NEW.profile_id;
            
        ELSIF NEW.leave_type = 'wfa' THEN
            UPDATE leave_quotas 
            SET wfa_used = wfa_used + duration 
            WHERE profile_id = NEW.profile_id;
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
