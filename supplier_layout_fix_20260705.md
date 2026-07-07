# 2026-07-05 供应商页面布局修复 + 类别管理

## 问题
1. 供应商库页面 tab 跳到底部
2. 桌面端显示为手机大小
3. 新建供应商弹窗偏小（560px）
4. 供应商类别不可自定义

## 根因
`suppliers-view` 和 `purchase-view` 在 `inventory-view` DOM 外部，而 `res-tabs` 在内部。`switchResTab` 只切换 `.hidden`，不移动 DOM。

## 修复
- **DOM**: 两个面板移入 `inventory-view` 内部（`inv-ledger` 之后、`</div>` 闭合前）
- **弹性**: `.modal` 桌面端 max-width 560→720px，加 border-radius
- **类别管理**: 工具栏「📂 类别」按钮 → 面板展示/新增/删除 → localStorage 持久化 → 与数据合并 → 联动下拉

## Commit
`323ee0a` - push 成功，等待 Pages 部署
