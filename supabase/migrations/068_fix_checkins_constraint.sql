-- Fix daily_checkins_status_check to include lowercase 'dinas'

ALTER TABLE public.daily_checkins
DROP CONSTRAINT IF EXISTS daily_checkins_status_check;

ALTER TABLE public.daily_checkins
ADD CONSTRAINT daily_checkins_status_check 
CHECK (status = ANY (ARRAY[
    'Office'::text, 'WFH'::text, 'WFA'::text, 'Sakit'::text, 'Cuti'::text, 
    'Izin'::text, 'Dinas'::text, 'Lembur'::text, 'Remote'::text, 'Field'::text, 
    'office'::text, 'wfh'::text, 'wfa'::text, 'sick'::text, 'leave'::text, 
    'field'::text, 'cuti'::text, 'izin'::text, 'lembur'::text,
    'dinas'::text -- Added this
]));
