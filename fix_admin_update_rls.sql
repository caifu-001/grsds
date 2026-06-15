-- ===== 管理员修改员工信息 RLS 修复 =====
-- 问题：profiles UPDATE 策略只有 auth.uid() = user_id（只能改自己）
-- 超管/管理员在编辑员工弹窗里改部门等字段时，UPDATE 被 RLS 静默拒绝
-- 前端用 sb.from('profiles').update(data).eq('user_id', userId) 发请求
-- PostgREST 返回 200 OK 空 body，error 为 null → 前端误以为成功

-- 加一条：管理员可以更新所有用户
CREATE POLICY IF NOT EXISTS "Admins can update all profiles" ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (true);
