-- ==========================================================================
-- 招标线索：补「中标结果」字段
-- --------------------------------------------------------------------------
-- 背景：招标公告抓进来时只有预算，中标人/中标价要等结果公告（开标后 20~40 天）
--       才出。销售关心的是「这家单位最后花落谁家、花了多少钱」——
--       中标了说明项目是真的，金额还能用来估自己的报价空间。
--
-- 为什么不在抓取时多建一条线索：
--   结果公告和招标公告是同一个标的，建两条会让公海里同一个项目出现两遍。
--   这里的选择是「回填」——结果公告只更新已有线索的下列字段。
--
-- 幂等：可重复执行。Supabase SQL Editor 直接贴进去跑。
-- ==========================================================================

alter table public.lead_pool add column if not exists win_bidder   text;      -- 中标供应商（多包/联合体用「、」拼）
alter table public.lead_pool add column if not exists win_amount   numeric;   -- 中标金额（元，多包累加）
alter table public.lead_pool add column if not exists win_date     date;      -- 结果公告发布日
alter table public.lead_pool add column if not exists win_url      text;      -- 结果公告原文
alter table public.lead_pool add column if not exists win_packages jsonb;     -- 分包明细 [{no,bidder,amount}]

-- 按「有结果」筛线索用得上
create index if not exists idx_lead_pool_win
  on public.lead_pool (company_id, win_date desc)
  where win_bidder is not null;

-- 校验：跑完应能看到 5 个新列
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'lead_pool'
  and column_name in ('win_bidder', 'win_amount', 'win_date', 'win_url', 'win_packages')
order by column_name;
