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

### 补丁执行后的线上实测（2026-11-28）

| 检查项 | 实测结果 |
|---|---|
| 匿名直查 `company_memberships` | `[]` / `Content-Range: */0`，**42P17 消失** |
| 匿名读 `companies` | `42501 permission denied`（提示 `GRANT SELECT ... TO anon`），4510 行不再外泄 |
| 匿名读 profiles / operation_logs / clients / contacts / orders / invitations | 仍全部 **0 行** |
| 补丁末尾自检（用户贴回） | `cm_policies=2`、`self_ref_policies=0`、`profile_policies=3` —— **三个全部命中预期** |

三个数字的含义：

- `cm_policies=2`：重建后的 `cm_select` + `cm_write` 两条，其余旧策略已被循环 drop。
- `self_ref_policies=0`：策略体里再没有 `FROM company_memberships` 的自引用，42P17 的根因已除。
- `profile_policies=3`：加固脚本建立的 `profiles_select_self` / `profiles_insert_self` /
  `profiles_update_self`。脚本末尾会循环 drop 这 3 条之外的所有历史策略，所以**等于 3 是干净的
  证明** —— 留任何一条 `FOR ALL USING(true)` 之类的旧策略，RLS 的「或」关系都会让隔离形同虚设。

`revoke select on companies from anon` 只影响未登录态：登录后的请求带用户 JWT
（role=`authenticated`），不走 anon 权限。逐条核过前端 10 处 `from('companies')` 调用，
`02-auth.js` 检查注册中公司、管理页公司名录、公司名自动补全全部发生在登录之后，不受影响。

### 不用去 Dashboard 也能确认 admin-proxy 版本

代理强制校验用户 JWT，无 token 时 v4/v5 都返回 401；拿 `service_role` key 去探也会被
GoTrue 以 `bad_jwt: missing sub claim` 拒绝，所以**外部探不到版本**。
登录任意账号后，在浏览器控制台粘贴：

```js
(async () => {
  const r = await callAdmin('rpc', '__version_probe__', { payload: {} });
  const m = (r && r.error && r.error.message) || '';
  console.log(m.includes('rpc not allowed') ? '✅ admin-proxy v5' : '❌ 不是 v5 / 未部署', m.slice(0, 160));
})();
```

v5 会在 RPC 白名单处直接返回 `Forbidden: rpc not allowed: __version_probe__`；
v4 会把这个不存在的函数转给 PostgREST，返回 `Could not find the function`。
探针不发任何写请求、不改数据。

**局限**：这个探针只能证明「跑的是 v5 系列」，**分不出是不是 `1048a57` 修好的那一版**
—— 修复改的是 companies 的归属判定，RPC 白名单两版完全一样。要确认修复版已部署，
用**公司管理员账号**（超管会跳过那段判定，测不出来）登录后再跑探针 ②：

```js
(async () => {
  const r = await callAdmin('update', 'companies', {
    payload: { __probe_col__: 1 },
    filters: [{ col: 'id', op: 'eq', val: currentCompanyId }]
  });
  const s = JSON.stringify(r || {});
  if (/company out of scope/.test(s)) console.log('❌ 旧版 v5，修复未部署');
  else if (/__probe_col__|does not exist|42703/.test(s)) console.log('✅ 修复版 v5 已部署');
  else console.log('? 未预期响应', s.slice(0, 200));
})();
```

原理：按 `id` 更新自己公司、payload 里放一个**不存在的列**。旧版在归属校验处就 403
（`Forbidden: company out of scope`），修复版会回查到本公司、放行到 PostgREST，
而 PostgREST 在列校验阶段就返回 `42703 column "__probe_col__" does not exist`。
**两种情况都不会写入任何数据**（旧版压根没发出 PATCH）。
本地把 `6cb9845`（未修版）与当前版源码分别放进沙箱真实执行，探针结果一个是
`HTTP 403 / PATCH=false`，一个是 `HTTP 200 / 42703`，已验证能稳定区分
（`.workbuddy/tools/pgtest/verify-proxy-probe.mjs`）。

### 部署 v5 后发现并修掉的一处功能回归

v5 把 companies 的写校验收紧成「filters 里必须有 `company_id` 且属于自己管理的公司」，
但 `08-admin.js` 的 `saveCompany` / `deleteCompany` 是按 `id` 定位的（companies.id 就是
company_id），filters 里没有 company_id → **公司管理员编辑/删除自己公司会收到 403**（v4 下正常）。

已在代理里补「按 id 回查该行真实归属」，并**以回查结果为唯一依据**（filters / payload 里的
`company_id` 是前端传的，可以伪造）：命中 `ownCompanyIds` 才放行，跨公司仍拒绝；
审核类字段（`status` / `is_tenant` 等）继续剥离。
把代理源码剥离 TS 类型后在本地沙箱里真实执行（`.workbuddy/tools/pgtest/verify-proxy.mjs`），
9 条断言全通过，含「伪造 `company_id` 过滤 + 跨公司 id」仍返回 403。
`profiles` 加严的「无过滤不给查」也核过：唯一无过滤的调用 `08-admin.js:344` 只在超管分支，
v5 对超管直接放行，不受影响。

### 超管重置密码 400 / 非超管 500（第三轮修复，2026-11-28）

**现象**：超管在员工管理里重置普通用户密码失败：
`callAdmin failed: 400 {"error":"Bad request: unsafe table name"}`。
控制台里的 `Tracking Prevention blocked access to storage` 是浏览器第三方存储提示，
与本次失败无关 —— 请求已发出且拿到 400，说明 token 正常。

**根因 1（400，v5 引入的回归）**：前端 `doResetPassword()` / `deleteUser()` 走
`callAdmin('auth_reset_password','',{userId,password})`；`01-core.js` 把 `table` 原样放进
body、把 `userId` / `password` 透传到顶层 —— **table 按约定就是空串**。v5 新加的第 3 段
注入防护却对「所有非 rpc 的 op」都要求 `IDENT_RE.test(table)`，空串不匹配 → 在到达
第 4 段 auth 分支之前就 400。受影响：`auth_reset_password` / `auth_delete_user` /
`auth_list_users`。v4 没有这段校验，属 v5 回归。

**根因 2（500，v4 起的历史遗留）**：本地沙箱跑非超管路径时报
`ReferenceError: allowed is not defined` / `eqValOf is not defined`。`try {}`（112–529 行）
里定义 `allowed` / `inAllowed` / `eqValOf`，但 helpers（`targetUserInScope` /
`checkSelfTable`）位于 catch 之后、try 之外，块级 `const` 不可见。超管路径会提前 return，
所以一直没暴露。影响面比 auth 更大：**公司管理员重置/删除成员、以及所有走
`checkSelfTable` 的 profiles / company_memberships / invitations 读写都会 500**。

**修法**：
1. 常量区新增 `AUTH_OPS`，三段注入校验（select / filter / table）对 auth_* 一律跳过，
   并把 `safeTable` 强制置空；auth 分支复用同一常量。权限仍由 `isAdmin` / `isSuper` /
   `targetUserInScope` 三层把关，与 table 无关 —— 跳过校验不放开任何越权。
2. `allowed` / `inAllowed` / `eqValOf` 提到 try 外的 serve 回调作用域；`isSuper` 改为
   外层 `let` + try 内赋值，`adminOf` 等仍通过 `ctx` 传入。

**验证**：`.workbuddy/tools/pgtest/verify-proxy.mjs` 扩到 20 条断言，剥离 TS 类型后
在 vm 沙箱真实执行代理源码：

- 当前版 **20/20**；用 `6cb9845`（修复前 v5）跑同一套 → **7/20**，⑧⑨ 明确
  `400 unsafe table name`、⑮ 明确 `500 eqValOf is not defined`，排除 harness 假阳性。
- 覆盖：超管改密/删号放行并真发 GoTrue PUT/DELETE、公司管理员本公司放行、跨公司 403、
  非管理员 403 且零 GoTrue 写、恶意 table 对数据操作仍 400、auth_* 的恶意 table
  被置空且不进入 URL、非超管走 `checkSelfTable` 不再 500。
- 门禁扩到 **70/70**。

### 不用真改密码就能确认修复版已部署

登录超管，控制台粘贴（用一个不存在的 uid，GoTrue 只回 `user_not_found`，**不改任何密码**）：

```js
(async()=>{
  const r=await callAdmin('auth_reset_password','',{userId:'00000000-0000-0000-0000-000000000000',password:'probe-only-123456'});
  const s=JSON.stringify(r||{});
  if(/unsafe table name/.test(s)) console.log('❌ 旧版代理（400 表名校验）');
  else if(/user_not_found|not found|404/i.test(s)) console.log('✅ 修复版已部署');
  else console.log('? 未预期',s.slice(0,200));
})()
```

### 超管重置密码 401：session 过期 + token 拼接 bug（第四轮，2026-11-28）

**现象**：400 修好后，超管重置**其他公司**成员密码变成
`401 {"error":"Unauthorized: invalid or expired token"}`。

**先定性**：401 来自代理第 1 段身份校验（`/auth/v1/user`），**早于**所有表/权限判定，
因此与目标用户属于哪家公司**完全无关**。「其他公司」只是操作场景，不是原因。
线上探测：无 token → `missing bearer token`，假 token → `invalid or expired token`；
service_role 查超管 auth 账号：未封禁、邮箱已确认 → 账号侧没问题。

**根因 1（运算符优先级）**：`01-core.js` 原写法
`Authorization:'Bearer '+(await sb.auth.getSession()).data.session?.access_token||''`。
`+` 优先级高于 `||`，实际等价于 `('Bearer ' + token) || ''`；session 为 null 时拼出字符串
`'Bearer undefined'`（truthy，`||''` 不生效）→ 代理拿到无效 token → 401。

**根因 2（JWT 过期 + 自动刷新没落地）**：`supabase.createClient(URL, ANON)` 用默认配置，
access_token 默认 1 小时；页面长时间后台、以及控制台一直出现的
`Tracking Prevention blocked access to storage` 会让自动刷新没写回存储。
前端原本没有任何主动刷新 / 401 重试，一旦 `getSession()` 返回过期 session，
**所有 `callAdmin` 操作**（不止重置密码）都会 401。

**修法（只改前端，代理不用动）**：
- 新增 `validAdminSession()` / `refreshAdminSession()`：`expires_at` 剩 60 秒内提前刷新；
  刷新失败不误杀，仍用旧 token 发请求；**401 时强制刷新并重试一次**；最终仍 401
  才返回「登录状态已失效，请重新登录」而不是笼统的 401。
- 修正括号，token 为空时不再产生 `Bearer undefined`。
- 顺带修 `08-admin.js` 的 `saveNewUser()` Step 4：原来用
  `localStorage.setItem(...) + getSession()` 恢复管理员 session 是**无效**的
  （supabase-js@2 的 `getSession()` 读内存、不会重读 storage）。改用
  `setSession({access_token, refresh_token})`，避免建号后 session 被切成新用户、
  后续所有 `callAdmin` 401。已确认全库无 `onAuthStateChange` 监听器，`setSession` 无副作用。

**验证**：`check-ui` / `smoke-batchB` / `lint-contracts` / `lint-hoisting` 全绿，
安全门禁 70/70；新增 `.workbuddy/tools/pgtest/verify-calladmin.mjs` 沙箱 **7/7**
（有效 session 直放、快过期提前刷新、401 刷新重试、刷新失败明确提示、
不拼 `Bearer undefined`、userId/password 透传、刷新失败不误杀）。

**不等前端部署也能立刻恢复**：重新登录一次；或控制台执行
`await sb.auth.refreshSession()` 后重试。先看 session 状态：

```js
(async()=>{const s=(await sb.auth.getSession()).data.session;console.log(s?{hasToken:!!s.access_token,expires_at:new Date(s.expires_at*1000).toISOString(),expired:Date.now()>s.expires_at*1000}:'session=null，需要重新登录')})()
```

### 超管重置密码仍 401：refresh token 已被判无效（第五轮，2026-11-28 13:20）

**这次和第四轮不是同一个问题。** 第四轮是 access_token 过期；这一轮日志里出现
`POST /auth/v1/token?grant_type=refresh_token 400 (Bad Request)` —— **连 refresh token
都被 GoTrue 拒绝了**，自动刷新这条路已经走不通。

线上实测硬证据：

| 检查 | 结果 |
|---|---|
| 超管 `last_sign_in_at` | `2026-10-12T14:21:56Z`（一个多月没用密码重新登录，一直靠 refresh 续期） |
| GoTrue 对无效 refresh token | `400 {"error_code":"validation_failed","msg":"Refresh token is not valid"}` |
| 前端版本 | `01-core.js?v=8c7f2669` / `08-admin.js?v=d0fd8139`，第四轮代码已生效 |
| 401 数量 | 同一时刻 4~5 个并发（初始化时 `companies` / `profiles` 等一起发） |
| 连锁反应 | `08-admin.js:110 / :344` 的 `callAdmin` fallback 直连同样拿不到数据，页面显示空 |

**refresh token 为什么会死**：Supabase 默认开启 Refresh Token Rotation，每次刷新会
作废旧 token。第四轮的 `validAdminSession()` 在「剩 60 秒到期」时会为**每个**并发
`callAdmin` 各调一次 `refreshSession()`，加上 `saveNewUser()` Step 1 还有一次独立刷新；
N 个请求拿同一个 refresh token 并发去换，只有一个能成功，其余全部 400。更糟的是
刷新拿到的新 token 在 `Tracking Prevention blocked access to storage` 下可能没写回
localStorage —— 页面重载后读回已被作废的旧 token，就永久失效了。

**唯一立即可行的恢复 = 用密码重新登录**（拿一份全新 session）。刷新页面、重部署代理、
再刷几次 token 都救不回一个已被吊销的 refresh token。控制台执行：

```js
(async()=>{try{await sb.auth.signOut()}catch(e){}Object.keys(localStorage).filter(k=>k.indexOf('auth-token')>=0).forEach(k=>localStorage.removeItem(k));location.reload()})()
```

执行后回到登录页用 `767142066@qq.com` 重新登录即可。

**代码侧修法（防止再次把 token 搞死）**：

- `01-core.js` 去掉「提前 60 秒主动刷新」—— 它是并发刷新的源头；改为**只在 401 时刷新**，
  常规续期交给 supabase-js 自带的 `autoRefreshToken`。
- `refreshAdminSession()` 加**全局单飞**：N 个并发 401 共用同一个 Promise，只发一次
  `refresh_token` 请求；重试时重新 `getSession()` 取内存里的新 token（不信任并发下的返回值）。
- GoTrue 明确回 400 / `Refresh token is not valid` 时**熔断**：清掉 localStorage 里的坏
  session（避免重载后又读回旧 token）、`showToast` 提示重新登录一次、后续 `callAdmin`
  直接返回 `{error:{authExpired:true}}`，不再刷一屏 401。同页重新登录（token 变化）
  会自动解除熔断 —— 因为 `doLogout()` / `onLoginSuccess()` 都不 reload 页面。
- `08-admin.js saveNewUser()` Step 1 去掉独立的 `refreshSession()`，只备份当前 session。

**验证**：`verify-calladmin.mjs` 重写为 12 条断言、**12/12**，其中 ⑤ 专门验证「并发 4 个
401 只发 1 次刷新」、⑥⑦⑧ 验证判死 → 熔断 → 重新登录自动恢复；`check-ui` /
`smoke-batchB` / `lint-contracts` / `lint-hoisting` / 安全门禁 **70/70**、代理沙箱
**20/20** 全绿。

**环境层建议**：`Tracking Prevention blocked access to storage` 说明浏览器在阻止会话
持久化。长期不重新登录（本次超过一个月）+ 存储被阻止 + 多标签页同时开，是这类 401
复发的土壤。建议改用 Chrome、把 `caifu-001.github.io` 加入跟踪防护白名单、避免同时
开多个标签页，并**定期重新登录一次**。

### 还剩什么

- **第三轮的 admin-proxy 仍要重新部署**（那两处：auth_* 表名校验、helpers 作用域）。
  401 发生在身份校验阶段，看不出代理版本，所以这次报错**不能**证明代理已部署；
  部署后用「不存在 uid」探针确认（见上一节），再试重置密码。
- 用密码重新登录一次（第五轮的一键命令），再重试重置密码。
- 第四节 7 条人工验证清单。重点：用 1281 的公司管理员登录，确认看不到超管、
  看不到超管日志、**能编辑自己公司资料**、审核按钮不可用。
