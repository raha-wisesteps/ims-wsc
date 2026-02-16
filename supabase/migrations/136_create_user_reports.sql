-- Create user_reports table
CREATE TABLE IF NOT EXISTS public.user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('system', 'operational')),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'rejected')),
    admin_response TEXT,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Insert: Authenticated users can insert their own reports
CREATE POLICY "Users can create reports" ON public.user_reports
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 2. Select: Users can see their own reports. Admins can see all.
CREATE POLICY "Users view own, Admins view all" ON public.user_reports
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('ceo', 'super_admin', 'owner', 'hr')
        )
    );

-- 3. Update: Only Admins can update (status, response). Users cannot edit reports once submitted (for integrity).
CREATE POLICY "Admins can update reports" ON public.user_reports
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('ceo', 'super_admin', 'owner', 'hr')
        )
    );

-- Indexes
CREATE INDEX idx_user_reports_user_id ON public.user_reports(user_id);
CREATE INDEX idx_user_reports_created_at ON public.user_reports(created_at DESC);
