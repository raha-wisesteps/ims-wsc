-- Migration: Create Bisdev CRM Tables
-- Description: Creates 4 tables for Business Development CRM system

-- =============================================
-- 1. Sales Tracking Table
-- =============================================
CREATE TABLE public.bisdev_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  year_month text NOT NULL,
  company_name text NOT NULL,
  project_name text NOT NULL,
  type text DEFAULT 'project' CHECK (type = ANY (ARRAY['project', 'retainer', 'adhoc'])),
  contract_value numeric DEFAULT 0,
  cash_in numeric DEFAULT 0,
  total_ar numeric DEFAULT 0,
  estimated_paid_date date,
  pic_name text,
  pic_position text,
  pic_contact text,
  status text DEFAULT 'running' CHECK (status = ANY (ARRAY['paid', 'partial', 'unpaid', 'running'])),
  sales_person uuid,
  jira_link text,
  drive_link text,
  start_date date,
  end_date date,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT bisdev_sales_pkey PRIMARY KEY (id),
  CONSTRAINT bisdev_sales_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT bisdev_sales_sales_person_fkey FOREIGN KEY (sales_person) REFERENCES public.profiles(id)
);

-- =============================================
-- 2. Leads Management Table
-- =============================================
CREATE TABLE public.bisdev_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  lead_source text,
  company_name text NOT NULL,
  industry text,
  pic_name text,
  pic_position text,
  pic_contact text,
  needs text,
  estimated_value numeric DEFAULT 0,
  status text DEFAULT 'cold' CHECK (status = ANY (ARRAY['hot', 'warm', 'cold', 'qualified'])),
  jira_link text,
  drive_link text,
  start_date date,
  end_date date,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  notes text,
  sales_person uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT bisdev_leads_pkey PRIMARY KEY (id),
  CONSTRAINT bisdev_leads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT bisdev_leads_sales_person_fkey FOREIGN KEY (sales_person) REFERENCES public.profiles(id)
);

-- =============================================
-- 3. Proposals Tracking Table
-- =============================================
CREATE TABLE public.bisdev_proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  proposal_number text UNIQUE,
  sent_date date,
  company_name text NOT NULL,
  proposal_title text NOT NULL,
  service_type text,
  offer_value numeric DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status = ANY (ARRAY['draft', 'sent', 'negotiation', 'approved', 'rejected'])),
  last_follow_up date,
  sales_person uuid,
  jira_link text,
  drive_link text,
  start_date date,
  end_date date,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT bisdev_proposals_pkey PRIMARY KEY (id),
  CONSTRAINT bisdev_proposals_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT bisdev_proposals_sales_person_fkey FOREIGN KEY (sales_person) REFERENCES public.profiles(id)
);

-- =============================================
-- 4. Prospects/Market Research Table
-- =============================================
CREATE TABLE public.bisdev_prospects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  company_name text NOT NULL,
  industry text,
  data_source text,
  key_person_name text,
  key_person_position text,
  key_person_contact text,
  status text DEFAULT 'identified' CHECK (status = ANY (ARRAY['identified', 'contacted', 'meeting_scheduled', 'not_interested'])),
  approach_plan text,
  sales_person uuid,
  jira_link text,
  drive_link text,
  start_date date,
  end_date date,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT bisdev_prospects_pkey PRIMARY KEY (id),
  CONSTRAINT bisdev_prospects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT bisdev_prospects_sales_person_fkey FOREIGN KEY (sales_person) REFERENCES public.profiles(id)
);

-- =============================================
-- Enable Row Level Security
-- =============================================
ALTER TABLE public.bisdev_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bisdev_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bisdev_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bisdev_prospects ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies for SELECT (Read Access)
-- Allowed: is_busdev flag, job_type bisdev, role ceo/super_admin
-- =============================================
CREATE POLICY "bisdev_sales_read" ON public.bisdev_sales FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin'))
  )
);

CREATE POLICY "bisdev_leads_read" ON public.bisdev_leads FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin'))
  )
);

CREATE POLICY "bisdev_proposals_read" ON public.bisdev_proposals FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin'))
  )
);

CREATE POLICY "bisdev_prospects_read" ON public.bisdev_prospects FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin'))
  )
);

-- =============================================
-- RLS Policies for INSERT (Create Access)
-- Allowed: is_busdev flag, job_type bisdev, role ceo/super_admin
-- =============================================
CREATE POLICY "bisdev_sales_insert" ON public.bisdev_sales FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin'))
  )
);

CREATE POLICY "bisdev_leads_insert" ON public.bisdev_leads FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin'))
  )
);

CREATE POLICY "bisdev_proposals_insert" ON public.bisdev_proposals FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin'))
  )
);

CREATE POLICY "bisdev_prospects_insert" ON public.bisdev_prospects FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin'))
  )
);

-- =============================================
-- RLS Policies for UPDATE (Edit Access)
-- Allowed: is_busdev flag, job_type bisdev, role ceo/super_admin
-- =============================================
CREATE POLICY "bisdev_sales_update" ON public.bisdev_sales FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin'))
  )
);

CREATE POLICY "bisdev_leads_update" ON public.bisdev_leads FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin'))
  )
);

CREATE POLICY "bisdev_proposals_update" ON public.bisdev_proposals FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin'))
  )
);

CREATE POLICY "bisdev_prospects_update" ON public.bisdev_prospects FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin'))
  )
);

-- =============================================
-- RLS Policies for DELETE (Full Access Only)
-- NOT ALLOWED: is_busdev flag alone (hide delete button in UI)
-- Allowed: job_type bisdev, role ceo/super_admin
-- =============================================
CREATE POLICY "bisdev_sales_delete" ON public.bisdev_sales FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (job_type = 'bisdev' OR role IN ('ceo', 'super_admin'))
  )
);

CREATE POLICY "bisdev_leads_delete" ON public.bisdev_leads FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (job_type = 'bisdev' OR role IN ('ceo', 'super_admin'))
  )
);

CREATE POLICY "bisdev_proposals_delete" ON public.bisdev_proposals FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (job_type = 'bisdev' OR role IN ('ceo', 'super_admin'))
  )
);

CREATE POLICY "bisdev_prospects_delete" ON public.bisdev_prospects FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (job_type = 'bisdev' OR role IN ('ceo', 'super_admin'))
  )
);

-- =============================================
-- Indexes for performance
-- =============================================
CREATE INDEX idx_bisdev_sales_created_by ON public.bisdev_sales(created_by);
CREATE INDEX idx_bisdev_sales_status ON public.bisdev_sales(status);
CREATE INDEX idx_bisdev_sales_sales_person ON public.bisdev_sales(sales_person);

CREATE INDEX idx_bisdev_leads_created_by ON public.bisdev_leads(created_by);
CREATE INDEX idx_bisdev_leads_status ON public.bisdev_leads(status);
CREATE INDEX idx_bisdev_leads_sales_person ON public.bisdev_leads(sales_person);

CREATE INDEX idx_bisdev_proposals_created_by ON public.bisdev_proposals(created_by);
CREATE INDEX idx_bisdev_proposals_status ON public.bisdev_proposals(status);
CREATE INDEX idx_bisdev_proposals_sales_person ON public.bisdev_proposals(sales_person);

CREATE INDEX idx_bisdev_prospects_created_by ON public.bisdev_prospects(created_by);
CREATE INDEX idx_bisdev_prospects_status ON public.bisdev_prospects(status);
CREATE INDEX idx_bisdev_prospects_sales_person ON public.bisdev_prospects(sales_person);
