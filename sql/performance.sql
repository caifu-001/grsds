-- ============================================================
-- 绩效管理 SQL (请在 Supabase SQL Editor 中执行)
-- 模块：销售目标 / 业绩计算 / 提成规则 / 提成明细
-- ============================================================

-- 1. 销售目标表
CREATE TABLE IF NOT EXISTS sales_targets (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_year INTEGER NOT NULL,
  target_month INTEGER NOT NULL CHECK(target_month BETWEEN 1 AND 12),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  assigned_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, user_id, target_year, target_month)
);

-- 2. 提成规则表
CREATE TABLE IF NOT EXISTS commission_rules (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  max_amount NUMERIC(12,2) NOT NULL DEFAULT 99999999,
  rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- 3. 业绩记录表
CREATE TABLE IF NOT EXISTS performance_records (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  record_year INTEGER NOT NULL,
  record_month INTEGER NOT NULL CHECK(record_month BETWEEN 1 AND 12),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 提成明细表
CREATE TABLE IF NOT EXISTS commission_details (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id BIGINT REFERENCES sales_targets(id) ON DELETE SET NULL,
  calc_year INTEGER NOT NULL,
  calc_month INTEGER NOT NULL CHECK(calc_month BETWEEN 1 AND 12),
  actual_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  target_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  target_completion_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending','confirmed','paid')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, user_id, calc_year, calc_month)
);

-- 5. 索引
CREATE INDEX IF NOT EXISTS idx_st_company ON sales_targets(company_id);
CREATE INDEX IF NOT EXISTS idx_st_user ON sales_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_st_period ON sales_targets(target_year, target_month);
CREATE INDEX IF NOT EXISTS idx_pr_company ON performance_records(company_id);
CREATE INDEX IF NOT EXISTS idx_pr_user ON performance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_pr_period ON performance_records(record_year, record_month);
CREATE INDEX IF NOT EXISTS idx_cd_company ON commission_details(company_id);
CREATE INDEX IF NOT EXISTS idx_cd_user ON commission_details(user_id);
CREATE INDEX IF NOT EXISTS idx_cd_period ON commission_details(calc_year, calc_month);

-- 6. RLS
ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_details ENABLE ROW LEVEL SECURITY;

-- Sales targets
DROP POLICY IF EXISTS "Company members view targets" ON sales_targets;
CREATE POLICY "Company members view targets" ON sales_targets FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=sales_targets.company_id)
);
DROP POLICY IF EXISTS "Admins manage targets" ON sales_targets;
CREATE POLICY "Admins manage targets" ON sales_targets FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=sales_targets.company_id AND role IN('admin','super_admin'))
);

-- Commission rules
DROP POLICY IF EXISTS "Company members view rules" ON commission_rules;
CREATE POLICY "Company members view rules" ON commission_rules FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=commission_rules.company_id)
);
DROP POLICY IF EXISTS "Admins manage rules" ON commission_rules;
CREATE POLICY "Admins manage rules" ON commission_rules FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=commission_rules.company_id AND role IN('admin','super_admin'))
);

-- Performance records
DROP POLICY IF EXISTS "Company members view records" ON performance_records;
CREATE POLICY "Company members view records" ON performance_records FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=performance_records.company_id)
);
DROP POLICY IF EXISTS "Users own insert records" ON performance_records;
CREATE POLICY "Users own insert records" ON performance_records FOR INSERT WITH CHECK (
  auth.uid()=user_id AND EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=performance_records.company_id)
);
DROP POLICY IF EXISTS "Admins manage records" ON performance_records;
CREATE POLICY "Admins manage records" ON performance_records FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=performance_records.company_id AND role IN('admin','super_admin'))
);

-- Commission details
DROP POLICY IF EXISTS "Company members view details" ON commission_details;
CREATE POLICY "Company members view details" ON commission_details FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=commission_details.company_id)
);
DROP POLICY IF EXISTS "Admins manage details" ON commission_details;
CREATE POLICY "Admins manage details" ON commission_details FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=commission_details.company_id AND role IN('admin','super_admin'))
);

NOTIFY pgrst, 'reload schema';
