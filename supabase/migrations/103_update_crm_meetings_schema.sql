-- Migration: Update CRM Meetings Schema
-- Description: Add internal_attendees for PIC tracking and expand meeting types

-- 1. Add internal_attendees column to crm_meetings
ALTER TABLE public.crm_meetings
ADD COLUMN IF NOT EXISTS internal_attendees UUID[] DEFAULT '{}';

-- 2. Add comment to explain the column
COMMENT ON COLUMN public.crm_meetings.internal_attendees IS 'Array of profile IDs representing internal staff (PICs) involved in the meeting';

-- 3. Update crm_meeting_type enum
-- modifying enum types in postgres can be tricky transactionally, 
-- but since this is a simple addition, we can use ALTER TYPE ADD VALUE IF NOT EXISTS
ALTER TYPE public.crm_meeting_type ADD VALUE IF NOT EXISTS 'chat';
ALTER TYPE public.crm_meeting_type ADD VALUE IF NOT EXISTS 'call';
ALTER TYPE public.crm_meeting_type ADD VALUE IF NOT EXISTS 'email';
ALTER TYPE public.crm_meeting_type ADD VALUE IF NOT EXISTS 'other';
