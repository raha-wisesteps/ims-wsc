-- Migration: Reset WFH Weekly Quota
-- Purpose: Reset wfh_weekly_used to 0 for all users every Monday at 00:00 UTC
-- Depends on: pg_cron extension

-- 1. Create the reset function
CREATE OR REPLACE FUNCTION public.reset_wfh_weekly_quota()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Reset wfh_weekly_used to 0 for all users
    UPDATE public.leave_quotas
    SET wfh_weekly_used = 0;
    
    -- Log the execution (optional, good for debugging)
    RAISE NOTICE 'WFH weekly quotas have been reset for all users.';
END;
$$;

-- 2. Schedule the job using pg_cron
-- Schedule: Every Monday at 00:00 UTC (which is Sunday various times or Monday morning depending on timezone, but standard start of week)
-- Cron syntax: min hour day month day_of_week
-- 0 0 * * 1 = At 00:00 on Monday.
SELECT cron.schedule(
    'reset-wfh-weekly', -- Job name
    '0 0 * * 1',        -- Schedule
    $$SELECT public.reset_wfh_weekly_quota()$$
);

-- Note: Ensure pg_cron is enabled in extensions. 
-- CREATE EXTENSION IF NOT EXISTS pg_cron; 
-- (Usually handled in dashboard or initial setup, but good to know)
