-- Add DELETE policy for crm_journey
CREATE POLICY "crm_journey_delete" ON public.crm_journey
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role IN ('super_admin', 'ceo') OR profiles.job_type = 'bisdev')
        )
    );
