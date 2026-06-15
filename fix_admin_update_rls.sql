-- ===== 管理员修改员工信息 RLS 修复 =====
-- 问题：profiles UPDATE 策略只有 auth.uid() = user_id（只能改自己）
-- 超管/管理员在编辑员工弹窗里改部门等字段时，UPDATE 被 RLS 静默拒绝

-- 幂等：先删再建（PostgreSQL 不支持 CREATE POLICY IF NOT EXISTS）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND policyname = 'Admins can update all profiles'
  ) THEN
    DROP POLICY "Admins can update all profiles" ON public.profiles;
  END IF;
END $$;

CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (true);
