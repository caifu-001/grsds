-- ============================================
-- 销售管理增强 Phase 2: 报价 & 合同增强
-- 请在 Supabase SQL Editor 中执行
-- ============================================

-- 1. 增强 quotes 表：模板报价 + 折扣 + 税费
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

COMMENT ON COLUMN quotations.discount_rate IS '折扣率 0-100';
COMMENT ON COLUMN quotations.discount_amount IS '折扣金额';
COMMENT ON COLUMN quotations.subtotal IS '折扣前小计';
COMMENT ON COLUMN quotations.tax_rate IS '税率(%)';
COMMENT ON COLUMN quotations.tax_amount IS '税额';
COMMENT ON COLUMN quotations.valid_until IS '报价有效期';
COMMENT ON COLUMN quotations.converted_to_order_id IS '转换后的订单ID';

-- 2. 报价模板表
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

-- 3. 增强 contracts 表：付款追踪 + 归档 + 提醒
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS total_amount DECIMAL DEFAULT 0;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS paid_amount DECIMAL DEFAULT 0;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS unpaid_amount DECIMAL DEFAULT 0;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS next_reminder_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS archive_status TEXT DEFAULT 'active';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS quote_id BIGINT;

COMMENT ON COLUMN contracts.total_amount IS '合同总金额';
COMMENT ON COLUMN contracts.paid_amount IS '已回款金额';
COMMENT ON COLUMN contracts.unpaid_amount IS '未回款金额';
COMMENT ON COLUMN contracts.next_reminder_date IS '下次提醒日期';
COMMENT ON COLUMN contracts.archive_status IS '归档状态: active/archived/expired';
COMMENT ON COLUMN contracts.quote_id IS '关联报价ID';

-- 4. 初始化已存在合同的金额
UPDATE contracts SET total_amount = COALESCE(amount, 0) WHERE total_amount = 0 AND amount > 0;
UPDATE contracts SET unpaid_amount = total_amount - COALESCE(paid_amount, 0) WHERE unpaid_amount = 0;

-- 5. RLS 策略
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
