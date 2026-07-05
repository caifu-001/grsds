-- ============================================================
-- 全链路数据外键迁移：公司名录 → 客户 → 供应商 → 选品调研
-- ============================================================

-- 1. 客户表加公司名录外键
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_directory_id BIGINT;

-- 2. 供应商表加公司名录外键
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS company_directory_id BIGINT;

-- 3. 选品调研表加供应商外键
ALTER TABLE product_scouting ADD COLUMN IF NOT EXISTS supplier_id BIGINT;

-- 4. 回填：按名称精确匹配，客户 → 公司名录
UPDATE clients c SET company_directory_id = co.id
FROM companies co
WHERE LOWER(TRIM(c.name)) = LOWER(TRIM(co.name))
  AND c.company_directory_id IS NULL;

-- 5. 回填：按名称精确匹配，供应商 → 公司名录
UPDATE suppliers s SET company_directory_id = co.id
FROM companies co
WHERE LOWER(TRIM(s.name)) = LOWER(TRIM(co.name))
  AND s.company_directory_id IS NULL;

-- 6. 回填：选品调研 → 供应商（按供应商名称匹配）
UPDATE product_scouting ps SET supplier_id = s.id
FROM suppliers s
WHERE LOWER(TRIM(ps.supplier_name)) = LOWER(TRIM(s.name))
  AND ps.supplier_id IS NULL
  AND ps.supplier_name IS NOT NULL;

-- 验证
SELECT 'clients matched' AS label, COUNT(*) FROM clients WHERE company_directory_id IS NOT NULL
UNION ALL
SELECT 'suppliers matched', COUNT(*) FROM suppliers WHERE company_directory_id IS NOT NULL
UNION ALL
SELECT 'scouting matched', COUNT(*) FROM product_scouting WHERE supplier_id IS NOT NULL;
