-- 诊断：检查所有表中 client_id 类型与 clients.id (UUID) 不一致的表
-- 在 Supabase SQL Editor 执行

SELECT 
  c.table_name,
  c.column_name,
  c.data_type,
  c.udt_name
FROM information_schema.columns c
WHERE c.column_name = 'client_id'
  AND c.table_schema = 'public'
ORDER BY c.table_name;

-- 同时也检查 orders 表所有列，确认 saveOrder 需要的列都存在
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND table_schema = 'public'
ORDER BY ordinal_position;
