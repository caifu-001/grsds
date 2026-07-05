-- ============================================================
-- invitations 相关 RPC 函数（依赖 invitations 表）
-- ⚠️ 请先执行 company_memberships.sql，再执行本文件
-- ============================================================

-- 1. 邀请成员（管理员用）
DROP FUNCTION IF EXISTS invite_member(INTEGER, TEXT, TEXT);
CREATE OR REPLACE FUNCTION invite_member(p_company_id INTEGER, p_email TEXT, p_role TEXT DEFAULT 'member')
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
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

  IF EXISTS (
    SELECT 1 FROM invitations
    WHERE from_company_id = p_company_id AND to_email = p_email AND status = 'pending'
  ) THEN
    RAISE EXCEPTION '该邮箱已有待处理的邀请';
  END IF;

  IF EXISTS (
    SELECT 1 FROM company_memberships cm
    JOIN profiles p ON p.user_id = cm.user_id
    WHERE cm.company_id = p_company_id AND p.email = p_email AND cm.status = 'active'
  ) THEN
    RAISE EXCEPTION '该用户已是公司成员';
  END IF;

  INSERT INTO invitations (from_company_id, to_email, role, invited_by, status)
  VALUES (p_company_id, p_email, p_role, auth.uid(), 'pending')
  RETURNING id INTO v_invitation_id;

  RETURN v_invitation_id;
END;
$$;

-- 2. 接受/拒绝邀请
DROP FUNCTION IF EXISTS handle_invitation(BIGINT, TEXT);
CREATE OR REPLACE FUNCTION handle_invitation(p_invitation_id BIGINT, p_action TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_inv invitations%ROWTYPE;
BEGIN
  IF p_action NOT IN ('accept','reject') THEN
    RAISE EXCEPTION 'action must be accept or reject';
  END IF;

  SELECT * INTO v_inv FROM invitations WHERE id = p_invitation_id;
  IF v_inv IS NULL THEN
    RAISE EXCEPTION '邀请不存在';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND email = v_inv.to_email) THEN
    RAISE EXCEPTION '邀请的邮箱不是你注册的邮箱';
  END IF;

  IF v_inv.status != 'pending' THEN
    RAISE EXCEPTION '该邀请已被处理';
  END IF;

  IF p_action = 'accept' THEN
    UPDATE invitations SET status = 'accepted', accepted_at = NOW() WHERE id = p_invitation_id;
    
    INSERT INTO company_memberships (user_id, company_id, role, invited_by, status)
    VALUES (auth.uid(), v_inv.from_company_id, COALESCE(v_inv.role, 'member'), v_inv.invited_by, 'active')
    ON CONFLICT (user_id, company_id) DO UPDATE SET status = 'active', role = COALESCE(v_inv.role, 'member');

    UPDATE profiles SET active_company_id = v_inv.from_company_id
    WHERE user_id = auth.uid() AND active_company_id IS NULL;
    
    RETURN 'accepted';
  ELSE
    UPDATE invitations SET status = 'rejected', rejected_at = NOW() WHERE id = p_invitation_id;
    RETURN 'rejected';
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
