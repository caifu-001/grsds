-- 🚨 删掉旧的 projects 及相关表，重建
DROP TABLE IF EXISTS project_contracts CASCADE;
DROP TABLE IF EXISTS project_payments CASCADE;
DROP TABLE IF EXISTS project_deliveries CASCADE;
DROP TABLE IF EXISTS project_biddings CASCADE;
DROP TABLE IF EXISTS project_stages CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- 重新创建（与 run_me_now.sql 完全一致）
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id INTEGER NOT NULL,
  client_id UUID,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  budget DECIMAL(15,2) DEFAULT 0,
  status TEXT DEFAULT 'planning',
  start_date DATE,
  end_date DATE,
  manager_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_projects_company ON projects(company_id);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company access projects" ON projects FOR ALL
  USING (EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=projects.company_id));

CREATE TABLE project_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  start_date DATE,
  end_date DATE,
  sort_order INT DEFAULT 0,
  assigned_to UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_stages_project ON project_stages(project_id);
ALTER TABLE project_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stages_via_project" ON project_stages FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=projects.company_id)));

CREATE TABLE project_biddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  bid_amount DECIMAL(15,2) DEFAULT 0,
  bid_deadline DATE,
  status TEXT DEFAULT 'preparing',
  materials_needed TEXT DEFAULT '[]',
  seal_requested BOOLEAN DEFAULT false,
  approval_id UUID,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_biddings_project ON project_biddings(project_id);
ALTER TABLE project_biddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biddings_via_project" ON project_biddings FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=projects.company_id)));

CREATE TABLE project_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  delivery_date DATE,
  status TEXT DEFAULT 'pending',
  acceptance_criteria TEXT DEFAULT '',
  acceptance_file TEXT DEFAULT '',
  approval_id UUID,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_deliveries_project ON project_deliveries(project_id);
ALTER TABLE project_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deliveries_via_project" ON project_deliveries FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=projects.company_id)));

CREATE TABLE project_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount DECIMAL(15,2) DEFAULT 0,
  payment_date DATE,
  status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT '',
  invoice_no TEXT DEFAULT '',
  approval_id UUID,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_prpay_project ON project_payments(project_id);
ALTER TABLE project_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prpayments_via_project" ON project_payments FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=projects.company_id)));

CREATE TABLE project_contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id INTEGER NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  bid_id UUID,
  title TEXT NOT NULL,
  contract_no TEXT DEFAULT '',
  amount DECIMAL(15,2) DEFAULT 0,
  our_party TEXT DEFAULT '',
  their_party TEXT DEFAULT '',
  sign_date DATE,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'draft',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_pcontracts_project ON project_contracts(project_id);
ALTER TABLE project_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company access project_contracts" ON project_contracts FOR ALL
  USING (EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=project_contracts.company_id));

NOTIFY pgrst, 'reload schema';
