-- Enable Delete for Admins
CREATE POLICY "Admins can delete reports" ON public.user_reports
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('ceo', 'super_admin', 'owner', 'hr')
        )
    );
