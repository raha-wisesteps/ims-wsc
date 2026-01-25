-- Migration: Auto Update Quotas on Approval
-- Purpose: Deduct quota usage when specific leave types are approved, and refund if rejected after approval.

CREATE OR REPLACE FUNCTION handle_leave_approval_trigger()
RETURNS TRIGGER AS $$
DECLARE
  days_count INTEGER;
BEGIN
  -- Calculate days (inclusive)
  days_count := (NEW.end_date - NEW.start_date) + 1;
  
  -- Case 1: Pending -> ApprovedOr any -> Approved (Deduct Quota / Increment Used)
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
  
    IF NEW.leave_type = 'annual_leave' THEN
      UPDATE leave_quotas SET annual_leave_used = annual_leave_used + days_count WHERE profile_id = NEW.profile_id;
    ELSIF NEW.leave_type = 'wfh' THEN
      UPDATE leave_quotas SET wfh_weekly_used = wfh_weekly_used + days_count WHERE profile_id = NEW.profile_id;
    ELSIF NEW.leave_type = 'wfa' THEN
      UPDATE leave_quotas SET wfa_used = wfa_used + days_count WHERE profile_id = NEW.profile_id;
    END IF;
    
  -- Case 2: Approved -> Rejected (Refund Quota / Decrement Used)
  ELSIF NEW.status = 'rejected' AND OLD.status = 'approved' THEN
  
    IF NEW.leave_type = 'annual_leave' THEN
      UPDATE leave_quotas SET annual_leave_used = GREATEST(0, annual_leave_used - days_count) WHERE profile_id = NEW.profile_id;
    ELSIF NEW.leave_type = 'wfh' THEN
      UPDATE leave_quotas SET wfh_weekly_used = GREATEST(0, wfh_weekly_used - days_count) WHERE profile_id = NEW.profile_id;
    ELSIF NEW.leave_type = 'wfa' THEN
      UPDATE leave_quotas SET wfa_used = GREATEST(0, wfa_used - days_count) WHERE profile_id = NEW.profile_id;
    END IF;
    
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid conflicts or duplication
DROP TRIGGER IF EXISTS on_leave_approval_update_quota ON leave_requests;

-- Create Trigger
CREATE TRIGGER on_leave_approval_update_quota
AFTER UPDATE OF status ON leave_requests
FOR EACH ROW
EXECUTE FUNCTION handle_leave_approval_trigger();
