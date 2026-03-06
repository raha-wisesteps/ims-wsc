-- Drop the OLD 5-parameter overload of generate_daily_checkins.
-- It conflicts with the new 9-parameter version (which has 4 default params).
-- When called with 5 args, PostgreSQL cannot disambiguate between the two.
DROP FUNCTION IF EXISTS public.generate_daily_checkins(uuid, date, date, text, text);
