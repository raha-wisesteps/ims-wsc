-- Create kpi_sub_aspect_scores table for detailed scoring
CREATE TABLE IF NOT EXISTS public.kpi_sub_aspect_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_score_id UUID REFERENCES kpi_scores(id) ON DELETE CASCADE,
  sub_aspect_id TEXT NOT NULL,  -- e.g., "K1", "K2", "P1", etc.
  score INTEGER CHECK (score >= 1 AND score <= 5),
  ceo_note TEXT,               -- ✅ Komentar CEO per sub-aspek
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(kpi_score_id, sub_aspect_id)
);

-- Enable RLS
ALTER TABLE public.kpi_sub_aspect_scores ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "CEO can manage all sub-aspect scores"
  ON public.kpi_sub_aspect_scores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('ceo', 'owner', 'super_admin')
    )
  );

CREATE POLICY "Users can view own sub-aspect scores"
  ON public.kpi_sub_aspect_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kpi_scores ks 
      WHERE ks.id = kpi_score_id 
      AND ks.profile_id = auth.uid()
    )
  );
