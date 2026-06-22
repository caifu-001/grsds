-- ============================================================
-- 项目管理模块 - 完整建表 SQL
-- 需在 Supabase SQL Editor 中执行
-- ============================================================

-- 1. 项目主表
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id BIGINT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  budget DECIMAL(15,2) DEFAULT 0,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning','in_progress','completed','suspended')),
  start_date DATE,
  end_date DATE,
  manager_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 项目阶段 / 里程碑
CREATE TABLE IF NOT EXISTS project_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
  start_date DATE,
  end_date DATE,
  sort_order INT DEFAULT 0,
  assigned_to UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 招投标
CREATE TABLE IF NOT EXISTS project_biddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  bid_amount DECIMAL(15,2) DEFAULT 0,
  bid_deadline DATE,
  status TEXT DEFAULT 'preparing' CHECK (status IN ('preparing','submitted','won','lost')),
  materials_needed TEXT DEFAULT '[]',  -- JSONB array: [{name, quantity, type(seal/document/certificate)}]
  seal_requested BOOLEAN DEFAULT false,
  approval_id UUID,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 项目交付
CREATE TABLE IF NOT EXISTS project_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  delivery_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','delivered','accepted','rejected')),
  acceptance_criteria TEXT DEFAULT '',
  acceptance_file TEXT DEFAULT '',
  approval_id UUID,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 项目收款
CREATE TABLE IF NOT EXISTS project_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount DECIMAL(15,2) DEFAULT 0,
  payment_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','received','overdue')),
  payment_method TEXT DEFAULT '',
  invoice_no TEXT DEFAULT '',
  approval_id UUID,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS 策略（与现有 company_id 隔离模型一致）
-- ============================================================

-- projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_company_isolation" ON projects
  FOR ALL USING (company_id = (current_setting('request.jwt.claims', true)::json->>'company_id')::bigint);

-- project_stages (通过 project_id 关联 company_id)
ALTER TABLE project_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stages_project_isolation" ON project_stages
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE company_id = (current_setting('request.jwt.claims', true)::json->>'company_id')::bigint)
  );

-- project_biddings
ALTER TABLE project_biddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biddings_project_isolation" ON project_biddings
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE company_id = (current_setting('request.jwt.claims', true)::json->>'company_id')::bigint)
  );

-- project_deliveries
ALTER TABLE project_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deliveries_project_isolation" ON project_deliveries
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE company_id = (current_setting('request.jwt.claims', true)::json->>'company_id')::bigint)
  );

-- project_payments
ALTER TABLE project_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_project_isolation" ON project_payments
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE company_id = (current_setting('request.jwt.claims', true)::json->>'company_id')::bigint)
  );

-- ============================================================
-- 索引
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_stages_project ON project_stages(project_id);
CREATE INDEX IF NOT EXISTS idx_biddings_project ON project_biddings(project_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_project ON project_deliveries(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_project ON project_payments(project_id);
