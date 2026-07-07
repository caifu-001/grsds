-- 修复：为当前用户创建 profile
-- 在 Supabase SQL Editor 执行

CREATE OR REPLACE FUNCTION fix_create_my_profile()
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_email TEXT;
  v_company_id INTEGER;
BEGIN
  -- 从 auth.users 取最近创建的用户
  SELECT id, email INTO v_uid, v_email FROM auth.users ORDER BY created_at DESC LIMIT 1;
  
  IF v_uid IS NULL THEN
    RETURN 'ERROR: no auth users found';
  END IF;

  RAISE NOTICE 'Found user: % (%)', v_email, v_uid;

  -- 创建 profile
  INSERT INTO profiles (user_id, email, role, created_at)
  VALUES (v_uid, v_email, 'super_admin', NOW())
  ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;

  -- 查找已有公司
  SELECT id INTO v_company_id FROM companies LIMIT 1;
  
  IF v_company_id IS NOT NULL THEN
    INSERT INTO company_memberships (user_id, company_id, role, status, joined_at)
    VALUES (v_uid, v_company_id, 'admin', 'active', NOW())
    ON CONFLICT (user_id, company_id) DO UPDATE SET role = 'admin', status = 'active';

    UPDATE profiles SET active_company_id = v_company_id, company_id = v_company_id
    WHERE user_id = v_uid;
    
    RETURN 'OK: profile created for ' || v_email || ', joined company ' || v_company_id;
  ELSE
    RETURN 'OK: profile created for ' || v_email || ', but no companies exist';
  END IF;
END;
$$;

SELECT fix_create_my_profile();
