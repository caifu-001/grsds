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

> 第一版执行时报 `42P13: cannot remove parameter defaults from existing function`，
> 已在第二轮修好（见第六节），**现在可以原样重跑，不需要先手工 DROP 任何函数**。

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

## 六、执行报错修复（第二轮，2026-11-28）

第一版在 Supabase SQL Editor 直接报错失败：

```
ERROR: 42P13: cannot remove parameter defaults from existing function
HINT:  Use DROP FUNCTION batch_grant_resources(uuid,integer,text,text,uuid) first.
```

根因：库里这个函数早就是 `(uuid,integer,text,text,uuid)` 且 `p_resource_ids` **带 DEFAULT `''`**；
PostgreSQL 的 `CREATE OR REPLACE FUNCTION` 允许「加默认值」，**不允许「去掉」已有默认值**。
顺着这个错把整份脚本按线上真实 schema 又核了一遍，同批修掉 8 处：

| # | 位置 | 问题 | 后果 |
|---|---|---|---|
| 1 | `batch_grant_resources` | 去掉了 `p_resource_ids` 的 DEFAULT `''` | 就是你看到的 42P13 |
| 2 | `invite_member` | 库里是 4 参 `(integer,text,text,text)`，脚本只建 3 参 | 留下同名重载，PostgREST 报「函数不唯一」(PGRST203) |
| 3 | `list_company_members` / `get_member_grants` | 都是 `RETURNS TABLE`，历史上存在 9 列 / 10 列两个版本 | 返回列不一致 → 42P13「cannot change return type」。已改为先 `drop` 再建 |
| 4 | `profiles` 读策略 | 策略里直接 `select ... from company_memberships`，而后者策略又查 `profiles` | 42P17 策略递归。已抽出 `SECURITY DEFINER` 的 `my_company_ids()` |
| 5 | `is_super_admin(uid uuid)` | `admin_enhance_v2` 留下的重载只看 `role` 字符串，脚本没管它 | 老策略写的是 `is_super_admin(auth.uid())`，被临时改成 super_admin 的账号照样通行 —— 等于后门。已一并改成邮箱绑定 |
| 6 | `operation_logs` 旧策略 | 旧脚本留了 `FOR ALL USING(true)` 的宽松策略，RLS 是「或」关系 | 新建的 select 策略等于摆设，超管日志照样被同公司的人读到。已循环 drop 全部旧策略 |
| 7 | `remove_member` | 先删成员关系、再改 `profiles` | 触发器凭成员关系认管理员身份，删完就认不出来了 → 整个 RPC 回滚（成员删不掉）；且只改 `active_company_id` 不改 `company_id`，老表的 RLS 仍放行被移除者 |
| 8 | `guard_profile_privileges` | 本人分支写成 `old.user_id = v_caller and not v_is_admin_of` | 公司管理员改自己时漏进管理员分支 → `active_company_id` 被还原 → **「切换公司」永远失败** |

额外两处只在运行时才暴露的问题，也一并处理：

- **`remove_member` 的搬家权限**：守卫触发器不允许管理员改别人的 `company_id`。摘人需要搬家，又不能开个后门让管理员随手把人推到别家公司 —— 改为 **事务级开关** `grsds.tenant_move`，只有 `remove_member` 内部会置位，且仍要求「新归属是对方仍有效加入的公司或 null」。
- **审计触发器写的日志没有角色**：`trg_audit_operation`（clients/contacts/orders 等表都挂了）直写 `operation_logs`，不带 `actor_role`，超管改客户产生的审计日志 `actor_role` 为 null → 同公司可见。已加 `BEFORE INSERT` 触发器 `fill_oplog_actor_role` 统一补标。

### 这次的验证方式（不是「看代码觉得对」）

本机拉了一个 PostgreSQL 16.4 便携实例，按线上 OpenAPI 规格把 9 张表、8 个函数的签名（含那个会触发 42P13 的旧版本）复刻出来，然后：

- 加固脚本连跑 **2 遍**：`ERROR` 计数 **0 / 0**（幂等成立）
- 再跑 30 条行为断言：**30 passed, 0 failed**，覆盖五条要求 + 越权路径

关键结果：

```
① 只剩 1 个 super_admin                          实际=1
② 普通用户不能自封超管                          不能授予平台超级管理员权限
② 管理员不能跨公司搬人                          实际=1734（被还原）
③ 非超管不能审核公司                            仅平台超级管理员可审核公司入驻
③ 自己注册的公司被强制 pending + 打租户标记     status=pending is_tenant=true
④ 999 公司的人看不到 1734 的用户 / 看不到超管    看到 0 条
④ 同公司能互相看到（下拉不为空）                 看到 3 条
⑤ 同公司员工看不到超管的日志                     看到 0 条
⑤ 超管能看到自己写过的日志                       看到 1 条
⑥ 移除成员：关系删掉且归属搬到剩下的公司         company_id=999 active=999
⑨ 被移除的成员看不到原公司的人                   看到 0 条
```

harness 留在 `.workbuddy/tools/pgtest/`（不进 git），后续改 SQL 可以先本地跑通再上线上。

## 七、线上执行后的只读验收（2026-11-28 10:51）

用户在 SQL Editor 执行成功、无报错。用 service_role + anon key 复核的实际结果：

| 检查项 | 线上实际值 | 结论 |
|---|---|---|
| `platform_config.super_admin_email` | `767142066@qq.com`（02:51 UTC 写入） | ✓ |
| `profiles.role='super_admin'` 行数 | **1**（仅 767142066） | ✓ 唯一化生效 |
| 75989677@qq.com | 已降为 `admin`，公司 1737 | ✓ |
| `companies.is_tenant=true` | 5 家（1 / 755 / 1281 / 1734 / 1737） | ✓ 客户档案没被误标 |
| 待审核租户 | 0 | ✓ |
| `operation_logs.actor_role` | 超管行 10561 / 非空 10612 / null 14537（对不上 profiles 的历史行） | ✓ 回填生效 |
| `is_platform_super_user()` 实调 | 超管 uid → `true`；假超管 uid → `false` | ✓ 邮箱绑定生效 |
| 函数签名 | 5 个 RPC 空参调用均 404（不是 300/203）+ OpenAPI required 列表正确 | ✓ 无歧义重载、默认值都还在 |
| 匿名读 profiles / operation_logs / clients / contacts / orders / invitations | 全部 **0 行** | ✓ 旧宽松策略清干净了 |
| 线上前端 | `index.html` 的 `?v=` 与本地 3 个 JS 的 md5 完全一致，特征串 `isPlatformSuperProfile` / `approve_tenant_company` / `actor_role` 全命中 | ✓ 已生效 |

### 顺带发现的两个历史遗留（不是本次脚本造成的）

1. **匿名直查 `company_memberships` 报 `42P17 infinite recursion detected in policy`**。
   根因是 `sql/create_memberships_table.sql` 留下的两条「自引用」策略（策略体里
   `FROM company_memberships cm2` 查的还是自己）。加固脚本只清了 `profiles` /
   `operation_logs` 的旧策略，没动这张表。
   **当前不影响主流程**：登录走 `rpc/get_my_memberships`（SECURITY DEFINER 绕 RLS）、
   成员管理走 admin-proxy（service_role 绕 RLS）；但任何直连读写成员关系都会失败。
2. **匿名 key 能读 `companies` 全表 4510 行**（客户公司档案 + 5 家租户公司名）。
   其余核心表都是 0 行，只有这一张漏。属于客户公司名自动补全的历史宽松读策略。

两个都写进了 `sql/fix_membership_rls_recursion.sql`（幂等、可重复执行）：
循环 drop 该表全部旧策略 → 用 SECURITY DEFINER 的 `my_admin_company_ids()` 重建不递归的策略
→ `revoke select on public.companies from anon`（只收匿名，登录用户不受影响）。

本地 PostgreSQL 16.4 复现 42P17 后执行该补丁：递归消失、管理员能正常读到本公司成员关系、
匿名读 companies 变成 `permission denied`；主脚本 + 补丁一起跑 **32/32 断言全通过**。

### 还剩什么

- **`admin-proxy` v5 必须确认已部署**。Edge Function 在线（无 token 返回 401 属正常），
  但版本无法从外部探测 —— 需要到 Dashboard → Edge Functions → `admin-proxy` 看代码首行
  是否为 `admin-proxy v5 (multi-tenant hardened)` / 部署时间是否晚于本次改动。
  没部署的话，前端的跨公司写操作仍走旧代理，第 2 条防线是缺的。
- 第四节 7 条人工验证清单。
