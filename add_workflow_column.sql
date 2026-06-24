-- 项目流程字段
ALTER TABLE projects ADD COLUMN IF NOT EXISTS workflow JSONB DEFAULT '{}';
