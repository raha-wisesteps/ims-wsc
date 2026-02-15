-- Migration: Create Water Logs and Config Tables
-- Created: 2026-02-15

-- ============================================
-- STEP 1: Create water_config table
-- ============================================

CREATE TABLE IF NOT EXISTS water_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hand_wash_freq integer DEFAULT 4,
    hand_wash_vol numeric(5,2) DEFAULT 1.5, -- Liters per wash
    toilet_flush_freq integer DEFAULT 3,
    toilet_flush_vol numeric(5,2) DEFAULT 6.0, -- Liters per flush
    emission_factor numeric(10,6) DEFAULT 0.344, -- kgCO2e per m3
    updated_at timestamptz DEFAULT now()
);

-- Insert default config if not exists
INSERT INTO water_config (hand_wash_freq, hand_wash_vol, toilet_flush_freq, toilet_flush_vol, emission_factor)
SELECT 4, 1.5, 3, 6.0, 0.344
WHERE NOT EXISTS (SELECT 1 FROM water_config);

-- Enable RLS
ALTER TABLE water_config ENABLE ROW LEVEL SECURITY;

-- Policies for config
CREATE POLICY "Everyone can view water config" ON water_config
    FOR SELECT USING (true);

CREATE POLICY "Only admins/HR/CEO can update water config" ON water_config
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE role IN ('super_admin', 'ceo', 'hr', 'owner')
        )
    );

-- ============================================
-- STEP 2: Create water_logs table
-- ============================================

CREATE TABLE IF NOT EXISTS water_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    date date NOT NULL UNIQUE,
    employee_count integer NOT NULL DEFAULT 0,
    attendees jsonb, -- Stores list of employee names/IDs used for calculation
    total_water_liters numeric(10,2) NOT NULL DEFAULT 0, -- Total usage 
    carbon_emission numeric(10,4) NOT NULL DEFAULT 0, -- kgCO2e
    is_holiday boolean DEFAULT false, -- If true, usage is 0 or minimal
    notes text,
    created_by uuid REFERENCES profiles(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;

-- Policies for logs

-- 1. View: Authenticated users
CREATE POLICY "Authenticated users can view water logs" ON water_logs
    FOR SELECT TO authenticated USING (true);

-- 2. Insert: Authenticated users
CREATE POLICY "Authenticated users can add water logs" ON water_logs
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- 3. Update: Owner OR Admin/HR/CEO
CREATE POLICY "Users can update their own water logs OR Admins" ON water_logs
    FOR UPDATE USING (
        auth.uid() = created_by OR 
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE role IN ('super_admin', 'ceo', 'hr', 'owner')
        )
    );

-- 4. Delete: Owner OR Admin/HR/CEO
CREATE POLICY "Users can delete their own water logs OR Admins" ON water_logs
    FOR DELETE USING (
        auth.uid() = created_by OR 
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE role IN ('super_admin', 'ceo', 'hr', 'owner')
        )
    );

-- ============================================
-- VERIFICATION
-- ============================================

SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('water_config', 'water_logs');
