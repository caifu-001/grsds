-- 供应商附件支持
-- 步骤1: Supabase SQL Editor 执行以下 DDL
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN suppliers.attachments IS '附件列表 JSONB：[{"name":"合同.pdf","size":102400,"type":"application/pdf","url":"https://...","path":"..."}]';

-- 步骤2: Supabase Dashboard → Storage → New Bucket
-- Bucket name: supplier-files
-- ☑ Public bucket (公开访问)
-- 文件大小限制建议: 10MB

-- 步骤3: Supabase SQL Editor 执行 Storage RLS 策略
-- (新建 bucket 后，Storage → Policies → 选中 supplier-files → New Policy)
-- 或者直接执行以下 SQL:
-- 允许已认证用户上传
-- INSERT policy: auth.role() = 'authenticated'
-- SELECT policy: (bucket_id = 'supplier-files'::text) → 公开读取
