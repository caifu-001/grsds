const fs = require('fs');

const data = JSON.parse(fs.readFileSync('D:/1kaifa/grsds/guangzhou_shenzhen_trade_companies.json', 'utf8'));

// 过滤外地公司
const foreignRE = /青岛|义乌|东莞|佛山|上海|北京|宁波|杭州|温州|中山|惠州|珠海|福建|厦门|汕头|揭阳|潮州|湛江|茂名|清远|江门|阳江|汕尾|韶关|河源|梅州|肇庆|云浮/;
const good = data.filter(c => !foreignRE.test(c.name));

console.log(`原始: ${data.length}, 过滤后: ${good.length}`);
console.log(`广州: ${good.filter(c=>c.city==='广州').length}, 深圳: ${good.filter(c=>c.city==='深圳').length}`);

function esc(s) {
  if (!s) return 'NULL';
  return `'` + s.replace(/'/g, "''").replace(/\\/g, '\\\\') + `'`;
}

const header = `-- ============================================================
-- 导入广深外贸制造业企业到 companies 表
-- 来源: 顺企网 11467.com
-- 数量: ${good.length} 条 | 广州 + 深圳
-- 生成: ${new Date().toISOString()}
-- ============================================================

-- 创建临时表
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

INSERT INTO _import_batch (name, legal_person, reg_capital, established, business_scope, contact, city, province) VALUES`;

const vals = good.map(c =>
  `(${esc(c.name)}, NULL, ${c.registered_capital || 'NULL'}, ${esc(c.established)}, ${esc(c.business_scope)}, NULL, ${esc(c.city)}, '广东')`
);

const footer = `
-- 按名称去重插入
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

-- 结果统计
DO $$
DECLARE
  new_cnt INTEGER;
  skip_cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO new_cnt FROM _import_batch b
    WHERE NOT EXISTS (SELECT 1 FROM companies c WHERE c.name = b.name);
  SELECT COUNT(*) INTO skip_cnt FROM _import_batch b
    WHERE EXISTS (SELECT 1 FROM companies c WHERE c.name = b.name);
  RAISE NOTICE '新增: % | 跳过（已存在）: %', new_cnt, skip_cnt;
END $$;`;

fs.writeFileSync('D:/1kaifa/grsds/import_guangzhou_shenzhen_trade.sql', header + '\n' + vals.join(',\n') + ';' + footer, 'utf8');
console.log('✅ 已重新生成 (临时表 + NOT EXISTS)');
