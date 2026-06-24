# 项目流程 v3 — 生命周期驱动架构

## 改造目标
将 46 步销售流程做成项目详情页的主导航驱动，而不仅仅是独立 tab 的复选框。

## 架构变化

### 之前 (v2)
- `projects-view` 中多 sub-tab 按钮切换面板
- 流程是独立 tab，点一下打勾，和招投标/合同/交付/收款无任何关联

### 之后 (v3)
- 项目列表页不变（`project-list-panel`）
- **点任意项目卡片 → 进入 `project-workbench`**（全屏工作台）
  - **顶部条**：返回按钮 + 项目名 + 当前步骤 + 进度条 + 百分比
  - **左侧 250px**：流程导航（按阶段分组可折叠），每步骤显示状态徽章（判断/分支/结束）
  - **右侧 flex:1**：根据点击的步骤显示对应的操作面板

### 步骤状态
- `active`：当前推进到的步骤，蓝色高亮
- `done`：已完成，灰色+划线
- `skipped`：被判断分支跳过的步骤，半透明不可交互
- `pending`：正常显示但不可点击

### 判断节点交互
步骤 5（参与决策）、9（内部审核）、20（是否借壳）、27（标签协议）、28（提前施工函）点击时弹出选择弹窗：
- **是**：标记完成，跳转到是分支，自动标记另一分支为 skipped
- **否**：标记完成，跳转到否分支，自动标记另一分支为 skipped

### 步骤→面板映射
| 步骤范围 | 面板 | 内容 |
|---|---|---|
| 10-11 | basic | 项目基本信息卡片 |
| 3-4 | competitor | 竞争对手名单+竞争分析笔记 |
| 15-16 | decision_chain | 决策链成员+汇报策略 |
| 19-20 | tender | 招标方式/金额/日期/要点 |
| 21-37 | bidding | 招投标模块（复用现有功能） |
| 38-41 | contract | 合同模块 |
| 42-44 | delivery | 交付模块 |
| 45 | payment | 收款模块 |
| 其他 | editor | 通用备注框+标记完成按钮 |

### 数据结构
projects 表已存在的字段：
- `workflow` JSONB：每步骤 `{done: bool, note: string, data: json}`
- `current_step` INT：当前推进到第几步

需要手动执行 ADD COLUMN（如果还没有）：
```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS workflow JSONB DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS current_step INT DEFAULT 1;
```

## 文件修改
- `index.html`：`projects-view` HTML 全部重写 + CSS 新增 workbench 样式 + JS 项目管理模块全部重写

## 已知待完善
- 招投标/合同/交付/收款的实际表单弹窗已有独立函数，workbench 面板中复用了列表渲染，但新建/编辑按钮仍是占位 toast
- 项目卡片列表中显示了流程进度百分比
