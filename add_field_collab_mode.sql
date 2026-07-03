-- 步骤字段：增加串行/并行协作模式
-- 执行前确保 project_step_fields 表已存在

-- 1. 新增字段
ALTER TABLE project_step_fields ADD COLUMN IF NOT EXISTS collaboration_mode varchar(20) DEFAULT 'parallel';
ALTER TABLE project_step_fields ADD COLUMN IF NOT EXISTS depends_on varchar(100);
ALTER TABLE project_step_fields ADD COLUMN IF NOT EXISTS assigned_to_type varchar(20) DEFAULT 'role';
ALTER TABLE project_step_fields ADD COLUMN IF NOT EXISTS assigned_to_role varchar(50);
ALTER TABLE project_step_fields ADD COLUMN IF NOT EXISTS assigned_to_user_id uuid;

-- 2. 说明
-- collaboration_mode: 'parallel'（并行，所有字段同时可见）| 'serial'（串行，按sort_order依次填写）
-- depends_on: 串行模式下，前一个字段的 field_key（第一个字段为空）
-- assigned_to_type: 'role'（按角色分配）| 'user'（指定人员）
-- assigned_to_role: 业务角色（sales/pre_sales/after_sales/procurement/finance/legal/admin）
-- assigned_to_user_id: 指定人员的 user_id
