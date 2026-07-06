-- ============================================================
-- 修复：profiles 表 RLS 策略（修复递归引用导致 500）
-- 请在 Supabase SQL Editor 执行
-- ============================================================

-- 删除上一个有问题的策略（递归查询自己）
DROP POLICY IF EXISTS "Super admin sees all profiles" ON profiles;

-- 每个人都看自己的 profile（这是最小策略，保证登录不崩）
DROP POLICY IF EXISTS "Users see own profile" ON profiles;
CREATE POLICY "Users see own profile" ON profiles FOR SELECT USING (user_id = auth.uid());

-- 超管豁免：用 SECURITY DEFINER 函数避免递归
DROP FUNCTION IF EXISTS is_super_admin();
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  -- SECURITY DEFINER 以函数 owner 身份执行，绕过 RLS
  RETURN EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'super_admin');
END;
$$;

DROP POLICY IF EXISTS "Super admin sees all profiles" ON profiles;
CREATE POLICY "Super admin sees all profiles" ON profiles FOR SELECT USING (is_super_admin());

-- 允许更新自己的 profile（登录时必须）
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 确认 RLS 已开启
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
