-- Migration: 081_relax_kpi_score_constraints.sql

-- The current constraints (score >= 1) block saving 0 (which is valid for "Need Improvement" or drafts).
-- We need to drop the old constraints and add new ones allowing >= 0.

DO $$
BEGIN
    -- 1. Knowledge
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kpi_scores_score_knowledge_check') THEN
        ALTER TABLE kpi_scores DROP CONSTRAINT kpi_scores_score_knowledge_check;
    END IF;
    ALTER TABLE kpi_scores ADD CONSTRAINT kpi_scores_score_knowledge_check CHECK (score_knowledge >= 0 AND score_knowledge <= 6);

    -- 2. People
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kpi_scores_score_people_check') THEN
        ALTER TABLE kpi_scores DROP CONSTRAINT kpi_scores_score_people_check;
    END IF;
    ALTER TABLE kpi_scores ADD CONSTRAINT kpi_scores_score_people_check CHECK (score_people >= 0 AND score_people <= 6);

    -- 3. Service
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kpi_scores_score_service_check') THEN
        ALTER TABLE kpi_scores DROP CONSTRAINT kpi_scores_score_service_check;
    END IF;
    ALTER TABLE kpi_scores ADD CONSTRAINT kpi_scores_score_service_check CHECK (score_service >= 0 AND score_service <= 6);

    -- 4. Business
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kpi_scores_score_business_check') THEN
        ALTER TABLE kpi_scores DROP CONSTRAINT kpi_scores_score_business_check;
    END IF;
    ALTER TABLE kpi_scores ADD CONSTRAINT kpi_scores_score_business_check CHECK (score_business >= 0 AND score_business <= 6);

    -- 5. Leadership
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kpi_scores_score_leadership_check') THEN
        ALTER TABLE kpi_scores DROP CONSTRAINT kpi_scores_score_leadership_check;
    END IF;
    ALTER TABLE kpi_scores ADD CONSTRAINT kpi_scores_score_leadership_check CHECK (score_leadership >= 0 AND score_leadership <= 6);

END $$;
