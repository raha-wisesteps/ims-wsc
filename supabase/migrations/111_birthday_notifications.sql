-- Migration: Create birthday notification function (Fixed)
-- Description: Adds function to check for upcoming birthdays and notify BisDev/Admins. Supports Leap Years.

CREATE OR REPLACE FUNCTION check_and_notify_birthdays()
RETURNS void AS $$
DECLARE
    contact_record RECORD;
    bdate date;
    current_year int;
    next_birthday date;
    day_diff int;
    notification_exists boolean;
BEGIN
    current_year := EXTRACT(YEAR FROM current_date)::int;

    -- Loop through contacts with birth_date
    FOR contact_record IN 
        SELECT c.id, c.name, c.birth_date, c.client_id, cl.company_name 
        FROM public.crm_client_contacts c
        JOIN public.crm_clients cl ON c.client_id = cl.id
        WHERE c.birth_date IS NOT NULL
    LOOP
        bdate := contact_record.birth_date;
        
        -- Default: Try to set birthday to this year
        BEGIN
            next_birthday := make_date(current_year, EXTRACT(MONTH FROM bdate)::int, EXTRACT(DAY FROM bdate)::int);
        EXCEPTION WHEN OTHERS THEN
            -- Handle Leap Year (Feb 29 on non-leap year) -> Set to Feb 28
            next_birthday := make_date(current_year, 2, 28);
        END;
        
        -- If birthday has passed this year, set to next year
        IF next_birthday < current_date THEN
            BEGIN
                next_birthday := make_date(current_year + 1, EXTRACT(MONTH FROM bdate)::int, EXTRACT(DAY FROM bdate)::int);
            EXCEPTION WHEN OTHERS THEN
                -- Handle Leap Year for next year as well
                next_birthday := make_date(current_year + 1, 2, 28);
            END;
        END IF;
        
        day_diff := next_birthday - current_date;
        
        -- Check if birthday is today or within 7 days
        IF day_diff <= 7 THEN
             -- Check for existing notification in last 24h
            SELECT EXISTS (
                SELECT 1 FROM public.notifications 
                WHERE type = 'birthday_alert' 
                AND related_request_id = contact_record.client_id -- Link to Client ID
                AND (message LIKE '%' || contact_record.name || '%') -- Unique check
                AND created_at > now() - interval '24 hours'
            ) INTO notification_exists;

            IF NOT notification_exists THEN
                INSERT INTO public.notifications (profile_id, type, title, message, related_request_id, related_request_type)
                SELECT id, 'birthday_alert', 'Upcoming Birthday Alert', 
                       'Birthday: ' || contact_record.name || ' (' || contact_record.company_name || ') is ' || 
                       (CASE WHEN day_diff = 0 THEN 'today!' ELSE 'in ' || day_diff || ' days.' END),
                       contact_record.client_id, 'client'
                FROM public.profiles
                WHERE is_busdev = true OR role IN ('ceo', 'super_admin');
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
