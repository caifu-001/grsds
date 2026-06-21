-- operation_logs 操作日志表 + RPC
-- ⚠️ 请复制到 Supabase SQL Editor 全选执行

-- 1. 建表
CREATE TABLE IF NOT EXISTS operation_logs (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT,
  user_id UUID,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oplog_company ON operation_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oplog_entity ON operation_logs(entity_type, entity_id);

-- 2. RPC: 供前端 writeOpLog() 调用（使用 service_key，参数全由前端传入）
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

-- 3. 数据库触发器（自动记录 INSERT/UPDATE/DELETE，仅对有 name 列的表生效）
CREATE OR REPLACE FUNCTION trg_audit_operation()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id BIGINT;
  v_entity_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_company_id := NEW.company_id;
    v_entity_name := NEW.name;
  ELSIF TG_OP = 'UPDATE' THEN
    v_company_id := NEW.company_id;
    v_entity_name := NEW.name;
  ELSE
    v_company_id := OLD.company_id;
    v_entity_name := OLD.name;
  END IF;
  INSERT INTO operation_logs(company_id, user_id, user_name, action, entity_type, entity_id, entity_name, detail)
  VALUES (
    v_company_id,
    auth.uid(),
    (SELECT display_name FROM profiles WHERE user_id = auth.uid()),
    LOWER(TG_OP::TEXT),
    TG_ARGV[0],
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT ELSE NEW.id::TEXT END,
    v_entity_name,
    CASE WHEN TG_OP = 'UPDATE'
      THEN jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))
      WHEN TG_OP = 'INSERT' THEN row_to_json(NEW)::jsonb
      ELSE row_to_json(OLD)::jsonb
    END
  );
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: 列出所有用户（供超级管理员页使用）
CREATE OR REPLACE FUNCTION list_all_users()
RETURNS TABLE(
  user_id UUID,
  display_name TEXT,
  email TEXT,
  role TEXT,
  dept_id BIGINT,
  data_scope TEXT,
  status TEXT,
  phone TEXT,
  position TEXT,
  company_id BIGINT
) AS $$
BEGIN
  RETURN QUERY SELECT
    p.user_id, p.display_name, p.email, p.role,
    p.dept_id, p.data_scope,
    COALESCE(p.status, 'active') AS status,
    p.phone, p.position, p.company_id
  FROM profiles p;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 挂触发器
DROP TRIGGER IF EXISTS trg_audit_clients ON clients;
CREATE TRIGGER trg_audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION trg_audit_operation('client');

DROP TRIGGER IF EXISTS trg_audit_contacts ON contacts;
CREATE TRIGGER trg_audit_contacts
  AFTER INSERT OR UPDATE OR DELETE ON contacts
  FOR EACH ROW EXECUTE FUNCTION trg_audit_operation('contact');

DROP TRIGGER IF EXISTS trg_audit_orders ON orders;
CREATE TRIGGER trg_audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_audit_operation('order');
