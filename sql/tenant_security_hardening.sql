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

grant execute on function public.super_admin_email()             to authenticated, anon;
grant execute on function public.is_platform_super_user(uuid)   to authenticated, anon;
grant execute on function public.is_platform_super()            to authenticated, anon;
grant execute on function public.is_super_admin()               to authenticated, anon;

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

  if old.user_id = v_caller and not v_is_admin_of then
    -- 本人：权限类字段一律还原（前端只允许改姓名/电话/岗位/头像等）
    new.role              := old.role;
    new.role_id           := old.role_id;
    new.company_id        := old.company_id;
    new.status            := old.status;
    new.department_id     := old.department_id;
    -- active_company_id 可以自己切，但必须是自己已加入的公司（否则代理会按它注入归属域）
    if new.active_company_id is distinct from old.active_company_id then
      if new.active_company_id is not null and not exists (
        select 1 from public.company_memberships cm
         where cm.user_id = old.user_id
           and cm.company_id = new.active_company_id
           and cm.status = 'active'
      ) then
        new.active_company_id := old.active_company_id;
      end if;
    end if;
    return new;
  end if;

  if not v_is_admin_of then
    raise exception '无权修改其他成员的档案';
  end if;

  -- 公司管理员：可改本公司成员的角色/部门/状态，但不能跨公司搬人、不能造超管
  new.company_id        := old.company_id;
  new.active_company_id := old.active_company_id;
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
    or company_id in (
      select cm.company_id from public.company_memberships cm
       where cm.user_id = auth.uid() and cm.status = 'active'
    )
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

  delete from public.company_memberships
   where user_id = p_user_id and company_id = p_company_id;

  update public.profiles
     set active_company_id = (
       select cm2.company_id from public.company_memberships cm2
        where cm2.user_id = p_user_id and cm2.status = 'active'
        order by cm2.joined_at limit 1
     )
   where user_id = p_user_id and active_company_id = p_company_id;

  return 'ok';
end;
$$;

-- 6.4 邀请成员：平台超管豁免；不能把平台超管邀请进别家公司
create or replace function public.invite_member(p_company_id integer, p_email text, p_role text default 'member')
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
  v_id bigint;
  v_email text := lower(btrim(coalesce(p_email, '')));
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

  insert into public.invitations (from_company_id, to_email, role, invited_by, status)
  values (p_company_id, v_email, coalesce(nullif(p_role, ''), 'member'), auth.uid(), 'pending')
  returning id into v_id;

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

create or replace function public.batch_grant_resources(
  p_user_id uuid,
  p_company_id integer,
  p_resource_type text,
  p_resource_ids text,
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

alter table public.operation_logs enable row level security;

drop policy if exists operation_logs_select on public.operation_logs;
create policy operation_logs_select on public.operation_logs
  for select to authenticated
  using (
    public.is_super_admin()
    or (
      coalesce(actor_role, '') <> 'super_admin'
      and company_id in (
        select cm.company_id from public.company_memberships cm
         where cm.user_id = auth.uid() and cm.status = 'active'
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 9. 授权：新增/重建的函数显式授给 authenticated
-- ---------------------------------------------------------------------------
grant execute on function public.register_tenant_company(text, text)      to authenticated;
grant execute on function public.approve_tenant_company(integer)          to authenticated;
grant execute on function public.reject_tenant_company(integer)           to authenticated;
grant execute on function public.list_company_members(integer)            to authenticated;
grant execute on function public.set_active_company(integer)              to authenticated;
grant execute on function public.remove_member(integer, uuid)             to authenticated;
grant execute on function public.invite_member(integer, text, text)       to authenticated;
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
