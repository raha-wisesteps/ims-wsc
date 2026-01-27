-- Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content text NOT NULL,
    category text DEFAULT 'General'::text,
    audience_type text NOT NULL CHECK (audience_type IN ('broadcast', 'department', 'individual')),
    target_departments text[], -- Array of department names
    target_users uuid[], -- Array of profile_ids
    author_id uuid REFERENCES public.profiles(id),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    CONSTRAINT announcements_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has access to an announcement
-- (Optimized to avoid complex joins in policies if possible, but for now direct checks)

-- POLICY 1: Read Access
-- Users can see an announcement if:
-- 1. It is a broadcast
-- 2. It is for their department
-- 3. It is specifically for them
-- 4. They are the author
DROP POLICY IF EXISTS "Users can view relevant announcements" ON public.announcements;
CREATE POLICY "Users can view relevant announcements" ON public.announcements
    FOR SELECT
    USING (
        audience_type = 'broadcast' 
        OR 
        (audience_type = 'department' AND (
            SELECT department FROM public.profiles WHERE id = auth.uid()
        ) = ANY(target_departments))
        OR
        (audience_type = 'individual' AND auth.uid() = ANY(target_users))
        OR
        author_id = auth.uid()
    );

-- POLICY 2: Insert Access
-- Only HR, Super Admin, Admin, CEO, Owner, OR users with is_hr=true can insert
DROP POLICY IF EXISTS "Authorized users can create announcements" ON public.announcements;
CREATE POLICY "Authorized users can create announcements" ON public.announcements
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND (
                role IN ('super_admin', 'admin', 'ceo', 'owner', 'hr')
                OR
                is_hr = true
            )
        )
    );

-- POLICY 3: Update Access (Author only or Global Admin potentially, sticking to Author or specialized roles)
DROP POLICY IF EXISTS "Authors and Admins can update announcements" ON public.announcements;
CREATE POLICY "Authors and Admins can update announcements" ON public.announcements
    FOR UPDATE
    USING (
        author_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('super_admin', 'ceo', 'owner')
        )
    );

-- POLICY 4: Delete Access (Same as Update)
DROP POLICY IF EXISTS "Authors and Admins can delete announcements" ON public.announcements;
CREATE POLICY "Authors and Admins can delete announcements" ON public.announcements
    FOR DELETE
    USING (
        author_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('super_admin', 'ceo', 'owner')
        )
    );
