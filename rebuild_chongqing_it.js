const fs = require('fs');

const data = JSON.parse(fs.readFileSync('D:/1kaifa/grsds/chongqing_it_companies.json', 'utf8'));
console.log(`总数: ${data.length}`);

function esc(s) {
  if (!s && s !== 0) return 'NULL';
  return `'` + String(s).replace(/'/g, "''").replace(/\\/g, '\\\\') + `'`;
}

// 解析 reg_capital: "100万" → 1000000, "500" → 500
function parseCapital(raw) {
  if (!raw || raw === '-') return 'NULL';
  let s = String(raw).trim();
  let m;
  if (m = s.match(/^(\d+(?:\.\d+)?)\s*万$/)) return Math.round(parseFloat(m[1]) * 10000).toString();
  if (m = s.match(/^(\d+(?:\.\d+)?)\s*亿$/)) return Math.round(parseFloat(m[1]) * 100000000).toString();
  if (m = s.match(/^(\d+)$/)) return m[1];
  return 'NULL';
}

const sql = [];

sql.push(`-- ============================================================`);
sql.push(`-- 修复重庆IT企业数据 — 补齐 reg_capital / address / legal_person`);
sql.push(`-- 数据源: 顺企网 (shunqi.com)`);
sql.push(`-- 数量: ${data.length} 条`);
sql.push(`-- 生成: ${new Date().toISOString()}`);
sql.push(`-- ============================================================`);
sql.push(``);
sql.push(`-- 确保表有 name 唯一约束`);
sql.push(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='companies_name_key')`);
sql.push(`THEN ALTER TABLE companies ADD CONSTRAINT companies_name_key UNIQUE (name);`);
sql.push(`END IF; END $$;`);
sql.push(``);

// 逐条 UPDATE
let count = 0;
for (const c of data) {
  const cap = parseCapital(c.reg_capital);
  const addr = c.address || null;
  const prod = c.products || null;

  let setClauses = [];
  if (cap !== 'NULL') setClauses.push(`reg_capital = ${cap}`);
  if (addr) setClauses.push(`address = ${esc(addr)}`);
  if (prod) setClauses.push(`business_scope = ${esc(prod)}`);
  setClauses.push(`established = ${esc(c.established)}`);
  setClauses.push(`city = '重庆'`);
  setClauses.push(`province = '重庆'`);

  if (setClauses.length > 0) {
    sql.push(`UPDATE companies SET ${setClauses.join(', ')} WHERE name = ${esc(c.name)};`);
    count++;
  }
}

sql.push(``);
sql.push(`-- 更新了 ${count} 条`);
sql.push(`SELECT '重庆IT企业数据已修复' AS status, COUNT(*) AS total FROM companies WHERE province='重庆';`);

fs.writeFileSync('D:/1kaifa/grsds/fix_chongqing_it.sql', sql.join('\n'), 'utf8');
console.log(`✅ 已生成 fix_chongqing_it.sql (${count} 条 UPDATE)`);

// 统计 capital 覆盖率
const caps = {};
data.forEach(c => {
  let raw = c.reg_capital || '-';
  caps[raw] = (caps[raw] || 0) + 1;
});
const sorted = Object.entries(caps).sort((a, b) => b[1] - a[1]).slice(0, 10);
console.log('reg_capital 分布 (top 10):');
sorted.forEach(([k, v]) => console.log(`  ${v}\t${k}`));
