-- ============================================================
-- 客户新增「归属地区」字段（省份分类）
-- 日期：2026-11-27
-- 执行位置：Supabase Dashboard → SQL Editor（项目 jyefbatmmbelrhhzsgva）
-- 说明：幂等，可重复执行
--
-- 为什么要这一列：
--   甲方客户目前集中在重庆，后续要拓外地市场。不建列时前端只能按
--   地址/名称实时解析（已覆盖 98%），但「重庆XX公司四川分公司」这类
--   跨省主体没法手工指定归属；建列后可以手工改、可以批量改、可以按省统计。
--
-- 未执行也不影响使用：前端会检测列是否存在，不存在就只靠实时解析，
-- 保存客户时不会发送该字段（不会导致整条保存失败）。
-- ============================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS province TEXT;

COMMENT ON COLUMN public.clients.province IS '客户归属省级行政区（简称，如：重庆 / 四川 / 广东）；为空时按地址与名称实时解析';

-- 可选：按省份建索引，客户量大时按省筛选更快
CREATE INDEX IF NOT EXISTS idx_clients_province ON public.clients (province);

-- 验证
-- SELECT province, COUNT(*) FROM public.clients WHERE deleted_at IS NULL GROUP BY province ORDER BY 2 DESC;
