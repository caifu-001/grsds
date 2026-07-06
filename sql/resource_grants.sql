-- 成员资源授权表
-- Supabase SQL Editor 执行

CREATE TABLE IF NOT EXISTS resource_grants (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('clients','products','suppliers')),
  resource_id INTEGER NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id, resource_type, resource_id)
);

ALTER TABLE resource_grants ENABLE ROW LEVEL SECURITY;

-- 成员看自己的授权
CREATE POLICY "Members see own grants" ON resource_grants FOR SELECT 
USING (user_id = auth.uid());

-- 管理员管理授权
CREATE POLICY "Admins manage grants" ON resource_grants FOR ALL 
USING (is_super_admin() OR EXISTS (
  SELECT 1 FROM company_memberships cm 
  WHERE cm.user_id = auth.uid() AND cm.company_id = resource_grants.company_id AND cm.role = 'admin' AND cm.status = 'active'
));

-- 快速查询：获取某成员在某公司的所有授权资源ID
CREATE OR REPLACE FUNCTION get_member_grants(
  p_user_id UUID,
  p_company_id INTEGER,
  p_resource_type TEXT
)
RETURNS TABLE(resource_id INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT rg.resource_id FROM resource_grants rg
  WHERE rg.user_id = p_user_id AND rg.company_id = p_company_id AND rg.resource_type = p_resource_type;
$$;

-- 批量授权：管理员给成员批量授权
CREATE OR REPLACE FUNCTION batch_grant_resources(
  p_user_id UUID,
  p_company_id INTEGER,
  p_resource_type TEXT,
  p_resource_ids INTEGER[]
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_count INTEGER := 0;
  v_rid INTEGER;
BEGIN
  -- 删除该成员该类型旧的授权（不在新列表中的）
  DELETE FROM resource_grants 
  WHERE user_id = p_user_id AND company_id = p_company_id AND resource_type = p_resource_type
    AND resource_id <> ALL(p_resource_ids);
  
  -- 插入新的授权
  FOREACH v_rid IN ARRAY p_resource_ids LOOP
    INSERT INTO resource_grants (user_id, company_id, resource_type, resource_id, granted_by)
    VALUES (p_user_id, p_company_id, p_resource_type, v_rid, auth.uid())
    ON CONFLICT (user_id, company_id, resource_type, resource_id) DO NOTHING;
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

NOTIFY pgrst, 'reload schema';
