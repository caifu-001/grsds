-- ============================================================================
-- 可执行补丁：修 company_memberships 策略递归（42P17）+ 收掉匿名读 companies
-- ----------------------------------------------------------------------------
-- 前提：sql/tenant_security_hardening.sql 已执行成功（本脚本依赖
--       public.is_super_admin() / public.my_company_ids()）。
-- 执行：Supabase Dashboard → SQL Editor → 全选 Run。幂等，可重复执行。
--
-- 背景（2026-11-28 线上只读验收时发现）：
--   1) 匿名直查 company_memberships 返回
--      `42P17 infinite recursion detected in policy for relation "company_memberships"`。
--      根因不是本次加固脚本，而是 sql/create_memberships_table.sql 留下的两条
--      「自引用」策略：策略体里 `FROM company_memberships cm2` 查的还是同一张表，
--      RLS 一开就无限递归。加固脚本只清理了 profiles / operation_logs 的旧策略，
--      没动 company_memberships，所以它们还留着。
--      目前不炸主流程：登录走 rpc/get_my_memberships（SECURITY DEFINER 绕 RLS）、
--      成员管理走 admin-proxy（service_role 绕 RLS）；但任何直连读写成员关系都会失败，
--      商用租赁下迟早要踩。
--   2) 匿名 key 能读到 companies 全表 4510 行（客户公司档案 + 5 家租户公司名）。
--      clients / contacts / orders / operation_logs / profiles 都是 0 行，只有这一张漏。
--      这是历史遗留的宽松读策略（客户公司名自动补全），本次只把 anon 的表级
--      SELECT 权限收掉，登录用户完全不受影响。
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. 清掉 company_memberships 上全部历史策略
--    只按名字 drop 会漏，RLS 是「或」关系，留一条自引用策略就等于没修。
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select policyname
      from pg_policies
     where schemaname = 'public' and tablename = 'company_memberships'
  loop
    execute format('drop policy %I on public.company_memberships', r.policyname);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. 公司管理员能管的公司 id 列表
--    必须 SECURITY DEFINER：策略里直接 `select ... from company_memberships`
--    就是上面那个 42P17 的成因。函数绕 RLS，策略引用函数即可。
-- ---------------------------------------------------------------------------
create or replace function public.my_admin_company_ids()
returns integer[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(cm.company_id), '{}'::integer[])
    from public.company_memberships cm
   where cm.user_id = auth.uid()
     and cm.role = 'admin'
     and cm.status = 'active';
$$;

grant execute on function public.my_admin_company_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. 重建不递归的策略
--    读：自己 + 同公司在职成员 + 平台超管（跨公司读不到）
--    写：仅本公司管理员 / 平台超管；普通成员一律不能直连改成员关系
-- ---------------------------------------------------------------------------
alter table public.company_memberships enable row level security;

create policy cm_select on public.company_memberships
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_super_admin()
    or company_id = any (public.my_company_ids())
  );

create policy cm_write on public.company_memberships
  for all to authenticated
  using (
    public.is_super_admin()
    or company_id = any (public.my_admin_company_ids())
  )
  with check (
    public.is_super_admin()
    or company_id = any (public.my_admin_company_ids())
  );

-- ---------------------------------------------------------------------------
-- 4. 匿名不该看到租户公司名单 / 4510 条客户档案
--    只 revoke anon 的表权限，RLS 策略一条不动，登录用户（authenticated）不受影响。
--    需要回退时：grant select on public.companies to anon;
-- ---------------------------------------------------------------------------
revoke select on public.companies from anon;

-- ---------------------------------------------------------------------------
-- 5. 收尾
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';

-- 自检：cm_policies 应为 2；anon 读 companies 应被拒（换匿名 key 在 REST 上验）
select
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'company_memberships') as cm_policies,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'company_memberships'
      and qual ilike '%company_memberships%')                        as self_ref_policies,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'profiles')          as profile_policies;
