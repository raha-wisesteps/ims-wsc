-- Create crm_opportunities table (Centralized Opportunity Management)
CREATE TABLE public.crm_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.crm_clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    stage TEXT NOT NULL CHECK (stage IN ('prospect', 'proposal', 'leads', 'sales')),
    status TEXT NOT NULL, -- Specific status (e.g., 'hot', 'won', 'paid')
    value NUMERIC DEFAULT 0,
    priority TEXT DEFAULT 'medium',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    
    -- Metadata links (optional but helpful)
    jira_link TEXT,
    drive_link TEXT
);

-- Enable RLS
ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Open for internal team for now, similar to other tables)
CREATE POLICY "Enable read access for authenticated users" ON public.crm_opportunities
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.crm_opportunities
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.crm_opportunities
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.crm_opportunities
    FOR DELETE TO authenticated USING (true);

-- Add opportunity_id to crm_journey for direct linking
ALTER TABLE public.crm_journey 
ADD COLUMN opportunity_id UUID REFERENCES public.crm_opportunities(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_crm_opportunities_client_id ON public.crm_opportunities(client_id);
CREATE INDEX idx_crm_opportunities_stage ON public.crm_opportunities(stage);
