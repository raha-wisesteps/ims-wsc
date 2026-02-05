-- Migration: 078_add_updated_at_to_kpi_scores.sql

DO $$
BEGIN
    -- Ensure updated_at exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kpi_scores' AND column_name = 'updated_at') THEN
        ALTER TABLE kpi_scores ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;

    -- Ensure created_at exists (good practice if missing)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kpi_scores' AND column_name = 'created_at') THEN
        ALTER TABLE kpi_scores ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
END $$;
