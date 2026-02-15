-- Enable DELETE policies for waste tables

-- 1. waste_logs DELETE policy
DROP POLICY IF EXISTS "Enable delete access for all users" ON waste_logs;
CREATE POLICY "Enable delete access for all users" ON waste_logs
    FOR DELETE TO authenticated USING (true); 
    -- Ideally restrictions apply, but based on "Water" pattern where owners can delete, 
    -- and since waste_logs initially didn't track owner, we allow authenticated users to delete logs based on date range logic.
    -- Or better: Allow if they are admin OR ... 
    -- For now, to match "Enable insert access for all users", we allow delete for all authenticated.

-- 2. waste_weekly_reports DELETE policy (if not already fully covered by previous migration attempts)
-- The previous migration 127 tried to add policies via execute_sql but failed.
-- So we add them here officially.

DROP POLICY IF EXISTS "Enable delete access for all users" ON waste_weekly_reports;
CREATE POLICY "Enable delete access for all users" ON waste_weekly_reports
    FOR DELETE TO authenticated USING (true);
