## 字段串行/并行协作模式

### 数据库变更（需在 Supabase SQL Editor 执行）
文件：`add_field_collab_mode.sql`
- project_step_fields 新增字段：collaboration_mode, depends_on, assigned_to_type, assigned_to_role, assigned_to_user_id

### 前端改动

**renderPanelContent** — 渲染逻辑：
- 按 sort_order 排序字段
- 串行模式：第一个串行字段可填，后续字段需前一个字段保存后才解锁
- 串行字段显示 🔒 锁定图标和 🔗 提示栏
- 每个字段标签旁显示"串行"橙色标签

**savePanelData** — 保存逻辑：
- 忽略 disabled 的串行锁定字段
- 保存成功后自动 re-render（解锁下一步）

**loadPAFields / 字段配置UI**：
- 每个字段行新增"并行/串行"下拉切换（蓝色 select）
- updateFieldCollabMode() 写入 collaboration_mode 字段

### 行为
| 模式 | 效果 |
|------|------|
| 并行（默认）| 所有字段同时可填，多人可同时操作 |
| 串行 | 按 sort_order 依次填写，前一个保存后下一个解锁 |

### 待执行
- 在 Supabase 执行 add_field_collab_mode.sql
