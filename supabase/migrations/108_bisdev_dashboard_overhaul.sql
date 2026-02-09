-- 1. Add cash_in column to crm_opportunities
ALTER TABLE crm_opportunities 
ADD COLUMN IF NOT EXISTS cash_in NUMERIC DEFAULT 0;

-- 2. Create bisdev_config table for dynamic targets
CREATE TABLE IF NOT EXISTS bisdev_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    annual_target NUMERIC DEFAULT 4000000000, -- Default 4 Billion
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- 3. Insert default config if not exists
INSERT INTO bisdev_config (annual_target)
SELECT 4000000000
WHERE NOT EXISTS (SELECT 1 FROM bisdev_config);

-- 4. Enable RLS
ALTER TABLE bisdev_config ENABLE ROW LEVEL SECURITY;

-- 5. Policies for bisdev_config
CREATE POLICY "Allow read access to all authenticated users"
ON bisdev_config FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow update access to CEO and Super Admin"
ON bisdev_config FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ceo', 'super_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ceo', 'super_admin')
    )
);

-- 6. Cleanup unused table
-- First, drop the dependency from crm_journey
ALTER TABLE crm_journey DROP CONSTRAINT IF EXISTS crm_journey_pipeline_id_fkey;

-- Optionally drop the column if it's no longer needed (assuming it was only for linking to crm_pipeline)
ALTER TABLE crm_journey DROP COLUMN IF EXISTS pipeline_id;

-- Now safe to drop crm_pipeline
DROP TABLE IF EXISTS crm_pipeline;
