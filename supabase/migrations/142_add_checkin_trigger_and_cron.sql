-- Migration 142: Add missing triggers and cron job for status refresh
-- =================================================================
-- Fixes:
-- 1. Add trigger on daily_checkins (DELETE/UPDATE) to refresh profile status
-- 2. Add pg_cron job to auto-refresh all profile statuses every 15 minutes
--    This enables time-based transitions: away -> office at 08:00, office -> away at 17:00
-- =================================================================

-- =========================================================
-- 1. Trigger on daily_checkins for DELETE and UPDATE
-- =========================================================
CREATE OR REPLACE FUNCTION trigger_refresh_status_from_checkin()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM refresh_profile_status(OLD.profile_id);
    ELSE
        PERFORM refresh_profile_status(NEW.profile_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_refresh_status_checkin ON daily_checkins;
CREATE TRIGGER trg_refresh_status_checkin
AFTER UPDATE OR DELETE ON daily_checkins
FOR EACH ROW EXECUTE FUNCTION trigger_refresh_status_from_checkin();

-- =========================================================
-- 2. pg_cron job: Auto-refresh all active profile statuses
--    Runs every 15 minutes for time-based status transitions
--    (away <-> office at 08:00/17:00, weekend detection, etc.)
-- =========================================================

-- Remove old job if exists
SELECT cron.unschedule('refresh-all-profile-statuses')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'refresh-all-profile-statuses'
);

-- Schedule new job: every 15 minutes
SELECT cron.schedule(
    'refresh-all-profile-statuses',
    '*/15 * * * *',
    $$
    DO $inner$
    DECLARE
        r RECORD;
    BEGIN
        FOR r IN SELECT id FROM profiles WHERE is_active = true LOOP
            PERFORM refresh_profile_status(r.id);
        END LOOP;
    END;
    $inner$;
    $$
);
