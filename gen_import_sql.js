// 生成 companies 导入 SQL（含加列 + 数据导入）
const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, 'guangdong_companies.json');
const OUTPUT = path.join(__dirname, 'import_companies.sql');

const data = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
console.log(`读取 ${data.length} 条数据`);

function esc(str) {
  if (str == null || str === '') return 'NULL';
  return "'" + String(str).replace(/'/g, "''").replace(/\n/g, ' ').replace(/\r/g, '').replace(/\\/g, '\\\\') + "'";
}

let sql = `-- ============================================================
-- 导入广东外贸企业名录到 companies 表
-- 在 Supabase SQL Editor 中一次性执行
-- 来源: gongshang.mingluji.com
-- 数量: ${data.length} 条 | 城市: 21
-- 生成: ${new Date().toISOString()}
-- ============================================================

-- 1. 补充 companies 表列（幂等，已存在则跳过）
ALTER TABLE companies ADD COLUMN IF NOT EXISTS legal_person TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS credit_code TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS reg_capital TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS reg_status TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS established DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS business_scope TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS province TEXT;

-- 2. 创建临时表批处理
CREATE TEMP TABLE IF NOT EXISTS _import_batch (
  name TEXT,
  legal_person TEXT,
  reg_capital TEXT,
  established DATE,
  business_scope TEXT,
  contact TEXT,
  city TEXT,
  province TEXT
) ON COMMIT DROP;

`;

const BATCH = 100;
const batches = [];
for (let i = 0; i < data.length; i += BATCH) {
  batches.push(data.slice(i, i + BATCH));
}

for (let bi = 0; bi < batches.length; bi++) {
  const batch = batches[bi];
  sql += `INSERT INTO _import_batch (name, legal_person, reg_capital, established, business_scope, contact, city, province) VALUES\n`;
  const rows = batch.map(c => {
    const cap = c.registered_capital != null ? String(Math.round(c.registered_capital)) : null;
    // contact 同时存入 legal_person 和 contact
    return `(${esc(c.name)}, ${esc(c.contact)}, ${esc(cap)}, ${esc(c.established)}, ${esc(c.business_scope)}, ${esc(c.contact)}, ${esc(c.city)}, ${esc(c.province)})`;
  });
  sql += rows.join(',\n') + ';\n\n';
}

sql += `-- 3. 写入 companies（去重：同名跳过）
INSERT INTO companies (name, legal_person, reg_capital, established, business_scope, contact, city, province, status)
SELECT 
  b.name,
  b.legal_person,
  b.reg_capital,
  b.established,
  b.business_scope,
  b.contact,
  b.city,
  b.province,
  'approved'
FROM _import_batch b
WHERE NOT EXISTS (SELECT 1 FROM companies c WHERE c.name = b.name);

-- 4. 结果统计
DO $$
DECLARE
  new_cnt INTEGER;
  skip_cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO new_cnt FROM _import_batch b
    WHERE NOT EXISTS (SELECT 1 FROM companies c WHERE c.name = b.name);
  SELECT COUNT(*) INTO skip_cnt FROM _import_batch b
    WHERE EXISTS (SELECT 1 FROM companies c WHERE c.name = b.name);
  RAISE NOTICE '✓ 新增: % | 跳过（已存在）: %', new_cnt, skip_cnt;
END $$;
`;

fs.writeFileSync(OUTPUT, sql, 'utf8');
console.log(`✅ 生成: ${OUTPUT}`);
console.log(`   大小: ${(fs.statSync(OUTPUT).size / 1024).toFixed(1)} KB`);
console.log(`   条数: ${data.length}`);
