-- operation_logs 操作日志表 + 触发器
-- 创建后去 Supabase SQL Editor 全选执行

-- 1. 建表
CREATE TABLE IF NOT EXISTS operation_logs (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT NOT NULL,        -- create/update/delete/export/login
  entity_type TEXT NOT NULL,   -- client/contact/order
  entity_id TEXT,
  entity_name TEXT,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oplog_company ON operation_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oplog_entity ON operation_logs(entity_type, entity_id);

-- 2. RPC: 供前端主动记录（如 export/login）
CREATE OR REPLACE FUNCTION log_operation(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_entity_name TEXT DEFAULT NULL,
  p_detail JSONB DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT display_name, company_id INTO v_profile FROM profiles WHERE user_id = auth.uid();
  INSERT INTO operation_logs(company_id, user_id, user_name, action, entity_type, entity_id, entity_name, detail)
  VALUES (v_profile.company_id, auth.uid(), v_profile.display_name, p_action, p_entity_type, p_entity_id, p_entity_name, p_detail);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 通用触发器函数
CREATE OR REPLACE FUNCTION trg_audit_operation()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id INTEGER;
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

-- 4. 挂触发器到核心表
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
