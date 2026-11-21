-- ==========================================================================
-- 招标公告自动采集：给 lead_pool 补字段
-- --------------------------------------------------------------------------
-- 背景：抓来的招标公告要能点回原文（source_url）、看出值多少钱（budget）、
-- 判断新不新（publish_date）。这些字段原来没有，且必须能去重——
-- 同一篇公告每天都会被搜到，靠 source_url 唯一索引挡住重复插入。
--
-- 幂等：可重复执行。Supabase SQL Editor 直接贴进去跑。
-- ==========================================================================

alter table public.lead_pool add column if not exists source_url     text;
alter table public.lead_pool add column if not exists source_site    text;
alter table public.lead_pool add column if not exists project_no     text;
alter table public.lead_pool add column if not exists budget         numeric;
alter table public.lead_pool add column if not exists publish_date   date;
alter table public.lead_pool add column if not exists region         text;
alter table public.lead_pool add column if not exists buyer_norm     text;
-- 自动采集的线索打标，方便和人工录入区分（也便于出问题时一次性清理）
alter table public.lead_pool add column if not exists auto_fetched  boolean default false;

-- 去重闸门：同一公司下同一篇公告只能有一条。
-- 用部分索引（where source_url is not null）避免人工线索（source_url 为空）互相冲突。
create unique index if not exists uq_lead_pool_source_url
  on public.lead_pool (company_id, source_url)
  where source_url is not null;

-- 采集脚本按「发布时间倒序 + 状态」查，建个组合索引
create index if not exists idx_lead_pool_auto
  on public.lead_pool (company_id, auto_fetched, publish_date desc);

-- 校验：跑完应能看到 8 个新列
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'lead_pool'
  and column_name in ('source_url','source_site','project_no','budget',
                      'publish_date','region','buyer_norm','auto_fetched')
order by column_name;
