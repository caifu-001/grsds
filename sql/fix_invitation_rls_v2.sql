-- ============================================================
-- 修复 invitations RLS + 前端查询
-- Supabase SQL Editor 执行
-- ============================================================

-- 修复 invitations RLS（不用 auth.users，改用 profiles）
DROP POLICY IF EXISTS "Users see own invitations" ON invitations;
CREATE POLICY "Users see own invitations" ON invitations FOR SELECT 
USING (to_email = (SELECT email FROM profiles WHERE user_id = auth.uid()));

-- 修复 notifications RLS（同样的问题）
DROP POLICY IF EXISTS "Users see own notifications" ON notifications;
CREATE POLICY "Users see own notifications" ON notifications FOR SELECT 
USING (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
