-- ============================================================
-- 项目流程节点审批 + 权限 + 人员流转
-- 执行方式：在 Supabase SQL Editor 中运行
-- ============================================================

-- 1. projects 表新增 workflow_state 列
ALTER TABLE projects ADD COLUMN IF NOT EXISTS workflow_state JSONB;

-- 注释
COMMENT ON COLUMN projects.workflow_state IS '流程审批运行时状态: {"1":{"status":"active","assignedTo":"uuid","approvedBy":"uuid","approvedAt":"ISO"},...}';
