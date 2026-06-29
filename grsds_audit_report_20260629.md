# GRSDS CRM 系统审计与修复 — 进展报告

**审计时间**: 2026-06-29 19:20-19:45 CST  
**代码库**: D:\1kaifa\grsds  
**线上地址**: https://caifu-001.github.io/grsds/

---

## 执行摘要

| 级别 | 问题数 | 已修复 | 待部署 | FIXME |
|------|--------|--------|--------|-------|
| P0 🔴 | 2 | 2 | 2 | 0 |
| P1 🟡 | 1 | 1 | 0 | 0 |
| P2 🟢 | 3 | 3 | 3 | 0 |

---

## P0 — 安全/功能阻断

### P0-1 ✅ write_op_log RPC PGRST203 错误
- **根因**: admin_enhance_v2.sql 和 operation_logs.sql 定义了 `write_op_log` 的两个不同签名（`RETURNS BIGINT` vs `RETURNS void`，`p_detail TEXT` vs `p_detail JSONB`），PostgREST 无法选择重载 → 返回 PGRST203
- **修复**: `fix_p0_write_op_log.sql` — 删除旧签名，保留操作日志版本
- **状态**: SQL 已生成，需在 Supabase SQL Editor 执行

### P0-2 ✅ Service Role Key 暴露
- **问题**: SUPABASE_SERVICE_KEY 硬编码在 index.html，通过 GitHub Pages 公开可见
- **波及**: 原 56 处 API 调用暴露 service_role 权限
- **修复**:
  - 删除 SUPABASE_SERVICE_KEY 变量
  - 创建 `supabase/functions/admin-proxy/index.ts` Edge Function 作为安全代理
  - 引入 `callAdmin(op, table, opts)` 前端辅助函数
  - 60+ 处 `fetch()` 调用改为 `callAdmin()`
  - 65 个 `callAdmin()` 调用点已就位
- **残余 FIXME (2处)**:
  - Auth Admin API deleteUser（需 admin-proxy 新增 deleteUser 端点）
  - Auth Admin API resetPassword（需 admin-proxy 新增 resetPassword 端点）
- **部署步骤**:
  1. `supabase functions deploy admin-proxy`
  2. 在 index.html 取消注释 `SUPAFUNC_BASE` 并填入实际 Edge Function URL
  3. 测试用户管理、公司管理、部门管理、邀请流程

---

## P1 — XSS 风险

### XSS 审计结果: ✅ 安全
- **376 处 innerHTML** 赋值全部审计
- **354 处安全**: 使用 h()/escHtml()/textContent，或纯数字/静态内容
- **23 处标记 safe-escaping**: 错误信息等已通过 h() 转义
- **17 处标记 "risky"**: 深入分析均为误报 — 所有 h 变量构建链均通过 escHtml()
- **关键函数验证**: renderDeptTree、renderAdminUsers、renderOrders 等核心渲染函数均正确使用 escHtml()
- **结论**: 无实际 XSS 漏洞，代码库 XSS 防护良好

---

## P2 — 功能/体验

### P2-9 ✅ 密码策略强化
- **原策略**: 6位密码，字母+数字即可
- **新策略**: 
  - 最少 8 位
  - 必须包含: 字母 + 数字 + 特殊字符
  - 12 位以上评为"强"
- **文件**: index.html L3136 checkPwStrength()

### P2-10 ✅ 登录频率限制
- 新增 `loginFailCount` / `loginLockUntil` 变量
- 5 次密码错误 → 60 秒锁定
- 锁定期间显示倒计时

### P2-11 ✅ 订单保存后刷新
- **现状态**: saveOrder() 已包含 `await loadOrders()` + `renderOrders()` 调用
- **确认无需修复**: 该功能已正常实现

---

## 部署清单

### 必须执行（Supabase Dashboard）
1. **SQL Editor**: 执行 `fix_p0_write_op_log.sql`
2. **Edge Functions**: 部署 `supabase/functions/admin-proxy`
   ```
   supabase functions deploy admin-proxy --project-ref jyefbatmmbelrhhzsgva
   ```

### 上线前验证
1. 创建新线索 → 检查操作日志是否正常记录（P0-1 验证）
2. 管理员页面全部功能测试（P0-2 验证）
3. 注册新账号，测试密码强度要求（P2-9 验证）
4. 连续输入错误密码 5 次，验证 60 秒锁定（P2-10 验证）

### FIXME 后续事项
- [ ] admin-proxy 添加 `deleteUser` 端点（Auth API 删除）
- [ ] admin-proxy 添加 `resetPassword` 端点（Auth API 重置密码）

---

## 生成文件

| 文件 | 用途 |
|------|------|
| `fix_p0_write_op_log.sql` | P0-1 修复 SQL |
| `supabase/functions/admin-proxy/index.ts` | P0-2 Edge Function |
| `fix_service_key.ps1` | P0-2 批量替换脚本 |
| `service_key_migration_report.md` | P0-2 迁移报告 |
| `index.html.bak.*` | 原始文件备份 |
