-- =============================================
-- Add 'busdev' role access to operational modules:
-- petty_cash_transactions, maintenance_records, operational_assets
-- =============================================

-- =============================================
-- 1. PETTY CASH TRANSACTIONS
-- =============================================

-- Drop existing write/manage policies
DROP POLICY IF EXISTS "Enable insert for income for admins and managers" ON public.petty_cash_transactions;
DROP POLICY IF EXISTS "Enable update for admins" ON public.petty_cash_transactions;
DROP POLICY IF EXISTS "Enable delete for admins" ON public.petty_cash_transactions;

-- Insert income/topup: Admins, HR, Office Managers, and BusDev
CREATE POLICY "Enable insert for income for admins and managers"
ON public.petty_cash_transactions FOR INSERT
TO authenticated
WITH CHECK (
    is_expense = false AND
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role IN ('super_admin', 'ceo', 'busdev') OR
            profiles.is_office_manager = true OR
            profiles.is_hr = true
        )
    )
);

-- Update: Admins, HR, Office Managers, and BusDev
CREATE POLICY "Enable update for admins"
ON public.petty_cash_transactions FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role IN ('super_admin', 'ceo', 'busdev') OR
            profiles.is_office_manager = true OR
            profiles.is_hr = true
        )
    )
);

-- Delete: Admins, HR, Office Managers, and BusDev
CREATE POLICY "Enable delete for admins"
ON public.petty_cash_transactions FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role IN ('super_admin', 'ceo', 'busdev') OR
            profiles.is_office_manager = true OR
            profiles.is_hr = true
        )
    )
);

-- =============================================
-- 2. MAINTENANCE RECORDS
-- =============================================

-- Drop existing manage policy
DROP POLICY IF EXISTS "Enable manage access for admins and operations" ON public.maintenance_records;

-- Recreate with busdev role and is_office_manager flag
CREATE POLICY "Enable manage access for admins and operations"
ON public.maintenance_records FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role IN ('super_admin', 'ceo', 'hr', 'busdev') OR
            profiles.is_office_manager = true OR
            profiles.job_title IN ('Office Manager', 'Head of Operations') OR
            profiles.department = 'Finance'
        )
    )
);

-- =============================================
-- 3. OPERATIONAL ASSETS
-- =============================================

-- Drop existing write policies
DROP POLICY IF EXISTS "Enable insert for authorized roles" ON public.operational_assets;
DROP POLICY IF EXISTS "Enable update for admins and owners" ON public.operational_assets;
DROP POLICY IF EXISTS "Enable delete for admins and owners" ON public.operational_assets;

-- Insert: Admins, HR, Office Managers, and BusDev
CREATE POLICY "Enable insert for authorized roles" ON public.operational_assets
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND (
                role IN ('super_admin', 'ceo', 'hr', 'busdev')
                OR is_office_manager = true
            )
        )
    );

-- Update: Admins, HR, Office Managers, BusDev, or creator
CREATE POLICY "Enable update for admins and owners" ON public.operational_assets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND (
                role IN ('super_admin', 'ceo', 'hr', 'busdev')
                OR is_office_manager = true
            )
        )
        OR
        (created_by = auth.uid())
    );

-- Delete: Admins, HR, Office Managers, BusDev, or creator
CREATE POLICY "Enable delete for admins and owners" ON public.operational_assets
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND (
                role IN ('super_admin', 'ceo', 'hr', 'busdev')
                OR is_office_manager = true
            )
        )
        OR
        (created_by = auth.uid())
    );
