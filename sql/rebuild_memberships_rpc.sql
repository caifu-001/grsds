-- 强制删除并重建 get_my_memberships()
DROP FUNCTION IF EXISTS get_my_memberships() CASCADE;
CREATE OR REPLACE FUNCTION get_my_memberships()
RETURNS TABLE(
  membership_id BIGINT,
  company_id INTEGER,
  company_name TEXT,
  role TEXT,
  status TEXT,
  joined_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cm.id, cm.company_id, c.name, cm.role, cm.status, cm.joined_at
  FROM public.company_memberships cm
  JOIN public.companies c ON c.id = cm.company_id
  WHERE cm.user_id = auth.uid()
    AND cm.status = 'active'
  ORDER BY cm.joined_at;
$$;

-- 验证
SELECT * FROM get_my_memberships();
