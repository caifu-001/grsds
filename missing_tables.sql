-- ============================================================
-- grsds CRM 缺失表补建（一次性执行，幂等安全）
-- 在 Supabase SQL Editor 执行
-- 2026-06-17
-- ============================================================

-- 1. 回款/收款记录表
CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  contract_id BIGINT REFERENCES contracts(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_date DATE,
  method TEXT DEFAULT '银行转账',
  status TEXT DEFAULT '已收款',
  invoice_no TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pay_company ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_pay_client ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_pay_date ON payments(payment_date);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company access payments" ON payments;
CREATE POLICY "Company access payments" ON payments FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=payments.company_id)
);

-- 2. 销售目标表
CREATE TABLE IF NOT EXISTS sales_targets (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  target_year INTEGER NOT NULL,
  target_month INTEGER NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_year, target_month)
);
CREATE INDEX IF NOT EXISTS idx_st_company ON sales_targets(company_id);
CREATE INDEX IF NOT EXISTS idx_st_year_month ON sales_targets(target_year, target_month);

ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company access sales_targets" ON sales_targets;
CREATE POLICY "Company access sales_targets" ON sales_targets FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=sales_targets.company_id)
);

-- 3. 绩效记录表
CREATE TABLE IF NOT EXISTS performance_records (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID,
  record_year INTEGER NOT NULL,
  record_month INTEGER NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  source TEXT DEFAULT 'sales',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pr_company ON performance_records(company_id);
CREATE INDEX IF NOT EXISTS idx_pr_year_month ON performance_records(record_year, record_month);

ALTER TABLE performance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company access performance_records" ON performance_records;
CREATE POLICY "Company access performance_records" ON performance_records FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=performance_records.company_id)
);

-- 4. 提成规则表
CREATE TABLE IF NOT EXISTS commission_rules (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  max_amount NUMERIC(12,2) NOT NULL DEFAULT 99999999,
  rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cr_company ON commission_rules(company_id);

ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company access commission_rules" ON commission_rules;
CREATE POLICY "Company access commission_rules" ON commission_rules FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=commission_rules.company_id)
);

-- 5. 提成明细表
CREATE TABLE IF NOT EXISTS commission_details (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  rule_id BIGINT REFERENCES commission_rules(id) ON DELETE SET NULL,
  calc_year INTEGER NOT NULL,
  calc_month INTEGER NOT NULL,
  actual_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  target_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'calculated',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cd_company ON commission_details(company_id);
CREATE INDEX IF NOT EXISTS idx_cd_year_month ON commission_details(calc_year, calc_month);

ALTER TABLE commission_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company access commission_details" ON commission_details;
CREATE POLICY "Company access commission_details" ON commission_details FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=commission_details.company_id)
);

-- 6. 商品分类表
CREATE TABLE IF NOT EXISTS product_categories (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pc_company ON product_categories(company_id);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company access product_categories" ON product_categories;
CREATE POLICY "Company access product_categories" ON product_categories FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=product_categories.company_id)
);

-- 7. 盘点明细表
CREATE TABLE IF NOT EXISTS stock_check_items (
  id BIGSERIAL PRIMARY KEY,
  check_id BIGINT REFERENCES stock_checks(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  book_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  actual_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  remark TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sci_check ON stock_check_items(check_id);

ALTER TABLE stock_check_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company access stock_check_items" ON stock_check_items;
CREATE POLICY "Company access stock_check_items" ON stock_check_items FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND stock_check_items.check_id IN (SELECT id FROM stock_checks WHERE company_id=profiles.company_id))
);

-- 8. 用户自定义客户类型
CREATE TABLE IF NOT EXISTS user_custom_types (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  color TEXT DEFAULT '#4F6EF7',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_uct_user ON user_custom_types(user_id);

ALTER TABLE user_custom_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User access custom_types" ON user_custom_types;
CREATE POLICY "User access custom_types" ON user_custom_types FOR ALL USING (
  user_id = auth.uid()
);

-- ============================================================
-- DONE
-- ============================================================
NOTIFY pgrst, 'reload schema';
