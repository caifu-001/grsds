-- Add missing lead_pool columns (2026-06-24 consolidated)
ALTER TABLE lead_pool ADD COLUMN IF NOT EXISTS lead_id TEXT;
ALTER TABLE lead_pool ADD COLUMN IF NOT EXISTS opportunity_id TEXT;
ALTER TABLE lead_pool ADD COLUMN IF NOT EXISTS customer_type TEXT;
ALTER TABLE lead_pool ADD COLUMN IF NOT EXISTS credit_code TEXT;
ALTER TABLE lead_pool ADD COLUMN IF NOT EXISTS assigned_sales TEXT;
ALTER TABLE lead_pool ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE lead_pool ADD COLUMN IF NOT EXISTS creator TEXT;
ALTER TABLE lead_pool ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE lead_pool ADD COLUMN IF NOT EXISTS project_name TEXT;
ALTER TABLE lead_pool ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
