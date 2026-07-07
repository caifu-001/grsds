// mingluji 第二轮：深广深度爬取
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TARGET = 1500;
const OUT = path.join(__dirname, 'guangdong_companies.json');

// 只爬深圳和广州，每城50页
const CITIES = ['深圳', '广州'];
const MAX_PAGES_PER_CITY = 50;

const nonCompany = /(协会|学院|学校|服务中心|机关|事务所|律所|医院|诊所|养老|福利|基金[会金])/;
const nodeBin = process.env.QCLAW_CLI_NODE_BINARY || 'node';
const xb = 'D:\\Program Files\\QClaw\\v0.2.31.600\\resources\\openclaw\\config\\skills\\xbrowser\\scripts\\xb.cjs';

function xbRun(cmd, timeoutMs = 30000) {
  const full = `powershell -Command "& '${nodeBin}' '${xb}' run --browser default ${cmd}"`;
  const r = execSync(full, { timeout: timeoutMs, encoding: 'utf8', maxBuffer: 10*1024*1024, windowsHide: true });
  try { return JSON.parse(r); } catch(e) { return { raw: r, error: e.message }; }
}

function cityUrl(city, page) {
  const enc = encodeURIComponent(city);
  const base = `https://gongshang.mingluji.com/guangdong/zhuanti/106/${enc}`;
  return page <= 1 ? base : `${base}?page=${page}`;
}

function parsePage(text, city) {
  const lines = text.split('\n');
  const results = [];

  let startIdx = 0, endIdx = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '立即联系') startIdx = i + 1;
    if (lines[i].trim().includes('下一页') && lines[i].trim().length < 10) { endIdx = i; break; }
  }

  const noise = /^(下载|常见问题|包括|报告|专题|企业列表|会员推荐|热门行业|相关推荐|数据批量|返回|联系我们|你可能对|如何获取|本站热门|优惠政策|搜索|🛒|💳|⛄|🕮|数据验证|📧|武汉市|隐私政策|版权通告|关于我们|热门大学|热门行业|内外贸易|新工商名录|主菜单|最近更新|其它省|更多学校|上一页|下一页|城市$|区县$)/;
  const fieldLabels = /^(联系人|联系电话|成立时间|注册资金|经营范围|公司类型|所属行业|法定代表人|注册地址|统一社会信用代码|参保人数|企业地址)/;

  for (let i = startIdx; i < endIdx; i++) {
    const line = lines[i].trim();
    if (!line || line.includes('\t') || line.length < 4 || noise.test(line) || fieldLabels.test(line)) continue;

    const lookahead = lines.slice(i+1, Math.min(i+4, endIdx)).join('\n');
    if (!lookahead.includes('联系人') && !lookahead.includes('联系电话')) continue;

    const name = line;
    if (nonCompany.test(name)) continue;

    let blockLines = [];
    for (let j = i + 1; j < Math.min(i + 15, endIdx); j++) {
      const bl = lines[j].trim();
      if (!bl) break;
      if (bl.includes('下载企业报告') || bl.includes('在线阅览') || bl.includes('🛒付费')) break;
      if (bl.includes('社区') && bl.includes('街道') && bl.includes('地图')) break;
      blockLines.push(bl);
    }
    const blockText = blockLines.join('\n');

    let contact = '', established = '', regCapital = null, scope = '';
    const cm = blockText.match(/联系人[：:]\s*(.+)/); if (cm) contact = cm[1].trim();
    const em = blockText.match(/于(\d{4}-\d{2}-\d{2})在工商局注册/); if (em) established = em[1];
    const rm = blockText.match(/注册资金[：:]\s*(\d+(?:\.\d+)?)\s*万/); if (rm) regCapital = parseFloat(rm[1]) * 10000;
    const sm = blockText.match(/经营范围[：:]\s*([\s\S]+)/); if (sm) {
      scope = sm[1].trim().replace(/[\u2026.]+$/, '').trim();
    }

    if (!results.find(r => r.name === name) && contact) {
      results.push({ name, contact, established, registered_capital: regCapital, business_scope: scope, province: '广东', city: city, source: 'mingluji' });
    }
    i += 8;
  }
  return results;
}

let all = [];
if (fs.existsSync(OUT)) {
  try { all = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch(e) {}
  all = all.filter(c => c.contact && !nonCompany.test(c.name));
}
const existingNames = new Set(all.map(c => c.name));
console.log(`已有 ${all.length} 家，目标 ${TARGET} 家`);

for (const city of CITIES) {
  if (all.length >= TARGET) break;
  console.log(`\n=== ${city}（第二轮，最多 ${MAX_PAGES_PER_CITY} 页）===`);

  let cityNew = 0;
  for (let page = 1; page <= MAX_PAGES_PER_CITY; page++) {
    if (all.length >= TARGET) break;

    const url = cityUrl(city, page);
    const openR = xbRun(`open "${url}"`);
    if (!openR.ok) { console.log(`  页${page} 打开失败`); break; }

    const waitR = xbRun('wait --load networkidle', 20000);
    if (!waitR.ok) { console.log(`  页${page} 等待失败`); continue; }

    const textR = xbRun('get text body', 15000);
    const rawText = textR.ok && textR.data?.result?.data?.text ? textR.data.result.data.text : '';
    if (!rawText) { console.log(`  页${page} 抓取失败`); continue; }

    const companies = parsePage(rawText, city);
    let added = 0;
    for (const c of companies) {
      if (!existingNames.has(c.name) && !nonCompany.test(c.name)) {
        all.push(c); existingNames.add(c.name); added++; cityNew++;
      }
    }
    const dupCount = companies.length - added;
    console.log(`  [页${page}] ${companies.length}条 +${added}${dupCount > 0 ? ` (${dupCount}去重)` : ''} 累计 ${all.length}/${TARGET}`);

    if (all.length >= TARGET) break;
    execSync('powershell -Command "Start-Sleep -Seconds 1"', { encoding: 'utf8', stdio: 'ignore' });
  }
  console.log(`  ${city} 小计: +${cityNew}`);
}

fs.writeFileSync(OUT, JSON.stringify(all, null, 2), 'utf8');
console.log(`\n✅ 导出: ${all.length} 家公司 -> ${OUT}`);
