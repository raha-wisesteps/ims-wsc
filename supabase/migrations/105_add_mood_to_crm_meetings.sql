-- Add mood column to crm_meetings
ALTER TABLE public.crm_meetings
ADD COLUMN IF NOT EXISTS mood text;

-- Add comment explaining options (e.g., 'excellent', 'good', 'neutral', 'bad')
COMMENT ON COLUMN public.crm_meetings.mood IS 'Mood tracking: excellent, good, neutral, bad';
