-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  related_request_id uuid,
  related_request_type text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = profile_id);

-- Policy: Users can update own notifications (e.g. mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = profile_id);

-- FUNCTION: Notify Admins on New Request
CREATE OR REPLACE FUNCTION notify_admins_on_new_request()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Find all admins (CEO, Super Admin) AND HR
  FOR admin_record IN 
    SELECT id FROM public.profiles 
    WHERE role IN ('ceo', 'super_admin') OR is_hr = true
  LOOP
    INSERT INTO public.notifications (profile_id, type, title, message, related_request_id, related_request_type)
    VALUES (
      admin_record.id,
      'request_new',
      'New Request Submitted',
      'A new ' || NEW.leave_type || ' request has been submitted.',
      NEW.id,
      NEW.leave_type
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER: New Request
DROP TRIGGER IF EXISTS on_new_request ON public.leave_requests;
CREATE TRIGGER on_new_request
  AFTER INSERT ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_on_new_request();


-- FUNCTION: Notify User on Status Change
CREATE OR REPLACE FUNCTION notify_user_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if status changed to approved or rejected
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO public.notifications (profile_id, type, title, message, related_request_id, related_request_type)
    VALUES (
      NEW.profile_id,
      CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'rejected' END,
      CASE WHEN NEW.status = 'approved' THEN 'Request Approved' ELSE 'Request Rejected' END,
      'Your ' || NEW.leave_type || ' request has been ' || NEW.status || '.',
      NEW.id,
      NEW.leave_type
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER: Status Change
DROP TRIGGER IF EXISTS on_request_status_change ON public.leave_requests;
CREATE TRIGGER on_request_status_change
  AFTER UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_on_status_change();
