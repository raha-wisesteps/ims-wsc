-- Fix generate_daily_checkins to populate employee_id

CREATE OR REPLACE FUNCTION public.generate_daily_checkins(target_profile_id uuid, start_d date, end_d date, attendance_status text, notes_text text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    curr_date DATE := start_d;
    emp_id INT;
BEGIN
    -- Fetch employee_id from profiles
    SELECT employee_id INTO emp_id FROM profiles WHERE id = target_profile_id;

    WHILE curr_date <= end_d LOOP
        -- Skip weekends (Saturday=6, Sunday=7)
        IF EXTRACT(ISODOW FROM curr_date) IN (6, 7) THEN
            curr_date := curr_date + 1;
            CONTINUE;
        END IF;

        -- Insert template checkin (08:00 - 17:00)
        INSERT INTO daily_checkins (
            profile_id, 
            employee_id, -- Added this field
            checkin_date, 
            clock_in_time, 
            clock_out_time, 
            status, 
            is_late, 
            notes, 
            source
        ) VALUES (
            target_profile_id,
            emp_id, -- Insert fetched employee_id
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
            notes = excluded.notes,
            employee_id = excluded.employee_id; -- Also update on conflict

        curr_date := curr_date + 1;
    END LOOP;
END;
$function$;
