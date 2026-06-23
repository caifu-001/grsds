-- Add project_name column to lead_pool
-- Required for: 2026-06-23 lead form project_name field
ALTER TABLE lead_pool ADD COLUMN IF NOT EXISTS project_name TEXT;
