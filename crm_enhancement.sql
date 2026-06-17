-- ============================================================
-- CRM客户模块全面增强 (请在Supabase SQL Editor执行)
-- 1.客户档案 2.线索/公海池 3.联系人管理 4.客户生命周期
-- ============================================================

-- ── 1. 增强 clients 表 ──
ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS scale TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS credit_rating TEXT DEFAULT '未评级';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS grade TEXT DEFAULT 'C';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT '意向客户';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- ── 2. 增强 contacts 表 ──
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_decision_maker BOOLEAN DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS relationship_to TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS notes TEXT;

-- ── 3. 跟进记录表 ──
CREATE TABLE IF NOT EXISTS engagement_logs (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT '跟进' CHECK (type IN ('跟进','电话','邮件','会议','拜访','微信','其他')),
  content TEXT,
  outcome TEXT,
  next_step TEXT,
  next_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_el_client ON engagement_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_el_company ON engagement_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_el_created ON engagement_logs(created_at);

ALTER TABLE engagement_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company access engagement_logs" ON engagement_logs;
CREATE POLICY "Company access engagement_logs" ON engagement_logs FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=engagement_logs.company_id)
);

-- ── 4. 公海/线索池表 ──
CREATE TABLE IF NOT EXISTS lead_pool (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  source TEXT DEFAULT '手动录入',
  industry TEXT,
  scale TEXT,
  status TEXT NOT NULL DEFAULT '新线索' CHECK (status IN ('新线索','已分配','已转化','已废弃')),
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ,
  recycled_at TIMESTAMPTZ,
  recycle_count INTEGER DEFAULT 0,
  max_recycle_count INTEGER DEFAULT 3,
  recycle_days INTEGER DEFAULT 30,
  last_follow_up TIMESTAMPTZ,
  converted_client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  notes TEXT,
  tags JSONB DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lp_company ON lead_pool(company_id);
CREATE INDEX IF NOT EXISTS idx_lp_status ON lead_pool(status);
CREATE INDEX IF NOT EXISTS idx_lp_assigned ON lead_pool(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lp_created ON lead_pool(created_at);

ALTER TABLE lead_pool ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company access lead_pool" ON lead_pool;
CREATE POLICY "Company access lead_pool" ON lead_pool FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=lead_pool.company_id)
);

-- ── 5. 生命周期变更日志 ──
CREATE TABLE IF NOT EXISTS lifecycle_logs (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ll_client ON lifecycle_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_ll_company ON lifecycle_logs(company_id);

ALTER TABLE lifecycle_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company access lifecycle_logs" ON lifecycle_logs;
CREATE POLICY "Company access lifecycle_logs" ON lifecycle_logs FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=lifecycle_logs.company_id)
);

-- ── 6. 公海自动回收函数(可选定时调用) ──
CREATE OR REPLACE FUNCTION recycle_stale_leads()
RETURNS void AS $$
BEGIN
  UPDATE lead_pool
  SET status='新线索', assigned_to=NULL, assigned_at=NULL, recycled_at=NOW(), recycle_count=recycle_count+1
  WHERE status='已分配'
    AND assigned_at < NOW() - (recycle_days || ' days')::INTERVAL
    AND (last_follow_up IS NULL OR last_follow_up < NOW() - (recycle_days || ' days')::INTERVAL)
    AND recycle_count < max_recycle_count;
END;
$$ LANGUAGE plpgsql;

-- ── 7. 补充 orders 缺列 (如之前未执行 fix_orders_columns.sql) ──
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2);
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
