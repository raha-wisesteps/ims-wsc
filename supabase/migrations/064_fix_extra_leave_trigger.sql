-- Fix handle_leave_approval_final to explicitly support extra_leave

CREATE OR REPLACE FUNCTION public.handle_leave_approval_final()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    duration INT;
    simple_status TEXT;
    grant_record RECORD;
    days_to_deduct INT;
BEGIN
    -- Only trigger when status changes to 'approved'
    IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
        
        -- A. Calculate Duration
        duration := (NEW.end_date - NEW.start_date) + 1;

        -- B. Determine Display Status for Attendance (explicitly handle extra_leave)
        IF NEW.leave_type = 'sick_leave' THEN 
            simple_status := 'sakit';
        ELSIF NEW.leave_type = 'extra_leave' THEN
            simple_status := 'cuti'; -- Explicit handling for Extra Leave
        ELSIF NEW.leave_type IN ('annual_leave', 'maternity', 'menstrual_leave', 'miscarriage') THEN 
            simple_status := 'cuti';
        ELSIF NEW.leave_type = 'business_trip' THEN 
            simple_status := 'dinas';
        ELSE 
            simple_status := 'izin'; 
        END IF;

        -- C. Generate Attendance (Daily Checkins)
        -- Explicitly allow extra_leave processing
        IF NEW.leave_type IN ('annual_leave', 'extra_leave', 'sick_leave', 'maternity', 'menstrual_leave', 'miscarriage', 'business_trip', 'other_permission', 'self_marriage', 'child_marriage', 'paternity', 'wife_miscarriage', 'child_event', 'family_death', 'household_death', 'sibling_death', 'hajj', 'government', 'disaster') THEN
             PERFORM generate_daily_checkins(NEW.profile_id, NEW.start_date, NEW.end_date, simple_status, 'System Auto: ' || NEW.leave_type);
        ELSE
             -- Fallback for unlisted types that shouldn't generate attendance (like overtime, asset, etc)
             -- We do nothing
        END IF;

        -- D. Quota Deduction
        IF NEW.leave_type IN ('annual_leave', 'other_permission', 'family_death', 'household_death', 'sibling_death', 'self_marriage', 'child_marriage', 'child_event', 'hajj', 'government', 'disaster') THEN
            UPDATE leave_quotas SET annual_leave_used = annual_leave_used + duration WHERE profile_id = NEW.profile_id;
        
        ELSIF NEW.leave_type = 'extra_leave' THEN
            -- Deduct from Extra Leave Grants (FIFO)
            days_to_deduct := duration;
            
            FOR grant_record IN 
                SELECT id, days_remaining 
                FROM extra_leave_grants 
                WHERE profile_id = NEW.profile_id 
                  AND days_remaining > 0 
                  AND is_expired = false
                  AND expires_at > NOW()
                ORDER BY expires_at ASC
            LOOP
                IF days_to_deduct <= 0 THEN
                    EXIT;
                END IF;

                IF grant_record.days_remaining >= days_to_deduct THEN
                    UPDATE extra_leave_grants 
                    SET days_remaining = days_remaining - days_to_deduct 
                    WHERE id = grant_record.id;
                    days_to_deduct := 0;
                ELSE
                    days_to_deduct := days_to_deduct - grant_record.days_remaining;
                    UPDATE extra_leave_grants 
                    SET days_remaining = 0 
                    WHERE id = grant_record.id;
                END IF;
            END LOOP;

            -- Update summary
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
             UPDATE extra_leave_grants
             SET days_remaining = days_remaining + duration
             WHERE id = (
                 SELECT id FROM extra_leave_grants 
                 WHERE profile_id = NEW.profile_id 
                 AND is_expired = false 
                 ORDER BY expires_at DESC 
                 LIMIT 1
             );

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
$function$
