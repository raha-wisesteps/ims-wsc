-- Create operational_assets table
CREATE TABLE IF NOT EXISTS operational_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE, -- Auto-generated
    category TEXT NOT NULL CHECK (category IN ('furniture', 'electronics', 'books', 'office_supplies', 'vehicles', 'others')),
    condition TEXT NOT NULL CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'lost', 'disposed')),
    location TEXT NOT NULL,
    purchase_value NUMERIC DEFAULT 0,
    acquisition_date DATE NOT NULL,
    current_holder_id UUID REFERENCES profiles(id),
    description TEXT,
    image_url TEXT, -- GDrive/Photo link
    created_by UUID REFERENCES profiles(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create operational_asset_logs table
CREATE TABLE IF NOT EXISTS operational_asset_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES operational_assets(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('creation', 'assignment', 'return', 'maintenance', 'update', 'disposal')),
    actor_id UUID REFERENCES profiles(id) NOT NULL,
    previous_holder_id UUID REFERENCES profiles(id),
    new_holder_id UUID REFERENCES profiles(id),
    previous_condition TEXT,
    new_condition TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to generate asset code
CREATE OR REPLACE FUNCTION generate_asset_code()
RETURNS TRIGGER AS $$
DECLARE
    prefix TEXT;
    year_suffix TEXT;
    seq INT;
    new_code TEXT;
BEGIN
    -- Determine prefix based on category
    CASE NEW.category
        WHEN 'furniture' THEN prefix := 'F';
        WHEN 'electronics' THEN prefix := 'E';
        WHEN 'books' THEN prefix := 'B';
        WHEN 'office_supplies' THEN prefix := 'O';
        WHEN 'vehicles' THEN prefix := 'V';
        ELSE prefix := 'Z';
    END CASE;

    -- Get last 2 digits of acquisition year
    year_suffix := TO_CHAR(NEW.acquisition_date, 'YY');

    -- Calculate sequence number for this category
    -- We count assets in this category to determine the next sequence
    -- Note: This might have concurrency issues in high-volume inserts, but suitable for this use case
    SELECT COALESCE(MAX(SUBSTRING(code FROM '\d+')::INT), 0) + 1
    INTO seq
    FROM operational_assets
    WHERE category = NEW.category;

    -- Format: PREFIX-SEQ-YY (e.g., F-001-25)
    new_code := prefix || '-' || LPAD(seq::TEXT, 3, '0') || '-' || year_suffix;
    
    NEW.code := new_code;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to assign code before insert
CREATE TRIGGER set_asset_code
BEFORE INSERT ON operational_assets
FOR EACH ROW
WHEN (NEW.code IS NULL)
EXECUTE FUNCTION generate_asset_code();

-- RLS Policies

-- Enable RLS
ALTER TABLE operational_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_asset_logs ENABLE ROW LEVEL SECURITY;

-- 1. View Policy: All authenticated users can view assets and logs
CREATE POLICY "Enable read access for all users" ON operational_assets
    FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON operational_asset_logs
    FOR SELECT USING (true);

-- 2. Insert Policy: Office Managers, HR, Super Admin, CEO can insert
CREATE POLICY "Enable insert for authorized roles" ON operational_assets
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND (
                job_type = 'operational' -- Office Manager typically falls here? Or checking specific allowed roles
                OR role IN ('super_admin', 'ceo', 'hr')
                OR (role = 'employee' AND job_type = 'operational') -- Assuming Office Manager is Operational
            )
        )
    );

-- 3. Update/Delete Policy for operational_assets
-- CEO/Super Admin/HR: Can update/delete all
-- Office Manager (Operational): Can only update/delete if they created it OR if policy allows. 
-- User requirement: "Office manager hanya bisa menghapus/mengedit data yang dia tambahkan"

-- Update Policy
CREATE POLICY "Enable update for admins and owners" ON operational_assets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND (role IN ('super_admin', 'ceo', 'hr'))
        )
        OR 
        (created_by = auth.uid()) -- Office manager (who created it)
    );

-- Delete Policy
CREATE POLICY "Enable delete for admins and owners" ON operational_assets
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND (role IN ('super_admin', 'ceo', 'hr'))
        )
        OR 
        (created_by = auth.uid()) -- Office manager (who created it)
    );

-- Logs should generally not be deleted/edited to maintain audit trail, 
-- but if needed, we can add similar policies. For now, we allow insert for logs by anyone (system generates them via app logic)
CREATE POLICY "Enable insert logs for all" ON operational_asset_logs
    FOR INSERT WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_operational_assets_modtime
    BEFORE UPDATE ON operational_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
