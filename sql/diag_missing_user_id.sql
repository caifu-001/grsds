-- Supabase 诊断脚本：找出缺 user_id 列的表
-- 在 Supabase SQL Editor 中逐组执行

-- 1. 检查所有在 update_rls_active_company.sql 中被引用的业务表是否有 user_id 列
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'user_id'
      AND table_name IN ('clients','contacts','orders','suppliers','products','product_scouting','operation_logs','projects')
    ORDER BY table_name
  LOOP
    RAISE NOTICE 'Table % has user_id column', r.table_name;
  END LOOP;
END;
$$;

-- 2. 列出上面所有业务表的全部列（找出缺 user_id 的表）
SELECT table_name, string_agg(column_name, ', ' ORDER BY ordinal_position) AS columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('clients','contacts','orders','suppliers','products','product_scouting','operation_logs','projects')
GROUP BY table_name
ORDER BY table_name;
