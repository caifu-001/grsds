-- ==========================================================================
-- 线索公海：清掉外地项目，只留重庆
-- --------------------------------------------------------------------------
-- 背景：早先采集跑的是「中国政府采购网」全国站，抓进来一批天津、成都、
--   北京等外地公告。现在只做重庆本地市场，这些外地线索留在公海里
--   会干扰销售逐条确认。本脚本只清「自动采集 + 还没人认领 + 没转客户」的，
--   已经分配出去或已转客户的记录一律不动（避免误删同事在跟的线索）。
--
-- 幂等：可重复执行。Supabase SQL Editor 直接贴进去跑。
-- 建议顺序：先跑 bid_leads.sql（补字段），再跑本脚本。
-- ==========================================================================

-- —— 第 1 步：先看看到底有多少外地的（只查不改，可单独跑这一段）——
-- 重庆标记：重庆 / 38 个区县 / 两江新区 / 万盛 / 市级 / 自主招标（交易网的地区写法）
with cq as (
  select '重庆|万州|涪陵|渝中|大渡口|江北|沙坪坝|九龙坡|南岸|北碚|綦江|大足|渝北|巴南|黔江|长寿|江津|合川|永川|南川|璧山|铜梁|潼南|荣昌|开州|梁平|武隆|城口|丰都|垫江|忠县|云阳|奉节|巫山|巫溪|石柱|秀山|酉阳|彭水|两江新区|万盛|市级|自主招标'::text as re
)
select coalesce(nullif(region, ''), '(空)') as 地区,
       count(*) as 条数,
       count(*) filter (where assigned_to is null and coalesce(status, 'new') = 'new') as 可清理条数
from public.lead_pool, cq
where coalesce(auto_fetched, false) = true
  and coalesce(region, '') || coalesce(name, '') !~ cq.re
group by 1
order by 2 desc;

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
