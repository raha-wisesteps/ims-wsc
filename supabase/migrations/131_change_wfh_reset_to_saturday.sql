-- Migration: Change WFH Weekly Quota Reset Day to Saturday
-- Purpose: Change the reset schedule from Monday (1) to Saturday (6) at 00:00 UTC
-- Depends on: 095_reset_wfh_quota_weekly.sql

-- 1. Unschedule the old job if it exists (safe to run even if not exists, but good practice to be explicit)
SELECT cron.unschedule('reset-wfh-weekly');

-- 2. Schedule the job for Saturday
-- Cron syntax: min hour day month day_of_week
-- 0 0 * * 6 = At 00:00 on Saturday.
SELECT cron.schedule(
    'reset-wfh-weekly', -- Job name (same name reusable)
    '0 0 * * 6',        -- Schedule: Saturday 00:00 UTC
    $$SELECT public.reset_wfh_weekly_quota()$$
);

-- Note: The function public.reset_wfh_weekly_quota() already exists from migration 095.
-- We are just changing when it runs.
