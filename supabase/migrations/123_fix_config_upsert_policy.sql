-- Migration: Add Insert Policy for Travel Emission Config
-- Description: Allows Admins/HR/CEO to insert into travel_emission_config to support UPSERT operations.

DROP POLICY IF EXISTS "config_insert_admin" ON public.travel_emission_config;

-- Insert: Admins Only
CREATE POLICY "config_insert_admin" ON public.travel_emission_config FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role IN ('ceo', 'super_admin', 'hr'))
  )
);
