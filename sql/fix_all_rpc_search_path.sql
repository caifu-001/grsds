-- ============================================================
-- 修复所有 company_memberships 相关 RPC 的 search_path
-- search_path='' → search_path='public'（否则找不到表和 auth.users）
-- 在 Supabase SQL Editor 中执行
-- ============================================================

-- 1. get_my_memberships
DROP FUNCTION IF EXISTS get_my_memberships();
CREATE OR REPLACE FUNCTION get_my_memberships()
RETURNS TABLE(
  membership_id BIGINT, company_id INTEGER, company_name TEXT,
  role TEXT, status TEXT, joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
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

-- 2. set_active_company
DROP FUNCTION IF EXISTS set_active_company(INTEGER);
CREATE OR REPLACE FUNCTION set_active_company(p_company_id INTEGER)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_membership_role TEXT;
  v_is_super BOOLEAN;
BEGIN
  SELECT (role = 'super_admin') INTO v_is_super FROM profiles WHERE user_id = auth.uid();
  SELECT cm.role INTO v_membership_role FROM company_memberships cm
  WHERE cm.user_id = auth.uid() AND cm.company_id = p_company_id AND cm.status = 'active';
  IF v_membership_role IS NULL THEN RAISE EXCEPTION '你不是该公司的成员'; END IF;
  IF v_is_super THEN
    UPDATE profiles SET active_company_id = p_company_id WHERE user_id = auth.uid();
  ELSE
    UPDATE profiles SET active_company_id = p_company_id, role = v_membership_role WHERE user_id = auth.uid();
  END IF;
  RETURN 'ok';
END;
$$;

-- 3. list_company_members
DROP FUNCTION IF EXISTS list_company_members(INTEGER);
CREATE OR REPLACE FUNCTION list_company_members(p_company_id INTEGER)
RETURNS TABLE(
  user_id UUID, email TEXT, display_name TEXT, department_id INTEGER,
  department_name TEXT, role TEXT, phone TEXT, "position" TEXT,
  joined_at TIMESTAMPTZ, invited_by_email TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM company_memberships cm WHERE cm.user_id = auth.uid() AND cm.company_id = p_company_id AND cm.status = 'active')
  THEN RAISE EXCEPTION 'permission denied'; END IF;
  RETURN QUERY
    SELECT cm.user_id, au.email::TEXT, p.display_name, p.department_id,
      d.name AS department_name, cm.role, p.phone, p."position", cm.joined_at,
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

-- 4. invite_member
DROP FUNCTION IF EXISTS invite_member(INTEGER, TEXT, TEXT);
CREATE OR REPLACE FUNCTION invite_member(p_company_id INTEGER, p_email TEXT, p_role TEXT DEFAULT 'member')
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_invitation_id BIGINT;
BEGIN
  SELECT (cm.role = 'admin') INTO v_is_admin FROM company_memberships cm
  WHERE cm.user_id = auth.uid() AND cm.company_id = p_company_id AND cm.status = 'active';
  IF NOT v_is_admin THEN RAISE EXCEPTION '仅公司管理员可邀请'; END IF;
  SELECT 1 INTO v_is_admin FROM invitations WHERE from_company_id = p_company_id AND to_email = p_email AND status = 'pending' LIMIT 1;
  IF v_is_admin THEN RAISE EXCEPTION '该邮箱已有待处理的邀请'; END IF;
  SELECT 1 INTO v_is_admin FROM company_memberships cm JOIN profiles p ON p.user_id = cm.user_id
  WHERE cm.company_id = p_company_id AND p.email = p_email AND cm.status = 'active' LIMIT 1;
  IF v_is_admin THEN RAISE EXCEPTION '该用户已是公司成员'; END IF;
  INSERT INTO invitations (from_company_id, to_email, role, invited_by, status)
  VALUES (p_company_id, p_email, p_role, auth.uid(), 'pending') RETURNING id INTO v_invitation_id;
  RETURN v_invitation_id;
END;
$$;

-- 5. handle_invitation（已经是 EXECUTE 动态 SQL，但修 search_path 更安全）
DROP FUNCTION IF EXISTS handle_invitation(TEXT, TEXT);
CREATE OR REPLACE FUNCTION handle_invitation(p_action TEXT, p_invitation_id BIGINT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_company_id INTEGER;
  v_role TEXT;
BEGIN
  EXECUTE 'SELECT from_company_id, role FROM invitations WHERE id = $1 AND to_email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND status = ''pending'''
  INTO v_company_id, v_role USING p_invitation_id;
  IF v_company_id IS NULL THEN RAISE EXCEPTION '邀请不存在或已处理'; END IF;
  IF p_action = 'accept' THEN
    EXECUTE 'INSERT INTO company_memberships (user_id, company_id, role, status, joined_at)
    VALUES ($1, $2, $3, ''active'', NOW()) ON CONFLICT (user_id, company_id) DO UPDATE SET status = ''active'', role = EXCLUDED.role'
    USING auth.uid(), v_company_id, v_role;
    EXECUTE 'UPDATE profiles SET active_company_id = $1, role = $2 WHERE user_id = $3'
    USING v_company_id, v_role, auth.uid();
    EXECUTE 'UPDATE invitations SET status = ''accepted'', accepted_at = NOW() WHERE id = $1' USING p_invitation_id;
    RETURN 'accepted';
  ELSIF p_action = 'reject' THEN
    EXECUTE 'UPDATE invitations SET status = ''rejected'', rejected_at = NOW() WHERE id = $1' USING p_invitation_id;
    RETURN 'rejected';
  END IF;
  RAISE EXCEPTION '无效操作';
END;
$$;

-- 6. get_my_invitations（如果有的话）
DROP FUNCTION IF EXISTS get_my_invitations();
CREATE OR REPLACE FUNCTION get_my_invitations()
RETURNS TABLE(
  id BIGINT, from_company_id INTEGER, company_name TEXT, role TEXT,
  status TEXT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
    SELECT i.id, i.from_company_id, c.name, i.role, i.status, i.created_at
    FROM invitations i
    JOIN companies c ON c.id = i.from_company_id
    WHERE i.to_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND i.status = 'pending'
    ORDER BY i.created_at DESC;
END;
$$;

NOTIFY pgrst, 'reload schema';
