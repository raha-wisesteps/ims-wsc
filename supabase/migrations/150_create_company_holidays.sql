-- Create company_holidays table for managing public holidays / tanggal merah
CREATE TABLE IF NOT EXISTS public.company_holidays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'national_holiday'
        CHECK (type IN ('national_holiday', 'collective_leave')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read holidays
CREATE POLICY "company_holidays_select_all"
    ON public.company_holidays
    FOR SELECT
    TO authenticated
    USING (true);

-- Only HR, CEO, Owner, Super Admin can insert
CREATE POLICY "company_holidays_insert_admin"
    ON public.company_holidays
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('hr', 'ceo', 'owner', 'super_admin')
        )
    );

-- Only HR, CEO, Owner, Super Admin can update
CREATE POLICY "company_holidays_update_admin"
    ON public.company_holidays
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('hr', 'ceo', 'owner', 'super_admin')
        )
    );

-- Only HR, CEO, Owner, Super Admin can delete
CREATE POLICY "company_holidays_delete_admin"
    ON public.company_holidays
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('hr', 'ceo', 'owner', 'super_admin')
        )
    );

-- Seed Indonesia 2026 public holidays
INSERT INTO public.company_holidays (date, name, type) VALUES
    ('2026-01-01', 'Tahun Baru 2026 Masehi', 'national_holiday'),
    ('2026-01-16', 'Isra Mikraj Nabi Muhammad SAW', 'national_holiday'),
    ('2026-02-16', 'Cuti Bersama Tahun Baru Imlek 2577 Kongzili', 'collective_leave'),
    ('2026-02-17', 'Tahun Baru Imlek 2577 Kongzili', 'national_holiday'),
    ('2026-03-18', 'Cuti Bersama Hari Suci Nyepi Tahun Baru Saka 1948', 'collective_leave'),
    ('2026-03-19', 'Hari Suci Nyepi Tahun Baru Saka 1948', 'national_holiday'),
    ('2026-03-20', 'Cuti Bersama Hari Raya Idul Fitri 1447 Hijriah', 'collective_leave'),
    ('2026-03-21', 'Hari Raya Idul Fitri 1447 Hijriah', 'national_holiday'),
    ('2026-03-22', 'Hari Raya Idul Fitri 1447 Hijriah', 'national_holiday'),
    ('2026-03-23', 'Cuti Bersama Hari Raya Idul Fitri 1447 Hijriah', 'collective_leave'),
    ('2026-04-03', 'Wafat Yesus Kristus', 'national_holiday'),
    ('2026-04-05', 'Kebangkitan Yesus Kristus (Paskah)', 'national_holiday'),
    ('2026-05-01', 'Hari Buruh Internasional', 'national_holiday'),
    ('2026-05-14', 'Kenaikan Yesus Kristus', 'national_holiday'),
    ('2026-05-15', 'Cuti Bersama Kenaikan Yesus Kristus', 'collective_leave'),
    ('2026-05-27', 'Hari Raya Idul Adha 1447 Hijriah', 'national_holiday'),
    ('2026-05-28', 'Cuti Bersama Hari Raya Idul Adha 1447 Hijriah', 'collective_leave'),
    ('2026-05-31', 'Hari Raya Waisak 2570 BE', 'national_holiday'),
    ('2026-06-01', 'Hari Lahir Pancasila', 'national_holiday'),
    ('2026-06-16', 'Tahun Baru Islam 1448 Hijriah', 'national_holiday'),
    ('2026-08-17', 'Hari Proklamasi Kemerdekaan Republik Indonesia', 'national_holiday'),
    ('2026-08-25', 'Maulid Nabi Muhammad SAW', 'national_holiday'),
    ('2026-12-24', 'Cuti Bersama Hari Raya Natal', 'collective_leave'),
    ('2026-12-25', 'Hari Raya Natal / Kelahiran Yesus Kristus', 'national_holiday')
ON CONFLICT (date) DO NOTHING;
