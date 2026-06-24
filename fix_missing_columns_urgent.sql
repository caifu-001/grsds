-- ============================================================
-- 紧急修复：projects 表补列（add_opportunity_fields 未执行）
-- ============================================================
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
ALTER TABLE projects ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contacts_json JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS workflow JSONB DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 1;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS template_id INTEGER;

-- ============================================================
-- orders 表补列（saveOrder 需要的字段）
-- ============================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount_enc TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT '进行中';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS project_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS expected_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS actual_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- 索引
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_lead_id ON projects(lead_id);
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
