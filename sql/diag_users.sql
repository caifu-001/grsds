-- 查看所有 auth 用户和 profiles 的对应关系
-- 找出哪个是你登录的账号
SELECT 'auth_users' AS source, id, email, created_at FROM auth.users ORDER BY created_at DESC;

SELECT 'profiles' AS source, user_id, email, role, company_id, active_company_id FROM profiles;

-- 手动操作：找到你的 auth 用户 ID 后，替换下面 SQL 中的 <YOUR_USER_ID>
-- INSERT INTO profiles (user_id, email, role, created_at)
-- VALUES ('<YOUR_USER_ID>', '你的邮箱', 'super_admin', NOW())
-- ON CONFLICT (user_id) DO NOTHING;
