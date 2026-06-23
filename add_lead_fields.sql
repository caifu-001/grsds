-- Add new lead fields (2026-06-24)
ALTER TABLE lead_pool ADD COLUMN IF NOT EXISTS lead_id TEXT;
ALTER TABLE lead_pool ADD COLUMN IF NOT EXISTS opportunity_id TEXT;
ALTER TABLE lead_pool ADD COLUMN IF NOT EXISTS customer_type TEXT;
ALTER TABLE lead_pool ADD COLUMN IF NOT EXISTS credit_code TEXT;
ALTER TABLE lead_pool ADD COLUMN IF NOT EXISTS assigned_sales TEXT;
ALTER TABLE lead_pool ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE lead_pool ADD COLUMN IF NOT EXISTS creator TEXT;

-- Note: created_at already exists as default column
-- Note: created_by already exists
-- Note: assigned_to / assigned_at already exist
