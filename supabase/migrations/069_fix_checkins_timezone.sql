-- Fix generate_daily_checkins to use explicit +07 timezone for default start/end times
-- This prevents the server (UTC) from interpreting 08:00 as 08:00 UTC (which becomes 15:00 WIB)
-- Instead we want 08:00 WIB -> 01:00 UTC

CREATE OR REPLACE FUNCTION public.generate_daily_checkins(target_profile_id uuid, start_d date, end_d date, attendance_status text, notes_text text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    curr_date DATE := start_d;
BEGIN
    WHILE curr_date <= end_d LOOP
        -- Skip weekends (Saturday=6, Sunday=7)
        IF EXTRACT(ISODOW FROM curr_date) IN (6, 7) THEN
            curr_date := curr_date + 1;
            CONTINUE;
        END IF;

        -- Insert template checkin (08:00 - 17:00 WIB)
        -- We explicitly append '+07' to force Postgres to strictly interpret this as WIB time
        -- Then ::timestamptz converts it to correct UTC for storage
        INSERT INTO daily_checkins (
            profile_id, 
            checkin_date, 
            clock_in_time, 
            clock_out_time, 
            status, 
            is_late, 
            notes, 
            source
        ) VALUES (
            target_profile_id,
            curr_date,
            (curr_date || ' 08:00:00+07')::timestamptz, -- Template Start (01:00 UTC)
            (curr_date || ' 17:00:00+07')::timestamptz, -- Template End (10:00 UTC)
            attendance_status,
            FALSE, -- Not late (template)
            notes_text,
            'system_auto'
        )
        ON CONFLICT (profile_id, checkin_date) 
        DO UPDATE SET 
            status = excluded.status,
            clock_in_time = excluded.clock_in_time,
            clock_out_time = excluded.clock_out_time,
            notes = excluded.notes;

        curr_date := curr_date + 1;
    END LOOP;
END;
$function$;
