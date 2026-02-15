-- Add created_by column to weekly reports (if not exists)
ALTER TABLE water_weekly_reports ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE waste_weekly_reports ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Enable RLS for DELETE on water_weekly_reports
-- 1. Owner can delete
CREATE POLICY "Users can delete their own water reports" ON water_weekly_reports
    FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- 2. Admins/HR/CEO can delete all
CREATE POLICY "Admins can delete any water report" ON water_weekly_reports
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND role IN ('super_admin', 'ceo', 'hr', 'owner')
        )
    );

-- Enable RLS for DELETE on waste_weekly_reports
-- 1. Owner
CREATE POLICY "Users can delete their own waste reports" ON waste_weekly_reports
    FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- 2. Admins
CREATE POLICY "Admins can delete any waste report" ON waste_weekly_reports
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND role IN ('super_admin', 'ceo', 'hr', 'owner')
        )
    );
