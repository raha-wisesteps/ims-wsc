-- Migration: Create Waste Management Tables
-- Purpose: Store daily waste logs and weekly reports history

-- 1. Daily Waste Logs
CREATE TABLE IF NOT EXISTS waste_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE, -- One log per day
    green_status TEXT NOT NULL CHECK (green_status IN ('empty', 'half', 'full')),
    green_note TEXT CHECK (green_note IN ('new', 'leftover', 'holiday')),
    yellow_status TEXT NOT NULL CHECK (yellow_status IN ('empty', 'half', 'full')),
    yellow_note TEXT CHECK (yellow_note IN ('new', 'leftover', 'holiday')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Weekly Reports (Snapshot of submissions)
CREATE TABLE IF NOT EXISTS waste_weekly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_green_weight NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_yellow_weight NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_carbon NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. RLS Policies
ALTER TABLE waste_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_weekly_reports ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view/insert/update
CREATE POLICY "Enable read access for all users" ON waste_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for all users" ON waste_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for all users" ON waste_logs FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON waste_weekly_reports FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for all users" ON waste_weekly_reports FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_waste_logs_updated_at
    BEFORE UPDATE ON waste_logs
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
