-- add_project_id_to_contracts_payments.sql
-- 合同和回款表增加 project_id 字段，实现项目关联

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- 可选：为已有数据创建索引提速
CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_project_id ON payments(project_id);
