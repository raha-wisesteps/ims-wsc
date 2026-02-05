-- Migration: Add unique constraint on daily_checkins for upsert to work
-- This constraint allows the upsert to properly handle conflicts

-- First check if there are duplicates that would prevent the constraint
-- If there are duplicates, we keep the most recent one (by created_at)
DO $$
BEGIN
    -- Delete older duplicates, keeping only the newest record per (profile_id, checkin_date)
    DELETE FROM public.daily_checkins a USING (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY profile_id, checkin_date ORDER BY created_at DESC) as rn
        FROM public.daily_checkins
    ) b
    WHERE a.id = b.id AND b.rn > 1;
    
    -- Now add the unique constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'daily_checkins_profile_id_checkin_date_key'
    ) THEN
        ALTER TABLE public.daily_checkins 
        ADD CONSTRAINT daily_checkins_profile_id_checkin_date_key 
        UNIQUE (profile_id, checkin_date);
    END IF;
END $$;
