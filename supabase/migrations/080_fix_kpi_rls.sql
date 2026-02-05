-- Migration: 080_fix_kpi_rls.sql

-- Enable RLS (if not already)
ALTER TABLE kpi_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_sub_aspect_scores ENABLE ROW LEVEL SECURITY;

-- Policy for kpi_scores: Allow Authenticated users to INSERT and UPDATE
-- Ideally restricted to 'CEO' or 'HR', but for now 'authenticated' unblocks testing.
-- Drop existing policies if they exist to avoid conflicts (optional but safer)
DROP POLICY IF EXISTS "Enable read access for all users" ON kpi_scores;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON kpi_scores;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON kpi_scores;

CREATE POLICY "Enable read access for all users" ON kpi_scores FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON kpi_scores FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON kpi_scores FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy for kpi_sub_aspect_scores
DROP POLICY IF EXISTS "Enable read access for all users" ON kpi_sub_aspect_scores;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON kpi_sub_aspect_scores;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON kpi_sub_aspect_scores;

CREATE POLICY "Enable read access for all users" ON kpi_sub_aspect_scores FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON kpi_sub_aspect_scores FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON kpi_sub_aspect_scores FOR UPDATE USING (auth.role() = 'authenticated');
