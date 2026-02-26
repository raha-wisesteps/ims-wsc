-- Add is_cash_in_verified column to crm_opportunities
ALTER TABLE "public"."crm_opportunities" 
ADD COLUMN "is_cash_in_verified" boolean NOT NULL DEFAULT false;
