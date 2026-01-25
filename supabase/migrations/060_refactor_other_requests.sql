-- 1. Create other_requests table for Training, Reimburse, Asset, Meeting
CREATE TABLE IF NOT EXISTS public.other_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    profile_id uuid REFERENCES public.profiles(id),
    request_type text NOT NULL CHECK (request_type = ANY (ARRAY['training'::text, 'reimburse'::text, 'asset'::text, 'meeting'::text, 'one_on_one'::text, 'business_trip'::text])),
    request_date date NOT NULL DEFAULT CURRENT_DATE,
    description text,
    reason text, -- Alias for description for some components
    status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])),
    attachment_url text,
    amount numeric, -- For reimburse
    manager_id uuid REFERENCES public.profiles(id), -- Who approved/rejected
    manager_note text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT other_requests_pkey PRIMARY KEY (id)
);

-- 2. Update handle_leave_approval_final to include extra_leave in check-in generation
CREATE OR REPLACE FUNCTION handle_leave_approval_final()
RETURNS TRIGGER AS $$
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

        -- B. Determine Display Status for Attendance (Lowercase Slugs)
        IF NEW.leave_type = 'sick_leave' THEN 
            simple_status := 'sakit';
        ELSIF NEW.leave_type IN ('annual_leave', 'extra_leave', 'maternity', 'menstrual_leave', 'miscarriage') THEN 
            simple_status := 'cuti';
        ELSIF NEW.leave_type = 'business_trip' THEN 
            simple_status := 'dinas';
        ELSE 
            simple_status := 'izin'; 
        END IF;

        -- C. Generate Attendance (Daily Checkins)
        -- ADDED 'extra_leave' to the implicit allowed list (by NOT excluding it)
        -- The previous code excluded 'overtime', 'training', 'asset', etc.
        -- 'extra_leave' matches the "NOT IN" condition, so it proceeds.
        -- We explicitly check:
        IF NEW.leave_type NOT IN ('overtime', 'training', 'asset', 'reimburse', 'meeting', 'one_on_one') THEN
            PERFORM generate_daily_checkins(NEW.profile_id, NEW.start_date, NEW.end_date, simple_status, 'System Auto: ' || NEW.leave_type);
        END IF;

        -- D. Quota Deduction...
        IF NEW.leave_type IN ('annual_leave', 'other_permission') THEN
            UPDATE leave_quotas SET annual_leave_used = annual_leave_used + duration WHERE profile_id = NEW.profile_id;
        
        ELSIF NEW.leave_type = 'extra_leave' THEN
            -- NEW LOGIC: Deduct from extra_leave_grants
            days_to_deduct := duration;
            
            -- Fetch valid grants ordered by expiry (use nearest expiry first)
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
                    -- This grant covers the remaining need
                    UPDATE extra_leave_grants 
                    SET days_remaining = days_remaining - days_to_deduct 
                    WHERE id = grant_record.id;
                    
                    days_to_deduct := 0;
                ELSE
                    -- Use up this grant
                    days_to_deduct := days_to_deduct - grant_record.days_remaining;
                    
                    UPDATE extra_leave_grants 
                    SET days_remaining = 0 
                    WHERE id = grant_record.id;
                END IF;
            END LOOP;

            -- If days_to_deduct > 0, we still update summary for record
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
