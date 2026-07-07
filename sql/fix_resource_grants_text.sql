-- resource_grants 修复：resource_id 从 INTEGER 改为 TEXT（clients/products 使用 UUID）
ALTER TABLE resource_grants ALTER COLUMN resource_id TYPE TEXT;
-- 重建唯一约束
ALTER TABLE resource_grants DROP CONSTRAINT IF EXISTS resource_grants_user_id_company_id_resource_type_resource_id_key;
ALTER TABLE resource_grants ADD UNIQUE(user_id, company_id, resource_type, resource_id);

-- 重建 RPC 函数：v_rid 改为 TEXT
DROP FUNCTION IF EXISTS batch_grant_resources(UUID,INTEGER,TEXT,TEXT);
DROP FUNCTION IF EXISTS batch_grant_resources(UUID,INTEGER,TEXT,TEXT,UUID);

CREATE OR REPLACE FUNCTION batch_grant_resources(
  p_user_id UUID,
  p_company_id INTEGER,
  p_resource_type TEXT,
  p_resource_ids TEXT DEFAULT '',
  p_granted_by UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_count INTEGER := 0;
  v_rid TEXT;
  v_id TEXT;
BEGIN
  IF p_resource_ids = '' THEN
    DELETE FROM resource_grants 
    WHERE user_id = p_user_id AND company_id = p_company_id AND resource_type = p_resource_type;
    RETURN 0;
  END IF;
  
  DELETE FROM resource_grants 
  WHERE user_id = p_user_id AND company_id = p_company_id AND resource_type = p_resource_type
    AND resource_id <> ALL(string_to_array(p_resource_ids, ','));
  
  FOREACH v_id IN ARRAY string_to_array(p_resource_ids, ',') LOOP
    v_rid := NULLIF(TRIM(v_id), '');
    CONTINUE WHEN v_rid IS NULL;
    INSERT INTO resource_grants (user_id, company_id, resource_type, resource_id, granted_by)
    VALUES (p_user_id, p_company_id, p_resource_type, v_rid, COALESCE(p_granted_by, p_user_id))
    ON CONFLICT (user_id, company_id, resource_type, resource_id) DO NOTHING;
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- 同样修复 get_member_grants 返回类型
DROP FUNCTION IF EXISTS get_member_grants(UUID,INTEGER,TEXT);

CREATE OR REPLACE FUNCTION get_member_grants(
  p_user_id UUID,
  p_company_id INTEGER,
  p_resource_type TEXT
)
RETURNS TABLE(resource_id TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT rg.resource_id::TEXT FROM resource_grants rg
  WHERE rg.user_id = p_user_id AND rg.company_id = p_company_id AND rg.resource_type = p_resource_type;
$$;

NOTIFY pgrst, 'reload schema';
