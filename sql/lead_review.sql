-- ============================================================
-- 自动采集线索的人工审核闸门
--
-- 采集脚本抓到的招标公告不再直接进公海，而是先落在「待审核」，
-- 人在页面上点「同意入库」才转正、点「忽略」转无效。
--
-- 为什么用独立字段 review_status 而不是 status：
--   lead_pool.status 上有 CHECK 约束（new/assigned/contacted/...），
--   加一个 'pending' 要删约束再重建，容易把线上允许值改错；
--   独立字段不碰原有枚举，回滚也只是少一个列。
--
-- 本脚本可重复执行。
-- ============================================================

-- ---------- 1. 加字段 ----------
-- 默认 approved：人工录入的老线索、以及以后任何不带该字段的写入，都算已审核，
-- 不会被藏进待审核区。采集脚本会显式写 pending。
alter table public.lead_pool
  add column if not exists review_status text not null default 'approved';

alter table public.lead_pool
  add column if not exists reviewed_at timestamptz;

-- 取值约束（只允许三种，防止拼错成 'Pendding' 后整批消失）
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.lead_pool'::regclass
      and conname = 'lead_pool_review_status_check'
  ) then
    alter table public.lead_pool
      add constraint lead_pool_review_status_check
      check (review_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

-- 待审核是列表页每次都要按状态筛的，单列部分索引足够
create index if not exists idx_lead_pool_review_pending
  on public.lead_pool (company_id, updated_at desc)
  where review_status = 'pending';

-- ---------- 2. 历史数据回填 ----------
-- 之前跑的 86 条已经以 status='new' 直接进公海了。它们也是机器抓的，
-- 同样该过一遍人的眼睛。只回填「没人认领、没转客户」的：
-- 已经分配或已转客户的说明同事已经审过了，不要打回待审核。
update public.lead_pool
   set review_status = 'pending'
 where auto_fetched is true
   and status = 'new'
   and review_status = 'approved'
   and assigned_to is null
   and converted_client_id is null;

-- ---------- 3. 核对 ----------
select review_status,
       count(*) as 条数,
       count(*) filter (where auto_fetched)              as 自动采集,
       count(*) filter (where contact_mobile is not null) as 有手机号
  from public.lead_pool
 where company_id = 1734
 group by review_status
 order by 条数 desc;

-- 待审核清单预览（确认一下是不是你想要的那批）
select name as 采购人,
       project_name as 项目,
       contact_name as 联系人,
       coalesce(contact_mobile, contact_phone) as 电话,
       budget as 预算,
       publish_date as 公告日,
       region as 地区
  from public.lead_pool
 where company_id = 1734
   and review_status = 'pending'
 order by budget desc nulls last
 limit 20;
