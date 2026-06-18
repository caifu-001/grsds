-- After-Sales Customer Service Module
-- 4 sub-modules: Tickets, Visits, Warranty/Maintenance, Knowledge Base

-- ============================================================
-- 1. 工单系统 (Service Tickets)
-- ============================================================
CREATE TABLE IF NOT EXISTS service_tickets (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL,
  client_id BIGINT,
  ticket_no TEXT,
  type TEXT DEFAULT 'service' CHECK (type IN ('complaint','repair','service','other')),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('urgent','high','normal','low')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','dispatched','in_progress','completed','confirmed','closed')),
  assigned_to UUID REFERENCES auth.users(id),
  engineer_name TEXT,
  service_start TIMESTAMPTZ,
  service_end TIMESTAMPTZ,
  service_notes TEXT,
  completion_notes TEXT,
  satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
  satisfaction_feedback TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_actions (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT REFERENCES service_tickets(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('created','dispatched','started','note','completed','confirmed','closed','reopened')),
  action_by UUID REFERENCES auth.users(id),
  action_by_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. 客户回访 (Client Visits)
-- ============================================================
CREATE TABLE IF NOT EXISTS client_visits (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL,
  client_id BIGINT,
  visit_type TEXT DEFAULT 'care' CHECK (visit_type IN ('post_sale','care','churn','other')),
  visit_method TEXT DEFAULT 'phone' CHECK (visit_method IN ('phone','email','visit','wechat','other')),
  title TEXT,
  planned_date DATE,
  actual_date DATE,
  content TEXT,
  result TEXT,
  satisfaction INTEGER CHECK (satisfaction BETWEEN 1 AND 5),
  follow_up_needed BOOLEAN DEFAULT false,
  next_visit_date DATE,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned','completed','cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visit_tasks (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL,
  client_id BIGINT,
  visit_id BIGINT REFERENCES client_visits(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  task_type TEXT DEFAULT 'care' CHECK (task_type IN ('post_sale','care','churn','custom')),
  trigger_event TEXT,
  scheduled_date DATE NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled')),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. 质保/维保管理 (Warranty & Maintenance)
-- ============================================================
CREATE TABLE IF NOT EXISTS warranties (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL,
  client_id BIGINT,
  product_id BIGINT,
  product_name TEXT NOT NULL,
  serial_no TEXT,
  warranty_start DATE,
  warranty_end DATE,
  warranty_type TEXT DEFAULT 'standard' CHECK (warranty_type IN ('standard','extended','free','paid')),
  terms TEXT,
  contract_id BIGINT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','expired','void','claimed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS maintenance_plans (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL,
  client_id BIGINT,
  warranty_id BIGINT REFERENCES warranties(id) ON DELETE SET NULL,
  product_name TEXT,
  plan_type TEXT DEFAULT 'preventive' CHECK (plan_type IN ('preventive','corrective','inspection','upgrade')),
  schedule_interval TEXT DEFAULT 'monthly',
  last_maintenance DATE,
  next_maintenance DATE,
  assigned_to UUID REFERENCES auth.users(id),
  notes TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','overdue','cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. 知识库 (Knowledge Base)
-- ============================================================
CREATE TABLE IF NOT EXISTS kb_articles (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL,
  category TEXT DEFAULT 'faq' CHECK (category IN ('faq','solution','script','policy','other')),
  title TEXT NOT NULL,
  content TEXT,
  tags TEXT[] DEFAULT '{}',
  related_products TEXT,
  view_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tickets_company ON service_tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_tickets_client ON service_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON service_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON service_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_visits_company ON client_visits(company_id);
CREATE INDEX IF NOT EXISTS idx_visits_client ON client_visits(client_id);
CREATE INDEX IF NOT EXISTS idx_visits_planned ON client_visits(planned_date);
CREATE INDEX IF NOT EXISTS idx_visit_tasks_assigned ON visit_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_visit_tasks_scheduled ON visit_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_warranties_client ON warranties(client_id);
CREATE INDEX IF NOT EXISTS idx_warranties_end ON warranties(warranty_end);
CREATE INDEX IF NOT EXISTS idx_maintenance_next ON maintenance_plans(next_maintenance);
CREATE INDEX IF NOT EXISTS idx_kb_category ON kb_articles(category);
CREATE INDEX IF NOT EXISTS idx_kb_company ON kb_articles(company_id);

-- ============================================================
-- RLS Policies (tenant isolation + permission system)
-- ============================================================
DO $$ BEGIN
  ALTER TABLE service_tickets ENABLE ROW LEVEL SECURITY;
  ALTER TABLE ticket_actions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE client_visits ENABLE ROW LEVEL SECURITY;
  ALTER TABLE visit_tasks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;
  ALTER TABLE maintenance_plans ENABLE ROW LEVEL SECURITY;
  ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Helper: check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$;

-- Helper: get user's company_id
CREATE OR REPLACE FUNCTION public.current_user_company()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Service Tickets RLS
DROP POLICY IF EXISTS "tickets_select" ON service_tickets;
CREATE POLICY "tickets_select" ON service_tickets FOR SELECT USING (
  public.is_super_admin() OR company_id = public.current_user_company()
);
DROP POLICY IF EXISTS "tickets_insert" ON service_tickets;
CREATE POLICY "tickets_insert" ON service_tickets FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "tickets_update" ON service_tickets;
CREATE POLICY "tickets_update" ON service_tickets FOR UPDATE USING (
  public.is_super_admin() OR company_id = public.current_user_company()
);
DROP POLICY IF EXISTS "tickets_delete" ON service_tickets;
CREATE POLICY "tickets_delete" ON service_tickets FOR DELETE USING (
  public.is_super_admin() OR company_id = public.current_user_company()
);

-- Ticket Actions RLS
DROP POLICY IF EXISTS "ticket_actions_select" ON ticket_actions;
CREATE POLICY "ticket_actions_select" ON ticket_actions FOR SELECT USING (true);
DROP POLICY IF EXISTS "ticket_actions_insert" ON ticket_actions;
CREATE POLICY "ticket_actions_insert" ON ticket_actions FOR INSERT WITH CHECK (true);

-- Client Visits RLS
DROP POLICY IF EXISTS "visits_select" ON client_visits;
CREATE POLICY "visits_select" ON client_visits FOR SELECT USING (
  public.is_super_admin() OR company_id = public.current_user_company()
);
DROP POLICY IF EXISTS "visits_insert" ON client_visits;
CREATE POLICY "visits_insert" ON client_visits FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "visits_update" ON client_visits;
CREATE POLICY "visits_update" ON client_visits FOR UPDATE USING (
  public.is_super_admin() OR company_id = public.current_user_company()
);
DROP POLICY IF EXISTS "visits_delete" ON client_visits;
CREATE POLICY "visits_delete" ON client_visits FOR DELETE USING (
  public.is_super_admin() OR company_id = public.current_user_company()
);

-- Visit Tasks RLS
DROP POLICY IF EXISTS "visit_tasks_select" ON visit_tasks;
CREATE POLICY "visit_tasks_select" ON visit_tasks FOR SELECT USING (
  public.is_super_admin() OR company_id = public.current_user_company()
);
DROP POLICY IF EXISTS "visit_tasks_insert" ON visit_tasks;
CREATE POLICY "visit_tasks_insert" ON visit_tasks FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "visit_tasks_update" ON visit_tasks;
CREATE POLICY "visit_tasks_update" ON visit_tasks FOR UPDATE USING (
  public.is_super_admin() OR company_id = public.current_user_company()
);
DROP POLICY IF EXISTS "visit_tasks_delete" ON visit_tasks;
CREATE POLICY "visit_tasks_delete" ON visit_tasks FOR DELETE USING (
  public.is_super_admin() OR company_id = public.current_user_company()
);

-- Warranties RLS
DROP POLICY IF EXISTS "warranties_select" ON warranties;
CREATE POLICY "warranties_select" ON warranties FOR SELECT USING (
  public.is_super_admin() OR company_id = public.current_user_company()
);
DROP POLICY IF EXISTS "warranties_insert" ON warranties;
CREATE POLICY "warranties_insert" ON warranties FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "warranties_update" ON warranties;
CREATE POLICY "warranties_update" ON warranties FOR UPDATE USING (
  public.is_super_admin() OR company_id = public.current_user_company()
);
DROP POLICY IF EXISTS "warranties_delete" ON warranties;
CREATE POLICY "warranties_delete" ON warranties FOR DELETE USING (
  public.is_super_admin() OR company_id = public.current_user_company()
);

-- Maintenance Plans RLS
DROP POLICY IF EXISTS "maintenance_select" ON maintenance_plans;
CREATE POLICY "maintenance_select" ON maintenance_plans FOR SELECT USING (
  public.is_super_admin() OR company_id = public.current_user_company()
);
DROP POLICY IF EXISTS "maintenance_insert" ON maintenance_plans;
CREATE POLICY "maintenance_insert" ON maintenance_plans FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "maintenance_update" ON maintenance_plans;
CREATE POLICY "maintenance_update" ON maintenance_plans FOR UPDATE USING (
  public.is_super_admin() OR company_id = public.current_user_company()
);
DROP POLICY IF EXISTS "maintenance_delete" ON maintenance_plans;
CREATE POLICY "maintenance_delete" ON maintenance_plans FOR DELETE USING (
  public.is_super_admin() OR company_id = public.current_user_company()
);

-- Knowledge Base RLS (all users in company can view)
DROP POLICY IF EXISTS "kb_select" ON kb_articles;
CREATE POLICY "kb_select" ON kb_articles FOR SELECT USING (
  public.is_super_admin() OR company_id = public.current_user_company()
);
DROP POLICY IF EXISTS "kb_insert" ON kb_articles;
CREATE POLICY "kb_insert" ON kb_articles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "kb_update" ON kb_articles;
CREATE POLICY "kb_update" ON kb_articles FOR UPDATE USING (
  public.is_super_admin() OR company_id = public.current_user_company()
);
DROP POLICY IF EXISTS "kb_delete" ON kb_articles;
CREATE POLICY "kb_delete" ON kb_articles FOR DELETE USING (
  public.is_super_admin() OR company_id = public.current_user_company()
);

-- Grants
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_user_company() TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
