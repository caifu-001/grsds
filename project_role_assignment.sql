-- ============================================================
-- 项目成员角色分配 + 步骤指定审批人
-- 执行方式：在 Supabase SQL Editor 中运行
-- ============================================================

-- 1. 扩展 project_assignments 表，添加业务角色字段
ALTER TABLE project_assignments 
ADD COLUMN IF NOT EXISTS business_role TEXT 
  CHECK (business_role IN ('sales','pre_sales','after_sales','procurement','finance','legal','admin'));

COMMENT ON COLUMN project_assignments.business_role IS '业务角色: sales=销售, pre_sales=售前, after_sales=售后, procurement=采购, finance=财务, legal=法务, admin=管理员';

-- 2. 项目步骤审批人表（每个步骤指定具体人员或角色）
CREATE TABLE IF NOT EXISTS project_step_assignees (
  id BIGSERIAL PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,                    -- 如 'step_0', 'step_1'
  step_label TEXT,                           -- 步骤名称，如 '搜集线索'
  assignee_type TEXT DEFAULT 'role'          -- 'role'=按角色分配, 'user'=指定具体人员
    CHECK (assignee_type IN ('role','user')),
  assignee_role TEXT,                        -- 当 type='role' 时: sales/pre_sales/after_sales/procurement/finance/legal
  assignee_user_id UUID REFERENCES auth.users(id),  -- 当 type='user' 时
  assignee_user_email TEXT,                  -- 冗余存储，方便显示
  is_required BOOLEAN DEFAULT true,          -- 是否必须审批
  can_reassign BOOLEAN DEFAULT false,        -- 是否允许转交
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_psa_project ON project_step_assignees(project_id);
CREATE INDEX IF NOT EXISTS idx_psa_step ON project_step_assignees(step_key);
CREATE INDEX IF NOT EXISTS idx_psa_role ON project_step_assignees(assignee_role);

COMMENT ON TABLE project_step_assignees IS '项目各步骤的审批人配置';

-- 3. 项目步骤审批记录表（记录实际审批历史）
CREATE TABLE IF NOT EXISTS project_step_approvals (
  id BIGSERIAL PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  step_label TEXT,
  assignee_id UUID REFERENCES auth.users(id),     -- 被指派的审批人
  assignee_type TEXT,                             -- 'role' 或 'user'
  assignee_role TEXT,
  actor_id UUID REFERENCES auth.users(id),        -- 实际执行审批的人
  actor_email TEXT,
  action TEXT DEFAULT 'submit'                    -- submit/approve/reject/transfer/comment
    CHECK (action IN ('submit','approve','reject','transfer','comment')),
  comment TEXT,
  transferred_to UUID REFERENCES auth.users(id),  -- 转交给谁
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psap_project ON project_step_approvals(project_id);
CREATE INDEX IF NOT EXISTS idx_psap_step ON project_step_approvals(step_key);
CREATE INDEX IF NOT EXISTS idx_psap_actor ON project_step_approvals(actor_id);

COMMENT ON TABLE project_step_approvals IS '项目步骤审批历史记录';

-- 4. RLS 策略
ALTER TABLE project_step_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_step_approvals ENABLE ROW LEVEL SECURITY;

-- project_step_assignees 查询策略
DROP POLICY IF EXISTS psa_select ON project_step_assignees;
CREATE POLICY psa_select ON project_step_assignees FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_step_assignees.project_id
          AND p.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
);

-- project_step_assignees 修改策略（项目成员可修改）
DROP POLICY IF EXISTS psa_modify ON project_step_assignees;
CREATE POLICY psa_modify ON project_step_assignees FOR ALL USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_step_assignees.project_id
          AND (p.owner_id = auth.uid()
               OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin','super_admin'))
               OR EXISTS (SELECT 1 FROM project_assignments pa 
                         WHERE pa.project_id = project_step_assignees.project_id 
                         AND pa.user_id = auth.uid() 
                         AND pa.project_role IN ('edit','approve'))))
);

-- project_step_approvals 查询策略
DROP POLICY IF EXISTS psap_select ON project_step_approvals;
CREATE POLICY psap_select ON project_step_approvals FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_step_approvals.project_id
          AND p.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
);

-- project_step_approvals 修改策略
DROP POLICY IF EXISTS psap_modify ON project_step_approvals;
CREATE POLICY psap_modify ON project_step_approvals FOR ALL USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_step_approvals.project_id
          AND (p.owner_id = auth.uid()
               OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin','super_admin'))
               OR actor_id = auth.uid()))
);

-- 5. 获取项目步骤审批人函数
CREATE OR REPLACE FUNCTION get_step_assignee(pid UUID, step_key TEXT)
RETURNS TABLE (
  assignee_type TEXT,
  assignee_role TEXT,
  assignee_user_id UUID,
  assignee_user_email TEXT,
  assignee_display_name TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    psa.assignee_type,
    psa.assignee_role,
    psa.assignee_user_id,
    psa.assignee_user_email,
    p.display_name
  FROM project_step_assignees psa
  LEFT JOIN profiles p ON p.user_id = psa.assignee_user_id
  WHERE psa.project_id = pid AND psa.step_key = step_key;
END;
$$;

-- 6. 获取用户在项目中的业务角色函数
CREATE OR REPLACE FUNCTION get_user_business_role(pid UUID, uid UUID DEFAULT auth.uid())
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT business_role INTO v_role
  FROM project_assignments
  WHERE project_id = pid AND user_id = uid
  LIMIT 1;
  RETURN v_role;
END;
$$;

-- 7. 检查用户是否可以审批某步骤
CREATE OR REPLACE FUNCTION can_approve_step(pid UUID, step_key TEXT, uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_assignee_type TEXT;
  v_assignee_role TEXT;
  v_assignee_user_id UUID;
  v_user_business_role TEXT;
  v_is_admin BOOLEAN;
BEGIN
  -- 检查是否管理员
  SELECT role IN ('admin','super_admin') INTO v_is_admin
  FROM profiles WHERE user_id = uid;
  
  IF v_is_admin THEN RETURN true; END IF;
  
  -- 获取步骤配置
  SELECT assignee_type, assignee_role, assignee_user_id
  INTO v_assignee_type, v_assignee_role, v_assignee_user_id
  FROM project_step_assignees
  WHERE project_id = pid AND step_key = step_key;
  
  IF NOT FOUND THEN RETURN false; END IF;
  
  -- 按用户分配
  IF v_assignee_type = 'user' AND v_assignee_user_id = uid THEN
    RETURN true;
  END IF;
  
  -- 按角色分配
  IF v_assignee_type = 'role' THEN
    SELECT business_role INTO v_user_business_role
    FROM project_assignments
    WHERE project_id = pid AND user_id = uid;
    
    IF v_user_business_role = v_assignee_role THEN
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION get_step_assignee(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_business_role(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_approve_step(UUID, TEXT, UUID) TO authenticated;

-- 8. 创建触发器：自动从模板初始化步骤审批人
CREATE OR REPLACE FUNCTION init_project_step_assignees()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_template_id BIGINT;
  v_steps JSONB;
  v_step JSONB;
  v_step_key TEXT;
  v_step_label TEXT;
  v_default_role TEXT;
BEGIN
  -- 获取项目使用的模板
  SELECT template_id INTO v_template_id
  FROM projects WHERE id = NEW.project_id;
  
  IF v_template_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- 获取模板步骤
  SELECT steps INTO v_steps
  FROM workflow_templates WHERE id = v_template_id;
  
  IF v_steps IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- 为每个步骤创建默认审批人配置
  FOR i IN 0..jsonb_array_length(v_steps)-1 LOOP
    v_step := v_steps->i;
    v_step_key := 'step_' || i;
    v_step_label := v_step->>'label';
    
    -- 根据步骤类型设置默认角色
    v_default_role := CASE 
      WHEN v_step_label LIKE '%线索%' OR v_step_label LIKE '%商机%' THEN 'sales'
      WHEN v_step_label LIKE '%分析%' OR v_step_label LIKE '%方案%' OR v_step_label LIKE '%技术%' THEN 'pre_sales'
      WHEN v_step_label LIKE '%交付%' OR v_step_label LIKE '%实施%' OR v_step_label LIKE '%培训%' THEN 'after_sales'
      WHEN v_step_label LIKE '%采购%' OR v_step_label LIKE '%盖章%' THEN 'procurement'
      WHEN v_step_label LIKE '%财务%' OR v_step_label LIKE '%回款%' OR v_step_label LIKE '%开票%' THEN 'finance'
      WHEN v_step_label LIKE '%法务%' OR v_step_label LIKE '%合同审核%' THEN 'legal'
      ELSE 'admin'
    END;
    
    INSERT INTO project_step_assignees (project_id, step_key, step_label, assignee_type, assignee_role)
    VALUES (NEW.project_id, v_step_key, v_step_label, 'role', v_default_role)
    ON CONFLICT (project_id, step_key) DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- 创建触发器：当项目创建时自动初始化步骤审批人
DROP TRIGGER IF EXISTS tr_init_step_assignees ON projects;
CREATE TRIGGER tr_init_step_assignees
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION init_project_step_assignees();

-- 9. 创建视图：项目步骤审批状态汇总
CREATE OR REPLACE VIEW project_step_status AS
SELECT 
  p.id AS project_id,
  p.name AS project_name,
  psa.step_key,
  psa.step_label,
  psa.assignee_type,
  psa.assignee_role,
  psa.assignee_user_id,
  psa.assignee_user_email,
  pa.action AS last_action,
  pa.actor_email AS last_actor,
  pa.comment AS last_comment,
  pa.created_at AS last_action_at,
  CASE 
    WHEN pa.action = 'approve' THEN 'approved'
    WHEN pa.action = 'reject' THEN 'rejected'
    WHEN pa.action = 'submit' THEN 'pending'
    ELSE 'waiting'
  END AS status
FROM projects p
JOIN project_step_assignees psa ON psa.project_id = p.id
LEFT JOIN LATERAL (
  SELECT * FROM project_step_approvals 
  WHERE project_id = p.id AND step_key = psa.step_key
  ORDER BY created_at DESC LIMIT 1
) pa ON true;

COMMENT ON VIEW project_step_status IS '项目各步骤的审批状态汇总视图';

-- 10. 初始化现有项目的步骤审批人（如果有现有项目）
INSERT INTO project_step_assignees (project_id, step_key, step_label, assignee_type, assignee_role)
SELECT 
  p.id AS project_id,
  'step_' || i AS step_key,
  (t.steps->i->>'label') AS step_label,
  'role' AS assignee_type,
  CASE 
    WHEN (t.steps->i->>'label') LIKE '%线索%' OR (t.steps->i->>'label') LIKE '%商机%' THEN 'sales'
    WHEN (t.steps->i->>'label') LIKE '%分析%' OR (t.steps->i->>'label') LIKE '%方案%' OR (t.steps->i->>'label') LIKE '%技术%' THEN 'pre_sales'
    WHEN (t.steps->i->>'label') LIKE '%交付%' OR (t.steps->i->>'label') LIKE '%实施%' OR (t.steps->i->>'label') LIKE '%培训%' THEN 'after_sales'
    WHEN (t.steps->i->>'label') LIKE '%采购%' OR (t.steps->i->>'label') LIKE '%盖章%' THEN 'procurement'
    WHEN (t.steps->i->>'label') LIKE '%财务%' OR (t.steps->i->>'label') LIKE '%回款%' OR (t.steps->i->>'label') LIKE '%开票%' THEN 'finance'
    WHEN (t.steps->i->>'label') LIKE '%法务%' OR (t.steps->i->>'label') LIKE '%合同审核%' THEN 'legal'
    ELSE 'admin'
  END AS assignee_role
FROM projects p
JOIN workflow_templates t ON t.id = p.template_id
CROSS JOIN generate_series(0, COALESCE(jsonb_array_length(t.steps)-1, 0)) AS i
WHERE t.steps IS NOT NULL
ON CONFLICT (project_id, step_key) DO NOTHING;

-- 完成
SELECT '项目成员角色分配 + 步骤审批人功能已创建' AS result;
