-- 步骤审批人 + 查阅人分离
-- 在 Supabase SQL Editor 中运行

ALTER TABLE project_step_assignees
ADD COLUMN IF NOT EXISTS reviewer_type TEXT DEFAULT 'role'
  CHECK (reviewer_type IN ('role','user')),
ADD COLUMN IF NOT EXISTS reviewer_role TEXT,
ADD COLUMN IF NOT EXISTS reviewer_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewer_user_email TEXT;

COMMENT ON COLUMN project_step_assignees.assignee_type IS '审批人类型: role=按角色, user=指定人员';
COMMENT ON COLUMN project_step_assignees.assignee_role IS '审批人角色: sales/pre_sales/after_sales/procurement/finance/legal/admin';
COMMENT ON COLUMN project_step_assignees.assignee_user_id IS '审批人(指定具体人员时)';
COMMENT ON COLUMN project_step_assignees.reviewer_type IS '查阅人类型: role=按角色, user=指定人员';
COMMENT ON COLUMN project_step_assignees.reviewer_role IS '查阅人角色: sales/pre_sales/after_sales/procurement/finance/legal/admin';
COMMENT ON COLUMN project_step_assignees.reviewer_user_id IS '查阅人(指定具体人员时)';

SELECT '审批人 + 查阅人字段已添加' AS result;
