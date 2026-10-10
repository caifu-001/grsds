-- ============================================================
-- 联系人新增「录入时间」字段（可手动填写的日期）
-- 日期：2026-10-10
-- 执行位置：Supabase Dashboard → SQL Editor（项目 jyefbatmmbelrhhzsgva）
-- 说明：幂等，可重复执行
-- ============================================================

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS entered_date DATE;

COMMENT ON COLUMN public.contacts.entered_date IS '联系人录入时间（手动填写）';

-- 验证
-- SELECT id, name, entered_date FROM public.contacts ORDER BY created_at DESC LIMIT 10;
