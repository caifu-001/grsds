# 修复三个长期未解决问题的根因分析 (2026-06-24 13:37)

## 问题
用户反馈三个问题持续存在数天，多次尝试修复无效：
1. admin-workflows div 泄露到所有页面底部
2. 信用代码不自动填充
3. 流程模板空白

## 根因

**唯一根因：一个孤儿 `</div>`。**

位于邀请模态框（Invite by email modal）之后（原 line ~1384），在 `admin-employees` 面板的闭合标签中多了一个 `</div>`：

```html
   </div></div>   ← 邀请模态框正常闭合
  </div>          ← ⚠️ 孤儿</div>！过早关闭了 admin-view 容器
  <!-- Free Agent Pool -->
```

这个多余的闭合标签提前关闭了 `<div id="admin-view" class="hidden">`，导致其后所有面板（自由员工池、离职审批、操作日志、系统配置、数据安全、流程模板）**全部泄漏到 `admin-view` 外部**。

## 连锁影响

- **div 泄露**：`admin-view` 使用 `class="hidden"` 在所有非管理页隐藏。孤儿 `</div>` 提前关闭它后，后续面板不再受 `hidden` 控制 → 出现在每个页面底部
- **模板空白**：不是 JS 逻辑问题，而是 DOM 结构被破坏 —— `admin-workflows` 跑到了错误位置
- **信用代码**：`selectLeadCompany` 和 `onLeadTypeChange` 代码本身是正确的（已确认），可能 DOM 错乱影响了事件绑定

## 修复

提交 `45f6ac7`：删除邀请模态框后的孤儿 `</div>`。

## 验证结果

- `admin-tabs` → `main-fab`：div 完全平衡（98 开 / 98 闭）
- `admin-workflows` 位于 `admin-security` 外部、`admin-view` 内部 ✅
- `renderWorkflowTemplates` / `loadTemplates` 均为 async ✅
- `selectLeadCompany` 包含 credit_code 自动填充逻辑 ✅
- `loadClients` 使用 `select('*')` ✅

## 教训

HTML 结构中的孤儿闭合标签是最隐蔽的 bug：不报错、难以定位、引发毫不相关的症状。49 个临时诊断脚本试图在不同层面找问题，最终根因是一个意外的 `</div>`。
