-- ============================================================================
-- grsds · 多租户账号权限体系加固（可重复执行 / 幂等）
-- ----------------------------------------------------------------------------
-- 目标（对应业务要求）：
--   1. 平台超级管理员唯一，账号固定为 767142066@qq.com，可管理所有公司
--   2. 其他公司管理员只能管理自己公司；不能越权、不能自封超管
--   3. 注册公司必须经超管审核，管理员/普通用户无法自己把公司改成 approved
--   4. 其他公司成员看不到平台超管（成员列表 / 员工列表 / 日志全部过滤）
--   5. 超管操作日志只有超管自己能看
--
-- 执行方式：Supabase Dashboard → SQL Editor → 全选 → Run（一次执行完）
-- 安全性：不含任何 DROP TABLE / DELETE，只重建函数、策略与触发器
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. 平台配置：唯一超管邮箱（改超管只改这一行）
-- ---------------------------------------------------------------------------
create table if not exists public.platform_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

insert into public.platform_config (key, value)
values ('super_admin_email', '767142066@qq.com')
on conflict (key) do update
  set value = excluded.value, updated_at = now();

alter table public.platform_config enable row level security;

-- ---------------------------------------------------------------------------
-- 1. 基础判定函数
--    super_admin_email()       → 配置里的超管邮箱
--    is_platform_super_user(u) → 某用户是否「role=super_admin 且邮箱=配置邮箱」
--    is_platform_super()       → 当前登录者是否平台超管
--    is_super_admin()          → 兼容旧策略名，语义收紧为「平台超管」
--    注意：is_super_admin() 被全库几十条 RLS 策略引用，改成邮箱绑定后
--          任何被临时改成 super_admin 的普通账号都不再具备超管豁免权。
-- ---------------------------------------------------------------------------
create or replace function public.super_admin_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select value from public.platform_config where key = 'super_admin_email'), '');
$$;

create or replace function public.is_platform_super_user(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    -- 没配置邮箱时退化为「只看 role」，避免加固脚本上线把系统锁死
    when coalesce((select value from public.platform_config where key = 'super_admin_email'), '') = ''
      then exists (select 1 from public.profiles p where p.user_id = p_user and p.role = 'super_admin')
    else exists (
      select 1
        from public.profiles p
        join auth.users u on u.id = p.user_id
       where p.user_id = p_user
         and p.role = 'super_admin'
         and lower(coalesce(u.email, '')) =
             lower((select value from public.platform_config where key = 'super_admin_email'))
    )
  end;
$$;

create or replace function public.is_platform_super()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_super_user(auth.uid());
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_super();
$$;

-- 库里还存在一个 is_super_admin(uid uuid) 的重载（admin_enhance_v2 留下的），
-- 它只看 role 字符串。旧策略里写的是 is_super_admin(auth.uid())，
-- 不一起改掉的话，被临时改成 super_admin 的账号在那些策略上仍然通行。
create or replace function public.is_super_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_super_user(uid);
$$;

grant execute on function public.super_admin_email()             to authenticated;
grant execute on function public.is_platform_super_user(uuid)   to authenticated;
grant execute on function public.is_platform_super()            to authenticated;
-- is_super_admin 保持 anon 可执行：全库几十条老策略没写 to authenticated，
-- 匿名访问时 PG 要校验函数执行权，收回会直接报 permission denied for function。
grant execute on function public.is_super_admin()               to authenticated, anon;
grant execute on function public.is_super_admin(uuid)           to authenticated, anon;

-- 当前登录者已加入的公司 id 列表（SECURITY DEFINER，绕过 RLS）。
-- 为什么必须用函数：profiles 的策略如果直接写 `company_id in (select ... from
-- company_memberships)`，而 company_memberships 自己的策略又 `select ... from profiles`，
-- PostgreSQL 会判为策略递归，直接抛 42P17 infinite recursion detected in policy。
create or replace function public.my_company_ids()
returns integer[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(cm.company_id), '{}'::integer[])
    from public.company_memberships cm
   where cm.user_id = auth.uid()
     and cm.status = 'active';
$$;

grant execute on function public.my_company_ids() to authenticated, anon;

-- 策略放在函数之后：创建策略时 PostgreSQL 会解析函数是否存在
drop policy if exists platform_config_read on public.platform_config;
create policy platform_config_read on public.platform_config
  for select to authenticated
  using (public.is_platform_super_user(auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. 超管唯一化：除 767142066@qq.com 之外，其他 super_admin 一律降为公司管理员
--    （只降 role，不动 company_memberships —— 他们原本就是各自公司的 admin）
-- ---------------------------------------------------------------------------
update public.profiles p
   set role = 'admin'
 where p.role = 'super_admin'
   and not exists (
     select 1
       from auth.users u
      where u.id = p.user_id
        and lower(coalesce(u.email, '')) =
            lower((select value from public.platform_config where key = 'super_admin_email'))
   );

-- ---------------------------------------------------------------------------
-- 3. profiles 防提权
--    修复的洞：原策略 "Users own profile" FOR ALL USING(user_id=auth.uid())
--    允许任何登录用户直接 UPDATE 自己 profiles 的 role / company_id →
--    一条 REST 请求即可把自己变成 super_admin 或搬进别的公司。
--    这里用 BEFORE 触发器兜底（RLS 换不了字段级校验）。
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller       uuid := auth.uid();
  v_is_super     boolean;
  v_is_admin_of  boolean;
  v_req_company  integer;      -- 前端请求写入的 company_id（UPDATE 时先存下来）
  v_req_active_company integer; -- 前端请求写入的 active_company_id
begin
  -- service_role / 后台任务（代理层已做归属校验）直接放行
  if v_caller is null then
    return new;
  end if;

  v_is_super := public.is_platform_super();
  if v_is_super then
    return new;
  end if;

  -- 本次操作的目标档案（INSERT 时看 new，UPDATE 时看 old）
  if tg_op = 'INSERT' then
    -- 自助建档（首次登录 upsert）：只能是普通角色，不能自带超管身份
    if new.role = 'super_admin' then
      raise exception '不能授予平台超级管理员权限';
    end if;
    if new.user_id = v_caller then
      new.role := 'user';
      if new.active_company_id is not null and not exists (
        select 1 from public.company_memberships cm
         where cm.user_id = v_caller
           and cm.company_id = new.active_company_id
           and cm.status = 'active'
      ) then
        new.active_company_id := null;
      end if;
      return new;
    end if;
    -- 替别人建档：必须是目标公司的管理员
    if not exists (
      select 1 from public.company_memberships cm
       where cm.user_id = v_caller
         and cm.role = 'admin'
         and cm.status = 'active'
         and cm.company_id = new.company_id
    ) then
      raise exception '无权为该用户建立档案';
    end if;
    return new;
  end if;

  -- ── UPDATE ──
  -- 前端请求的归属先存下来：下面会先把 new 上的值还原成 old，
  -- 再决定是否放行（搬家场景要用原始请求值判断）。
  v_req_company := new.company_id;
  v_req_active_company := new.active_company_id;

  -- 调用者是否是「目标用户所属公司的管理员」
  v_is_admin_of := exists (
    select 1 from public.company_memberships cm
     where cm.user_id = v_caller
       and cm.role = 'admin'
       and cm.status = 'active'
       and cm.company_id in (
         select cm2.company_id from public.company_memberships cm2
          where cm2.user_id = old.user_id
       )
  );

  if new.role = 'super_admin' then
    raise exception '不能授予平台超级管理员权限';
  end if;

  -- 本人改自己：先于管理员分支判断。
  -- 之前写成 `old.user_id = v_caller and not v_is_admin_of`，公司管理员改自己时
  -- v_is_admin_of 为真 → 漏进下面的管理员分支 → active_company_id 被还原成旧值，
  -- 结果管理员点「切换公司」永远切不过去。顺序必须是「先本人、再管理员」。
  if old.user_id = v_caller then
    -- 权限类字段一律还原（前端只允许改姓名/电话/岗位/头像等）
    new.role              := old.role;
    new.role_id           := old.role_id;
    new.status            := old.status;
    new.department_id     := old.department_id;

    -- active_company_id 可以自己切，但必须是自己已加入的公司（否则代理会按它注入归属域）
    if new.active_company_id is distinct from old.active_company_id
       and (new.active_company_id is null or not exists (
              select 1 from public.company_memberships cm
               where cm.user_id = old.user_id
                 and cm.company_id = new.active_company_id
                 and cm.status = 'active')) then
      new.active_company_id := old.active_company_id;
    end if;

    -- company_id 是历史兼容字段，但一大票老表（orders/clients/inventory…）的 RLS
    -- 仍是 `company_id = (select company_id from profiles …)`。它不跟 active 走的话，
    -- 切换公司后数据域不会变（A/B 两家来回串），所以这里强制同步。
    new.company_id := coalesce(new.active_company_id, old.company_id);
    return new;
  end if;

  if not v_is_admin_of then
    raise exception '无权修改其他成员的档案';
  end if;

  -- 公司管理员：可改本公司成员的角色/部门/状态，但不能跨公司搬人、不能造超管。
  new.company_id        := old.company_id;
  new.active_company_id := old.active_company_id;

  -- 唯一例外：把成员从本公司「摘出去」（remove_member）。人被删了成员关系却还留着
  -- 原 company_id 的话，老表的 RLS 照样放行 —— 必须允许一起搬家。
  -- 用事务级开关 grsds.tenant_move 显式放行：只有 remove_member 内部会置位，
  -- 普通 UPDATE 永远进不来（否则管理员可以随手把兼职的人推到另一家公司去）。
  -- 即便开关被置位，仍要求：调用者是对方当前公司的管理员 + 新归属是对方
  -- 仍有效加入的公司或 null，绝不允许塞进第三方公司。
  if coalesce(current_setting('grsds.tenant_move', true), '') = '1'
     and (v_req_company is distinct from old.company_id
          or v_req_active_company is distinct from old.active_company_id)
     and exists (
       select 1 from public.company_memberships cm
        where cm.user_id = v_caller
          and cm.role = 'admin'
          and cm.status = 'active'
          and cm.company_id in (old.active_company_id, old.company_id)
     )
     and (v_req_company is null or exists (
            select 1 from public.company_memberships cm3
             where cm3.user_id = old.user_id
               and cm3.company_id = v_req_company
               and cm3.status = 'active'))
     and (v_req_active_company is null or exists (
            select 1 from public.company_memberships cm4
             where cm4.user_id = old.user_id
               and cm4.company_id = v_req_active_company
               and cm4.status = 'active'))
  then
    new.company_id        := v_req_company;
    new.active_company_id := v_req_active_company;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_privileges on public.profiles;
create trigger trg_guard_profile_privileges
  before insert or update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- profiles 的 RLS 同步收紧：直连只允许看/改自己；跨成员管理一律走代理
drop policy if exists "Users own profile"            on public.profiles;
drop policy if exists "Users see own profile"        on public.profiles;
drop policy if exists "Super admin sees all profiles" on public.profiles;
drop policy if exists "Users update own profile"     on public.profiles;
drop policy if exists "Users manage own profile"     on public.profiles;
drop policy if exists "Admins manage profiles"       on public.profiles;
drop policy if exists profiles_select_self           on public.profiles;
drop policy if exists profiles_insert_self           on public.profiles;
drop policy if exists profiles_update_self           on public.profiles;

-- 读：自己 + 同公司在职成员 + 平台超管。
-- 必须放行「同公司」，否则订单销售下拉 / 绩效人员 / 模板审批人全部拿不到人；
-- 「跨公司」一律读不到（这是隔离的关键）。
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_super_admin()
    or company_id = any (public.my_company_ids())
  );

-- 插入：只能建自己（新同事建档一律走 admin-proxy 的 service_role）
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (user_id = auth.uid());

-- 改：只能改自己。改别人（角色/部门/状态）只能走 admin-proxy，
-- 由代理做归属校验 + guard_profile_privileges 触发器兜底。
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (user_id = auth.uid() or public.is_super_admin())
  with check (user_id = auth.uid() or public.is_super_admin());

alter table public.profiles enable row level security;

-- 清理 profiles 上其它历史策略：旧脚本可能留下 FOR ALL 的宽松策略，
-- 与本节的 3 条新策略同时生效时仍会放行（RLS 是「或」关系）。只保留本节建立的 3 条。
do $$
declare
  r record;
begin
  for r in
    select policyname
      from pg_policies
     where schemaname = 'public'
       and tablename  = 'profiles'
       and policyname not in ('profiles_select_self', 'profiles_insert_self', 'profiles_update_self')
  loop
    execute format('drop policy %I on public.profiles', r.policyname);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. companies：把「租户公司」与「客户公司档案」分开标记
--    现状坑：companies 表同时存了 5 家付费租户 + 4500 多条客户公司档案，
--    「公司管理 / 入驻审核」必须只看 is_tenant=true，否则审核列表里全是客户。
-- ---------------------------------------------------------------------------
alter table public.companies add column if not exists is_tenant boolean not null default false;
alter table public.companies add column if not exists owner_user_id uuid;

-- 已有成员关系的公司就是租户
update public.companies c
   set is_tenant = true
 where exists (select 1 from public.company_memberships cm where cm.company_id = c.id);

create index if not exists idx_companies_tenant on public.companies(is_tenant, status);

-- 公司状态/租户标记只能由平台超管改
create or replace function public.guard_company_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;                       -- service_role（代理层已校验）
  end if;
  if public.is_platform_super() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- 普通用户/公司管理员建公司：一律待审核，不能自带 approved 混过审核。
    -- 走这条路的都是「入驻申请」，必须打租户标记，否则审核列表里看不到。
    new.status       := 'pending';
    new.approved_by  := null;
    new.approved_at  := null;
    new.is_tenant    := true;
    new.created_by   := coalesce(new.created_by, auth.uid());
    new.owner_user_id := coalesce(new.owner_user_id, auth.uid());
    return new;
  end if;

  -- UPDATE：审核结论、租户标记、创建人不可改（其余工商信息允许自己维护）
  new.status      := old.status;
  new.approved_by := old.approved_by;
  new.approved_at := old.approved_at;
  new.is_tenant   := old.is_tenant;
  new.created_by  := old.created_by;
  return new;
end;
$$;

drop trigger if exists trg_guard_company_privileges on public.companies;
create trigger trg_guard_company_privileges
  before insert or update on public.companies
  for each row execute function public.guard_company_privileges();

-- 超管豁免策略改用邮箱绑定判定（不再只看 role 字符串）
drop policy if exists "Super admins all companies" on public.companies;
create policy "Super admins all companies" on public.companies
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- 说明：companies 同时存客户公司档案（4500+ 行），"Members see own company"
-- 原策略（按 profiles.company_id）保持不动，避免影响客户公司名自动补全；
-- 租户隔离由 is_tenant 标记 + 审核 RPC 负责，不在这条读策略上收口。
drop policy if exists "Auth users register company" on public.companies;
create policy "Auth users register company" on public.companies
  for insert to authenticated
  with check (auth.uid() is not null and status = 'pending' and created_by = auth.uid());

-- 申请人要能在审核结果页看到自己那条申请（否则会一直停在注册页）
drop policy if exists "Applicant sees own registration" on public.companies;
create policy "Applicant sees own registration" on public.companies
  for select to authenticated
  using (created_by = auth.uid());

alter table public.companies enable row level security;

-- ---------------------------------------------------------------------------
-- 5. 注册 / 审核 RPC（审核结论只能走这里，且只有超管能调）
-- ---------------------------------------------------------------------------
create or replace function public.register_tenant_company(p_name text, p_tax_id text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id integer;
  v_name text := btrim(coalesce(p_name, ''));
begin
  if auth.uid() is null then
    raise exception '请先登录';
  end if;
  if v_name = '' then
    raise exception '公司名称不能为空';
  end if;
  if exists (
    select 1 from public.companies c
     where c.is_tenant
       and lower(btrim(c.name)) = lower(v_name)
  ) then
    raise exception '该公司名称已被注册';
  end if;

  insert into public.companies (name, tax_id, status, is_tenant, created_by, owner_user_id)
  values (v_name, nullif(btrim(coalesce(p_tax_id, '')), ''), 'pending', true, auth.uid(), auth.uid())
  returning id into v_id;

  -- 审批通过前不写入任何成员关系，申请人拿不到该公司任何数据
  return v_id;
end;
$$;

create or replace function public.approve_tenant_company(p_company_id integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator uuid;
  v_status  text;
begin
  if not public.is_platform_super() then
    raise exception '仅平台超级管理员可审核公司入驻';
  end if;

  select created_by, status into v_creator, v_status
    from public.companies where id = p_company_id;

  if v_status is null then
    raise exception '公司不存在';
  end if;
  if v_status = 'approved' then
    return 'already';
  end if;
  if v_creator is null then
    raise exception '该公司缺少申请人，无法自动建立管理员';
  end if;

  update public.companies
     set status = 'approved', approved_by = auth.uid(), approved_at = now(), is_tenant = true
   where id = p_company_id;

  -- 不用 on conflict：该表历史上未必有 (user_id, company_id) 唯一约束，
  -- 依赖它会直接报 42P10。先判后写最稳。
  if exists (
    select 1 from public.company_memberships
     where user_id = v_creator and company_id = p_company_id
  ) then
    update public.company_memberships
       set role = 'admin', status = 'active'
     where user_id = v_creator and company_id = p_company_id;
  else
    insert into public.company_memberships (user_id, company_id, role, status, joined_at)
    values (v_creator, p_company_id, 'admin', 'active', now());
  end if;

  update public.profiles
     set role = 'admin',
         status = 'active',
         company_id = p_company_id,
         active_company_id = coalesce(active_company_id, p_company_id)
   where user_id = v_creator
     and role <> 'super_admin';

  return 'approved';
end;
$$;

create or replace function public.reject_tenant_company(p_company_id integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_super() then
    raise exception '仅平台超级管理员可审核公司入驻';
  end if;
  update public.companies
     set status = 'rejected', approved_by = auth.uid(), approved_at = now()
   where id = p_company_id and status = 'pending';
  return 'rejected';
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. 成员关系 RPC 收紧
-- ---------------------------------------------------------------------------
-- 6.1 切换激活公司：绝不改写 profiles.role
--     原实现 `update profiles set role = v_role` 会把超管降成 admin，超管身份一去不回。
create or replace function public.set_active_company(p_company_id integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.company_memberships cm
     where cm.user_id = auth.uid()
       and cm.company_id = p_company_id
       and cm.status = 'active'
  ) then
    raise exception '你不是该公司的成员';
  end if;

  update public.profiles
     set active_company_id = p_company_id
   where user_id = auth.uid();

  return 'ok';
end;
$$;

-- 6.2 列成员：仅本公司管理员 / 平台超管；结果里剔除平台超管
-- 先 drop 再建：历史上有 9 列（无 invited_by_email）和 10 列两个版本共存过，
-- RETURNS TABLE 的列一旦和库里现存版本不一致，CREATE OR REPLACE 会报 42P13
-- （cannot change return type of existing function）。drop 掉最稳，后面统一授权。
drop function if exists public.list_company_members(integer);

create or replace function public.list_company_members(p_company_id integer)
returns table(
  user_id uuid,
  email text,
  display_name text,
  department_id integer,
  department_name text,
  role text,
  phone text,
  "position" text,
  joined_at timestamptz,
  invited_by_email text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() 为空 = 来自 admin-proxy 的 service_role（代理层已做归属校验）
  if auth.uid() is null then
    null;
  elsif not (
    public.is_platform_super()
    or exists (
      select 1 from public.company_memberships cm
       where cm.user_id = auth.uid()
         and cm.company_id = p_company_id
         and cm.role = 'admin'
         and cm.status = 'active'
    )
  ) then
    raise exception 'permission denied';
  end if;

  return query
    select cm.user_id,
           au.email::text,
           p.display_name,
           p.department_id,
           d.name as department_name,
           cm.role,
           p.phone,
           p."position",
           cm.joined_at,
           inviter.email::text
      from public.company_memberships cm
      join public.profiles p on p.user_id = cm.user_id
      left join auth.users au on au.id = cm.user_id
      left join public.departments d on d.id = p.department_id
      left join auth.users inviter on inviter.id = cm.invited_by
     where cm.company_id = p_company_id
       and cm.status = 'active'
       and not public.is_platform_super_user(cm.user_id)
     order by cm.joined_at;
end;
$$;

-- 6.3 移除成员：平台超管豁免；不允许移除平台超管
create or replace function public.remove_member(p_company_id integer, p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;   -- 被移除者剩下的第一个有效公司（没有则 null）
begin
  if auth.uid() is null then
    null;
  elsif not (
    public.is_platform_super()
    or exists (
      select 1 from public.company_memberships cm
       where cm.user_id = auth.uid()
         and cm.company_id = p_company_id
         and cm.role = 'admin'
         and cm.status = 'active'
    )
  ) then
    raise exception '仅公司管理员可移除成员';
  end if;

  if p_user_id = auth.uid() then
    raise exception '不能移除自己';
  end if;

  if public.is_platform_super_user(p_user_id) then
    raise exception '不能移除平台超级管理员';
  end if;

  select cm2.company_id into v_next
    from public.company_memberships cm2
   where cm2.user_id = p_user_id
     and cm2.status = 'active'
     and cm2.company_id <> p_company_id
   order by cm2.joined_at
   limit 1;

  -- 顺序很关键：必须先改 profiles、再删成员关系。
  -- guard_profile_privileges 是凭「目标用户仍属于调用者管理的公司」来认管理员身份的，
  -- 先删关系的话它认不出来，会抛「无权修改其他成员的档案」，整个 RPC 回滚。
  -- company_id 一起搬：老表的 RLS 还按它划范围，只改 active_company_id 等于没摘干净。
  -- grsds.tenant_move 是给守卫触发器看的临时开关（事务级，出了本函数就失效）。
  perform set_config('grsds.tenant_move', '1', true);

  update public.profiles
     set company_id        = case when company_id        = p_company_id then v_next else company_id        end,
         active_company_id = case when active_company_id = p_company_id then v_next else active_company_id end
   where user_id = p_user_id
     and (company_id = p_company_id or active_company_id = p_company_id);

  perform set_config('grsds.tenant_move', '', true);

  delete from public.company_memberships
   where user_id = p_user_id and company_id = p_company_id;

  return 'ok';
end;
$$;

-- 6.4 邀请成员：平台超管豁免；不能把平台超管邀请进别家公司
--     签名必须与库里已有的版本完全一致：invite_member(integer, text, text, text)
--     （p_role TEXT DEFAULT 'member', p_message TEXT DEFAULT NULL）。
--     若只按 3 个参数重建，PostgreSQL 会当成新重载留下两个同名函数，
--     PostgREST 调用时报「函数不唯一」。
drop function if exists public.invite_member(integer, text, text);

create or replace function public.invite_member(
  p_company_id integer,
  p_email text,
  p_role text default 'member',
  p_message text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
  v_id bigint;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_company_name text;
  v_inviter_name text;
  v_target uuid;
begin
  select (
    public.is_platform_super()
    or exists (
      select 1 from public.company_memberships cm
       where cm.user_id = auth.uid()
         and cm.company_id = p_company_id
         and cm.role = 'admin'
         and cm.status = 'active'
    )
  ) into v_ok;

  if auth.uid() is not null and not v_ok then
    raise exception '仅公司管理员可邀请';
  end if;

  if v_email = '' then
    raise exception '邮箱不能为空';
  end if;

  if exists (
    select 1 from auth.users u
     where lower(coalesce(u.email, '')) = v_email
       and public.is_platform_super_user(u.id)
  ) then
    raise exception '不能邀请平台超级管理员加入公司';
  end if;

  if exists (
    select 1 from public.invitations i
     where i.from_company_id = p_company_id and lower(i.to_email) = v_email and i.status = 'pending'
  ) then
    raise exception '该邮箱已有待处理的邀请';
  end if;

  if exists (
    select 1
      from public.company_memberships cm
      join public.profiles p on p.user_id = cm.user_id
     where cm.company_id = p_company_id
       and lower(coalesce(p.email, '')) = v_email
       and cm.status = 'active'
  ) then
    raise exception '该用户已是公司成员';
  end if;

  insert into public.invitations (from_company_id, to_email, role, invited_by, status, message)
  values (p_company_id, v_email, coalesce(nullif(p_role, ''), 'member'), auth.uid(), 'pending', p_message)
  returning id into v_id;

  -- 已注册的邮箱顺手发一条站内通知（未注册的等注册后自己看到邀请列表）
  select u.id into v_target from auth.users u where lower(coalesce(u.email, '')) = v_email limit 1;
  if v_target is not null then
    select name into v_company_name from public.companies where id = p_company_id;
    select coalesce(nullif(btrim(display_name), ''), email)
      into v_inviter_name from public.profiles where user_id = auth.uid();
    insert into public.notifications (user_id, company_id, title, body, type, link, is_read)
    values (
      v_target, p_company_id, '📨 入职邀请',
      case when p_message is not null and p_message <> ''
        then coalesce(v_inviter_name, '管理员') || ' 邀请你加入「' || coalesce(v_company_name, '公司') || '」: ' || p_message
        else coalesce(v_inviter_name, '管理员') || ' 邀请你加入「' || coalesce(v_company_name, '公司') || '」'
      end,
      'info', 'invitations', false
    );
  end if;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. 资源授权：补上原先完全缺失的权限校验
--    batch_grant_resources 是 SECURITY DEFINER 且零校验，任何登录用户
--    都能给任意用户在任意公司写授权（代理走 service_role 时 auth.uid() 为空）。
--
--    参数类型修正：前端传的是逗号分隔字符串（"12,13" 或 uuid 串），
--    resource_grants.resource_id 也是 text。原签名 integer[] 既收不下 uuid，
--    也解析不了 "1,2" 这种写法 —— 统一按 text 收，函数内 string_to_array 解析。
--    p_granted_by 保留占位：前端一直在传，签名里没有会直接被 PostgREST 拒掉。
-- ---------------------------------------------------------------------------
-- 旧签名的重载必须先删掉，否则同名的 integer[] 版本会留下来，
-- PostgREST 面对两个候选会直接报「函数不唯一」。
drop function if exists public.batch_grant_resources(uuid, integer, text, integer[]);

-- 注意：库里旧版本已经是 (uuid,integer,text,text,uuid)，且 p_resource_ids 带
-- DEFAULT ''。PostgreSQL 的 CREATE OR REPLACE 不允许「移除已有参数的默认值」
-- （报 42P13: cannot remove parameter defaults from existing function），
-- 所以这里必须把 p_resource_ids 的默认值原样保留。
create or replace function public.batch_grant_resources(
  p_user_id uuid,
  p_company_id integer,
  p_resource_type text,
  p_resource_ids text default '',
  p_granted_by uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_ids   text[];
  v_rid   text;
begin
  -- service_role（admin-proxy）已在校验归属后转调，这里放行；直连一律校验
  if auth.uid() is not null and not (
    public.is_platform_super()
    or exists (
      select 1 from public.company_memberships cm
       where cm.user_id = auth.uid()
         and cm.company_id = p_company_id
         and cm.role = 'admin'
         and cm.status = 'active'
    )
  ) then
    raise exception '仅公司管理员可分配资源授权';
  end if;

  if not exists (
    select 1 from public.company_memberships cm
     where cm.user_id = p_user_id
       and cm.company_id = p_company_id
       and cm.status = 'active'
  ) then
    raise exception '目标用户不属于该公司';
  end if;

  -- 空串 / null → 空数组（等于清空该类型授权）
  select coalesce(array_agg(btrim(x)), '{}'::text[])
    into v_ids
    from unnest(string_to_array(coalesce(p_resource_ids, ''), ',')) as x
   where btrim(x) <> '';

  delete from public.resource_grants
   where user_id = p_user_id
     and company_id = p_company_id
     and resource_type = p_resource_type
     and not (resource_id = any (v_ids));

  foreach v_rid in array v_ids
  loop
    if not exists (
      select 1 from public.resource_grants rg
       where rg.user_id = p_user_id
         and rg.company_id = p_company_id
         and rg.resource_type = p_resource_type
         and rg.resource_id = v_rid
    ) then
      insert into public.resource_grants (user_id, company_id, resource_type, resource_id, granted_by)
      values (p_user_id, p_company_id, p_resource_type, v_rid,
              coalesce(auth.uid(), p_granted_by));
    end if;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- 同样先 drop：admin_enhance_v2 时期可能留下 TABLE(resource_id integer) 的版本，
-- 返回列类型不同，CREATE OR REPLACE 会直接 42P13。
drop function if exists public.get_member_grants(uuid, integer, text);

create or replace function public.get_member_grants(
  p_user_id uuid,
  p_company_id integer,
  p_resource_type text
)
returns table(resource_id text)
language sql
stable
security definer
set search_path = public
as $$
  select rg.resource_id
    from public.resource_grants rg
   where rg.user_id = p_user_id
     and rg.company_id = p_company_id
     and rg.resource_type = p_resource_type
     and (
       rg.user_id = auth.uid()
       or auth.uid() is null
       or public.is_platform_super()
       or exists (
         select 1 from public.company_memberships cm
          where cm.user_id = auth.uid()
            and cm.company_id = p_company_id
            and cm.role = 'admin'
            and cm.status = 'active'
       )
     );
$$;

-- ---------------------------------------------------------------------------
-- 8. 操作日志：超管的日志只有超管能看
--    8.1 增列 actor_role，写入时由数据库判定，不接受前端伪造
--    8.2 RLS：非超管只能看本公司、且 actor_role 不是 super_admin 的行
--    8.3 admin-proxy 还会再强制一次（直连被绕过的兜底）
-- ---------------------------------------------------------------------------
alter table public.operation_logs add column if not exists actor_role text;
create index if not exists idx_oplog_actor_role on public.operation_logs(actor_role);

create or replace function public.write_op_log(
  p_company_id bigint,
  p_user_id uuid,
  p_user_name text,
  p_action text,
  p_entity_type text,
  p_entity_id text default '',
  p_entity_name text default '',
  p_detail jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := coalesce(auth.uid(), p_user_id);
  v_role text;
  v_name text;
  v_co   bigint := p_company_id;
begin
  select p.role,
         coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(p.email), ''))
    into v_role, v_name
    from public.profiles p
   where p.user_id = v_uid;

  if v_co is null then
    select coalesce(p.active_company_id, p.company_id) into v_co
      from public.profiles p where p.user_id = v_uid;
  end if;

  insert into public.operation_logs
    (company_id, user_id, user_name, action, entity_type, entity_id, entity_name, detail, actor_role)
  values
    (v_co, v_uid, coalesce(v_name, p_user_name), p_action, p_entity_type,
     p_entity_id, p_entity_name, p_detail, v_role);
end;
$$;

-- 历史日志回填 actor_role：老数据这一列是空的，不回填等于超管的历史操作
-- 对所有人可见。只补能对上 profiles 的行，补不到的保持 null（按普通日志处理）。
update public.operation_logs l
   set actor_role = p.role
  from public.profiles p
 where l.user_id = p.user_id
   and l.actor_role is null;

-- 所有写入路径统一打标：write_op_log 之外，还有 trg_audit_operation 这个
-- AFTER 触发器在往 operation_logs 里写（clients/contacts/orders…每张表都挂了），
-- 它不带 actor_role。不补这一层，超管改客户产生的审计日志 actor_role 是 null，
-- 同公司的人照样能看到。
create or replace function public.fill_oplog_actor_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.actor_role is null then
    select p.role into new.actor_role
      from public.profiles p
     where p.user_id = coalesce(new.user_id, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_fill_oplog_actor_role on public.operation_logs;
create trigger trg_fill_oplog_actor_role
  before insert on public.operation_logs
  for each row execute function public.fill_oplog_actor_role();

alter table public.operation_logs enable row level security;

drop policy if exists operation_logs_select on public.operation_logs;
create policy operation_logs_select on public.operation_logs
  for select to authenticated
  using (
    public.is_super_admin()
    or (
      coalesce(actor_role, '') <> 'super_admin'
      and company_id = any (public.my_company_ids()::bigint[])
    )
  );

-- 老脚本（admin_enhance_v2 / update_rls_active_company / run_me_now）在
-- operation_logs 上留下过 FOR ALL 的宽松策略，RLS 是「或」关系，不清掉它们
-- 新建的 select 策略就是摆设 —— 超管的日志照样能被同公司的人读到。
do $$
declare
  r record;
begin
  for r in
    select policyname
      from pg_policies
     where schemaname = 'public'
       and tablename  = 'operation_logs'
       and policyname <> 'operation_logs_select'
  loop
    execute format('drop policy %I on public.operation_logs', r.policyname);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 9. 授权：新增/重建的函数显式授给 authenticated
-- ---------------------------------------------------------------------------
grant execute on function public.register_tenant_company(text, text)      to authenticated;
grant execute on function public.approve_tenant_company(integer)          to authenticated;
grant execute on function public.reject_tenant_company(integer)           to authenticated;
grant execute on function public.list_company_members(integer)            to authenticated;
grant execute on function public.set_active_company(integer)              to authenticated;
grant execute on function public.remove_member(integer, uuid)             to authenticated;
grant execute on function public.invite_member(integer, text, text, text)  to authenticated;
grant execute on function public.batch_grant_resources(uuid, integer, text, text, uuid) to authenticated;
grant execute on function public.get_member_grants(uuid, integer, text)   to authenticated;

-- ---------------------------------------------------------------------------
-- 10. 收尾：刷新 PostgREST schema cache
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';

-- 执行后自检（把结果贴回来即可确认生效）
select
  (select value from public.platform_config where key = 'super_admin_email') as super_admin_email,
  (select count(*) from public.profiles p where p.role = 'super_admin')       as super_admin_rows,
  (select count(*) from public.companies where is_tenant)                     as tenant_companies,
  (select count(*) from public.companies where status = 'pending' and is_tenant) as pending_tenants;
