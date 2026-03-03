-- =============================================
-- Fix 1: Update generate_asset_code() function
-- Bug: regex '\d+' extracts wrong number from code format PREFIX-SEQ-YY
-- Bug: 'others' category used prefix 'Z', should be 'X'
-- =============================================

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
        WHEN 'others' THEN prefix := 'X';
        ELSE prefix := 'X';
    END CASE;

    -- Get last 2 digits of acquisition year
    year_suffix := TO_CHAR(NEW.acquisition_date, 'YY');

    -- Calculate sequence number for this category
    -- Fix: Use regex that captures only the sequence portion from PREFIX-SEQ-YY format
    -- e.g. from 'F-001-25' captures '001', not '25'
    SELECT COALESCE(MAX(SUBSTRING(code FROM '[A-Z]-(\d+)-')::INT), 0) + 1
    INTO seq
    FROM operational_assets
    WHERE category = NEW.category;

    -- Format: PREFIX-SEQ-YY (e.g., F-001-25)
    new_code := prefix || '-' || LPAD(seq::TEXT, 3, '0') || '-' || year_suffix;
    
    NEW.code := new_code;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Fix 2: Update existing 'others' assets codes from Z- to X-
-- =============================================
UPDATE operational_assets
SET code = 'X' || SUBSTRING(code FROM 2)
WHERE category = 'others' AND code LIKE 'Z-%';

-- =============================================
-- Fix 3: Update RLS policies to include is_office_manager flag
-- =============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Enable insert for authorized roles" ON operational_assets;
DROP POLICY IF EXISTS "Enable update for admins and owners" ON operational_assets;
DROP POLICY IF EXISTS "Enable delete for admins and owners" ON operational_assets;

-- Recreate INSERT policy with is_office_manager
CREATE POLICY "Enable insert for authorized roles" ON operational_assets
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND (
                role IN ('super_admin', 'ceo', 'hr')
                OR is_office_manager = true
            )
        )
    );

-- Recreate UPDATE policy with is_office_manager
CREATE POLICY "Enable update for admins and owners" ON operational_assets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND (
                role IN ('super_admin', 'ceo', 'hr')
                OR is_office_manager = true
            )
        )
        OR 
        (created_by = auth.uid())
    );

-- Recreate DELETE policy with is_office_manager
CREATE POLICY "Enable delete for admins and owners" ON operational_assets
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND (
                role IN ('super_admin', 'ceo', 'hr')
                OR is_office_manager = true
            )
        )
        OR 
        (created_by = auth.uid())
    );
