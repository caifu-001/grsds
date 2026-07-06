-- ============================================================
-- 超管查看全部注册用户 — RLS豁免 + 修复
-- 请在 Supabase SQL Editor 执行
-- ============================================================

-- 1. profiles 表：超管豁免 RLS，能看所有用户
DROP POLICY IF EXISTS "Super admin sees all profiles" ON profiles;
CREATE POLICY "Super admin sees all profiles" ON profiles FOR SELECT USING (
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'super_admin'
);

-- 2. 确认 profiles 表有 RLS 开启
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. 确认超管账号 role = 'super_admin'
-- SELECT user_id, email, role FROM profiles WHERE role = 'super_admin';

NOTIFY pgrst, 'reload schema';
