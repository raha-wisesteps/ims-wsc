-- Migration: Create CRM Client Journey Tables
-- Description: CRM system with client journey tracking, tagging, meetings, and notes
-- Note: Run manually via Supabase SQL Editor

-- =============================================
-- 1. ENUM TYPES
-- =============================================

-- Client Categories
CREATE TYPE public.crm_category AS ENUM (
    'government',
    'ngo', 
    'media',
    'accommodation',
    'tour_operator',
    'bumn',
    'transportation',
    'fnb',
    'attraction',
    'tourism_village',
    'hospitality_suppliers',
    'supporting_organizations',
    'others'
);

-- Client Journey Stages
CREATE TYPE public.crm_stage AS ENUM (
    'prospect',
    'proposal', 
    'lead',
    'sales',
    'closed_won',
    'closed_lost'
);

-- Client Tags
CREATE TYPE public.crm_tag_type AS ENUM (
    'recommended',
    'problematic',
    'vip',
    'high_value',
    'slow_payer',
    'responsive'
);

-- Meeting Types
CREATE TYPE public.crm_meeting_type AS ENUM (
    'online',
    'onsite',
    'phone'
);

-- Note Types
CREATE TYPE public.crm_note_type AS ENUM (
    'general',
    'issue',
    'opportunity',
    'requirement'
);

-- =============================================
-- 2. CRM CLIENTS - Master Data
-- =============================================
CREATE TABLE public.crm_clients (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_name text NOT NULL,
    category public.crm_category DEFAULT 'others',
    current_stage public.crm_stage DEFAULT 'prospect',
    assigned_to uuid,
    source text,
    notes text,
    created_by uuid NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT crm_clients_pkey PRIMARY KEY (id),
    CONSTRAINT crm_clients_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id),
    CONSTRAINT crm_clients_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- =============================================
-- 3. CRM CLIENT CONTACTS - Multiple PICs per Client
-- =============================================
CREATE TABLE public.crm_client_contacts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL,
    name text NOT NULL,
    position text,
    email text,
    phone text,
    is_primary boolean DEFAULT false,
    notes text,
    created_by uuid NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT crm_client_contacts_pkey PRIMARY KEY (id),
    CONSTRAINT crm_client_contacts_client_fkey FOREIGN KEY (client_id) REFERENCES public.crm_clients(id) ON DELETE CASCADE,
    CONSTRAINT crm_client_contacts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- =============================================
-- 4. CRM CLIENT TAGS - Tagging System
-- =============================================
CREATE TABLE public.crm_client_tags (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL,
    tag public.crm_tag_type NOT NULL,
    notes text,
    created_by uuid NOT NULL,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT crm_client_tags_pkey PRIMARY KEY (id),
    CONSTRAINT crm_client_tags_client_fkey FOREIGN KEY (client_id) REFERENCES public.crm_clients(id) ON DELETE CASCADE,
    CONSTRAINT crm_client_tags_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
    CONSTRAINT crm_client_tags_unique UNIQUE (client_id, tag)
);

-- =============================================
-- 5. CRM JOURNEY - Auto-log Stage Changes
-- =============================================
CREATE TABLE public.crm_journey (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL,
    from_stage text,
    to_stage text NOT NULL,
    source_table text,
    source_id uuid,
    notes text,
    created_by uuid NOT NULL,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT crm_journey_pkey PRIMARY KEY (id),
    CONSTRAINT crm_journey_client_fkey FOREIGN KEY (client_id) REFERENCES public.crm_clients(id) ON DELETE CASCADE,
    CONSTRAINT crm_journey_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- =============================================
-- 6. CRM MEETINGS - Meeting Records with MOM
-- =============================================
CREATE TABLE public.crm_meetings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL,
    meeting_date timestamptz NOT NULL,
    meeting_type public.crm_meeting_type DEFAULT 'online',
    attendees text,
    agenda text,
    mom_content text,
    mom_link text,
    next_action text,
    reminder_date timestamptz,
    created_by uuid NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT crm_meetings_pkey PRIMARY KEY (id),
    CONSTRAINT crm_meetings_client_fkey FOREIGN KEY (client_id) REFERENCES public.crm_clients(id) ON DELETE CASCADE,
    CONSTRAINT crm_meetings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- =============================================
-- 7. CRM NOTES - Free-form Notes
-- =============================================
CREATE TABLE public.crm_notes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL,
    note_type public.crm_note_type DEFAULT 'general',
    content text NOT NULL,
    is_pinned boolean DEFAULT false,
    created_by uuid NOT NULL,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT crm_notes_pkey PRIMARY KEY (id),
    CONSTRAINT crm_notes_client_fkey FOREIGN KEY (client_id) REFERENCES public.crm_clients(id) ON DELETE CASCADE,
    CONSTRAINT crm_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- =============================================
-- 8. Enable Row Level Security
-- =============================================
ALTER TABLE public.crm_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_client_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_journey ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_notes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 9. RLS Policies - Same as Bisdev tables
-- =============================================

-- CRM Clients Policies
CREATE POLICY "crm_clients_read" ON public.crm_clients FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin')))
);
CREATE POLICY "crm_clients_insert" ON public.crm_clients FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin')))
);
CREATE POLICY "crm_clients_update" ON public.crm_clients FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin')))
);
CREATE POLICY "crm_clients_delete" ON public.crm_clients FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() 
    AND (job_type = 'bisdev' OR role IN ('ceo', 'super_admin')))
);

-- CRM Client Tags Policies
CREATE POLICY "crm_client_tags_read" ON public.crm_client_tags FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin')))
);
CREATE POLICY "crm_client_tags_insert" ON public.crm_client_tags FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin')))
);
CREATE POLICY "crm_client_tags_delete" ON public.crm_client_tags FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() 
    AND (job_type = 'bisdev' OR role IN ('ceo', 'super_admin')))
);

-- CRM Client Contacts Policies
CREATE POLICY "crm_client_contacts_read" ON public.crm_client_contacts FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin')))
);
CREATE POLICY "crm_client_contacts_insert" ON public.crm_client_contacts FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin')))
);
CREATE POLICY "crm_client_contacts_update" ON public.crm_client_contacts FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin')))
);
CREATE POLICY "crm_client_contacts_delete" ON public.crm_client_contacts FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() 
    AND (job_type = 'bisdev' OR role IN ('ceo', 'super_admin')))
);

-- CRM Journey Policies
CREATE POLICY "crm_journey_read" ON public.crm_journey FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin')))
);
CREATE POLICY "crm_journey_insert" ON public.crm_journey FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin')))
);
CREATE POLICY "crm_journey_update" ON public.crm_journey FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin')))
);

-- CRM Meetings Policies
CREATE POLICY "crm_meetings_read" ON public.crm_meetings FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin')))
);
CREATE POLICY "crm_meetings_insert" ON public.crm_meetings FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin')))
);
CREATE POLICY "crm_meetings_update" ON public.crm_meetings FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin')))
);
CREATE POLICY "crm_meetings_delete" ON public.crm_meetings FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() 
    AND (job_type = 'bisdev' OR role IN ('ceo', 'super_admin')))
);

-- CRM Notes Policies
CREATE POLICY "crm_notes_read" ON public.crm_notes FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin')))
);
CREATE POLICY "crm_notes_insert" ON public.crm_notes FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin')))
);
CREATE POLICY "crm_notes_update" ON public.crm_notes FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() 
    AND (is_busdev = true OR job_type = 'bisdev' OR role IN ('ceo', 'super_admin')))
);
CREATE POLICY "crm_notes_delete" ON public.crm_notes FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() 
    AND (job_type = 'bisdev' OR role IN ('ceo', 'super_admin')))
);

-- =============================================
-- 10. Indexes for Performance
-- =============================================
CREATE INDEX idx_crm_clients_category ON public.crm_clients(category);
CREATE INDEX idx_crm_clients_current_stage ON public.crm_clients(current_stage);
CREATE INDEX idx_crm_clients_assigned_to ON public.crm_clients(assigned_to);
CREATE INDEX idx_crm_clients_created_by ON public.crm_clients(created_by);

CREATE INDEX idx_crm_client_tags_client ON public.crm_client_tags(client_id);
CREATE INDEX idx_crm_client_tags_tag ON public.crm_client_tags(tag);

CREATE INDEX idx_crm_client_contacts_client ON public.crm_client_contacts(client_id);
CREATE INDEX idx_crm_client_contacts_primary ON public.crm_client_contacts(is_primary);

CREATE INDEX idx_crm_journey_client ON public.crm_journey(client_id);
CREATE INDEX idx_crm_journey_created_at ON public.crm_journey(created_at);

CREATE INDEX idx_crm_meetings_client ON public.crm_meetings(client_id);
CREATE INDEX idx_crm_meetings_date ON public.crm_meetings(meeting_date);
CREATE INDEX idx_crm_meetings_reminder ON public.crm_meetings(reminder_date);

CREATE INDEX idx_crm_notes_client ON public.crm_notes(client_id);
CREATE INDEX idx_crm_notes_pinned ON public.crm_notes(is_pinned);

-- =============================================
-- 11. Updated At Trigger Function (reuse existing or create)
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_crm_clients_updated_at BEFORE UPDATE ON public.crm_clients
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_meetings_updated_at BEFORE UPDATE ON public.crm_meetings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_client_contacts_updated_at BEFORE UPDATE ON public.crm_client_contacts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
