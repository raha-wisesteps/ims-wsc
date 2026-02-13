-- Add configuration columns to waste_weekly_reports table
-- This allows each weekly report to store the specific factors used for calculation,
-- ensuring historical data accuracy even if factors change in the future.

ALTER TABLE waste_weekly_reports 
ADD COLUMN IF NOT EXISTS bin_capacity NUMERIC DEFAULT 10,
ADD COLUMN IF NOT EXISTS green_density NUMERIC DEFAULT 0.03,
ADD COLUMN IF NOT EXISTS yellow_density NUMERIC DEFAULT 0.05,
ADD COLUMN IF NOT EXISTS green_emission_factor NUMERIC DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS yellow_emission_factor NUMERIC DEFAULT 2.0;

-- Comment on columns for clarity
COMMENT ON COLUMN waste_weekly_reports.bin_capacity IS 'Capacity of the waste bin in Liters used for this week';
COMMENT ON COLUMN waste_weekly_reports.green_density IS 'Density of green waste in kg/L used for this week';
COMMENT ON COLUMN waste_weekly_reports.yellow_density IS 'Density of yellow waste in kg/L used for this week';
COMMENT ON COLUMN waste_weekly_reports.green_emission_factor IS 'Emission factor for green waste in kgCO2e/kg used for this week';
COMMENT ON COLUMN waste_weekly_reports.yellow_emission_factor IS 'Emission factor for yellow waste in kgCO2e/kg used for this week';
