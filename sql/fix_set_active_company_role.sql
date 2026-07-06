-- ============================================================
-- 修复 set_active_company 覆盖超管 role 的 Bug
-- 请在 Supabase SQL Editor 执行
-- ============================================================

-- 问题：set_active_company 会把 profiles.role 从 super_admin 覆盖成 company_memberships.role（admin/member）
-- 导致超管切换公司后丢失超级管理员身份

DROP FUNCTION IF EXISTS set_active_company(INTEGER);
CREATE OR REPLACE FUNCTION set_active_company(p_company_id INTEGER)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_membership_role TEXT;
  v_is_super BOOLEAN;
BEGIN
  -- 检查是否是超管
  SELECT (role = 'super_admin') INTO v_is_super FROM profiles WHERE user_id = auth.uid();

  -- 验证是这个公司的成员
  SELECT cm.role INTO v_membership_role
  FROM company_memberships cm
  WHERE cm.user_id = auth.uid()
    AND cm.company_id = p_company_id
    AND cm.status = 'active';
  
  IF v_membership_role IS NULL THEN
    RAISE EXCEPTION '你不是该公司的成员';
  END IF;

  -- 更新 active_company_id，超管保留 role = 'super_admin'
  IF v_is_super THEN
    UPDATE profiles
    SET active_company_id = p_company_id
    WHERE user_id = auth.uid();
  ELSE
    UPDATE profiles
    SET active_company_id = p_company_id, role = v_membership_role
    WHERE user_id = auth.uid();
  END IF;

  RETURN 'ok';
END;
$$;

NOTIFY pgrst, 'reload schema';
