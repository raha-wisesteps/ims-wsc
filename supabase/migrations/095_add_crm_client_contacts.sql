-- Migration: Add CRM Client Contacts Table
-- Description: Add support for multiple contacts per client
-- Note: Run this ONLY if you already ran 094_create_crm_client_journey.sql

-- =============================================
-- 1. Create Contacts Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.crm_client_contacts (
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
-- 2. Enable RLS
-- =============================================
ALTER TABLE public.crm_client_contacts ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. RLS Policies
-- =============================================
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

-- =============================================
-- 4. Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_crm_client_contacts_client ON public.crm_client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_client_contacts_primary ON public.crm_client_contacts(is_primary);

-- =============================================
-- 5. Updated At Trigger
-- =============================================
CREATE TRIGGER update_crm_client_contacts_updated_at BEFORE UPDATE ON public.crm_client_contacts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 6. Migrate existing PIC data to contacts (if columns exist)
-- =============================================
DO $$
BEGIN
    -- Check if pic_name column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'crm_clients' 
        AND column_name = 'pic_name'
    ) THEN
        -- Migrate existing PIC data to contacts table
        INSERT INTO public.crm_client_contacts (client_id, name, position, email, phone, is_primary, created_by)
        SELECT id, pic_name, pic_position, pic_email, pic_phone, true, created_by
        FROM public.crm_clients
        WHERE pic_name IS NOT NULL AND pic_name != '';
        
        -- Drop old PIC columns
        ALTER TABLE public.crm_clients DROP COLUMN IF EXISTS pic_name;
        ALTER TABLE public.crm_clients DROP COLUMN IF EXISTS pic_position;
        ALTER TABLE public.crm_clients DROP COLUMN IF EXISTS pic_email;
        ALTER TABLE public.crm_clients DROP COLUMN IF EXISTS pic_phone;
    END IF;
END $$;
