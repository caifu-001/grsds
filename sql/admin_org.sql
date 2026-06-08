-- ============================================================
-- 组织架构管理 - Supabase SQL (请在 Supabase SQL Editor 中执行)
-- ============================================================

-- 1. 部门表
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- 管理员可以管理部门
CREATE POLICY "Admins manage departments" ON departments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 所有登录用户可查看部门
CREATE POLICY "Users view departments" ON departments FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- 2. 扩展 profiles 表
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 3. 列出所有用户的 RPC 函数 (admin 权限)
CREATE OR REPLACE FUNCTION list_all_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  department_id INTEGER,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    au.email::TEXT,
    p.display_name,
    p.department_id,
    p.role
  FROM profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  ORDER BY p.created_at DESC NULLS LAST;
END;
$$;

-- 4. 刷新 schema 缓存
NOTIFY pgrst, 'reload schema';
