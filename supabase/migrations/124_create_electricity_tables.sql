-- Migration: Create Electricity Log Tables
-- Description: Creates tables for Electricity Sustainability features.

-- =============================================
-- 1. Electricity Config (Settings)
-- =============================================
CREATE TABLE public.electricity_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  allocation_percentage numeric NOT NULL DEFAULT 100, -- Percentage of building usage attributed to company
  emission_factor numeric NOT NULL DEFAULT 0.8, -- kgCO2e/kWh
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT electricity_config_pkey PRIMARY KEY (id)
);

-- Seed Default Config (Default 100% allocation, 0.8 emission factor)
INSERT INTO public.electricity_config (allocation_percentage, emission_factor)
VALUES (100, 0.8);

-- RLS
ALTER TABLE public.electricity_config ENABLE ROW LEVEL SECURITY;

-- Read: Everyone
CREATE POLICY "electricity_config_read" ON public.electricity_config FOR SELECT USING (true);

-- Update: Admins Only
CREATE POLICY "electricity_config_update" ON public.electricity_config FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role IN ('ceo', 'super_admin', 'hr'))
  )
);

-- Insert: Admins Only (Normally seeded once, but allow for setup)
CREATE POLICY "electricity_config_insert" ON public.electricity_config FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role IN ('ceo', 'super_admin', 'hr'))
  )
);


-- =============================================
-- 2. Electricity Logs
-- =============================================
CREATE TABLE public.electricity_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    period_start date NOT NULL,
    period_end date NOT NULL,
    
    building_consumption_kwh numeric NOT NULL DEFAULT 0, -- Input
    allocation_percentage numeric NOT NULL, -- Config Snapshot
    company_consumption_kwh numeric NOT NULL DEFAULT 0, -- Calculated (Building * Allocation%)
    emission_factor numeric NOT NULL, -- Config Snapshot
    carbon_emission numeric NOT NULL DEFAULT 0, -- Calculated (Company * Factor)
    
    evidence_link text, -- Input (Link)
    notes text,
    
    created_by uuid NOT NULL,

    CONSTRAINT electricity_logs_pkey PRIMARY KEY (id),
    CONSTRAINT electricity_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- RLS
ALTER TABLE public.electricity_logs ENABLE ROW LEVEL SECURITY;

-- Read: Everyone
CREATE POLICY "electricity_logs_read" ON public.electricity_logs FOR SELECT USING (true);

-- Insert: Authenticated Users (Staff, Admin, etc.)
CREATE POLICY "electricity_logs_insert" ON public.electricity_logs FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
);

-- Update: Creator (Own Data) OR Admins
CREATE POLICY "electricity_logs_update" ON public.electricity_logs FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND (role IN ('ceo', 'super_admin', 'hr'))
    )
);

-- Delete: Creator (Own Data) OR Admins
-- Staff can only delete their own data. Admins can delete any.
CREATE POLICY "electricity_logs_delete" ON public.electricity_logs FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND (role IN ('ceo', 'super_admin', 'hr'))
    )
);

-- Indexes
CREATE INDEX idx_electricity_logs_period ON public.electricity_logs(period_start);
CREATE INDEX idx_electricity_logs_created_by ON public.electricity_logs(created_by);
