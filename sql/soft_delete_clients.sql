-- ============================================================
-- 批次D：客户/联系人「回收站」（软删除）
-- 在 Supabase SQL Editor 中执行一次即可。
--
-- 说明：
--   1. 新增 deleted_at 列，删除客户时不再物理删除，而是打时间戳。
--   2. 前端会自动探测该列是否存在：
--        · 列存在  → 删除进回收站，可恢复 / 彻底删除
--        · 列不存在 → 自动回退为原来的物理删除（功能不报错）
--   3. 索引用于「回收站列表」和「过滤未删除」的查询加速。
-- ============================================================

ALTER TABLE public.clients  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_clients_company_deleted  ON public.clients  (company_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_contacts_client_deleted  ON public.contacts (client_id,  deleted_at);

-- 已存在的老数据全部视为「未删除」
UPDATE public.clients  SET deleted_at = NULL WHERE deleted_at IS NOT NULL AND deleted_at < '1970-01-01'::timestamptz;
UPDATE public.contacts SET deleted_at = NULL WHERE deleted_at IS NOT NULL AND deleted_at < '1970-01-01'::timestamptz;

-- 校验：应返回两行
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'deleted_at'
  AND table_name IN ('clients', 'contacts');
