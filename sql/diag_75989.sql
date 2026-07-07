-- 直接查：不靠 RPC，看 75989677@qq.com 在 company_memberships 表里到底有什么
SELECT * FROM company_memberships
WHERE user_id = 'c252c421-4100-4ad6-8125-f441483958c4';

-- 也看看这个公司的基本信息
SELECT id, name FROM companies WHERE id = 1737;

-- 直接模拟 RPC 查询
SELECT cm.id, cm.company_id, c.name AS company_name, cm.role, cm.status, cm.joined_at
FROM company_memberships cm
JOIN companies c ON c.id = cm.company_id
WHERE cm.user_id = 'c252c421-4100-4ad6-8125-f441483958c4'
  AND cm.status = 'active';
