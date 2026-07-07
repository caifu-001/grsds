-- 重新创建 get_my_memberships RPC（如果原来没创建成功）
DROP FUNCTION IF EXISTS get_my_memberships();
CREATE OR REPLACE FUNCTION get_my_memberships()
RETURNS TABLE(
  membership_id BIGINT,
  company_id INTEGER,
  company_name TEXT,
  role TEXT,
  status TEXT,
  joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT cm.id, cm.company_id, c.name, cm.role, cm.status, cm.joined_at
    FROM company_memberships cm
    JOIN companies c ON c.id = cm.company_id
    WHERE cm.user_id = auth.uid() AND cm.status = 'active'
    ORDER BY cm.joined_at;
END;
$$;

-- 验证
SELECT * FROM get_my_memberships();
