-- ============================================
-- 销售管理增强 Phase 1: 商机/机会管理
-- 请在 Supabase SQL Editor 中执行
-- ============================================

-- 1. 增强 leads 表：添加商机管理新字段
ALTER TABLE leads ADD COLUMN IF NOT EXISTS win_probability INT DEFAULT 50 CHECK (win_probability >= 0 AND win_probability <= 100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS expected_close_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS competitors JSONB DEFAULT '[]';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_ups JSONB DEFAULT '[]';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS frozen BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS frozen_by UUID;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_name TEXT DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_phone TEXT DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

COMMENT ON COLUMN leads.win_probability IS '赢单概率 0-100';
COMMENT ON COLUMN leads.competitors IS '竞品记录 [{name,strength,weakness,note}]';
COMMENT ON COLUMN leads.follow_ups IS '跟进计划 [{type,date,content,next_step,completed}]';
COMMENT ON COLUMN leads.frozen IS '是否冻结';

-- 2. 销售阶段配置表（支持自定义）
CREATE TABLE IF NOT EXISTS sales_stages (
  id BIGSERIAL PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  probability INT DEFAULT 0,
  color TEXT DEFAULT '#4F6EF7',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- 3. 竞品信息表
CREATE TABLE IF NOT EXISTS competitor_info (
  id BIGSERIAL PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website TEXT DEFAULT '',
  strengths JSONB DEFAULT '[]',
  weaknesses JSONB DEFAULT '[]',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 插入默认销售阶段（供现有数据使用）
INSERT INTO sales_stages (company_id, name, sort_order, probability, color)
SELECT id, '初步沟通', 1, 20, '#1565C0'
FROM companies ON CONFLICT DO NOTHING;

INSERT INTO sales_stages (company_id, name, sort_order, probability, color)
SELECT id, '需求方案', 2, 40, '#E65100'
FROM companies ON CONFLICT DO NOTHING;

INSERT INTO sales_stages (company_id, name, sort_order, probability, color)
SELECT id, '报价阶段', 3, 60, '#6B21A8'
FROM companies ON CONFLICT DO NOTHING;

INSERT INTO sales_stages (company_id, name, sort_order, probability, color)
SELECT id, '商务谈判', 4, 80, '#92400E'
FROM companies ON CONFLICT DO NOTHING;

INSERT INTO sales_stages (company_id, name, sort_order, probability, color)
SELECT id, '签约成交', 5, 100, '#166534'
FROM companies ON CONFLICT DO NOTHING;

-- 5. RLS 策略
ALTER TABLE sales_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_stages_select" ON sales_stages;
CREATE POLICY "sales_stages_select" ON sales_stages FOR SELECT USING (
  company_id = (current_setting('request.jwt.claims', true)::jsonb->>'company_id')::UUID
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "sales_stages_insert" ON sales_stages;
CREATE POLICY "sales_stages_insert" ON sales_stages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "sales_stages_update" ON sales_stages;
CREATE POLICY "sales_stages_update" ON sales_stages FOR UPDATE USING (
  company_id = (current_setting('request.jwt.claims', true)::jsonb->>'company_id')::UUID
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "sales_stages_delete" ON sales_stages;
CREATE POLICY "sales_stages_delete" ON sales_stages FOR DELETE USING (
  company_id = (current_setting('request.jwt.claims', true)::jsonb->>'company_id')::UUID
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "competitor_info_select" ON competitor_info;
CREATE POLICY "competitor_info_select" ON competitor_info FOR SELECT USING (
  company_id = (current_setting('request.jwt.claims', true)::jsonb->>'company_id')::UUID
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "competitor_info_all" ON competitor_info;
CREATE POLICY "competitor_info_all" ON competitor_info FOR ALL USING (
  company_id = (current_setting('request.jwt.claims', true)::jsonb->>'company_id')::UUID
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'super_admin')
);
