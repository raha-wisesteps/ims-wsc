-- Add description column to crm_clients
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment for documentation
COMMENT ON COLUMN crm_clients.description IS 'Detailed description of the client/company, not shown in quick add form';
