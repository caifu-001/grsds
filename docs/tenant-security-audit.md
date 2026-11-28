# 账号权限体系 · 审计与加固说明

> 目标场景：这套 CRM 未来要租给多家公司商用。
> 审计时间：2026-11-28 · 对应提交：见 `git log`

## 一、五条要求与当前状态

| 要求 | 加固前 | 加固后 |
|---|---|---|
| 超管唯一 = 767142066@qq.com，能管所有公司 | 有 2 个 `super_admin`（767142066、75989677），判定只看 `profiles.role` 字符串 | 超管 = `role='super_admin'` **且** 邮箱等于 `platform_config.super_admin_email`；75989677 自动降为 1737 公司的管理员 |
| 其他公司管理员只能管自己公司 | RLS 允许「任何登录用户改自己的 profiles」，一条 REST 请求就能把自己 `role` 改成 `super_admin` 或搬进别家公司 | `guard_profile_privileges` 触发器 + 代理双重拦截，权限字段一律还原 |
| 注册公司必须超管审核 | 前端审核通过后自己 `upsert profiles.role='admin'`；`companies.status` 任何管理员都能直连改 | 审核只走 `approve_tenant_company()` / `reject_tenant_company()`，函数内校验平台超管；`guard_company_privileges` 触发器强制非超管建档 `status='pending'`、改不动 `status/approved_by/is_tenant` |
| 其他公司成员看不到超管 | 管理页「员工管理」直接列出全部 6 个账号 | 代理层对非超管强制 `role <> 'super_admin'`；`list_company_members()` 剔除超管；`auth_list_users` 剔除超管；前端再兜一层 |
| 超管日志只有超管能看 | `operation_logs` 没有角色标记，本公司内谁都能看超管的操作记录 | 新增 `actor_role` 列（数据库判定，不接受前端伪造）+ 历史回填；RLS 与代理双过滤 |

## 二、顺手修掉的 6 个真实缺陷

1. **`profiles` 自改提权**（最严重）：`Users own profile FOR ALL USING(user_id=auth.uid())` → 任何人都能 `PATCH /profiles?user_id=eq.<自己>` 把 role 改成 `super_admin`。已用触发器堵死。
2. **`companies` 表混用**：4510 条客户公司档案和 5 家租户公司存在同一张表，审核列表里全是客户。已加 `is_tenant` 标记，审核列表只看 `is_tenant=true`。
3. **`set_active_company()` 会把超管降级**：切换公司时执行 `update profiles set role = v_role`，超管切一次公司就永久失去超管身份。已改为只写 `active_company_id`。
4. **`batch_grant_resources()` 零校验 + 签名不匹配**：`SECURITY DEFINER` 却没有任何权限判断，任何登录用户能给任意人写授权；且参数是 `integer[]`，前端传的是 uuid 逗号串，调用必失败。已改为 `text` 收参 + `string_to_array` 解析 + 管理员校验。
5. **代理层 PostgREST 注入**：`query` 和 `filters.col` 直接拼进 URL，可传 `*,contacts(*)` 做关系内联、或 `id&or=(...)` 改查询结构 —— 用 service_role 执行即跨租户读全库。已改为只允许纯列清单 / 纯标识符。
6. **`callAdmin` 返回值被当 Response 用**：`saveNewUser` / `deleteCompany` / `deleteDept` / 日志页 / 工作流模板等多处 `if(!res.ok)` / `r.error.catch()` / `await r.text()` —— 实际返回的是 `{data,error}`，这些分支要么恒真要么抛异常。建号流程（`saveNewUser`）因此一直是坏的。已全部修正。

## 三、需要你手动执行的两步

### 1. 执行数据库加固脚本

Supabase Dashboard → SQL Editor → 打开 `sql/tenant_security_hardening.sql` → 全选 Run。

脚本幂等，可重复执行；不含 `DROP TABLE` / `DELETE`。
末尾会输出自检结果：

```
super_admin_email | super_admin_rows | tenant_companies | pending_tenants
767142066@qq.com  | 1                | 5                | 0
```

`super_admin_rows` 必须是 **1**。

### 2. 部署 admin-proxy（v5）

```bash
supabase functions deploy admin-proxy --project-ref jyefbatmmbelrhhzsgva
```

没有安装 CLI 时：Supabase Dashboard → Edge Functions → `admin-proxy` → 粘贴 `supabase/functions/admin-proxy/index.ts` 全文 → Deploy。

### 未执行前的兼容性

前端对两个 RPC 都做了「函数不存在 → 回退旧逻辑」的降级，所以先发前端、后执行 SQL 不会白屏或卡死。
但**在 SQL 执行前，第 1 / 3 条漏洞仍然存在**（触发器是唯一防线）。

## 四、验证清单（执行后按此逐条点）

| # | 操作 | 预期 |
|---|---|---|
| 1 | 用 767142066 登录 | 左侧「管理」里有「公司审核」「公司管理」，日志页有「公司」列，超管操作行标红「超管」 |
| 2 | 用 394764779（1281 管理员）登录 | 员工列表只有 1281 的人，**看不到 767142066**；日志页看不到任何超管操作 |
| 3 | 用 394764779 打开 F12，执行 `supabase.from('profiles').update({role:'super_admin'}).eq('user_id','<自己uid>')` | 返回 0 行或报错；刷新后角色仍是 admin |
| 4 | 用 394764779 打开 F12，`supabase.from('companies').update({status:'approved'}).eq('id',<自己公司>)` | `status` 不变（触发器还原） |
| 5 | 765 用新邮箱注册 → 选「注册公司」 | 停在「等待审核」页；767142066 的审核列表出现该公司（只有这一家，不是 4510 条） |
| 6 | 767142066 点「通过」 | 申请人刷新后进入系统，角色是该公司 admin；`company_memberships` 有一条 admin 记录 |
| 7 | 767142066 把人调到另一家公司 | 该人在新公司能看到数据（membership 已同步） |

## 五、已知遗留（本次未动）

- `companies` 表仍是「客户档案 + 租户」混存。彻底拆表要改 20+ 处调用，风险大于收益，本次用 `is_tenant` 标记隔离。
- `NO_COMPANY_TABLE`（`stock_check_items` 等 4 张子表）没有 `company_id`，代理只能靠父表兜底 —— 已知 P2 风险，需要真实越权路径才能利用（必须知道父表 id 且父表校验已拦）。
- `profiles` 的字段级权限靠触发器实现，`email` 列对同公司成员可见（通讯录需要），跨公司不可见。
