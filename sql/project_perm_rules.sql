-- ============================================================
-- 项目流程权限规则 (v2 - 修正 projects.id UUID 类型)
-- 实施日期: 2026-06-29
-- ============================================================

-- 1. projects 表扩展
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS department_id BIGINT REFERENCES departments(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS current_state TEXT DEFAULT 'todo'
  CHECK (current_state IN ('todo','doing','done','archived'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_state ON projects(current_state);
CREATE INDEX IF NOT EXISTS idx_projects_dept ON projects(department_id);

-- 2. project_assignments: 项目-人员-部门 绑定 (projects.id 为 UUID)
CREATE TABLE IF NOT EXISTS project_assignments (
  id BIGSERIAL PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  department TEXT,
  project_role TEXT DEFAULT 'view'
    CHECK (project_role IN ('view','edit','approve')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pa_project ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_pa_user ON project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_pa_dept ON project_assignments(department);

-- 3. project_block_state: 区块完成状态
CREATE TABLE IF NOT EXISTS project_block_state (
  id BIGSERIAL PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  block_key TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','done','skipped')),
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, block_key)
);

CREATE INDEX IF NOT EXISTS idx_pbs_project ON project_block_state(project_id);
CREATE INDEX IF NOT EXISTS idx_pbs_status ON project_block_state(status);

-- 4. RLS 策略
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_block_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pa_select ON project_assignments;
CREATE POLICY pa_select ON project_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_assignments.project_id
          AND p.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  OR user_id = auth.uid()
);

DROP POLICY IF EXISTS pa_modify ON project_assignments;
CREATE POLICY pa_modify ON project_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_assignments.project_id
          AND (p.owner_id = auth.uid()
               OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))))
);

DROP POLICY IF EXISTS pbs_select ON project_block_state;
CREATE POLICY pbs_select ON project_block_state FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_block_state.project_id
          AND p.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
);

DROP POLICY IF EXISTS pbs_modify ON project_block_state;
CREATE POLICY pbs_modify ON project_block_state FOR ALL USING (
  EXISTS (SELECT 1 FROM project_assignments pa
          WHERE pa.project_id = project_block_state.project_id
          AND pa.user_id = auth.uid()
          AND pa.project_role IN ('edit','approve'))
);

-- 5. 权限继承函数 (UUID 参数)
CREATE OR REPLACE FUNCTION get_user_project_role(pid UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_owner UUID;
  v_company UUID;
  v_role TEXT;
  v_global_role TEXT;
BEGIN
  SELECT owner_id, company_id INTO v_owner, v_company
  FROM projects WHERE id = pid;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT role INTO v_global_role FROM profiles WHERE id = v_uid;
  IF v_global_role IN ('super_admin','admin') THEN RETURN 'admin'; END IF;

  IF v_owner = v_uid THEN RETURN 'owner'; END IF;

  SELECT project_role INTO v_role
  FROM project_assignments
  WHERE project_id = pid AND user_id = v_uid
  LIMIT 1;
  RETURN COALESCE(v_role, 'none');
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_project_role(UUID) TO authenticated;
