-- 修复 template_id 为 NULL 的项目步骤配置
-- 使用默认模板或从 projects.workflow 字段提取

-- 为没有步骤数据的项目（包括 template_id 为 NULL 的）创建默认步骤
INSERT INTO project_step_assignees (project_id, step_key, step_label, assignee_type, assignee_role, reviewer_type, reviewer_role)
SELECT 
  p.id AS project_id,
  'step_' || i AS step_key,
  COALESCE(
    -- 尝试从 projects.workflow 提取步骤名
    (p.workflow->i->>'label'),
    -- 或使用默认步骤名
    CASE i
      WHEN 0 THEN '搜集线索'
      WHEN 1 THEN '分析与验证'
      WHEN 2 THEN '竞争对手分析'
      WHEN 3 THEN '内部赋能'
      WHEN 4 THEN '需求挖掘'
      WHEN 5 THEN '技术交流'
      WHEN 6 THEN '方案编制'
      WHEN 7 THEN '标书编制'
      WHEN 8 THEN '封装盖章'
      WHEN 9 THEN '财务审核'
      WHEN 10 THEN '法务审核'
      WHEN 11 THEN '合同签署'
      WHEN 12 THEN '工期排定'
      WHEN 13 THEN '交付实施'
      WHEN 14 THEN '文档移交'
      WHEN 15 THEN '客户签收'
      WHEN 16 THEN '开票申请'
      WHEN 17 THEN '回款管理'
      ELSE '步骤 ' || (i+1)
    END
  ) AS step_label,
  'role' AS assignee_type,
  CASE 
    WHEN i IN (0,1) THEN 'sales'
    WHEN i IN (2,3,4,5,6,7) THEN 'pre_sales'
    WHEN i IN (8) THEN 'procurement'
    WHEN i IN (9,16,17) THEN 'finance'
    WHEN i IN (10) THEN 'legal'
    WHEN i IN (11,12,13,14,15) THEN 'after_sales'
    ELSE 'admin'
  END AS assignee_role,
  'role' AS reviewer_type,
  'admin' AS reviewer_role
FROM projects p
CROSS JOIN generate_series(0, 17) AS i  -- 默认18个步骤
WHERE NOT EXISTS (
  SELECT 1 FROM project_step_assignees psa 
  WHERE psa.project_id = p.id
)
ON CONFLICT (project_id, step_key) DO NOTHING;

-- 查看为哪些项目插入了数据
SELECT p.id, p.name, p.template_id, COUNT(psa.step_key) as step_count
FROM projects p
LEFT JOIN project_step_assignees psa ON psa.project_id = p.id
WHERE p.id = '421c3f6b-8984-4974-a8df-04b05dc9cfe6'
GROUP BY p.id, p.name, p.template_id;
