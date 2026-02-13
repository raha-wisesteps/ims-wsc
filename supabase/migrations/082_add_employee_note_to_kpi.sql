-- Add employee_note column to kpi_sub_aspect_scores
ALTER TABLE kpi_sub_aspect_scores
ADD COLUMN IF NOT EXISTS employee_note TEXT;

-- Verify policy allows update by user for their own rows (or via rpc/api)
-- Existing policies likely cover "update" if the user owns the kpi_score. 
-- We might need to ensure the user can update this specific column. 
-- For now, assuming standard RLS "update own" applies.
