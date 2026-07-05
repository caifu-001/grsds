-- ============================================================
-- Step 1: 创建 company_memberships 表 + 迁移现有数据
-- Step 2: profiles 表改造
-- 请在 Supabase SQL Editor 中一次性执行
-- ============================================================

-- 1. 创建公司成员关系表
CREATE TABLE IF NOT EXISTS company_memberships (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','editor','member')),
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (user_id, company_id)
);

ALTER TABLE company_memberships ENABLE ROW LEVEL SECURITY;

-- 2. 迁移现有 profiles.company_id 数据到 company_memberships
INSERT INTO company_memberships (user_id, company_id, role, status, joined_at)
SELECT user_id, company_id,
  CASE WHEN role = 'super_admin' THEN 'admin' WHEN role = 'admin' THEN 'admin' ELSE 'member' END,
  'active', created_at
FROM profiles
WHERE company_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;

-- 3. profiles 添加 active_company_id
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;

-- 4. 回填 active_company_id（取第一条成员关系）
UPDATE profiles p
SET active_company_id = (
  SELECT cm.company_id FROM company_memberships cm
  WHERE cm.user_id = p.user_id AND cm.status = 'active'
  ORDER BY cm.joined_at LIMIT 1
)
WHERE p.active_company_id IS NULL
  AND EXISTS (SELECT 1 FROM company_memberships cm WHERE cm.user_id = p.user_id AND cm.status = 'active');

-- 4.5 创建 invitations 表（如果不存在，确保 handle_invitation 函数可用）
CREATE TABLE IF NOT EXISTS invitations (
  id BIGSERIAL PRIMARY KEY,
  from_company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','editor','member')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_inv_to_email_status ON invitations(to_email, status);

-- 6. profiles 表保留 company_id 为兼容字段（通过触发器同步）

-- 7. company_memberships RLS 策略
DROP POLICY IF EXISTS "Users see own memberships" ON company_memberships;
CREATE POLICY "Users see own memberships" ON company_memberships FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Super admin sees all" ON company_memberships;
CREATE POLICY "Super admin sees all" ON company_memberships FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "Company admin manages members" ON company_memberships;
CREATE POLICY "Company admin manages members" ON company_memberships FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid()
      AND active_company_id = company_memberships.company_id
      AND role = 'admin'
  )
);

-- 8. RPC: 查询 user 所有公司成员关系（前端登录时用）
DROP FUNCTION IF EXISTS get_my_memberships();
CREATE OR REPLACE FUNCTION get_my_memberships()
RETURNS TABLE(
  membership_id BIGINT,
  company_id INTEGER,
  company_name TEXT,
  role TEXT,
  status TEXT,
  joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
    SELECT cm.id, cm.company_id, c.name, cm.role, cm.status, cm.joined_at
    FROM company_memberships cm
    JOIN companies c ON c.id = cm.company_id
    WHERE cm.user_id = auth.uid() AND cm.status = 'active'
    ORDER BY cm.joined_at;
END;
$$;

-- 9. RPC: 切换激活公司
DROP FUNCTION IF EXISTS set_active_company(INTEGER);
CREATE OR REPLACE FUNCTION set_active_company(p_company_id INTEGER)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- 验证是这个公司的成员
  SELECT cm.role INTO v_role
  FROM company_memberships cm
  WHERE cm.user_id = auth.uid()
    AND cm.company_id = p_company_id
    AND cm.status = 'active';
  
  IF v_role IS NULL THEN
    RAISE EXCEPTION '你不是该公司的成员';
  END IF;

  -- 更新 active_company_id
  UPDATE profiles
  SET active_company_id = p_company_id, role = v_role
  WHERE user_id = auth.uid();
  
  RETURN 'ok';
END;
$$;

-- 10. RPC: 列出本公司成员（管理员用）
DROP FUNCTION IF EXISTS list_company_members(INTEGER);
CREATE OR REPLACE FUNCTION list_company_members(p_company_id INTEGER)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  display_name TEXT,
  department_id INTEGER,
  department_name TEXT,
  role TEXT,
  phone TEXT,
  "position" TEXT,
  joined_at TIMESTAMPTZ,
  invited_by_email TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- 权限：必须是该公司成员
  IF NOT EXISTS (
    SELECT 1 FROM company_memberships cm
    WHERE cm.user_id = auth.uid()
      AND cm.company_id = p_company_id
      AND cm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  RETURN QUERY
    SELECT
      cm.user_id,
      au.email::TEXT,
      p.display_name,
      p.department_id,
      d.name AS department_name,
      cm.role,
      p.phone,
      p."position",
      cm.joined_at,
      inviter.email::TEXT AS invited_by_email
    FROM company_memberships cm
    JOIN profiles p ON p.user_id = cm.user_id
    LEFT JOIN auth.users au ON au.id = cm.user_id
    LEFT JOIN departments d ON d.id = p.department_id
    LEFT JOIN auth.users inviter ON inviter.id = cm.invited_by
    WHERE cm.company_id = p_company_id AND cm.status = 'active'
    ORDER BY cm.joined_at;
END;
$$;

-- 11+12. 邀请成员和接受邀请函数 → 见 invitation_functions.sql（拆分以避免编译依赖）
-- 13. RPC: 移除成员（管理员用）
DROP FUNCTION IF EXISTS remove_member(INTEGER, UUID);
CREATE OR REPLACE FUNCTION remove_member(p_company_id INTEGER, p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT (cm.role = 'admin') INTO v_is_admin
  FROM company_memberships cm
  WHERE cm.user_id = auth.uid()
    AND cm.company_id = p_company_id
    AND cm.status = 'active';
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION '仅公司管理员可移除成员';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION '不能移除自己';
  END IF;

  DELETE FROM company_memberships WHERE user_id = p_user_id AND company_id = p_company_id;
  
  -- 如果被移除用户的 active_company_id 是这家，清掉
  UPDATE profiles SET active_company_id = (
    SELECT cm2.company_id FROM company_memberships cm2 WHERE cm2.user_id = p_user_id AND cm2.status = 'active' ORDER BY cm2.joined_at LIMIT 1
  ) WHERE user_id = p_user_id AND active_company_id = p_company_id;
  
  RETURN 'ok';
END;
$$;

NOTIFY pgrst, 'reload schema';
