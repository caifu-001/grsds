-- ===== 客户支持多项目 + 中标人信息 =====

-- 1) 加 projects JSONB 列（存储多项目数组）
ALTER TABLE IF EXISTS public.clients ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]';

-- 2) 回填现有数据：将 project/bidding_date 迁移到 projects 数组
UPDATE public.clients
SET projects = jsonb_build_array(jsonb_build_object(
  'project_name', COALESCE(project, ''),
  'bidding_date', bidding_date,
  'bidder_name', '',
  'bidder_phone', '',
  'bidder_company', '',
  'bid_amount', ''
))
WHERE project IS NOT NULL AND project != '' AND (projects IS NULL OR projects = '[]'::jsonb);
