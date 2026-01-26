-- Fix status column default value to match lowercase constraint
-- This fixes the "Database error creating new user" issue

ALTER TABLE public.profiles ALTER COLUMN status SET DEFAULT 'office';
