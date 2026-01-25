-- Add INSERT policies for notifications table

-- Policy: Users can insert notifications for themselves (e.g. "Request Sent")
CREATE POLICY "Users can insert own notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Policy: Admins/Managers can insert notifications for anyone (e.g. "Approved")
CREATE POLICY "Admins can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.profiles 
            WHERE role IN ('ceo', 'super_admin', 'hr') 
            OR is_office_manager = true
        )
    );
