-- 1. Fix Schema: Consolidate to 'reason'
UPDATE public.other_requests 
SET reason = description 
WHERE reason IS NULL AND description IS NOT NULL;

ALTER TABLE public.other_requests 
DROP COLUMN IF EXISTS description;

-- 2. RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Public Read (needed for displaying avatars/names)
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

-- Policy: Users can update own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 3. RLS on other_requests
ALTER TABLE public.other_requests ENABLE ROW LEVEL SECURITY;

-- Policy: View own requests
CREATE POLICY "Users can view own requests" ON public.other_requests
    FOR SELECT USING (auth.uid() = profile_id);

-- Policy: Insert own requests
CREATE POLICY "Users can insert own requests" ON public.other_requests
    FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Policy: Admins/Managers can view all
CREATE POLICY "Admins can view all requests" ON public.other_requests
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM public.profiles 
            WHERE role IN ('ceo', 'super_admin', 'hr') 
            OR is_office_manager = true
        )
    );

-- Policy: Admins/Managers can update (approve/reject)
CREATE POLICY "Admins can update requests" ON public.other_requests
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT id FROM public.profiles 
            WHERE role IN ('ceo', 'super_admin', 'hr') 
            OR is_office_manager = true
        )
    );
