-- Migration: Fix CRM Relations
-- Description: Add opportunity_id to crm_journey for direct linking and better PostgREST joins

-- 1. Add opportunity_id to crm_journey
ALTER TABLE public.crm_journey
ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES public.crm_opportunities(id) ON DELETE SET NULL;

-- 2. Create index
CREATE INDEX IF NOT EXISTS idx_crm_journey_opportunity_id ON public.crm_journey(opportunity_id);

-- 3. Backfill opportunity_id from source_id if source_table is 'crm_opportunities' (Optional but good)
UPDATE public.crm_journey
SET opportunity_id = source_id
WHERE source_table = 'crm_opportunities' AND opportunity_id IS NULL;
