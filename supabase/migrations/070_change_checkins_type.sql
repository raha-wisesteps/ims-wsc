-- Change clock_in_time and clock_out_time to timestamp without time zone
-- Convert existing UTC values to WIB (Asia/Jakarta) before removing timezone info
-- This ensures '01:00 UTC' becomes '08:00' stored timestamp.

ALTER TABLE public.daily_checkins
ALTER COLUMN clock_in_time TYPE timestamp without time zone 
USING clock_in_time AT TIME ZONE 'Asia/Jakarta';

ALTER TABLE public.daily_checkins
ALTER COLUMN clock_out_time TYPE timestamp without time zone 
USING clock_out_time AT TIME ZONE 'Asia/Jakarta';

-- Update the generator function to insert simple timestamps
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

        -- Insert template checkin (08:00 - 17:00)
        -- NOW: Inserting simple 'YYYY-MM-DD 08:00:00' literal.
        -- Type is timestamp without time zone, so it stores exactly this value.
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
            (curr_date || ' 08:00:00')::timestamp, 
            (curr_date || ' 17:00:00')::timestamp,
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
