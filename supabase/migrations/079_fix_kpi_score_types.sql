-- Migration: 079_fix_kpi_score_types.sql

-- The error "invalid input syntax for type integer: 0.75..." indicates that
-- columns like final_score or score_knowledge are INTEGER but we are saving floats.
-- This migration forces them to be NUMERIC.

ALTER TABLE kpi_scores 
    ALTER COLUMN final_score TYPE NUMERIC,
    ALTER COLUMN score_knowledge TYPE NUMERIC,
    ALTER COLUMN score_people TYPE NUMERIC,
    ALTER COLUMN score_service TYPE NUMERIC,
    ALTER COLUMN score_business TYPE NUMERIC,
    ALTER COLUMN score_leadership TYPE NUMERIC;
