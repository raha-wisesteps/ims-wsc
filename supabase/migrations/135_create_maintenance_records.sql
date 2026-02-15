-- Create maintenance_records table
CREATE TABLE IF NOT EXISTS public.maintenance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_date DATE NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- ac_service, internet_wifi, cleaning_service, etc.
    amount NUMERIC NOT NULL,
    vendor_name TEXT,
    next_service_date DATE,
    proof_link TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

-- Create Policy: Enable read for all authenticated users
CREATE POLICY "Enable read access for all authenticated users"
ON public.maintenance_records FOR SELECT
TO authenticated
USING (true);

-- Create Policy: Enable insert/update/delete for specific roles (Admins, Ops)
CREATE POLICY "Enable manage access for admins and operations"
ON public.maintenance_records FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role IN ('super_admin', 'ceo') OR
            profiles.job_title IN ('Office Manager', 'Head of Operations') OR
            profiles.department = 'Finance'
        )
    )
);

-- Create indexes
CREATE INDEX idx_maintenance_service_date ON public.maintenance_records(service_date);
CREATE INDEX idx_maintenance_category ON public.maintenance_records(category);
CREATE INDEX idx_maintenance_created_by ON public.maintenance_records(created_by);
