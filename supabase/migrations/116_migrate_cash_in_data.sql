-- Migrate existing cash_in data to crm_revenue table
-- Only migrate where cash_in > 0 and no revenue record exists for that opportunity
-- This prevents duplicate migration if run multiple times

INSERT INTO crm_revenue (opportunity_id, amount, payment_date, notes, created_by, created_at)
SELECT 
    id, 
    cash_in, 
    COALESCE(created_at, NOW()), -- Use creation date as default payment date for migrated legacy data
    'Legacy Data Migration', 
    created_by,
    COALESCE(created_at, NOW())
FROM crm_opportunities 
WHERE cash_in > 0 
AND NOT EXISTS (
    SELECT 1 FROM crm_revenue WHERE opportunity_id = crm_opportunities.id
);
