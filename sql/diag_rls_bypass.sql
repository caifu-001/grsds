-- 绕过 RLS 的诊断（SECURITY DEFINER 直接查）
CREATE OR REPLACE FUNCTION diag_company_state()
RETURNS TABLE(step TEXT, info TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_count INTEGER;
BEGIN
  -- Step 1: company_memberships 表存在吗？
  SELECT COUNT(*) INTO v_count FROM information_schema.tables WHERE table_schema='public' AND table_name='company_memberships';
  RETURN QUERY SELECT '1_table_exists'::TEXT, CASE WHEN v_count>0 THEN 'YES' ELSE 'NO - TABLE MISSING!' END;

  -- Step 2: company_memberships 行数
  IF v_count > 0 THEN
    SELECT COUNT(*) INTO v_count FROM company_memberships;
    RETURN QUERY SELECT '2_membership_rows'::TEXT, v_count::TEXT;
    SELECT COUNT(*) INTO v_count FROM company_memberships WHERE user_id = v_uid;
    RETURN QUERY SELECT '3_my_memberships'::TEXT, v_count::TEXT;
  END IF;

  -- Step 3: profiles 信息
  RETURN QUERY SELECT '4_profile'::TEXT, COALESCE(
    (SELECT email || ' | company_id=' || COALESCE(company_id::TEXT,'NULL') || ' | active=' || COALESCE(active_company_id::TEXT,'NULL') || ' | role=' || COALESCE(role,'NULL')
     FROM profiles WHERE user_id = v_uid),
    'NO PROFILE FOUND'
  );

  -- Step 4: companies 有当前用户创建的？
  SELECT COUNT(*) INTO v_count FROM companies WHERE created_by = v_uid;
  RETURN QUERY SELECT '5_my_companies'::TEXT, v_count::TEXT;

  -- Step 5: invitations
  SELECT COUNT(*) INTO v_count FROM information_schema.tables WHERE table_schema='public' AND table_name='invitations';
  RETURN QUERY SELECT '6_invitations_table'::TEXT, CASE WHEN v_count>0 THEN 'YES' ELSE 'NO' END;
END;
$$;

SELECT * FROM diag_company_state();
