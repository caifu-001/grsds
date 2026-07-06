-- invitations RLS：直接用 auth.email()，不查 profile 表
DROP POLICY IF EXISTS "Users see own invitations" ON invitations;
CREATE POLICY "Users see own invitations" ON invitations FOR SELECT 
USING (to_email = auth.email());

-- 同时删掉之前的超管 policy（如果存在冲突），重建
DROP POLICY IF EXISTS "Super admin sees all invitations" ON invitations;
CREATE POLICY "Super admin sees all invitations" ON invitations FOR SELECT 
USING (is_super_admin());

NOTIFY pgrst, 'reload schema';
