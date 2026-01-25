-- Add is_converted column to leave_requests to track overtime processing
ALTER TABLE public.leave_requests 
ADD COLUMN IF NOT EXISTS is_converted boolean DEFAULT false;

-- Function to convert overtime to extra leave
CREATE OR REPLACE FUNCTION convert_overtime_to_leave(
    admin_id uuid,
    target_profile_id uuid,
    request_ids uuid[],
    days_to_grant int,
    reason_text text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_grant_id uuid;
BEGIN
    -- 1. Insert into extra_leave_grants
    INSERT INTO public.extra_leave_grants (
        profile_id,
        days_granted,
        days_remaining,
        reason,
        granted_by,
        expires_at
    ) VALUES (
        target_profile_id,
        days_to_grant,
        days_to_grant,
        reason_text,
        admin_id,
        NOW() + INTERVAL '30 days'
    ) RETURNING id INTO new_grant_id;

    -- 2. Mark requests as converted
    UPDATE public.leave_requests
    SET is_converted = true
    WHERE id = ANY(request_ids);

    -- 3. Notify user
    INSERT INTO public.notifications (
        profile_id,
        type,
        title,
        message,
        related_request_id
    ) VALUES (
        target_profile_id,
        'extra_leave_granted',
        'Cuti Ekstra Diterima',
        'Anda menerima ' || days_to_grant || ' hari cuti ekstra dari hasil lembur. Berlaku 30 hari.',
        new_grant_id
    );
END;
$$;

-- Function to convert overtime to cash (mark as converted only)
CREATE OR REPLACE FUNCTION convert_overtime_to_cash(
    admin_id uuid,
    target_profile_id uuid,
    request_ids uuid[],
    amount text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Mark requests as converted
    UPDATE public.leave_requests
    SET is_converted = true
    WHERE id = ANY(request_ids);

    -- 2. Notify user
    INSERT INTO public.notifications (
        profile_id,
        type,
        title,
        message
    ) VALUES (
        target_profile_id,
        'overtime_cashed_out',
        'Lembur Dicairkan',
        'Lembur Anda telah diproses untuk pencairan dana sebesar: ' || amount
    );
END;
$$;
