ALTER TABLE operational_assets 
ADD COLUMN IF NOT EXISTS existing_value NUMERIC DEFAULT 0;
