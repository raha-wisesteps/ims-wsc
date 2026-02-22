-- Migration 141: Fix TIMEZONE bug in refresh_profile_status
-- ==========================================================
-- ROOT CAUSE: today_date used CURRENT_DATE (UTC timezone)
-- but user data (leave_requests.start_date, daily_checkins.checkin_date) uses WIB dates.
--
-- At 05:59 WIB = 22:59 UTC -> CURRENT_DATE = Feb 21 (UTC)
-- But leave request start_date = Feb 22 (user's local WIB date)
-- So "today_date BETWEEN start_date AND end_date" = FALSE -> status forced to 'away'
--
-- FIX: Use (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::DATE for today_date
-- ==========================================================

CREATE OR REPLACE FUNCTION refresh_profile_status(target_profile_id UUID)
RETURNS VOID AS $$
DECLARE
    found_status TEXT;
    checkin_status TEXT;
    -- FIX: Use Jakarta timezone for BOTH date and time
    today_date DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::DATE;
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
                    found_status := checkin_status;
                ELSIF checkin_status IN ('lembur', 'sakit', 'izin', 'cuti', 'dinas') THEN
                    found_status := checkin_status;
                END IF;
            END IF;
        END IF;

        -- D. Fallback: Default based on Employee Type (Working Hours 08-17)
        IF found_status IS NULL THEN
            IF (current_time_val BETWEEN '08:00:00'::time AND '17:00:00'::time) AND NOT is_weekend THEN
                IF user_role = 'ceo' THEN
                    found_status := NULL;
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
            NULL;
        END IF;
    ELSE
        IF (current_time_val >= '17:00:00'::time) OR (current_time_val < '08:00:00'::time) OR is_weekend THEN
            IF found_status IS NULL OR found_status NOT IN ('lembur', 'cuti', 'sakit', 'izin', 'dinas') THEN
                found_status := 'away';
            END IF;
        ELSIF found_status IS NULL THEN
            found_status := 'away';
        END IF;
    END IF;

    -- Final Update
    IF found_status IS NOT NULL THEN
        UPDATE profiles SET status = found_status WHERE id = target_profile_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refresh all active profiles with corrected timezone
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM profiles WHERE is_active = true LOOP
        PERFORM refresh_profile_status(r.id);
    END LOOP;
END;
$$;
