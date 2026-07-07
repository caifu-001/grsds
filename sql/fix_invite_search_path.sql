-- ============================================================
-- 修复 invite_member / list_company_members RPC 的 search_path
-- 请在 Supabase SQL Editor 执行
-- ============================================================

-- 1. 修复 invite_member（直接查 company_memberships 但 search_path 为空）
DROP FUNCTION IF EXISTS invite_member(INTEGER, TEXT, TEXT);
CREATE OR REPLACE FUNCTION invite_member(p_company_id INTEGER, p_email TEXT, p_role TEXT DEFAULT 'member')
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_invitation_id BIGINT;
BEGIN
  SELECT (cm.role = 'admin') INTO v_is_admin
  FROM company_memberships cm
  WHERE cm.user_id = auth.uid()
    AND cm.company_id = p_company_id
    AND cm.status = 'active';
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION '仅公司管理员可邀请';
  END IF;

  SELECT 1 INTO v_is_admin FROM invitations 
  WHERE from_company_id = p_company_id AND to_email = p_email AND status = 'pending' 
  LIMIT 1;
  IF v_is_admin THEN
    RAISE EXCEPTION '该邮箱已有待处理的邀请';
  END IF;

  SELECT 1 INTO v_is_admin 
  FROM company_memberships cm 
  JOIN profiles p ON p.user_id = cm.user_id 
  WHERE cm.company_id = p_company_id AND p.email = p_email AND cm.status = 'active' 
  LIMIT 1;
  IF v_is_admin THEN
    RAISE EXCEPTION '该用户已是公司成员';
  END IF;

  INSERT INTO invitations (from_company_id, to_email, role, invited_by, status) 
  VALUES (p_company_id, p_email, p_role, auth.uid(), 'pending') 
  RETURNING id INTO v_invitation_id;

  RETURN v_invitation_id;
END;
$$;

-- 2. 修复 list_company_members（同样的问题）
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
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

NOTIFY pgrst, 'reload schema';
