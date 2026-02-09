-- Add opportunity_id to crm_meetings for granular tracking
ALTER TABLE public.crm_meetings
ADD COLUMN opportunity_id UUID REFERENCES public.crm_opportunities(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_crm_meetings_opportunity_id ON public.crm_meetings(opportunity_id);
