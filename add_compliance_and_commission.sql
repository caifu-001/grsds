-- 供应商：新增合规要求字段
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS compliance_requirements TEXT;

-- 产品：新增佣金比例字段
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0;
