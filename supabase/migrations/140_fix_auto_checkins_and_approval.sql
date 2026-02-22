-- Migration 140: Fix Auto Daily Checkins, Leave Approval, and Status Automation
-- =================================================================================
-- Fixes:
-- 1. generate_daily_checkins: add parameters for weekend control and clock times
-- 2. handle_leave_approval_final: add overtime, WFH/WFA, fix dinas weekends
-- 3. refresh_profile_status: fix Step C for non-CEO, separate overtime check
-- =================================================================================

-- =========================================================
-- 1. Enhanced generate_daily_checkins
-- =========================================================
CREATE OR REPLACE FUNCTION public.generate_daily_checkins(
    target_profile_id uuid,
    start_d date,
    end_d date,
    attendance_status text,
    notes_text text,
    p_skip_weekends BOOLEAN DEFAULT TRUE,
    p_set_clock_times BOOLEAN DEFAULT TRUE,
    p_clock_in TIME DEFAULT '08:00:00'::TIME,
    p_clock_out TIME DEFAULT '17:00:00'::TIME
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    curr_date DATE := start_d;
    emp_id INT;
    v_clock_in TIMESTAMP;
    v_clock_out TIMESTAMP;
BEGIN
    SELECT employee_id INTO emp_id FROM profiles WHERE id = target_profile_id;

    WHILE curr_date <= end_d LOOP
        -- Skip weekends if requested
        IF p_skip_weekends AND EXTRACT(ISODOW FROM curr_date) IN (6, 7) THEN
            curr_date := curr_date + 1;
            CONTINUE;
        END IF;

        -- Set clock times based on parameter
        IF p_set_clock_times THEN
            v_clock_in := (curr_date || ' ' || p_clock_in::text)::timestamp;
            v_clock_out := (curr_date || ' ' || p_clock_out::text)::timestamp;
        ELSE
            v_clock_in := NULL;
            v_clock_out := NULL;
        END IF;

        INSERT INTO daily_checkins (
            profile_id, employee_id, checkin_date,
            clock_in_time, clock_out_time,
            status, is_late, notes, source
        ) VALUES (
            target_profile_id, emp_id, curr_date,
            v_clock_in, v_clock_out,
            attendance_status, FALSE, notes_text, 'system_auto'
        )
        ON CONFLICT (profile_id, checkin_date)
        DO UPDATE SET
            status = excluded.status,
            -- Only overwrite clock times if p_set_clock_times is true
            clock_in_time = CASE
                WHEN p_set_clock_times THEN excluded.clock_in_time
                ELSE daily_checkins.clock_in_time
            END,
            clock_out_time = CASE
                WHEN p_set_clock_times THEN excluded.clock_out_time
                ELSE daily_checkins.clock_out_time
            END,
            notes = excluded.notes,
            employee_id = excluded.employee_id;

        curr_date := curr_date + 1;
    END LOOP;
END;
$function$;

-- =========================================================
-- 2. Enhanced handle_leave_approval_final
-- =========================================================
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

        duration := (NEW.end_date - NEW.start_date) + 1;

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
            -- LEMBUR: Only generate checkins for weekend days
            -- Weekday lembur: don't overwrite existing office checkin
            -- (overtime is typically single-day: start_date = end_date)
            IF EXTRACT(ISODOW FROM NEW.start_date) IN (6, 7) THEN
                PERFORM generate_daily_checkins(
                    NEW.profile_id, NEW.start_date, NEW.end_date,
                    'lembur', 'System Auto: overtime',
                    FALSE,  -- don't skip weekends
                    TRUE,   -- set clock times from request
                    COALESCE(NEW.start_time, '08:00:00'::TIME),
                    COALESCE(NEW.end_time, '17:00:00'::TIME)
                );
            END IF;

        ELSIF NEW.leave_type IN ('wfh', 'wfa') THEN
            -- WFH/WFA: generate checkins WITHOUT clock times (staff clocks themselves)
            PERFORM generate_daily_checkins(
                NEW.profile_id, NEW.start_date, NEW.end_date,
                simple_status, 'System Auto: ' || NEW.leave_type,
                TRUE,   -- skip weekends
                FALSE   -- NO pre-set clock times
            );

        ELSIF NEW.leave_type = 'business_trip' THEN
            -- DINAS: include weekends, fixed 08:00-17:00
            PERFORM generate_daily_checkins(
                NEW.profile_id, NEW.start_date, NEW.end_date,
                'dinas', 'System Auto: business_trip',
                FALSE,  -- DON'T skip weekends
                TRUE    -- set clock times 08:00-17:00
            );

        ELSIF NEW.leave_type IN (
            'annual_leave', 'extra_leave', 'sick_leave',
            'maternity', 'menstrual_leave', 'miscarriage',
            'other_permission', 'self_marriage', 'child_marriage',
            'paternity', 'wife_miscarriage', 'child_event',
            'family_death', 'household_death', 'sibling_death',
            'hajj', 'government', 'disaster'
        ) THEN
            -- IZIN/SAKIT/CUTI: skip weekends, fixed 08:00-17:00
            PERFORM generate_daily_checkins(
                NEW.profile_id, NEW.start_date, NEW.end_date,
                simple_status, 'System Auto: ' || NEW.leave_type
                -- defaults: skip_weekends=TRUE, set_clock_times=TRUE
            );
        END IF;
        -- Types: training, asset, reimburse, meeting, one_on_one -> NO checkins

        -- C. Quota Deduction
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
        duration := (NEW.end_date - NEW.start_date) + 1;

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

-- =========================================================
-- 3. Enhanced refresh_profile_status
-- =========================================================
CREATE OR REPLACE FUNCTION refresh_profile_status(target_profile_id UUID)
RETURNS VOID AS $$
DECLARE
    found_status TEXT;
    checkin_status TEXT;
    today_date DATE := CURRENT_DATE;
    current_time_val TIME := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::TIME;
    emp_type TEXT;
    user_role TEXT;
    is_weekend BOOLEAN;
BEGIN
    -- 0. Setup
    is_weekend := EXTRACT(ISODOW FROM today_date) IN (6, 7);
    SELECT role INTO user_role FROM profiles WHERE id = target_profile_id;

    -- A. Check for APPROVED Business Trip (Highest Priority)
    PERFORM 1 FROM business_trips
    WHERE profile_id = target_profile_id
    AND status = 'approved'
    AND today_date BETWEEN start_date AND end_date;

    IF FOUND THEN
        found_status := 'dinas';
    ELSE
        -- B. Check for Approved Leave Requests (EXCLUDING overtime)
        -- Priority: WFH/WFA > Sakit > Cuti > Izin
        SELECT
            CASE
                WHEN leave_type = 'wfh' THEN 'wfh'
                WHEN leave_type = 'wfa' THEN 'wfa'
                WHEN leave_type = 'sick_leave' THEN 'sakit'
                WHEN leave_type IN ('annual_leave', 'other_permission', 'menstrual_leave',
                    'maternity', 'miscarriage', 'extra_leave') THEN 'cuti'
                WHEN leave_type IN ('self_marriage', 'child_marriage', 'paternity',
                    'wife_miscarriage', 'child_event', 'family_death', 'household_death',
                    'sibling_death', 'hajj', 'government', 'disaster') THEN 'izin'
                ELSE NULL
            END
        INTO found_status
        FROM leave_requests
        WHERE profile_id = target_profile_id
        AND status = 'approved'
        AND today_date BETWEEN start_date AND end_date
        AND leave_type NOT IN ('overtime', 'training', 'asset', 'reimburse', 'meeting', 'one_on_one')
        ORDER BY
            CASE leave_type
                WHEN 'wfh' THEN 1
                WHEN 'wfa' THEN 1
                WHEN 'sick_leave' THEN 2
                ELSE 3
            END
        LIMIT 1;

        -- B2. Check Approved Overtime (separate, lower priority than WFH/etc)
        -- If approved overtime exists for today -> 'lembur'
        IF found_status IS NULL THEN
            PERFORM 1 FROM leave_requests
            WHERE profile_id = target_profile_id
            AND leave_type = 'overtime'
            AND status = 'approved'
            AND today_date BETWEEN start_date AND end_date;

            IF FOUND THEN
                found_status := 'lembur';
            END IF;
        END IF;

        -- C. Check Daily Checkins (Manual Override)
        -- Preserve protected statuses for ALL users (not just CEO)
        IF found_status IS NULL THEN
            SELECT LOWER(status) INTO checkin_status
            FROM daily_checkins
            WHERE profile_id = target_profile_id
            AND checkin_date = today_date
            ORDER BY created_at DESC
            LIMIT 1;

            IF checkin_status IS NOT NULL THEN
                IF user_role = 'ceo' THEN
                    -- CEO: Always respect manual status
                    found_status := checkin_status;
                ELSIF checkin_status IN ('lembur', 'sakit', 'izin', 'cuti', 'dinas') THEN
                    -- Non-CEO: Respect protected statuses from manual checkin
                    found_status := checkin_status;
                END IF;
            END IF;
        END IF;

        -- D. Fallback: Default based on Employee Type (Working Hours 08-17)
        IF found_status IS NULL THEN
            IF (current_time_val BETWEEN '08:00:00'::time AND '17:00:00'::time) AND NOT is_weekend THEN
                IF user_role = 'ceo' THEN
                    found_status := NULL; -- CEO: No default force
                ELSE
                    SELECT employee_type INTO emp_type FROM profiles WHERE id = target_profile_id;
                    IF emp_type = 'remote_employee' THEN
                        found_status := 'remote';
                    ELSE
                        found_status := 'office';
                    END IF;
                END IF;
            END IF;
        END IF;
    END IF;

    -- E. NIGHT / WEEKEND OVERRIDE
    -- Protected statuses: lembur, cuti, sakit, izin, dinas — NEVER overridden to 'away'
    IF user_role = 'ceo' THEN
        IF (current_time_val >= '17:00:00'::time) OR is_weekend THEN
            IF found_status IS NULL OR found_status NOT IN ('lembur', 'cuti', 'sakit', 'izin', 'dinas') THEN
                found_status := 'away';
            END IF;
        ELSE
            NULL; -- Before 08:00 weekday: preserve CEO's manual status
        END IF;
    ELSE
        IF (current_time_val >= '17:00:00'::time) OR (current_time_val < '08:00:00'::time) OR is_weekend THEN
            IF found_status IS NULL OR found_status NOT IN ('lembur', 'cuti', 'sakit', 'izin', 'dinas') THEN
                found_status := 'away';
            END IF;
        ELSIF found_status IS NULL THEN
            found_status := 'away'; -- Failsafe
        END IF;
    END IF;

    -- Final Update
    IF found_status IS NOT NULL THEN
        UPDATE profiles SET status = found_status WHERE id = target_profile_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================
-- 4. Refresh all profiles with new logic
-- =========================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM profiles WHERE is_active = true LOOP
        PERFORM refresh_profile_status(r.id);
    END LOOP;
END;
$$;
