-- ============================================================
-- 邀请通知全链路修复（一次性执行，Supabase SQL Editor）
-- ============================================================

-- 1. invitations 表 RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own invitations" ON invitations;
DROP POLICY IF EXISTS "Super admin sees all invitations" ON invitations;
CREATE POLICY "Users see own invitations" ON invitations FOR SELECT USING (to_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "Super admin sees all invitations" ON invitations FOR SELECT USING (is_super_admin());

-- 2. notifications 表不存在则建
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. notifications RLS（读自己的 + 超管全看）
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own notifications" ON notifications;
DROP POLICY IF EXISTS "Super admin sees all notifications" ON notifications;
CREATE POLICY "Users see own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Super admin sees all notifications" ON notifications FOR SELECT USING (is_super_admin());

-- 4. 重建 invite_member（写入通知 + 通知链接指向邀请面板）
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

  SELECT name INTO v_company_name FROM companies WHERE id = p_company_id;
  SELECT display_name INTO v_inviter_name FROM profiles WHERE user_id = auth.uid();
  SELECT id INTO v_target_user_id FROM auth.users WHERE email = p_email;

  IF v_target_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, company_id, title, body, type, link, is_read)
    VALUES (v_target_user_id, p_company_id,
      '📨 入职邀请',
      COALESCE(v_inviter_name, '管理员') || ' 邀请你加入「' || COALESCE(v_company_name, '公司') || '」',
      'info',
      'invitations',
      false);
  END IF;

  RETURN v_invitation_id;
END;
$$;

-- 5. 确保 is_super_admin 存在（CREATE OR REPLACE 不删依赖）
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'super_admin');
END;
$$;

NOTIFY pgrst, 'reload schema';
