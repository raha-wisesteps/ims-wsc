-- Migration: 077_enhance_kpi_schema.sql

-- 1. Ensure kpi_scores has all required columns
DO $$
BEGIN
    -- final_score
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kpi_scores' AND column_name = 'final_score') THEN
        ALTER TABLE kpi_scores ADD COLUMN final_score NUMERIC DEFAULT 0;
    END IF;

    -- Pillar scores
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kpi_scores' AND column_name = 'score_knowledge') THEN
        ALTER TABLE kpi_scores ADD COLUMN score_knowledge NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kpi_scores' AND column_name = 'score_people') THEN
        ALTER TABLE kpi_scores ADD COLUMN score_people NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kpi_scores' AND column_name = 'score_service') THEN
        ALTER TABLE kpi_scores ADD COLUMN score_service NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kpi_scores' AND column_name = 'score_business') THEN
        ALTER TABLE kpi_scores ADD COLUMN score_business NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kpi_scores' AND column_name = 'score_leadership') THEN
        ALTER TABLE kpi_scores ADD COLUMN score_leadership NUMERIC DEFAULT 0;
    END IF;

    -- Status for Draft/Final workflow
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kpi_scores' AND column_name = 'status') THEN
        ALTER TABLE kpi_scores ADD COLUMN status TEXT DEFAULT 'draft'; -- 'draft' or 'final'
    END IF;
END $$;

-- 2. Ensure sub-aspect scores has ceo_note
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kpi_sub_aspect_scores' AND column_name = 'ceo_note') THEN
        ALTER TABLE kpi_sub_aspect_scores ADD COLUMN ceo_note TEXT;
    END IF;
END $$;
