-- ============================================
-- patch_missing.sql — 补缺失的 RPC 函数
-- ============================================

-- 1. list_all_users — 列出所有用户及其 profile（供超管使用）
DROP FUNCTION IF EXISTS list_all_users();
CREATE OR REPLACE FUNCTION list_all_users()
RETURNS TABLE(
  user_id uuid, email text, display_name text,
  role text, company_id bigint, company_name text,
  dept_id bigint, dept_name text, is_active boolean, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.user_id,
    u.email::text,
    p.display_name,
    p.role,
    p.company_id,
    c.name AS company_name,
    p.dept_id,
    d.name AS dept_name,
    p.is_active,
    u.created_at
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN companies c ON c.id = p.company_id
  LEFT JOIN departments d ON d.id = p.dept_id
  ORDER BY u.created_at DESC;
END;
$$;

-- 2. list_all_companies — 列出所有公司
DROP FUNCTION IF EXISTS list_all_companies();
CREATE OR REPLACE FUNCTION list_all_companies()
RETURNS TABLE(
  id bigint, name text, address text, phone text,
  status text, created_at timestamptz, employee_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.name, c.address, c.phone,
    c.status, c.created_at,
    (SELECT count(*) FROM profiles WHERE company_id = c.id) AS employee_count
  FROM companies c
  ORDER BY c.created_at DESC;
END;
$$;
