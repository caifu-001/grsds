-- ============================================================
-- 修复邀请通知全链路
-- 请在 Supabase SQL Editor 执行
-- ============================================================

-- 1. invitations 表加 RLS（用户能查发给自己的邀请）
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own invitations" ON invitations;
CREATE POLICY "Users see own invitations" ON invitations FOR SELECT 
USING (to_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 2. notifications 表加 RLS（用户能查发给自己的通知）
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own notifications" ON notifications;
CREATE POLICY "Users see own notifications" ON notifications FOR SELECT 
USING (user_id = auth.uid());

-- 3. 超管豁免
DROP POLICY IF EXISTS "Super admin sees all notifications" ON notifications;
CREATE POLICY "Super admin sees all notifications" ON notifications FOR SELECT 
USING (is_super_admin());

NOTIFY pgrst, 'reload schema';
