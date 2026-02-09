ALTER TABLE crm_opportunities 
ADD COLUMN opportunity_type text CHECK (opportunity_type IN ('customer_based', 'product_based'));

COMMENT ON COLUMN crm_opportunities.opportunity_type IS 'Type of opportunity: customer_based or product_based';
