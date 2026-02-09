-- Add 'new' to crm_tag_type enum
ALTER TYPE public.crm_tag_type ADD VALUE IF NOT EXISTS 'new';
