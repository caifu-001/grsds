-- ============================================================
-- 批次E：客户「自定义字段」值存储
-- 在 Supabase SQL Editor 中执行一次即可。
--
-- 说明：
--   配置中心的「自定义字段」此前只是孤立配置，没有落到任何表单。
--   执行本 SQL 后：
--     · 客户表单会多出「⚙ 自定义字段」区块，字段来自 custom_field_defs（entity_type='client'）
--     · 填写的值以 JSON 存到 clients.custom_data
--   未执行时表单仍可正常保存，只是不写入自定义字段（会给出提示）。
-- ============================================================

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS custom_data jsonb DEFAULT '{}'::jsonb;

-- 可选：对常用自定义字段建表达式索引（按需打开注释并替换 field_key）
-- CREATE INDEX IF NOT EXISTS idx_clients_custom_industry ON public.clients ((custom_data->>'industry'));

-- 校验：应返回一行
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'clients'
  AND column_name = 'custom_data';
