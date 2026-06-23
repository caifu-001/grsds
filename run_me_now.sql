-- ============================================================
-- 🚨 一次性执行：关键缺失表（幂等，可重复跑）
-- 在 Supabase → SQL Editor 粘贴，点 Run
-- ============================================================

-- 【1】线索表补齐 project_name + client_id 列
ALTER TABLE lead_pool ADD COLUMN IF NOT EXISTS project_name TEXT;
ALTER TABLE lead_pool ADD COLUMN IF NOT EXISTS client_id UUID;

-- 【2】操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER,
  user_id UUID,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ol_company ON operation_logs(company_id);
ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company access operation_logs" ON operation_logs;
CREATE POLICY "Company access operation_logs" ON operation_logs FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=operation_logs.company_id)
);

-- 【3】fix_client_id_uuid — service_tickets.client_id BIGINT → UUID
ALTER TABLE service_tickets ALTER COLUMN client_id TYPE UUID USING client_id::text::UUID;

-- 【4】项目管理模块（6张表）
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id INTEGER NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projects_company_isolation" ON projects;
CREATE POLICY "projects_company_isolation" ON projects
  FOR ALL USING (company_id = (current_setting('request.jwt.claims', true)::json->>'company_id')::integer);

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
CREATE INDEX IF NOT EXISTS idx_stages_project ON project_stages(project_id);
ALTER TABLE project_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stages_project_isolation" ON project_stages;
CREATE POLICY "stages_project_isolation" ON project_stages
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE company_id = (current_setting('request.jwt.claims', true)::json->>'company_id')::integer)
  );

CREATE TABLE IF NOT EXISTS project_biddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  bid_amount DECIMAL(15,2) DEFAULT 0,
  bid_deadline DATE,
  status TEXT DEFAULT 'preparing' CHECK (status IN ('preparing','submitted','won','lost')),
  materials_needed TEXT DEFAULT '[]',
  seal_requested BOOLEAN DEFAULT false,
  approval_id UUID,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_biddings_project ON project_biddings(project_id);
ALTER TABLE project_biddings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "biddings_project_isolation" ON project_biddings;
CREATE POLICY "biddings_project_isolation" ON project_biddings
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE company_id = (current_setting('request.jwt.claims', true)::json->>'company_id')::integer)
  );

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
CREATE INDEX IF NOT EXISTS idx_deliveries_project ON project_deliveries(project_id);
ALTER TABLE project_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deliveries_project_isolation" ON project_deliveries;
CREATE POLICY "deliveries_project_isolation" ON project_deliveries
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE company_id = (current_setting('request.jwt.claims', true)::json->>'company_id')::integer)
  );

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
CREATE INDEX IF NOT EXISTS idx_payments_project ON project_payments(project_id);
ALTER TABLE project_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_project_isolation" ON project_payments;
CREATE POLICY "payments_project_isolation" ON project_payments
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE company_id = (current_setting('request.jwt.claims', true)::json->>'company_id')::integer)
  );

CREATE TABLE IF NOT EXISTS project_contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id INTEGER NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  bid_id UUID REFERENCES project_biddings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  contract_no TEXT DEFAULT '',
  amount DECIMAL(15,2) DEFAULT 0,
  our_party TEXT DEFAULT '',
  their_party TEXT DEFAULT '',
  sign_date DATE,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','signed','executing','completed','terminated')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pcontracts_project ON project_contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_pcontracts_bid ON project_contracts(bid_id);
CREATE INDEX IF NOT EXISTS idx_pcontracts_company ON project_contracts(company_id);
ALTER TABLE project_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pcontracts_company_isolation" ON project_contracts;
CREATE POLICY "pcontracts_company_isolation" ON project_contracts
  FOR ALL USING (company_id = (current_setting('request.jwt.claims', true)::json->>'company_id')::integer);

-- 【5】邀请表
CREATE TABLE IF NOT EXISTS invitations (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  token TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','cancelled')),
  invited_by UUID,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_inv_company ON invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_inv_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_inv_token ON invitations(token);
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company access invitations" ON invitations;
CREATE POLICY "Company access invitations" ON invitations FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=invitations.company_id)
);

-- ============================================================
-- DONE
-- ============================================================
NOTIFY pgrst, 'reload schema';
