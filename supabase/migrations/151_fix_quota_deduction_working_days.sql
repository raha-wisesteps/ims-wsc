-- Migration 151: Fix quota deduction to count working days only
-- =================================================================
-- Problem: handle_leave_approval_final uses calendar days for quota:
--   duration := (end_date - start_date) + 1
-- This counts weekends and holidays, over-deducting quotas.
--
-- Fix: Create a helper function that counts only business days
-- (excluding Sat/Sun and company_holidays), then use it in the trigger.
-- =================================================================

-- 1. Helper: count working days between two dates (inclusive)
CREATE OR REPLACE FUNCTION public.count_working_days(
    p_start DATE,
    p_end   DATE
)
RETURNS INT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $fn$
DECLARE
    d DATE := p_start;
    cnt INT := 0;
BEGIN
    IF p_start IS NULL OR p_end IS NULL OR p_start > p_end THEN
        RETURN 0;
    END IF;

    WHILE d <= p_end LOOP
        -- Skip Saturday (6) and Sunday (7)
        IF EXTRACT(ISODOW FROM d) NOT IN (6, 7) THEN
            -- Skip company holidays
            IF NOT EXISTS (
                SELECT 1 FROM public.company_holidays
                WHERE company_holidays.date = d
            ) THEN
                cnt := cnt + 1;
            END IF;
        END IF;
        d := d + 1;
    END LOOP;

    RETURN cnt;
END;
$fn$;

-- 2. Updated handle_leave_approval_final using count_working_days
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
    -- ===========================
    -- CASE: Pending -> Approved
    -- ===========================
    IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN

        -- Count only working days (excludes weekends + company holidays)
        duration := public.count_working_days(NEW.start_date, NEW.end_date);

        -- A. Determine Display Status
        IF NEW.leave_type = 'overtime' THEN
            simple_status := 'lembur';
        ELSIF NEW.leave_type = 'sick_leave' THEN
            simple_status := 'sakit';
        ELSIF NEW.leave_type = 'wfh' THEN
            simple_status := 'wfh';
        ELSIF NEW.leave_type = 'wfa' THEN
            simple_status := 'wfa';
        ELSIF NEW.leave_type = 'extra_leave' THEN
            simple_status := 'cuti';
        ELSIF NEW.leave_type IN ('annual_leave', 'maternity', 'menstrual_leave', 'miscarriage') THEN
            simple_status := 'cuti';
        ELSIF NEW.leave_type = 'business_trip' THEN
            simple_status := 'dinas';
        ELSE
            simple_status := 'izin';
        END IF;

        -- B. Generate Daily Checkins (per type rules)
        IF NEW.leave_type = 'overtime' THEN
            IF EXTRACT(ISODOW FROM NEW.start_date) IN (6, 7) THEN
                PERFORM generate_daily_checkins(
                    NEW.profile_id, NEW.start_date, NEW.end_date,
                    'lembur', 'System Auto: overtime',
                    FALSE,
                    TRUE,
                    COALESCE(NEW.start_time, '08:00:00'::TIME),
                    COALESCE(NEW.end_time, '17:00:00'::TIME)
                );
            END IF;

        ELSIF NEW.leave_type IN ('wfh', 'wfa') THEN
            PERFORM generate_daily_checkins(
                NEW.profile_id, NEW.start_date, NEW.end_date,
                simple_status, 'System Auto: ' || NEW.leave_type,
                TRUE,
                FALSE
            );

        ELSIF NEW.leave_type = 'business_trip' THEN
            PERFORM generate_daily_checkins(
                NEW.profile_id, NEW.start_date, NEW.end_date,
                'dinas', 'System Auto: business_trip',
                FALSE,
                TRUE
            );

        ELSIF NEW.leave_type IN (
            'annual_leave', 'extra_leave', 'sick_leave',
            'maternity', 'menstrual_leave', 'miscarriage',
            'other_permission', 'self_marriage', 'child_marriage',
            'paternity', 'wife_miscarriage', 'child_event',
            'family_death', 'household_death', 'sibling_death',
            'hajj', 'government', 'disaster'
        ) THEN
            PERFORM generate_daily_checkins(
                NEW.profile_id, NEW.start_date, NEW.end_date,
                simple_status, 'System Auto: ' || NEW.leave_type
            );
        END IF;

        -- C. Quota Deduction (now uses working days!)
        IF NEW.leave_type IN ('annual_leave', 'other_permission', 'family_death',
            'household_death', 'sibling_death', 'self_marriage', 'child_marriage',
            'child_event', 'hajj', 'government', 'disaster') THEN
            UPDATE leave_quotas SET annual_leave_used = annual_leave_used + duration
            WHERE profile_id = NEW.profile_id;

        ELSIF NEW.leave_type = 'extra_leave' THEN
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
                IF days_to_deduct <= 0 THEN EXIT; END IF;
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
            UPDATE leave_quotas SET extra_leave_used = extra_leave_used + duration
            WHERE profile_id = NEW.profile_id;

        ELSIF NEW.leave_type = 'menstrual_leave' THEN
            UPDATE leave_quotas SET menstrual_leave_used = menstrual_leave_used + duration
            WHERE profile_id = NEW.profile_id;
        ELSIF NEW.leave_type = 'wfh' THEN
            UPDATE leave_quotas SET wfh_weekly_used = wfh_weekly_used + duration
            WHERE profile_id = NEW.profile_id;
        ELSIF NEW.leave_type = 'wfa' THEN
            UPDATE leave_quotas SET wfa_used = wfa_used + duration
            WHERE profile_id = NEW.profile_id;
        END IF;

    -- ===========================
    -- CASE: Approved -> Rejected (Refund)
    -- ===========================
    ELSIF NEW.status = 'rejected' AND OLD.status = 'approved' THEN
        -- Refund also uses working days
        duration := public.count_working_days(NEW.start_date, NEW.end_date);

        IF NEW.leave_type IN ('annual_leave', 'other_permission') THEN
            UPDATE leave_quotas SET annual_leave_used = GREATEST(0, annual_leave_used - duration)
            WHERE profile_id = NEW.profile_id;
        ELSIF NEW.leave_type = 'extra_leave' THEN
            UPDATE extra_leave_grants
            SET days_remaining = days_remaining + duration
            WHERE id = (
                SELECT id FROM extra_leave_grants
                WHERE profile_id = NEW.profile_id AND is_expired = false
                ORDER BY expires_at DESC LIMIT 1
            );
            UPDATE leave_quotas SET extra_leave_used = GREATEST(0, extra_leave_used - duration)
            WHERE profile_id = NEW.profile_id;
        ELSIF NEW.leave_type = 'menstrual_leave' THEN
            UPDATE leave_quotas SET menstrual_leave_used = GREATEST(0, menstrual_leave_used - duration)
            WHERE profile_id = NEW.profile_id;
        ELSIF NEW.leave_type = 'wfh' THEN
            UPDATE leave_quotas SET wfh_weekly_used = GREATEST(0, wfh_weekly_used - duration)
            WHERE profile_id = NEW.profile_id;
        ELSIF NEW.leave_type = 'wfa' THEN
            UPDATE leave_quotas SET wfa_used = GREATEST(0, wfa_used - duration)
            WHERE profile_id = NEW.profile_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;
