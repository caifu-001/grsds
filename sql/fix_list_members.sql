-- 单独创建 list_company_members RPC 函数（管理员用）
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
  joined_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cm.user_id,
    p.email,
    p.display_name,
    p.department_id,
    d.name AS department_name,
    cm.role,
    p.phone,
    p."position",
    cm.joined_at
  FROM company_memberships cm
  JOIN profiles p ON cm.user_id = p.user_id
  LEFT JOIN departments d ON p.department_id = d.id
  WHERE cm.company_id = p_company_id
  ORDER BY cm.role, p.display_name;
$$;

-- 测试
SELECT * FROM list_company_members(1);
