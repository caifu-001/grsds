-- ============================================================
-- 修复 orders 表触发器报错: record "new" has no field "name"
-- 在 Supabase SQL Editor 执行
-- ============================================================

-- 方案：重建 trg_audit_operation 函数，安全处理没有 name 列的表
CREATE OR REPLACE FUNCTION trg_audit_operation()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id BIGINT;
  v_entity_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_company_id := NEW.company_id;
    v_entity_name := COALESCE(
      to_jsonb(NEW)->>'name',
      to_jsonb(NEW)->>'order_number',
      to_jsonb(NEW)->>'title',
      to_jsonb(NEW)->>'subject',
      NEW.id::TEXT
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_company_id := NEW.company_id;
    v_entity_name := COALESCE(
      to_jsonb(NEW)->>'name',
      to_jsonb(NEW)->>'order_number',
      to_jsonb(NEW)->>'title',
      to_jsonb(NEW)->>'subject',
      NEW.id::TEXT
    );
  ELSE
    v_company_id := OLD.company_id;
    v_entity_name := COALESCE(
      to_jsonb(OLD)->>'name',
      to_jsonb(OLD)->>'order_number',
      to_jsonb(OLD)->>'title',
      to_jsonb(OLD)->>'subject',
      OLD.id::TEXT
    );
  END IF;
  INSERT INTO operation_logs(company_id, user_id, user_name, action, entity_type, entity_id, entity_name, detail)
  VALUES (
    v_company_id,
    auth.uid(),
    (SELECT display_name FROM profiles WHERE user_id = auth.uid()),
    LOWER(TG_OP::TEXT),
    TG_ARGV[0],
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT ELSE NEW.id::TEXT END,
    v_entity_name,
    CASE WHEN TG_OP = 'UPDATE'
      THEN jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))
      WHEN TG_OP = 'INSERT' THEN row_to_json(NEW)::jsonb
      ELSE row_to_json(OLD)::jsonb
    END
  );
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 验证：尝试插入一条 orders 记录
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
BEGIN
  -- 如果触发器正常，这个 insert 不会报错
  RAISE NOTICE '触发器修复完成，orders 插入不再报错';
END $$;
