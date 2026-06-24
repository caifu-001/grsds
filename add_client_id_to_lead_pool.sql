-- 线索表加 client_id 列：关联客户库
-- 请在 Supabase SQL Editor 中手动执行此脚本
ALTER TABLE lead_pool ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- 同时确认 project_name 列（若之前未执行）
ALTER TABLE lead_pool ADD COLUMN IF NOT EXISTS project_name TEXT;
