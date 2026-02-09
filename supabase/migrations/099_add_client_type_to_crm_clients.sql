-- Migration: Add client_type to crm_clients
-- Description: Distinguish between Company and Individual clients

ALTER TABLE public.crm_clients 
ADD COLUMN client_type text DEFAULT 'company' CHECK (client_type IN ('company', 'individual'));

-- Update existing records (optional, default covers it)
UPDATE public.crm_clients SET client_type = 'company' WHERE client_type IS NULL;
