-- Migration: Add birth_date to contacts and create inactivity notification function
-- Description: Adds birth_date column and implements logic for inactivity notifications

-- 1. Add birth_date to crm_client_contacts
ALTER TABLE public.crm_client_contacts
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 2. Create function to check and notify inactivity
CREATE OR REPLACE FUNCTION check_and_notify_inactivity()
RETURNS void AS $$
DECLARE
    client_record RECORD;
    last_interaction timestamptz;
    days_inactive int;
    notification_exists boolean;
BEGIN
    -- Loop through all clients
    FOR client_record IN SELECT id, company_name FROM public.crm_clients LOOP
        -- Get last interaction date (from meetings)
        -- Assuming meetings are linked to clients directly or via opportunities
        -- Logic: Max date from crm_meetings where client_id = client.id OR opportunity_id IN (select id from crm_opportunities where client_id = client.id)
        
        SELECT MAX(date) INTO last_interaction
        FROM public.crm_meetings
        WHERE opportunity_id IN (SELECT id FROM public.crm_opportunities WHERE client_id = client_record.id);
        
        -- If no interaction, use created_at of client? Or ignore?
        -- Let's ignore if NULL for now, or assume created_at
        IF last_interaction IS NULL THEN
            SELECT created_at INTO last_interaction FROM public.crm_clients WHERE id = client_record.id;
        END IF;

        IF last_interaction IS NOT NULL THEN
            days_inactive := EXTRACT(DAY FROM (now() - last_interaction));
            
            -- Thresholds: 14, 30, 60, 90
            IF days_inactive IN (14, 30, 60, 90) THEN
                -- Check if notification already exists for this client and this duration (to avoid duplicate today)
                -- We can check if a notification of type 'inactivity_alert' was created in the last 24h for this client
                -- But notifications table doesn't have client_id, only related_request_id. We can use related_request_id = client_id
                
                SELECT EXISTS (
                    SELECT 1 FROM public.notifications 
                    WHERE type = 'inactivity_alert' 
                    AND related_request_id = client_record.id
                    AND created_at > now() - interval '24 hours'
                ) INTO notification_exists;

                IF NOT notification_exists THEN
                    -- Insert notification for BisDev/Admins
                    INSERT INTO public.notifications (profile_id, type, title, message, related_request_id, related_request_type)
                    SELECT id, 'inactivity_alert', 'Client Inactivity Alert', 
                           'Client ' || client_record.company_name || ' has been inactive for ' || days_inactive || ' days.',
                           client_record.id, 'client'
                    FROM public.profiles
                    WHERE is_busdev = true OR role IN ('ceo', 'super_admin');
                END IF;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
