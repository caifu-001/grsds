-- ============================================================
-- 修复：邀请成员时写入 notifications 表（被邀请方可见）
-- 请在 Supabase SQL Editor 执行
-- ============================================================

DROP FUNCTION IF EXISTS invite_member(INTEGER, TEXT, TEXT);
CREATE OR REPLACE FUNCTION invite_member(p_company_id INTEGER, p_email TEXT, p_role TEXT DEFAULT 'member')
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_invitation_id BIGINT;
  v_company_name TEXT;
  v_inviter_name TEXT;
  v_target_user_id UUID;
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

  -- 查询公司名和邀请人
  SELECT name INTO v_company_name FROM companies WHERE id = p_company_id;
  SELECT display_name INTO v_inviter_name FROM profiles WHERE user_id = auth.uid();

  -- 查被邀请人的 user_id
  SELECT id INTO v_target_user_id FROM auth.users WHERE email = p_email;

  -- 如果被邀请人已注册，写入通知
  IF v_target_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, company_id, title, body, type, link, is_read)
    VALUES (v_target_user_id, p_company_id,
      '📨 入职邀请',
      COALESCE(v_inviter_name, '管理员') || ' 邀请你加入「' || COALESCE(v_company_name, '公司') || '」',
      'info',
      'profile/invitations',
      false);
  END IF;

  RETURN v_invitation_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
