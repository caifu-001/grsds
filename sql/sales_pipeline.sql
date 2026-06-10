-- sales_pipeline.sql
-- 销售全流程管理：线索/商机、跟进、报价、合同、回款
-- 执行: Supabase SQL Editor

-- ========== 1. 线索/商机管理 ==========
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                           -- 线索名称
  company_name TEXT DEFAULT '',                 -- 客户公司名
  contact_name TEXT DEFAULT '',                 -- 联系人
  contact_phone TEXT DEFAULT '',                -- 联系电话
  source TEXT DEFAULT '',                       -- 来源: 展会/转介绍/网络/陌拜/其他
  status TEXT DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','proposal','negotiation','won','lost')),
  estimated_value NUMERIC(14,2) DEFAULT 0,      -- 预估金额
  probability INTEGER DEFAULT 10 CHECK (probability>=0 AND probability<=100),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own company leads" ON leads;
CREATE POLICY "Users view own company leads" ON leads FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id=auth.uid()));
DROP POLICY IF EXISTS "Users insert leads" ON leads;
CREATE POLICY "Users insert leads" ON leads FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id=auth.uid()));
DROP POLICY IF EXISTS "Users update leads" ON leads;
CREATE POLICY "Users update leads" ON leads FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id=auth.uid()));
DROP POLICY IF EXISTS "Users delete leads" ON leads;
CREATE POLICY "Users delete leads" ON leads FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id=auth.uid()));

-- ========== 2. 销售跟进 ==========
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  follow_type TEXT DEFAULT 'call' CHECK (follow_type IN ('call','meeting','email','visit','wechat','other')),
  content TEXT DEFAULT '',
  result TEXT DEFAULT '',
  next_step TEXT DEFAULT '',
  next_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own company follow_ups" ON follow_ups;
CREATE POLICY "Users view own company follow_ups" ON follow_ups FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id=auth.uid()));
DROP POLICY IF EXISTS "Users insert follow_ups" ON follow_ups;
CREATE POLICY "Users insert follow_ups" ON follow_ups FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id=auth.uid()));
DROP POLICY IF EXISTS "Users update follow_ups" ON follow_ups;
CREATE POLICY "Users update follow_ups" ON follow_ups FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id=auth.uid()));
DROP POLICY IF EXISTS "Users delete follow_ups" ON follow_ups;
CREATE POLICY "Users delete follow_ups" ON follow_ups FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id=auth.uid()));

-- ========== 3. 报价管理 ==========
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  items JSONB DEFAULT '[]',                     -- [{name,spec,unit,qty,price,amount}]
  total_amount NUMERIC(14,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','expired')),
  valid_until DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own company quotations" ON quotations;
CREATE POLICY "Users view own company quotations" ON quotations FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id=auth.uid()));
DROP POLICY IF EXISTS "Users insert quotations" ON quotations;
CREATE POLICY "Users insert quotations" ON quotations FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id=auth.uid()));
DROP POLICY IF EXISTS "Users update quotations" ON quotations;
CREATE POLICY "Users update quotations" ON quotations FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id=auth.uid()));
DROP POLICY IF EXISTS "Users delete quotations" ON quotations;
CREATE POLICY "Users delete quotations" ON quotations FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id=auth.uid()));

-- ========== 4. 合同管理 ==========
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  contract_no TEXT DEFAULT '',
  title TEXT NOT NULL,
  total_amount NUMERIC(14,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','signed','executing','completed','terminated')),
  sign_date DATE,
  start_date DATE,
  end_date DATE,
  our_party TEXT DEFAULT '',                    -- 我方签约主体
  their_party TEXT DEFAULT '',                  -- 对方签约主体
  notes TEXT DEFAULT '',
  file_url TEXT DEFAULT '',                     -- 合同附件链接
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own company contracts" ON contracts;
CREATE POLICY "Users view own company contracts" ON contracts FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id=auth.uid()));
DROP POLICY IF EXISTS "Users insert contracts" ON contracts;
CREATE POLICY "Users insert contracts" ON contracts FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id=auth.uid()));
DROP POLICY IF EXISTS "Users update contracts" ON contracts;
CREATE POLICY "Users update contracts" ON contracts FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id=auth.uid()));
DROP POLICY IF EXISTS "Users delete contracts" ON contracts;
CREATE POLICY "Users delete contracts" ON contracts FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id=auth.uid()));

-- ========== 5. 回款/财务对账 ==========
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_date DATE,
  method TEXT DEFAULT 'bank' CHECK (method IN ('bank','cash','wechat','alipay','check','other')),
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned','received','overdue','cancelled')),
  invoice_no TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own company payments" ON payments;
CREATE POLICY "Users view own company payments" ON payments FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id=auth.uid()));
DROP POLICY IF EXISTS "Users insert payments" ON payments;
CREATE POLICY "Users insert payments" ON payments FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id=auth.uid()));
DROP POLICY IF EXISTS "Users update payments" ON payments;
CREATE POLICY "Users update payments" ON payments FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id=auth.uid()));
DROP POLICY IF EXISTS "Users delete payments" ON payments;
CREATE POLICY "Users delete payments" ON payments FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id=auth.uid()));

-- ========== 索引 ==========
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_lead ON follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_client ON follow_ups(client_id);
CREATE INDEX IF NOT EXISTS idx_quotations_client ON quotations(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_payments_contract ON payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Schema cache refresh
NOTIFY pgrst, 'reload schema';