-- 终极诊断：直接用 auth.uid() 查，不加任何包装
-- 同时列出所有同名函数防冲突

-- 1. 检查有没有多个 get_my_memberships
SELECT proname, pronargs, prosrc 
FROM pg_proc 
WHERE proname = 'get_my_memberships';

-- 2. 不靠 RPC，直接查
SELECT cm.id, cm.company_id, c.name, cm.role, cm.status
FROM company_memberships cm
JOIN companies c ON c.id = cm.company_id
WHERE cm.user_id = 'c252c421-4100-4ad6-8125-f441483958c4';

-- 3. 确认这个 UUID 是否匹配 auth.users
SELECT id, email FROM auth.users 
WHERE id = 'c252c421-4100-4ad6-8125-f441483958c4';
