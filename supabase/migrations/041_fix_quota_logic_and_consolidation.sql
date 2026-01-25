-- 041_fix_quota_logic_and_consolidation.sql

-- Purpose:
-- 1. Ensure leave_quotas has extra_leave columns
-- 2. Consolidate attendance and quota logic into a single trigger
-- 3. Target leave_quotas table correctly
-- 4. Fix "Approve error: {}" by removing direct profiles table updates for quotas

-- 1. Add extra_leave columns to leave_quotas if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leave_quotas' AND column_name='extra_leave_used') THEN
        ALTER TABLE leave_quotas ADD COLUMN extra_leave_used INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leave_quotas' AND column_name='extra_leave_total') THEN
        ALTER TABLE leave_quotas ADD COLUMN extra_leave_total INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Create the consolidated trigger function
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
        ELSIF NEW.leave_type IN ('annual_leave', 'extra_leave', 'maternity', 'menstrual_leave') THEN 
            simple_status := 'Cuti';
        ELSIF NEW.leave_type = 'business_trip' THEN 
            simple_status := 'Dinas';
        ELSE 
            simple_status := 'Izin'; 
        END IF;

        -- C. Generate Attendance (Daily Checkins)
        -- Skip for: overtime, training, asset, reimburse, meeting (these are usually not full-day presence replacements)
        IF NEW.leave_type NOT IN ('overtime', 'training', 'asset', 'reimburse', 'meeting') THEN
            PERFORM generate_daily_checkins(NEW.profile_id, NEW.start_date, NEW.end_date, simple_status, 'System Auto: ' || NEW.leave_type);
        END IF;

        -- D. Quota Deduction (Increment Used) in leave_quotas table
        -- 1. Annual Leave & Other Permission (uses annual quota)
        IF NEW.leave_type IN ('annual_leave', 'other_permission') THEN
            UPDATE leave_quotas 
            SET annual_leave_used = annual_leave_used + duration 
            WHERE profile_id = NEW.profile_id;
            
        -- 2. Extra Leave
        ELSIF NEW.leave_type = 'extra_leave' THEN
            UPDATE leave_quotas 
            SET extra_leave_used = extra_leave_used + duration 
            WHERE profile_id = NEW.profile_id;
            
        -- 3. Menstrual Leave
        ELSIF NEW.leave_type = 'menstrual_leave' THEN
            UPDATE leave_quotas 
            SET menstrual_leave_used = menstrual_leave_used + duration 
            WHERE profile_id = NEW.profile_id;
            
        -- 4. WFH (Weekly Limit)
        ELSIF NEW.leave_type = 'wfh' THEN
            UPDATE leave_quotas 
            SET wfh_weekly_used = wfh_weekly_used + duration 
            WHERE profile_id = NEW.profile_id;
            
        -- 5. WFA
        ELSIF NEW.leave_type = 'wfa' THEN
            UPDATE leave_quotas 
            SET wfa_used = wfa_used + duration 
            WHERE profile_id = NEW.profile_id;
        END IF;

    -- Case: Approved -> Rejected (Refund Quota / Decrement Used)
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
        
        -- Note: Attendance record removal is not strictly handled here to keep history, 
        -- but refresh_profile_status will correct the current state.
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-assign Triggers
-- Drop the old redundant triggers to avoid duplication
DROP TRIGGER IF EXISTS on_leave_approval_update_quota ON leave_requests;
DROP TRIGGER IF EXISTS on_leave_approval_final ON leave_requests;

CREATE TRIGGER on_leave_approval_final
AFTER UPDATE ON leave_requests
FOR EACH ROW EXECUTE FUNCTION handle_leave_approval_final();
