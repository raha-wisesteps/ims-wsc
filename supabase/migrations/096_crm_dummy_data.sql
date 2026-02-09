-- =============================================
-- CRM DUMMY DATA - Fixed for actual schema
-- Run this in Supabase SQL Editor
-- =============================================

DO $$
DECLARE
    v_user_id uuid;
    v_client1_id uuid;
    v_client2_id uuid;
    v_client3_id uuid;
BEGIN
    -- Get first super_admin, CEO, or bisdev user
    SELECT id INTO v_user_id 
    FROM profiles 
    WHERE role IN ('ceo', 'super_admin') OR is_busdev = true
    LIMIT 1;

    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id FROM profiles LIMIT 1;
    END IF;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No user found in profiles table';
    END IF;

    RAISE NOTICE 'Using user_id: %', v_user_id;

    -- Client 1: Government
    INSERT INTO crm_clients (company_name, category, current_stage, source, notes, created_by)
    VALUES ('Kementerian Pariwisata', 'government', 'proposal', 'Referral', 'Potential partnership for tourism development', v_user_id)
    RETURNING id INTO v_client1_id;

    INSERT INTO crm_client_contacts (client_id, name, position, email, phone, is_primary, created_by)
    VALUES 
        (v_client1_id, 'Budi Santoso', 'Direktur', 'budi@kemenpar.go.id', '08123456789', true, v_user_id),
        (v_client1_id, 'Sari Wijaya', 'Staff TU', 'sari@kemenpar.go.id', '08198765432', false, v_user_id);

    INSERT INTO crm_journey (client_id, from_stage, to_stage, notes, created_by)
    VALUES (v_client1_id, null, 'prospect', 'Initial contact', v_user_id),
           (v_client1_id, 'prospect', 'proposal', 'Proposal sent', v_user_id);

    RAISE NOTICE 'Client 1 created: %', v_client1_id;

    -- Client 2: Hotel
    INSERT INTO crm_clients (company_name, category, current_stage, source, notes, created_by)
    VALUES ('Ayana Resort Bali', 'accommodation', 'lead', 'Website', 'Interested in sustainability training', v_user_id)
    RETURNING id INTO v_client2_id;

    INSERT INTO crm_client_contacts (client_id, name, position, email, phone, is_primary, created_by)
    VALUES (v_client2_id, 'Maria Chen', 'GM', 'maria@ayana.com', '08111222333', true, v_user_id);

    INSERT INTO crm_client_tags (client_id, tag, notes, created_by)
    VALUES (v_client2_id, 'vip', 'High profile client', v_user_id),
           (v_client2_id, 'high_value', 'Large contract potential', v_user_id);

    INSERT INTO crm_journey (client_id, from_stage, to_stage, notes, created_by)
    VALUES (v_client2_id, null, 'prospect', 'Initial inquiry', v_user_id),
           (v_client2_id, 'prospect', 'proposal', 'Proposal presented', v_user_id),
           (v_client2_id, 'proposal', 'lead', 'Positive feedback', v_user_id);

    RAISE NOTICE 'Client 2 created: %', v_client2_id;

    -- Client 3: Tour Operator
    INSERT INTO crm_clients (company_name, category, current_stage, source, notes, created_by)
    VALUES ('Wonderful Indonesia Tours', 'tour_operator', 'sales', 'Conference', 'Contract signed for 2026', v_user_id)
    RETURNING id INTO v_client3_id;

    INSERT INTO crm_client_contacts (client_id, name, position, email, phone, is_primary, created_by)
    VALUES 
        (v_client3_id, 'Andi Pratama', 'CEO', 'andi@witours.id', '08555666777', true, v_user_id),
        (v_client3_id, 'Dewi Lestari', 'Finance', 'dewi@witours.id', '08555666778', false, v_user_id),
        (v_client3_id, 'Rudi Hartono', 'Operations', 'rudi@witours.id', '08555666779', false, v_user_id);

    INSERT INTO crm_client_tags (client_id, tag, notes, created_by)
    VALUES (v_client3_id, 'recommended', 'Great partner', v_user_id),
           (v_client3_id, 'responsive', 'Quick response time', v_user_id);

    INSERT INTO crm_journey (client_id, from_stage, to_stage, notes, created_by)
    VALUES (v_client3_id, null, 'prospect', 'Met at conference', v_user_id),
           (v_client3_id, 'prospect', 'proposal', 'Proposal sent', v_user_id),
           (v_client3_id, 'proposal', 'lead', 'Negotiation', v_user_id),
           (v_client3_id, 'lead', 'sales', 'Contract signed!', v_user_id);

    -- Using actual crm_meetings schema: attendees is TEXT, no location, agenda instead of summary
    INSERT INTO crm_meetings (client_id, meeting_date, meeting_type, attendees, agenda, mom_link, next_action, created_by)
    VALUES (v_client3_id, NOW() - INTERVAL '7 days', 'offline', 'Andi Pratama, Tim Bisdev', 'Contract discussion', 'https://drive.google.com/meeting1', 'Finalize terms', v_user_id);

    INSERT INTO crm_notes (client_id, note_type, content, is_pinned, created_by)
    VALUES (v_client3_id, 'follow_up', 'Need to follow up on contract terms next week', true, v_user_id);

    RAISE NOTICE 'Client 3 created: %', v_client3_id;
    RAISE NOTICE 'All dummy data inserted successfully!';
END $$;

-- =============================================
-- VERIFICATION: Check inserted data
-- =============================================
SELECT 
    c.company_name,
    c.category,
    c.current_stage,
    (SELECT COUNT(*) FROM crm_client_contacts WHERE client_id = c.id) as contacts_count,
    (SELECT COUNT(*) FROM crm_client_tags WHERE client_id = c.id) as tags_count
FROM crm_clients c
ORDER BY c.created_at DESC;
