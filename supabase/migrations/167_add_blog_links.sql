-- Add blog_links column to kpi_sub_aspect_scores for K1 (Penulisan Blog/News) evidence
ALTER TABLE kpi_sub_aspect_scores ADD COLUMN IF NOT EXISTS blog_links jsonb DEFAULT '[]'::jsonb;
