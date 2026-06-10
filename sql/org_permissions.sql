-- ============================================================
-- 组织管控 SQL (请在 Supabase SQL Editor 中执行)
-- 模块：员工/组织架构 + 权限体系
-- ============================================================

-- 1. profiles 表补建字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','leave'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hire_date DATE;

-- 2. 角色表
CREATE TABLE IF NOT EXISTS roles (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- 3. profiles 加 role_id 和 role 字段松弛
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_id BIGINT REFERENCES roles(id) ON DELETE SET NULL;
-- role 字段扩展允许自定义角色名
ALTER TABLE profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE profiles ALTER COLUMN role TYPE TEXT;

-- 4. 角色表 RLS
DROP POLICY IF EXISTS "Company members view roles" ON roles;
CREATE POLICY "Company members view roles" ON roles FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=roles.company_id)
);

DROP POLICY IF EXISTS "Admins manage roles" ON roles;
CREATE POLICY "Admins manage roles" ON roles FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=roles.company_id AND (role='admin' OR role='super_admin'))
);

-- 5. 默认角色种子数据（为已有公司创建默认角色）
DO $$
DECLARE
  comp RECORD;
  rid BIGINT;
BEGIN
  FOR comp IN SELECT id FROM companies WHERE status='approved' LOOP
    -- 管理员
    INSERT INTO roles(company_id, name, permissions) VALUES(comp.id, '管理员', '{
      "clients": "full", "orders": "full", "sales": "full", "inventory": "full",
      "admin": "full", "reports": "full"
    }'::jsonb) ON CONFLICT(company_id, name) DO UPDATE SET permissions=EXCLUDED.permissions;

    -- 销售
    INSERT INTO roles(company_id, name, permissions) VALUES(comp.id, '销售', '{
      "clients": "view_edit", "orders": "view_edit", "sales": "view_edit",
      "inventory": "view", "admin": "none", "reports": "view"
    }'::jsonb) ON CONFLICT(company_id, name) DO UPDATE SET permissions=EXCLUDED.permissions;

    -- 仓管
    INSERT INTO roles(company_id, name, permissions) VALUES(comp.id, '仓管', '{
      "clients": "view", "orders": "view", "sales": "none",
      "inventory": "full", "admin": "none", "reports": "view"
    }'::jsonb) ON CONFLICT(company_id, name) DO UPDATE SET permissions=EXCLUDED.permissions;

    -- 查看者
    INSERT INTO roles(company_id, name, permissions) VALUES(comp.id, '查看者', '{
      "clients": "view", "orders": "view", "sales": "view",
      "inventory": "view", "admin": "none", "reports": "view"
    }'::jsonb) ON CONFLICT(company_id, name) DO UPDATE SET permissions=EXCLUDED.permissions;
  END LOOP;
END $$;

-- 刷新 schema cache
NOTIFY pgrst, 'reload schema';
