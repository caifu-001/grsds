-- 批量授权：管理员给成员批量授权（修复版）
-- 改为接受逗号分隔字符串，避免 JSON→PG 数组转换问题
DROP FUNCTION IF EXISTS batch_grant_resources(UUID,INTEGER,TEXT,INTEGER[]);

CREATE OR REPLACE FUNCTION batch_grant_resources(
  p_user_id UUID,
  p_company_id INTEGER,
  p_resource_type TEXT,
  p_resource_ids TEXT DEFAULT '',   -- 逗号分隔，如 "1,3,5"
  p_granted_by UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_count INTEGER := 0;
  v_rid INTEGER;
  v_id TEXT;
BEGIN
  -- 删除旧授权
  IF p_resource_ids = '' THEN
    DELETE FROM resource_grants 
    WHERE user_id = p_user_id AND company_id = p_company_id AND resource_type = p_resource_type;
    RETURN 0;
  END IF;
  
  -- 删除不在新列表中的旧授权
  DELETE FROM resource_grants 
  WHERE user_id = p_user_id AND company_id = p_company_id AND resource_type = p_resource_type
    AND resource_id::TEXT <> ALL(string_to_array(p_resource_ids, ','));
  
  -- 插入新授权
  FOREACH v_id IN ARRAY string_to_array(p_resource_ids, ',') LOOP
    v_rid := NULLIF(v_id, '')::INTEGER;
    CONTINUE WHEN v_rid IS NULL;
    INSERT INTO resource_grants (user_id, company_id, resource_type, resource_id, granted_by)
    VALUES (p_user_id, p_company_id, p_resource_type, v_rid, COALESCE(p_granted_by, p_user_id))
    ON CONFLICT (user_id, company_id, resource_type, resource_id) DO NOTHING;
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

NOTIFY pgrst, 'reload schema';
