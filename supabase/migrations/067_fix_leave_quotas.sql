-- 1. Add user_name column to leave_quotas
ALTER TABLE public.leave_quotas ADD COLUMN IF NOT EXISTS user_name TEXT;

-- 2. Create function to sync quotas (Insert & Update)
CREATE OR REPLACE FUNCTION public.sync_leave_quotas()
RETURNS TRIGGER AS $$
DECLARE
    is_intern BOOLEAN;
    target_limit INT;
BEGIN
    -- Update user_name on change
    IF (TG_OP = 'UPDATE') THEN
        UPDATE public.leave_quotas
        SET user_name = NEW.full_name
        WHERE profile_id = NEW.id;
    END IF;

    -- Handle WFH Quota logic based on Role Change
    -- If Inserting, New Intern = 2, Else = 1
    -- If Updating, Changed TO Intern = 2, Changed FROM Intern = 1
    
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.leave_quotas (profile_id, user_name, wfh_weekly_limit)
        VALUES (
            NEW.id, 
            NEW.full_name, 
            CASE WHEN NEW.job_type = 'intern' THEN 2 ELSE 1 END
        )
        ON CONFLICT (profile_id) DO NOTHING;
    
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Only update quota if job_type changes
        IF (NEW.job_type IS DISTINCT FROM OLD.job_type) THEN
            IF (NEW.job_type = 'intern') THEN
                UPDATE public.leave_quotas 
                SET wfh_weekly_limit = 2 
                WHERE profile_id = NEW.id;
            ELSIF (OLD.job_type = 'intern') THEN
                 -- Reset to 1 if moving away from intern
                 UPDATE public.leave_quotas 
                 SET wfh_weekly_limit = 1 
                 WHERE profile_id = NEW.id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger on profiles (INSERT and UPDATE)
DROP TRIGGER IF EXISTS trg_sync_quotas ON public.profiles;
CREATE TRIGGER trg_sync_quotas
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_leave_quotas();

-- 4. Backfill existing profiles (Insert missing quotas)
INSERT INTO public.leave_quotas (profile_id, user_name, wfh_weekly_limit)
SELECT 
    p.id, 
    p.full_name,
    CASE WHEN p.job_type = 'intern' THEN 2 ELSE 1 END
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.leave_quotas lq WHERE lq.profile_id = p.id);

-- 5. Backfill existing quotas (Correction run)
-- Ensure all current interns have 2
UPDATE public.leave_quotas lq
SET 
    wfh_weekly_limit = 2,
    user_name = p.full_name
FROM public.profiles p
WHERE lq.profile_id = p.id AND p.job_type = 'intern';

-- Ensure user_names are sync
UPDATE public.leave_quotas lq
SET user_name = p.full_name
FROM public.profiles p
WHERE lq.profile_id = p.id AND lq.user_name IS DISTINCT FROM p.full_name;
