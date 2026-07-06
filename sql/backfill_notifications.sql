-- 回填现有邀请的通知 + 铃铛初始化主动加载邀请计数
-- Supabase SQL Editor 执行

-- 1. 为所有 pending 邀请写入通知
INSERT INTO notifications (user_id, company_id, title, body, type, link, is_read)
SELECT u.id, inv.from_company_id,
  '📨 入职邀请',
  (SELECT COALESCE(p.display_name, '管理员') FROM profiles p WHERE p.user_id = inv.invited_by)
    || ' 邀请你加入「'
    || COALESCE((SELECT name FROM companies WHERE id = inv.from_company_id), '公司')
    || '」'
    || CASE WHEN inv.message IS NOT NULL AND inv.message <> '' THEN ': ' || inv.message ELSE '' END,
  'info',
  'invitations',
  false
FROM invitations inv
JOIN auth.users u ON u.email = inv.to_email
WHERE inv.status = 'pending'
  AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = u.id AND n.link = 'invitations' AND n.created_at > NOW() - INTERVAL '1 minute');

-- 2. 确认结果
SELECT 'invitations' as tbl, count(*) FROM invitations WHERE status = 'pending';
SELECT 'notifications' as tbl, count(*) FROM notifications;
