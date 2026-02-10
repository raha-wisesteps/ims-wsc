-- Allow HR, CEO, Super Admin to delete announcements

-- Policy: Expanded delete permissions
DROP POLICY IF EXISTS "Authors and Admins can delete announcements" ON public.announcements;
CREATE POLICY "Authorized users can delete announcements" ON public.announcements
    FOR DELETE
    USING (
        author_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND (
                role IN ('super_admin', 'ceo', 'hr')
                OR
                is_hr = true
            )
        )
    );
