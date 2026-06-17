-- 诊断 orders 表列，修复缺列（请在 Supabase SQL Editor 执行）
DO $$
DECLARE
  cols TEXT[];
BEGIN
  -- 收集 orders 表现有列
  SELECT array_agg(column_name::text) INTO cols FROM information_schema.columns WHERE table_name='orders' AND table_schema='public';
  RAISE NOTICE 'orders 现有列: %', cols;

  -- 补建可能缺失的列
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2);
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT '进行中';
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS company_id INTEGER;

  -- 补建缺失的索引
  CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
  CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
  CREATE INDEX IF NOT EXISTS idx_orders_stage ON orders(stage);
END $$;
