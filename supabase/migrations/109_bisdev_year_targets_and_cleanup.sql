-- 1. Update bisdev_config for Year-based Targets
ALTER TABLE bisdev_config
ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT 2025;

-- Add unique constraint to ensure one target per year
ALTER TABLE bisdev_config
ADD CONSTRAINT bisdev_config_year_key UNIQUE (year);

-- Insert defaults for adjacent years if they don't exist
INSERT INTO bisdev_config (year, annual_target)
VALUES 
    (2024, 4000000000),
    (2026, 4000000000)
ON CONFLICT (year) DO NOTHING;

-- 2. Drop Legacy Tables
DROP TABLE IF EXISTS bisdev_leads CASCADE;
DROP TABLE IF EXISTS bisdev_proposals CASCADE;
DROP TABLE IF EXISTS bisdev_prospects CASCADE;
DROP TABLE IF EXISTS bisdev_sales CASCADE;
