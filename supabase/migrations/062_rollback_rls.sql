-- Rollback RLS settings to unrestricted as requested

-- 1. Profiles: Disable RLS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 2. Other Requests: Disable RLS
ALTER TABLE public.other_requests DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own requests" ON public.other_requests;
DROP POLICY IF EXISTS "Users can insert own requests" ON public.other_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON public.other_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON public.other_requests;

-- 3. Cleanup: Ensure reason column is not null where possible (though description is gone)
-- If we have null reasons, we can't recover description since it's missing from schema now.
-- But we can set a default if needed. For now, we leave data as is.
