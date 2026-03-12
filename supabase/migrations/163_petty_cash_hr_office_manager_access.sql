-- =============================================
-- Step 1: Create petty_cash_transactions table (if not already created)
-- =============================================
CREATE TABLE IF NOT EXISTS public.petty_cash_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    category TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    is_expense BOOLEAN NOT NULL DEFAULT true,
    proof_link TEXT,
    created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.petty_cash_transactions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_petty_cash_date ON public.petty_cash_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_petty_cash_category ON public.petty_cash_transactions(category);

-- =============================================
-- Step 2: Drop old policies (if they exist) and recreate with updated access
-- =============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.petty_cash_transactions;
DROP POLICY IF EXISTS "Enable insert for expenses for authenticated users" ON public.petty_cash_transactions;
DROP POLICY IF EXISTS "Enable insert for income for admins and managers" ON public.petty_cash_transactions;
DROP POLICY IF EXISTS "Enable update for admins" ON public.petty_cash_transactions;
DROP POLICY IF EXISTS "Enable delete for admins" ON public.petty_cash_transactions;

-- 1. View: Everyone can view
CREATE POLICY "Enable read access for authenticated users"
ON public.petty_cash_transactions FOR SELECT
TO authenticated
USING (true);

-- 2. Insert expenses: All authenticated users
CREATE POLICY "Enable insert for expenses for authenticated users"
ON public.petty_cash_transactions FOR INSERT
TO authenticated
WITH CHECK (
    is_expense = true
);

-- 3. Insert income/topup: Admins, HR, and Office Managers
CREATE POLICY "Enable insert for income for admins and managers"
ON public.petty_cash_transactions FOR INSERT
TO authenticated
WITH CHECK (
    is_expense = false AND
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role IN ('super_admin', 'ceo') OR
            profiles.is_office_manager = true OR
            profiles.is_hr = true
        )
    )
);

-- 4. Update: Admins, HR, and Office Managers
CREATE POLICY "Enable update for admins"
ON public.petty_cash_transactions FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role IN ('super_admin', 'ceo') OR
            profiles.is_office_manager = true OR
            profiles.is_hr = true
        )
    )
);

-- 5. Delete: Admins, HR, and Office Managers
CREATE POLICY "Enable delete for admins"
ON public.petty_cash_transactions FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role IN ('super_admin', 'ceo') OR
            profiles.is_office_manager = true OR
            profiles.is_hr = true
        )
    )
);
