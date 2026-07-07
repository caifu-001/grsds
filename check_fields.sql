-- 检查这个项目的字段配置
SELECT id, project_id, step_key, field_key, field_label, field_type, sort_order
FROM project_step_fields
WHERE project_id = '421c3f6b-8984-4974-a8df-04b05dc9cfe6'
ORDER BY step_key, sort_order;
