-- ============================================================
-- grsds CRM 数据库全面升级（一次性执行，幂等安全）
-- 在 Supabase SQL Editor 中粘贴全文执行即可
-- 2026-06-17 合并版
-- ============================================================

-- ============================================================
-- PART 1: profiles 表 email 列
-- ============================================================
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.user_id = au.id AND p.email IS NULL;

-- ============================================================
-- PART 2: clients 多项目支持
-- ============================================================
ALTER TABLE IF EXISTS public.clients ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]';

UPDATE public.clients
SET projects = jsonb_build_array(jsonb_build_object(
  'project_name', COALESCE(project, ''),
  'bidding_date', bidding_date,
  'bidder_name', '',
  'bidder_phone', '',
  'bidder_company', '',
  'bid_amount', ''
))
WHERE project IS NOT NULL AND project != '' AND (projects IS NULL OR projects = '[]'::jsonb);

-- ============================================================
-- PART 3: orders 表修复（缺列补建）
-- ============================================================
DO $$
DECLARE
  cols TEXT[];
BEGIN
  SELECT array_agg(column_name::text) INTO cols FROM information_schema.columns WHERE table_name='orders' AND table_schema='public';
  RAISE NOTICE 'orders 现有列: %', cols;
END $$;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT '进行中';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS company_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_stage ON orders(stage);

-- ============================================================
-- PART 4: clients 表全面增强（客户360字段）
-- ============================================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS scale TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS credit_rating TEXT DEFAULT '未评级';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS grade TEXT DEFAULT 'C';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT 'prospect';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- ============================================================
-- PART 5: contacts 表增强
-- ============================================================
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_decision_maker BOOLEAN DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS relationship_to TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================
-- PART 6: 跟进记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS engagement_logs (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
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

-- ============================================================
-- PART 7: 线索池表（替代旧 leads 表）
-- ============================================================
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
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','assigned','contacted','converted','recycled','junk')),
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ,
  recycled_at TIMESTAMPTZ,
  recycle_count INTEGER DEFAULT 0,
  max_recycle_count INTEGER DEFAULT 3,
  recycle_days INTEGER DEFAULT 30,
  last_follow_up TIMESTAMPTZ,
  win_probability INTEGER DEFAULT 50 CHECK (win_probability >= 0 AND win_probability <= 100),
  expected_close_date DATE,
  competitors JSONB DEFAULT '[]',
  follow_ups JSONB DEFAULT '[]',
  converted_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
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

-- ============================================================
-- PART 8: 生命周期变更日志
-- ============================================================
CREATE TABLE IF NOT EXISTS lifecycle_logs (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
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

-- ============================================================
-- PART 9: 公海自动回收函数
-- ============================================================
CREATE OR REPLACE FUNCTION recycle_stale_leads()
RETURNS void AS $$
BEGIN
  UPDATE lead_pool
  SET status='recycled', assigned_to=NULL, assigned_at=NULL, recycled_at=NOW(), recycle_count=recycle_count+1
  WHERE status='assigned'
    AND assigned_at < NOW() - (recycle_days || ' days')::INTERVAL
    AND (last_follow_up IS NULL OR last_follow_up < NOW() - (recycle_days || ' days')::INTERVAL)
    AND recycle_count < max_recycle_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PART 10: 销售阶段配置表 + 竞品信息表
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_stages (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  probability INT DEFAULT 0,
  color TEXT DEFAULT '#4F6EF7',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

CREATE TABLE IF NOT EXISTS competitor_info (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website TEXT DEFAULT '',
  strengths JSONB DEFAULT '[]',
  weaknesses JSONB DEFAULT '[]',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入默认销售阶段
INSERT INTO sales_stages (company_id, name, sort_order, probability, color)
SELECT id, '初步沟通', 1, 20, '#1565C0' FROM companies ON CONFLICT DO NOTHING;
INSERT INTO sales_stages (company_id, name, sort_order, probability, color)
SELECT id, '需求方案', 2, 40, '#E65100' FROM companies ON CONFLICT DO NOTHING;
INSERT INTO sales_stages (company_id, name, sort_order, probability, color)
SELECT id, '报价阶段', 3, 60, '#6B21A8' FROM companies ON CONFLICT DO NOTHING;
INSERT INTO sales_stages (company_id, name, sort_order, probability, color)
SELECT id, '商务谈判', 4, 80, '#92400E' FROM companies ON CONFLICT DO NOTHING;
INSERT INTO sales_stages (company_id, name, sort_order, probability, color)
SELECT id, '签约成交', 5, 100, '#166534' FROM companies ON CONFLICT DO NOTHING;

ALTER TABLE sales_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_stages_select" ON sales_stages;
CREATE POLICY "sales_stages_select" ON sales_stages FOR SELECT USING (
  company_id = (current_setting('request.jwt.claims', true)::jsonb->>'company_id')::BIGINT
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'super_admin')
);
DROP POLICY IF EXISTS "sales_stages_insert" ON sales_stages;
CREATE POLICY "sales_stages_insert" ON sales_stages FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "sales_stages_update" ON sales_stages;
CREATE POLICY "sales_stages_update" ON sales_stages FOR UPDATE USING (
  company_id = (current_setting('request.jwt.claims', true)::jsonb->>'company_id')::BIGINT
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'super_admin')
);
DROP POLICY IF EXISTS "sales_stages_delete" ON sales_stages;
CREATE POLICY "sales_stages_delete" ON sales_stages FOR DELETE USING (
  company_id = (current_setting('request.jwt.claims', true)::jsonb->>'company_id')::BIGINT
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "competitor_info_select" ON competitor_info;
CREATE POLICY "competitor_info_select" ON competitor_info FOR SELECT USING (
  company_id = (current_setting('request.jwt.claims', true)::jsonb->>'company_id')::BIGINT
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'super_admin')
);
DROP POLICY IF EXISTS "competitor_info_all" ON competitor_info;
CREATE POLICY "competitor_info_all" ON competitor_info FOR ALL USING (
  company_id = (current_setting('request.jwt.claims', true)::jsonb->>'company_id')::BIGINT
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- ============================================================
-- PART 11: 报价 & 合同增强
-- ============================================================
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS discount_rate DECIMAL DEFAULT 0 CHECK (discount_rate >= 0 AND discount_rate <= 100);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS discount_amount DECIMAL DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS subtotal DECIMAL DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tax_rate DECIMAL DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tax_amount DECIMAL DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS valid_until DATE;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS template_name TEXT DEFAULT '';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS converted_to_order_id BIGINT;
ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotations ADD CONSTRAINT quotes_status_check CHECK (status IN ('draft','sent','approved','rejected','expired','converted'));

CREATE TABLE IF NOT EXISTS quote_templates (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  items JSONB DEFAULT '[]',
  discount_rate DECIMAL DEFAULT 0,
  tax_rate DECIMAL DEFAULT 0,
  terms TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS total_amount DECIMAL DEFAULT 0;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS paid_amount DECIMAL DEFAULT 0;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS unpaid_amount DECIMAL DEFAULT 0;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS next_reminder_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS archive_status TEXT DEFAULT 'active';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS quote_id BIGINT;

UPDATE contracts SET unpaid_amount = total_amount - COALESCE(paid_amount, 0) WHERE unpaid_amount = 0;

ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quote_templates_select" ON quote_templates;
CREATE POLICY "quote_templates_select" ON quote_templates FOR SELECT USING (
  company_id = (current_setting('request.jwt.claims', true)::jsonb->>'company_id')::BIGINT
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'super_admin')
);
DROP POLICY IF EXISTS "quote_templates_all" ON quote_templates;
CREATE POLICY "quote_templates_all" ON quote_templates FOR ALL USING (
  company_id = (current_setting('request.jwt.claims', true)::jsonb->>'company_id')::BIGINT
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- ============================================================
-- PART 12: 通知系统 + 活动日志
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT,
  user_id UUID,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  link TEXT DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT,
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id BIGINT,
  entity_name TEXT DEFAULT '',
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notif_select_company') THEN
    CREATE POLICY notif_select_company ON public.notifications FOR SELECT USING (company_id = current_setting('request.header.x-company-id', true)::bigint OR user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notif_update_company') THEN
    CREATE POLICY notif_update_company ON public.notifications FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notif_insert_auth') THEN
    CREATE POLICY notif_insert_auth ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='activity_logs' AND policyname='actlog_select_company') THEN
    CREATE POLICY actlog_select_company ON public.activity_logs FOR SELECT USING (company_id = current_setting('request.header.x-company-id', true)::bigint OR user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='activity_logs' AND policyname='actlog_insert_auth') THEN
    CREATE POLICY actlog_insert_auth ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON public.notifications(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_company ON public.activity_logs(company_id, created_at DESC);

-- ============================================================
-- PART 13: 管理员修改员工信息 RLS 修复
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admins can update all profiles'
  ) THEN
    DROP POLICY "Admins can update all profiles" ON public.profiles;
  END IF;
END $$;

CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (true);

-- ============================================================
-- DONE: 刷新 PostgREST 缓存
-- ============================================================
NOTIFY pgrst, 'reload schema';
