-- Create petty_cash_transactions table
CREATE TABLE IF NOT EXISTS public.petty_cash_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    category TEXT NOT NULL, -- 'transportation', 'fnb', 'office_supplies', 'accommodation', 'others', 'topup'
    amount NUMERIC(15, 2) NOT NULL,
    is_expense BOOLEAN NOT NULL DEFAULT true, -- true = expense (out), false = income/topup (in)
    proof_link TEXT, -- Google Drive link
    created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.petty_cash_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies

-- 1. View policy: Everyone can view transactions (transparency for operational team)
CREATE POLICY "Enable read access for authenticated users"
ON public.petty_cash_transactions FOR SELECT
TO authenticated
USING (true);

-- 2. Insert policy: 
-- Expenses: Authenticated users can submit expenses
CREATE POLICY "Enable insert for expenses for authenticated users"
ON public.petty_cash_transactions FOR INSERT
TO authenticated
WITH CHECK (
    is_expense = true
);

-- Income/Topup: Only Managers/Admins can add funds
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
            profiles.job_title IN ('Office Manager', 'Head of Operations') OR
            profiles.department = 'Finance' -- Optional additional check
        )
    )
);

-- 3. Update/Delete policy: Restricted to Admins/Owners
CREATE POLICY "Enable update for admins"
ON public.petty_cash_transactions FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'ceo')
    )
);

CREATE POLICY "Enable delete for admins"
ON public.petty_cash_transactions FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'ceo')
    )
);

-- Create index for performance
CREATE INDEX idx_petty_cash_date ON public.petty_cash_transactions(transaction_date);
CREATE INDEX idx_petty_cash_category ON public.petty_cash_transactions(category);
