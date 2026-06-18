-- ================================
-- 协同办公模块 (Collab Office Module)
-- 执行方式: Supabase SQL Editor 全选执行
-- ================================

-- 1. 日程管理 (Schedules)
CREATE TABLE IF NOT EXISTS schedules (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  location TEXT,
  repeat_type TEXT DEFAULT 'none',
  color TEXT DEFAULT '#4F6EF7',
  visibility TEXT DEFAULT 'team',
  related_client_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 任务管理 (Tasks)
CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'todo',
  due_date DATE,
  assigned_to UUID,
  assigned_by UUID NOT NULL,
  related_client_id BIGINT,
  reminder_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 审批模板 (Approval Templates)
CREATE TABLE IF NOT EXISTS approval_templates (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 审批实例 (Approval Requests)
CREATE TABLE IF NOT EXISTS approval_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT NOT NULL,
  template_id BIGINT,
  requestor_id UUID NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  content JSONB DEFAULT '{}',
  related_id BIGINT,
  status TEXT DEFAULT 'pending',
  current_step INT DEFAULT 1,
  total_steps INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 审批操作记录 (Approval Actions)
CREATE TABLE IF NOT EXISTS approval_actions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT NOT NULL,
  request_id BIGINT NOT NULL,
  approver_id UUID NOT NULL,
  action TEXT NOT NULL,
  comment TEXT,
  step INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 客户协作评论 (Client Comments)
CREATE TABLE IF NOT EXISTS client_comments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT NOT NULL,
  client_id BIGINT NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  visibility TEXT DEFAULT 'team',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================
-- RLS Policies
-- ================================

-- schedules RLS
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY schedules_select ON schedules FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR is_super_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY schedules_insert ON schedules FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR is_super_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY schedules_update ON schedules FOR UPDATE USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR is_super_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY schedules_delete ON schedules FOR DELETE USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR is_super_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- tasks RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY tasks_select ON tasks FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR is_super_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY tasks_insert ON tasks FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR is_super_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY tasks_update ON tasks FOR UPDATE USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR is_super_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY tasks_delete ON tasks FOR DELETE USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR is_super_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- approval_templates RLS
ALTER TABLE approval_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY approval_templates_select ON approval_templates FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR is_super_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY approval_templates_insert ON approval_templates FOR INSERT WITH CHECK ((current_user_role(auth.uid()) = 'admin' AND company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())) OR is_super_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY approval_templates_update ON approval_templates FOR UPDATE USING ((current_user_role(auth.uid()) = 'admin' AND company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())) OR is_super_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY approval_templates_delete ON approval_templates FOR DELETE USING ((current_user_role(auth.uid()) = 'admin' AND company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())) OR is_super_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- approval_requests RLS
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY approval_requests_select ON approval_requests FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR is_super_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY approval_requests_insert ON approval_requests FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR is_super_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY approval_requests_update ON approval_requests FOR UPDATE USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR is_super_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY approval_requests_delete ON approval_requests FOR DELETE USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR is_super_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- approval_actions RLS
ALTER TABLE approval_actions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY approval_actions_select ON approval_actions FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR is_super_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY approval_actions_insert ON approval_actions FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR is_super_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- client_comments RLS
ALTER TABLE client_comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY client_comments_select ON client_comments FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR is_super_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY client_comments_insert ON client_comments FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR is_super_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY client_comments_delete ON client_comments FOR DELETE USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()) OR is_super_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Need is_super_admin and current_user_role functions if not exists
CREATE OR REPLACE FUNCTION is_super_admin(uid uuid) RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE user_id = uid AND role = 'super_admin');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_role(uid uuid) RETURNS text AS $$
  SELECT role FROM profiles WHERE user_id = uid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_schedules_company_user ON schedules(company_id, user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_start ON schedules(start_time);
CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_approval_requests_company ON approval_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_client_comments_client ON client_comments(client_id);

NOTIFY pgrst, 'reload schema';
