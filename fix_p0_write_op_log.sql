-- P0-1: 修复 write_op_log RPC PGRST203 错误
-- 问题: admin_enhance_v2.sql 和 operation_logs.sql 定义了两个不同签名的 write_op_log
--       PostgREST 无法选择 → 返回 300 Multiple Choices
-- 解决: 删除 admin_enhance_v2.sql 中的旧版本，保留 operation_logs.sql 版本
-- 运行: 复制到 Supabase Dashboard → SQL Editor → 全选执行

-- Step 1: 删除 admin_enhance_v2.sql 中返回 BIGINT 的旧版本
DROP FUNCTION IF EXISTS write_op_log(
  BIGINT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
);

-- Step 2: 确保 operation_logs.sql 版本存在且返回 void + p_detail JSONB
CREATE OR REPLACE FUNCTION write_op_log(
  p_company_id BIGINT,
  p_user_id UUID,
  p_user_name TEXT,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT DEFAULT '',
  p_entity_name TEXT DEFAULT '',
  p_detail JSONB DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO operation_logs(company_id, user_id, user_name, action, entity_type, entity_id, entity_name, detail)
  VALUES (p_company_id, p_user_id, p_user_name, p_action, p_entity_type, p_entity_id, p_entity_name, p_detail);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 验证: 运行此查询确认只剩一个 write_op_log
-- SELECT proname, pronargs, prorettype::regtype, pg_get_function_arguments(oid) 
-- FROM pg_proc WHERE proname = 'write_op_log';
-- 预期: 只有1行，prorettype = void
