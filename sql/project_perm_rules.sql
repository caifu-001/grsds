-- ============================================================
-- 项目流程权限规则 (v1)
-- 实施日期: 2026-06-29
-- 说明: 大公司流程管理权限 = 项目所有者/部门分配/角色三层
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

-- 2. project_assignments: 项目-人员-部门 绑定 (多对多)
CREATE TABLE IF NOT EXISTS project_assignments (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,                   -- 冗余便于查询
  department TEXT,                   -- 技术部/实施部/销售部/财务部/法务部
  project_role TEXT DEFAULT 'view'   -- view/edit/approve
    CHECK (project_role IN ('view','edit','approve')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pa_project ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_pa_user ON project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_pa_dept ON project_assignments(department);

-- 3. project_block_state: 区块完成状态 (待办/已完成)
CREATE TABLE IF NOT EXISTS project_block_state (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  block_key TEXT,                    -- 区块唯一标识 (template step key)
  status TEXT DEFAULT 'pending'      -- pending/in_progress/done/skipped
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

-- project_assignments: 同公司用户可见，自己始终可见
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

-- project_block_state: 同项目人员可见
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

-- 5. 默认权限继承函数
-- 销售(owner) → 全部看 + 全部编辑
-- 部门成员(assignment) → 仅看分配部门的区块
-- 其他人 → 仅看 owner_id == self 的项目
CREATE OR REPLACE FUNCTION get_user_project_role(pid BIGINT)
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

GRANT EXECUTE ON FUNCTION get_user_project_role(BIGINT) TO authenticated;
