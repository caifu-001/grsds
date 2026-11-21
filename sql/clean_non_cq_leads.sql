-- ==========================================================================
-- 线索公海：清掉外地项目，只留重庆
-- --------------------------------------------------------------------------
-- 背景：早先采集跑的是「中国政府采购网」全国站，抓进来一批天津、成都、
--   北京等外地公告。现在只做重庆本地市场，这些外地线索留在公海里
--   会干扰销售逐条确认。
--
-- 顺序要求：先跑 sql/bid_leads.sql（补 13 个采集字段），再跑本脚本。
--   搞反了会得到 ERROR 42703 column "region" does not exist —— 本脚本
--   加了前置检查，会提前给中文提示，不必对着原始报错猜。
--
-- 安全边界：只删「自动采集 + 未分配 + 未转客户 + 状态 new」的，
--   同事已经认领或已经转成客户的线索一条都不动。
--
-- 幂等：可重复执行。Supabase SQL Editor 直接贴进去跑。
-- ==========================================================================

-- —— 第 0 步：前置检查（缺字段就明确说该先跑哪个文件，别甩 42703）——
do $$
declare
  miss text;
begin
  select string_agg(c, '、') into miss
  from unnest(array['region', 'auto_fetched', 'source_url']) as t(c)
  where not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lead_pool' and column_name = c
  );
  if miss is not null then
    raise exception 'lead_pool 缺少字段：%。请先执行 sql/bid_leads.sql，再跑本脚本。', miss;
  end if;
end $$;

-- —— 第 1 步：先看有多少外地的（只查不改，可单独跑这一段）——
-- 重庆标记：重庆 / 38 个区县 / 两江新区 / 万盛 / 市级 / 自主招标（交易网的地区写法）
with cq as (
  select '重庆|万州|涪陵|渝中|大渡口|江北|沙坪坝|九龙坡|南岸|北碚|綦江|大足|渝北|巴南|黔江|长寿|江津|合川|永川|南川|璧山|铜梁|潼南|荣昌|开州|梁平|武隆|城口|丰都|垫江|忠县|云阳|奉节|巫山|巫溪|石柱|秀山|酉阳|彭水|两江新区|万盛|市级|自主招标'::text as re
)
select coalesce(nullif(region, ''), '(空)') as 地区,
       count(*) as 条数,
       count(*) filter (where assigned_to is null
                          and converted_client_id is null
                          and coalesce(status, 'new') = 'new') as 可清理条数
from public.lead_pool, cq
where coalesce(auto_fetched, false) = true
  and coalesce(region, '') || coalesce(name, '') !~ cq.re
group by 1
order by 2 desc;

-- —— 第 1.5 步：把要删的具体线索列出来（最多 20 条，先过一眼再删）——
with cq as (
  select '重庆|万州|涪陵|渝中|大渡口|江北|沙坪坝|九龙坡|南岸|北碚|綦江|大足|渝北|巴南|黔江|长寿|江津|合川|永川|南川|璧山|铜梁|潼南|荣昌|开州|梁平|武隆|城口|丰都|垫江|忠县|云阳|奉节|巫山|巫溪|石柱|秀山|酉阳|彭水|两江新区|万盛|市级|自主招标'::text as re
)
select region as 地区, name as 采购人, project_name as 项目, publish_date as 公告日
from public.lead_pool, cq
where coalesce(auto_fetched, false) = true
  and coalesce(region, '') || coalesce(name, '') !~ cq.re
  and assigned_to is null
  and converted_client_id is null
  and coalesce(status, 'new') = 'new'
order by publish_date desc nulls last
limit 20;

-- —— 第 2 步：删掉外地线索 ——
-- 三重保险：自动采集的 + 未分配 + 未转客户且状态还是 new。
-- 万一将来想反悔，这里的记录都是脚本自动抓的，重跑采集就能再拿回来。
with cq as (
  select '重庆|万州|涪陵|渝中|大渡口|江北|沙坪坝|九龙坡|南岸|北碚|綦江|大足|渝北|巴南|黔江|长寿|江津|合川|永川|南川|璧山|铜梁|潼南|荣昌|开州|梁平|武隆|城口|丰都|垫江|忠县|云阳|奉节|巫山|巫溪|石柱|秀山|酉阳|彭水|两江新区|万盛|市级|自主招标'::text as re
)
delete from public.lead_pool l
using cq
where coalesce(l.auto_fetched, false) = true
  and coalesce(l.region, '') || coalesce(l.name, '') !~ cq.re
  and l.assigned_to is null
  and l.converted_client_id is null
  and coalesce(l.status, 'new') = 'new';

-- —— 第 3 步：校验，应该只剩重庆的 ——
select coalesce(nullif(region, ''), '(空)') as 地区, count(*) as 条数
from public.lead_pool
where coalesce(auto_fetched, false) = true
group by 1
order by 2 desc;

-- 备注：如果第 3 步还看到外地地区，说明那几条已经被分配或已转客户，
--       属于同事在跟的线索，需要手工在「线索公海」页面上处理。
