-- 手动初始化项目步骤配置（如果触发器未生效）
-- 为指定项目创建步骤配置

-- 先检查表是否存在
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_step_assignees') THEN
    RAISE EXCEPTION 'project_step_assignees 表不存在，请先执行 project_role_assignment.sql';
  END IF;
END $$;

-- 为所有没有步骤配置的项目初始化
INSERT INTO project_step_assignees (project_id, step_key, step_label, assignee_type, assignee_role, reviewer_type, reviewer_role)
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
  END AS assignee_role,
  'role' AS reviewer_type,
  'admin' AS reviewer_role
FROM projects p
JOIN workflow_templates t ON t.id = p.template_id
CROSS JOIN generate_series(0, COALESCE(jsonb_array_length(t.steps)-1, 0)) AS i
WHERE t.steps IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM project_step_assignees psa 
    WHERE psa.project_id = p.id AND psa.step_key = 'step_' || i
  )
ON CONFLICT (project_id, step_key) DO NOTHING;

SELECT '项目步骤配置已初始化' AS result;
