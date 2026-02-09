-- Migration: Add client_id to Bisdev Tables
-- Links bisdev_* tables to crm_clients for unified client view

-- =============================================
-- 1. Add client_id Foreign Key to all bisdev tables
-- =============================================

-- Prospects
ALTER TABLE public.bisdev_prospects 
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.crm_clients(id) ON DELETE SET NULL;

-- Proposals  
ALTER TABLE public.bisdev_proposals
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.crm_clients(id) ON DELETE SET NULL;

-- Leads
ALTER TABLE public.bisdev_leads
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.crm_clients(id) ON DELETE SET NULL;

-- Sales
ALTER TABLE public.bisdev_sales
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.crm_clients(id) ON DELETE SET NULL;

-- =============================================
-- 2. Add indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_bisdev_prospects_client ON public.bisdev_prospects(client_id);
CREATE INDEX IF NOT EXISTS idx_bisdev_proposals_client ON public.bisdev_proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_bisdev_leads_client ON public.bisdev_leads(client_id);
CREATE INDEX IF NOT EXISTS idx_bisdev_sales_client ON public.bisdev_sales(client_id);

-- =============================================
-- 3. Add source_table and source_id to crm_journey if not exists
-- For tracking which bisdev table triggered the journey log
-- =============================================
-- Note: These columns were already added in 094 migration, but adding IF NOT EXISTS check

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'crm_journey' AND column_name = 'source_table') THEN
        ALTER TABLE public.crm_journey ADD COLUMN source_table text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'crm_journey' AND column_name = 'source_id') THEN
        ALTER TABLE public.crm_journey ADD COLUMN source_id uuid;
    END IF;
END $$;
