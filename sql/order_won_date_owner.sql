-- ============================================================================
-- 订单业绩口径升级：赢单日期 + 业绩归属人
-- 目的：订单「签约即计业绩」，业绩看板按「赢单日期」归月、按「业绩归属人」归属
-- 幂等：可重复执行
-- ============================================================================

-- 1) 赢单日期（签约/中标那天，业绩计入这个月）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS won_date DATE;

-- 2) 业绩归属人（这一单算谁的业绩；为空时前端回退到 user_id 录单人）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS owner_id UUID;

-- 3) 历史数据：归属人默认=录单人
UPDATE orders SET owner_id = user_id WHERE owner_id IS NULL;

-- 4) 历史数据：已赢单但没填赢单日期的，用「实际完成 → 开始日期 → 创建日期」回填
--    统一走 ::text::date，兼容 actual_date 是 date / text 两种历史定义
DO $$
BEGIN
  UPDATE orders
     SET won_date = coalesce(
           nullif(btrim(actual_date::text),'')::date,
           nullif(btrim(start_date::text),'')::date,
           (created_at AT TIME ZONE 'Asia/Shanghai')::date
         )
   WHERE won_date IS NULL
     AND stage IN ('已签约','执行中','已完成');
EXCEPTION WHEN others THEN
  RAISE NOTICE '回填 won_date 跳过（日期格式不兼容）：%。不影响新数据，新订单保存时会写入。', SQLERRM;
END $$;

-- 5) 索引：按公司 + 赢单日期聚合业绩
CREATE INDEX IF NOT EXISTS idx_orders_won_date ON orders(company_id, won_date);

-- 6) 校验
SELECT count(*)                                                    AS 订单总数,
       count(won_date)                                             AS 有赢单日期,
       count(owner_id)                                             AS 有归属人,
       count(*) FILTER (WHERE stage IN ('已签约','执行中','已完成')) AS 应计业绩单数
  FROM orders;
