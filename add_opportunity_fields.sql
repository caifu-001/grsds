-- Add opportunity (project) fields per spec (2026-06-24)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS bus_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS lead_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS customer_type TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS credit_code TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contact_title TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS assigned_sales TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS co_sales TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS conclusion TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes TEXT;

-- Note: name, industry, budget, status, company_id, created_by, created_at, updated_at already exist
