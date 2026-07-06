-- ============================================================
-- 修复：profiles 表 RLS 策略（修复递归引用导致 500）
-- 请在 Supabase SQL Editor 执行
-- 注意：is_super_admin() 已被多处 RLS 引用，用 CREATE OR REPLACE 避免依赖报错
-- ============================================================

-- 1. 删除上一个有问题的策略（递归查询自己导致 500）
DROP POLICY IF EXISTS "Super admin sees all profiles" ON profiles;

-- 2. 确保 is_super_admin() 存在且正确（用 CREATE OR REPLACE，不碰依赖）
--    注意：不 DROP，不 CASCADE，不动已有策略
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'super_admin');
END;
$$;

-- 3. 重建 profiles 的超管豁免策略
DROP POLICY IF EXISTS "Super admin sees all profiles" ON profiles;
CREATE POLICY "Super admin sees all profiles" ON profiles FOR SELECT USING (is_super_admin());

-- 4. 每个人看自己的 profile（登录必须）
DROP POLICY IF EXISTS "Users see own profile" ON profiles;
CREATE POLICY "Users see own profile" ON profiles FOR SELECT USING (user_id = auth.uid());

-- 5. 允许更新自己的 profile（登录时写 last_login_at 等）
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 6. 确认 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
