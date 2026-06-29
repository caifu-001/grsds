# GRSDS CRM 修复 — 当前状态与下一步

**时间**: 2026-06-29 19:55

## 已完成 ✅

| 项目 | 详情 |
|------|------|
| P0-1 RPC 修复 SQL | `fix_p0_write_op_log.sql` — 需在 Supabase SQL Editor 执行 |
| P0-2 Service Key 前端迁移 | 65 处 `callAdmin()` 已就位，SUPAFUNC_BASE 已激活 |
| P0-2 安全代理函数 | `supabase/functions/admin-proxy/index.ts` — 零依赖版本（纯 fetch） |
| P1 XSS 审计 | 确认无实际漏洞，代码已有完善防护 |
| P2-9 密码策略 | 8位+字母+数字+特殊字符 |
| P2-10 登录频率限制 | 5次错误 → 60秒锁定 |

## 待操作 ⚠️（需你手动完成）

### 1. 执行 SQL → Supabase Dashboard SQL Editor
打开 `D:\1kaifa\grsds\fix_p0_write_op_log.sql`，全选粘贴执行

### 2. 部署 Edge Function
两种方式任选其一：

**方式 A — Dashboard 手动（推荐）**:
- Supabase Dashboard → Edge Functions
- 找到 `admin-proxy` → 编辑
- 把 `supabase/functions/admin-proxy/index.ts` 内容粘贴进去
- Deploy

**方式 B — CLI**（需先 `supabase login` 输入 access token）:
```bash
cd D:\1kaifa\grsds
supabase login
supabase functions deploy admin-proxy --project-ref jyefbatmmbelrhhzsgva
```

### 3. 提交代码
```bash
cd D:\1kaifa\grsds
git add index.html fix_p0_write_op_log.sql supabase/functions/admin-proxy/ grsds_audit_report_20260629.md
git commit -m "fix: P0-1 RPC + P0-2 service key removal + P2 password hardening"
git push
```

---

## 验证步骤（部署后）

1. 登录系统 → 创建新线索 → 检查是否正常（P0-1 验证）
2. 管理员页面 → 公司/部门/用户管理 → 全部操作（P0-2 验证）
3. 注册新账号 → 设弱密码 → 应被拒绝（P2-9 验证）
4. 连续输错密码 5 次 → 60 秒锁定（P2-10 验证）
