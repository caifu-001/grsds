-- 接受/拒绝邀请 RPC
-- Supabase SQL Editor 执行

CREATE OR REPLACE FUNCTION handle_invitation(
  p_invitation_id BIGINT,
  p_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_record invitations%ROWTYPE;
  v_email TEXT;
  v_user_id UUID;
  v_already_member BOOLEAN;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  
  SELECT * INTO v_record FROM invitations
  WHERE id = p_invitation_id AND to_email = v_email AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', '邀请不存在或已处理');
  END IF;

  IF p_action = 'reject' THEN
    UPDATE invitations SET status = 'rejected', updated_at = NOW() WHERE id = p_invitation_id;
    RETURN jsonb_build_object('success', true, 'message', '已拒绝');
  END IF;

  IF p_action = 'accept' THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    
    SELECT EXISTS(
      SELECT 1 FROM company_memberships 
      WHERE user_id = v_user_id AND company_id = v_record.from_company_id AND status = 'active'
    ) INTO v_already_member;
    
    IF v_already_member THEN
      UPDATE invitations SET status = 'accepted', updated_at = NOW() WHERE id = p_invitation_id;
      RETURN jsonb_build_object('success', true, 'message', '已是该公司成员');
    END IF;

    -- 加入公司
    INSERT INTO company_memberships (user_id, company_id, role, status)
    VALUES (v_user_id, v_record.from_company_id, COALESCE(v_record.role, 'member'), 'active')
    ON CONFLICT (user_id, company_id) DO UPDATE SET status = 'active', role = COALESCE(v_record.role, 'member');

    -- 同步 profiles.company_id
    UPDATE profiles SET company_id = v_record.from_company_id WHERE user_id = v_user_id;
    
    UPDATE invitations SET status = 'accepted', updated_at = NOW() WHERE id = p_invitation_id;
    
    RETURN jsonb_build_object('success', true, 'message', '已加入公司');
  END IF;

  RETURN jsonb_build_object('success', false, 'message', '无效操作');
END;
$$;
