-- admin_enhance_v2.sql — 权限、组织、系统配置、数据安全模块
-- 执行前确认已存在: companies, departments, profiles, roles

-- ============================================================
-- 1. OPERATION LOGS (操作日志)
-- ============================================================
CREATE TABLE IF NOT EXISTS operation_logs (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT NOT NULL,          -- 'create'/'update'/'delete'/'export'/'login'
  entity_type TEXT NOT NULL,     -- 'client'/'contact'/'order'/'contract'/'product'...
  entity_id TEXT,                -- 目标记录ID
  entity_name TEXT,              -- 目标记录名称（快照）
  detail TEXT,                   -- 变更详情 JSON
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_opl_company ON operation_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_opl_action ON operation_logs(action);
CREATE INDEX IF NOT EXISTS idx_opl_entity ON operation_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_opl_created ON operation_logs(created_at DESC);

-- RLS: 超管全部可见; 普通用户仅见本公司
ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS op_logs_policy ON operation_logs;
CREATE POLICY op_logs_policy ON operation_logs FOR ALL USING (
  (SELECT is_super_admin(auth.uid())) = TRUE
  OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
);

-- ============================================================
-- 2. CUSTOM FIELD DEFINITIONS (自定义字段)
-- ============================================================
CREATE TABLE IF NOT EXISTS custom_field_defs (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'client',  -- client/order/contact/product...
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,                   -- 「项目预算」
  field_type TEXT NOT NULL DEFAULT 'text',     -- text/number/date/select/multi_select/textarea
  options JSONB DEFAULT '[]',                  -- 下拉选项: ["A","B"]
  required BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cfd_company ON custom_field_defs(company_id);

ALTER TABLE custom_field_defs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cfd_policy ON custom_field_defs;
CREATE POLICY cfd_policy ON custom_field_defs FOR ALL USING (
  (SELECT is_super_admin(auth.uid())) = TRUE
  OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
);

-- ============================================================
-- 3. CUSTOM FORMS (自定义表单)
-- ============================================================
CREATE TABLE IF NOT EXISTS custom_forms (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL,
  form_name TEXT NOT NULL,        -- 表单名称
  entity_type TEXT NOT NULL,     -- client/order/lead...
  fields JSONB NOT NULL DEFAULT '[]', -- [{field_id,label,required,position}]
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cform_company ON custom_forms(company_id);

ALTER TABLE custom_forms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cform_policy ON custom_forms;
CREATE POLICY cform_policy ON custom_forms FOR ALL USING (
  (SELECT is_super_admin(auth.uid())) = TRUE
  OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
);

-- ============================================================
-- 4. CUSTOM SALES STAGES (自定义销售阶段)
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_stages_def (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL,
  stage_name TEXT NOT NULL,       -- 「方案演示」
  stage_key TEXT NOT NULL,        -- 'demo'
  color TEXT DEFAULT '#4F6EF7',
  sort_order INT DEFAULT 0,
  probability INT DEFAULT 50,     -- 成交概率%
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ssd_company ON sales_stages_def(company_id);

ALTER TABLE sales_stages_def ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ssd_policy ON sales_stages_def;
CREATE POLICY ssd_policy ON sales_stages_def FOR ALL USING (
  (SELECT is_super_admin(auth.uid())) = TRUE
  OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
);

-- 插入默认阶段（如果不存在）
INSERT INTO sales_stages_def (company_id, stage_name, stage_key, color, sort_order, probability, is_default)
SELECT id, '初步接触', 'contact', '#6b7280', 1, 10, TRUE FROM companies
WHERE NOT EXISTS (SELECT 1 FROM sales_stages_def WHERE stage_key='contact' AND company_id=companies.id);
INSERT INTO sales_stages_def (company_id, stage_name, stage_key, color, sort_order, probability, is_default)
SELECT id, '需求分析', 'analysis', '#3b82f6', 2, 25, TRUE FROM companies
WHERE NOT EXISTS (SELECT 1 FROM sales_stages_def WHERE stage_key='analysis' AND company_id=companies.id);
INSERT INTO sales_stages_def (company_id, stage_name, stage_key, color, sort_order, probability, is_default)
SELECT id, '方案报价', 'proposal', '#8b5cf6', 3, 50, TRUE FROM companies
WHERE NOT EXISTS (SELECT 1 FROM sales_stages_def WHERE stage_key='proposal' AND company_id=companies.id);
INSERT INTO sales_stages_def (company_id, stage_name, stage_key, color, sort_order, probability, is_default)
SELECT id, '谈判磋商', 'negotiation', '#f59e0b', 4, 75, TRUE FROM companies
WHERE NOT EXISTS (SELECT 1 FROM sales_stages_def WHERE stage_key='negotiation' AND company_id=companies.id);
INSERT INTO sales_stages_def (company_id, stage_name, stage_key, color, sort_order, probability, is_default)
SELECT id, '赢单/输单', 'closed', '#10b981', 5, 100, TRUE FROM companies
WHERE NOT EXISTS (SELECT 1 FROM sales_stages_def WHERE stage_key='closed' AND company_id=companies.id);

-- ============================================================
-- 5. CUSTOM TAGS (自定义标签)
-- ============================================================
CREATE TABLE IF NOT EXISTS custom_tags (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL,
  tag_name TEXT NOT NULL,
  tag_color TEXT DEFAULT '#4F6EF7',
  entity_type TEXT DEFAULT 'client',  -- client/order/lead
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ctag_company ON custom_tags(company_id);

ALTER TABLE custom_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ctag_policy ON custom_tags;
CREATE POLICY ctag_policy ON custom_tags FOR ALL USING (
  (SELECT is_super_admin(auth.uid())) = TRUE
  OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
);

-- ============================================================
-- 6. NUMBERING RULES (编号规则)
-- ============================================================
CREATE TABLE IF NOT EXISTS numbering_rules (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL,
  entity_type TEXT NOT NULL,      -- client/order/quotation/contract
  prefix TEXT DEFAULT '',         -- 「KH」→ KH-20240101-001
  date_format TEXT DEFAULT 'YYYYMMDD',
  seq_length INT DEFAULT 3,       -- 序号位数
  current_seq BIGINT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nr_company ON numbering_rules(company_id);

ALTER TABLE numbering_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nr_policy ON numbering_rules;
CREATE POLICY nr_policy ON numbering_rules FOR ALL USING (
  (SELECT is_super_admin(auth.uid())) = TRUE
  OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
);

-- ============================================================
-- 7. EXTEND profiles (员工状态 + 数据权限)
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';  -- active/inactive
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS data_scope TEXT DEFAULT 'all'; -- own/dept/all
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS func_perms JSONB DEFAULT '{}'; -- {delete_contract:false,modify_price:false}
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS field_perms JSONB DEFAULT '{}'; -- {hide_mobile:false,hide_price:false}

-- ============================================================
-- 8. EXTEND roles (数据权限 + 功能权限 + 字段权限)
-- ============================================================
ALTER TABLE roles ADD COLUMN IF NOT EXISTS data_scope TEXT DEFAULT 'all';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS func_perms JSONB DEFAULT '{}';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS field_perms JSONB DEFAULT '{}';

-- ============================================================
-- 9. EXTEND departments (部门负责人)
-- ============================================================
ALTER TABLE departments ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================
-- 10. DATA BACKUP LOGS (备份记录 — 元数据存本地，记录存表)
-- ============================================================
CREATE TABLE IF NOT EXISTS backup_logs (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  backup_type TEXT DEFAULT 'manual', -- manual/auto
  entity_types JSONB DEFAULT '["clients","contacts","orders"]',
  record_count INT DEFAULT 0,
  file_name TEXT,
  file_size BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bl_company ON backup_logs(company_id);

ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bl_policy ON backup_logs;
CREATE POLICY bl_policy ON backup_logs FOR ALL USING (
  (SELECT is_super_admin(auth.uid())) = TRUE
  OR company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
);

-- ============================================================
-- 11. Stored function: write operation log atomically
-- ============================================================
CREATE OR REPLACE FUNCTION write_op_log(
  p_company_id BIGINT,
  p_user_id UUID,
  p_user_name TEXT,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_entity_name TEXT,
  p_detail TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
  INSERT INTO operation_logs (company_id, user_id, user_name, action, entity_type, entity_id, entity_name, detail)
  VALUES (p_company_id, p_user_id, p_user_name, p_action, p_entity_type, p_entity_id, p_entity_name, p_detail)
  RETURNING id;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- 12. Employee auto-reclaim: function to reassign clients on deactivation
-- ============================================================
CREATE OR REPLACE FUNCTION reassign_clients_on_deactivate(
  p_user_id UUID,
  p_company_id BIGINT,
  p_reassign_to UUID DEFAULT NULL  -- NULL = 回收到公共池
) RETURNS INT AS $$
DECLARE
  affected INT;
BEGIN
  IF p_reassign_to IS NULL THEN
    UPDATE clients SET assigned_to = NULL, updated_at = NOW()
    WHERE company_id = p_company_id AND assigned_to = p_user_id;
  ELSE
    UPDATE clients SET assigned_to = p_reassign_to, updated_at = NOW()
    WHERE company_id = p_company_id AND assigned_to = p_user_id;
  END IF;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 13. Export permission check function
-- ============================================================
CREATE OR REPLACE FUNCTION can_export(p_user_id UUID) RETURNS BOOLEAN AS $$
DECLARE
  r_role TEXT;
  r_func JSONB;
BEGIN
  -- Super admin always allowed
  IF (SELECT is_super_admin(p_user_id)) THEN RETURN TRUE; END IF;
  -- Check profile func_perms
  SELECT func_perms INTO r_func FROM profiles WHERE user_id = p_user_id;
  IF r_func IS NOT NULL AND r_func->>'allow_export' = 'true' THEN RETURN TRUE; END IF;
  -- Check role func_perms
  SELECT r.func_perms INTO r_func FROM profiles p
  JOIN roles r ON r.name = p.role AND r.company_id = p.company_id
  WHERE p.user_id = p_user_id;
  IF r_func IS NOT NULL AND r_func->>'allow_export' = 'true' THEN RETURN TRUE; END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 通知 PostgREST 刷新 schema
NOTIFY pgrst, 'reload schema';
