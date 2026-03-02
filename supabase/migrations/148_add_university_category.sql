-- Migration: Add 'university' to crm_category ENUM
-- Description: Adds 'University' as a new client category option

ALTER TYPE public.crm_category ADD VALUE IF NOT EXISTS 'university';
