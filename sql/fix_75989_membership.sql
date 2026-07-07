-- 为 75989677@qq.com 建 company_memberships 记录（之前已修复 profile）
DO $$
BEGIN
  -- 加入公司 1737（你的主公司）
  INSERT INTO company_memberships (user_id, company_id, role, status, joined_at)
  VALUES ('c252c421-4100-4ad6-8125-f441483958c4', 1737, 'admin', 'active', NOW())
  ON CONFLICT (user_id, company_id) DO UPDATE SET role = 'admin', status = 'active';

  -- 确认
  RAISE NOTICE 'Done';
END;
$$;

-- 验证
SELECT cm.*, c.name AS company_name
FROM company_memberships cm
JOIN companies c ON c.id = cm.company_id
WHERE cm.user_id = 'c252c421-4100-4ad6-8125-f441483958c4';
