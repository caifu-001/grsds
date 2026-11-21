-- ===========================================================================
-- 清理历史线索里混进来的「招标代理公司」
--
-- 背景：行采家（gec123）列表接口的「招标人」字段（belongOrgName）填的其实是
--       采购执行方＝招标代理，真正的甲方写在正文「七、联系方式 → 采购需求方」。
--       采集脚本已改成取需求方，但**已经入库的旧线索**里还有一批代理公司，
--       名称长这样：重庆鸿兴招标代理有限公司 / 重庆华大工程管理有限公司 /
--       重庆亿驰工程项目管理有限公司 …
--       这类公司不是客户，销售打过去对面是代理，白打一次。
--
-- 处理：只标「无效」（status=junk, review_status=rejected），不删除——
--       万一误判，把 review_status 改回 pending 就能救回来。
-- 范围：只动「自动采集 + 未分配 + 未转客户」，人工录入的线索一条不碰。
-- 幂等：可以重复执行。
-- ===========================================================================

-- 第 0 步：字段必须已经存在（先跑过 sql/bid_leads.sql 与 sql/lead_review.sql）
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_name='lead_pool' and column_name='review_status') then
    raise exception 'lead_pool 缺少 review_status 字段，请先执行 sql/lead_review.sql';
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_name='lead_pool' and column_name='auto_fetched') then
    raise exception 'lead_pool 缺少 auto_fetched 字段，请先执行 sql/bid_leads.sql';
  end if;
end $$;

-- 第 1 步：先看看会动到哪些（不改数据）
select id,
       name                                  as 单位名称,
       left(coalesce(project_name,''), 24)   as 项目,
       coalesce(review_status,'(空)')        as 审核状态,
       coalesce(status,'(空)')               as 线索状态,
       left(coalesce(contact_name,''), 8)    as 联系人,
       coalesce(contact_mobile, contact_phone) as 电话
from lead_pool
where coalesce(auto_fetched, false) = true
  and coalesce(review_status,'approved') <> 'rejected'
  and assigned_to is null
  and converted_client_id is null
  and name ~ '(招标代理|招标有限|采购代理|工程管理|项目管理|工程咨询|造价咨询|建设咨询|招标咨询|工程监理|代理有限)'
order by created_at desc;

-- 第 2 步：标记为无效（把「招标代理」从客户候选里剔掉）
update lead_pool
set review_status = 'rejected',
    status        = 'junk',
    reviewed_at   = now(),
    updated_at    = now()
where coalesce(auto_fetched, false) = true
  and coalesce(review_status,'approved') <> 'rejected'
  and assigned_to is null
  and converted_client_id is null
  and name ~ '(招标代理|招标有限|采购代理|工程管理|项目管理|工程咨询|造价咨询|建设咨询|招标咨询|工程监理|代理有限)';

-- 第 3 步：核对剩余待审核里还有没有代理公司（应该为 0 条）
select count(*) as 剩余疑似代理
from lead_pool
where review_status = 'pending'
  and name ~ '(招标代理|招标有限|采购代理|工程管理|项目管理|工程咨询|造价咨询|建设咨询|招标咨询|工程监理|代理有限)';

-- 第 4 步：剩下的待审核还有多少条
select count(*) as 待审核条数
from lead_pool
where review_status = 'pending';
