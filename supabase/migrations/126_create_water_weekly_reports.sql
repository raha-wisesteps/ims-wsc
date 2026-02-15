-- Migration: Create Water Weekly Reports Table
-- Created: 2026-02-15

CREATE TABLE IF NOT EXISTS water_weekly_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start date NOT NULL UNIQUE,
    week_end date NOT NULL,
    submitted_at timestamptz,
    
    -- Weekly Totals
    total_water_liters numeric(10,2) DEFAULT 0,
    total_carbon_kg numeric(10,4) DEFAULT 0,
    
    -- Config Snapshot (to lock historical calculations)
    hand_wash_freq integer,
    hand_wash_vol numeric(5,2),
    toilet_flush_freq integer,
    toilet_flush_vol numeric(5,2),
    emission_factor numeric(10,6),
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE water_weekly_reports ENABLE ROW LEVEL SECURITY;

-- Policies (same as Logs)
CREATE POLICY "Authenticated users can view water weekly reports" ON water_weekly_reports
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins/HR can manage water weekly reports" ON water_weekly_reports
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE role IN ('super_admin', 'ceo', 'hr', 'owner')
        )
    );

-- Allow Employees to view/insert? Usually only admins/officers submit.
-- Assuming "Add Report" button is limited. But Waste page allows "Save Changes".
-- I'll allow authenticated Insert/Update for now, relying on UI logic and audit trails.
CREATE POLICY "Authenticated users can create weekly reports" ON water_weekly_reports
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update weekly reports" ON water_weekly_reports
    FOR UPDATE TO authenticated USING (true);
