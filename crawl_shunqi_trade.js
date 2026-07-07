// 顺企网 广州+深圳 外贸/跨境/进出口制造企业爬虫 v3
// 用法: node crawl_shunqi_trade.js
// 改进: 城市推断修复 + 严格制造业过滤 + 搜索页直接解析

const fs = require('fs');
const path = require('path');

const OUTPUT_JSON = path.join(__dirname, 'guangzhou_shenzhen_trade_companies.json');
const OUTPUT_SQL = path.join(__dirname, 'import_guangzhou_shenzhen_trade.sql');

const SEARCHES = [
  ['外贸广州', '59168d385e7f5dde'],
  ['外贸深圳', '59168d386df15733'],
  ['进出口广州', '8fdb51fa53e35e7f5dde'],
  ['进出口深圳', '8fdb51fa53e36df15733'],
  ['跨境电商广州', '8de85883753555465e7f5dde'],
  ['跨境电商深圳', '8de85883753555466df15733'],
  // 补充：行业+产品关键词搜索
  ['服装出口广州', '670d88c551fa53e35e7f5dde'],
  ['服装出口深圳', '670d88c551fa53e36df15733'],
  ['电子产品出口广州', '753510d85b50c151fa53e35e7f5dde'],
  ['电子产品出口深圳', '753510d85b50c151fa53e36df15733'],
  ['玩具出口广州', '73a98d7751fa53e35e7f5dde'],
  ['玩具出口深圳', '73a98d7751fa53e36df15733'],
];

const MAX_PAGES = 5;
const DELAY_MS = 1500;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchHtml(url, retries = 3) {
  return fetch(url, { signal: AbortSignal.timeout(15000) })
    .then(r => r.text())
    .catch(async (err) => {
      if (retries > 0) { await sleep(2000); return fetchHtml(url, retries - 1); }
      return null;
    });
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').trim();
}

// 排除服务类/非制造业
const EXCLUDE = /(代办|代理记账|知识产权|商标|财税|法务|律[师所]|报关行|物流|货运|快递|供应链|展览|展会|广告|培训|咨询|认证|检测|学院|学校|医院|诊所|养老|投资管理|基金管理|旅行社|网络科技|信息科技|软件开发|APP|微信|小程序|营销|推广|设计公司|签证|移民)/;
// 公司名必须包含"公司"或"厂"，排除个人/商行/经营部
const NAME_MUST_HAVE = /(公司|厂)$/;

// 必须关联产品/制造业
const PRODUCT_KW = /(服装|服饰|纺织|面料|皮革|鞋|帽|箱包|手袋|玩具|电子|电器|家电|家具|灯饰|灯[具光]|饰品|珠宝|钟表|眼镜|化妆品|日化|护肤|塑料|文具|体育|礼品|工艺品|陶瓷|玻璃|水晶|食品|饮料|茶叶|酒|农产品|水产品|汽车|摩托车|自行车|配件|零件|机械|设备|仪器|五金|工具|家居|厨具|卫浴|石材|包装|印刷|纸制品|办公|数码|手机|电脑|耳机|音箱|相机|手表|太阳能|光伏|电池|电源|瓷砖|地板|窗帘|床上用品|园林|花卉|宠物|渔具|帐篷|户外|健身|泳装|内衣|手套|围巾|领带|皮带|纽扣|拉链|标牌|花边|刺绣|贴纸|标签|画框|相框|蜡烛|香薰|精油|无人机|机器人|无人机|3D打印|医疗器械|防护用品|面膜|假发|织带)/;

function parseSearchPage(html, cityHint) {
  const results = [];
  const itemRe = /<li>\s*<div class="f_r cologo"><\/div>\s*<div class="f_l">([\s\S]*?)<\/li>/gi;
  let m;

  while ((m = itemRe.exec(html)) !== null) {
    const block = m[1];
    const record = {};

    const nameM = block.match(/<a[^>]*href="(https?:\/\/[^"]*\/co\/\d+\.htm)"[^>]*title="([^"]+)"/);
    if (!nameM) continue;
    record.name = nameM[2];
    record.source_url = nameM[1];

    const scopeM = block.match(/主营产品\s*[:：]\s*(.+?)<\/div>/);
    record.business_scope = scopeM ? stripTags(scopeM[1]).trim() : '';

    const addrM = block.match(/地址\s*[:：]\s*(.+?)<\/div>/);
    record.address = addrM ? stripTags(addrM[1]).trim() : '';

    const capM = block.match(/注册资本\s*[:：]\s*([\d,]+(?:\.\d+)?)\s*万/);
    if (capM) record.registered_capital = parseFloat(capM[1].replace(/,/g, '')) * 10000;

    const estM = block.match(/成立时间\s*[:：]\s*(\d{4}-\d{2}-\d{2})/);
    record.established = estM ? estM[1] : '';

    // 城市由搜索关键词确定
    record.city = cityHint;
    record.province = '广东';
    record.source = 'shunqi';

    results.push(record);
  }
  return results;
}

function isTradeManufacturing(record) {
  const scope = record.business_scope || '';
  const name = record.name || '';
  const combined = scope + name;

  const tradeKW = ['外贸', '出口', '进口', '跨境', '进出口', '国际贸易', '海外', '跨境电商', '贸易'];
  if (!tradeKW.some(k => combined.includes(k))) return false;

  return PRODUCT_KW.test(combined);
}

async function main() {
  console.log('=== 顺企网 广州/深圳 外贸制造企业爬虫 v3 ===\n');

  const allCompanies = [];
  const seen = new Set();

  for (const [keyword, hex] of SEARCHES) {
    const cityName = keyword.includes('广州') ? '广州' : '深圳';
    console.log(`📌 "${keyword}" → ${cityName}`);

    let searchCount = 0;
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = page === 1
        ? `https://b2b.11467.com/search/-${hex}.htm`
        : `https://b2b.11467.com/search/-${hex}-pn${page}.htm`;

      const html = await fetchHtml(url);
      if (!html) { console.log(`  ✗ 请求失败`); break; }
      if (html.includes('没有找到主营产品包含')) { console.log(`  ✓ 已无更多结果`); break; }

      const companies = parseSearchPage(html, cityName);
      let added = 0;
      for (const c of companies) {
        if (!c.name) continue;
        const key = `${c.city}-${c.name}`;
        if (seen.has(key)) continue;
        if (EXCLUDE.test(c.name + c.business_scope)) continue;
        if (!NAME_MUST_HAVE.test(c.name)) continue;
        if (!isTradeManufacturing(c)) continue;
        seen.add(key);
        allCompanies.push(c);
        added++;
      }
      searchCount += added;
      const pageLabel = url.includes('-pn') ? `第${page}页` : '第1页';
      console.log(`  ${pageLabel}: ${companies.length}条 → +${added}`);
      if (companies.length === 0) break;
      await sleep(DELAY_MS);
    }
    console.log(`  小计: +${searchCount}, 累计: ${allCompanies.length}\n`);
    await sleep(2000);
  }

  // 去重
  const finalSeen = new Set();
  const deduped = allCompanies.filter(c => {
    const key = `${c.name}-${c.city}`;
    if (finalSeen.has(key)) return false;
    finalSeen.add(key);
    return true;
  });

  console.log(`\n=== 统计 ===`);
  console.log(`  去重后: ${deduped.length} 条`);
  const gz = deduped.filter(c => c.city === '广州').length;
  const sz = deduped.filter(c => c.city === '深圳').length;
  console.log(`  广州: ${gz} | 深圳: ${sz}`);
  console.log(`  有成立时间: ${deduped.filter(c => c.established).length}`);
  console.log(`  有注册资本: ${deduped.filter(c => c.registered_capital).length}`);

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(deduped, null, 2), 'utf8');
  console.log(`\n✅ JSON: ${OUTPUT_JSON} (${deduped.length} 条)`);

  if (deduped.length > 0) {
    const sql = genSQL(deduped);
    fs.writeFileSync(OUTPUT_SQL, sql, 'utf8');
    console.log(`✅ SQL: ${OUTPUT_SQL}`);
  }

  console.log('\n=== 预览 ===');
  deduped.slice(0, 15).forEach((c, i) => {
    console.log(`${i+1}. ${c.name} | ${c.city} | ${c.business_scope?.slice(0,50)} | ${c.established}`);
  });
}

function esc(s) {
  if (!s) return 'NULL';
  return `'` + s.replace(/'/g, "''").replace(/\\/g, '\\\\') + `'`;
}

function genSQL(companies) {
  const lines = [
    `-- 顺企网 广州/深圳 外贸制造企业`,
    `-- 日期: ${new Date().toISOString()}`,
    `-- 总计: ${companies.length} 条`,
    '',
    'INSERT INTO companies (name, legal_person, reg_capital, established, business_scope, contact, city, province, status)',
    'VALUES',
  ];
  const vals = companies.map(c =>
    `(${esc(c.name)}, NULL, ${c.registered_capital || 'NULL'}, ${esc(c.established)}, ${esc(c.business_scope)}, NULL, ${esc(c.city)}, '广东', 'approved')`
  );
  lines.push(vals.join(',\n'));
  lines.push('ON CONFLICT (name, city) DO UPDATE SET');
  lines.push('  business_scope = EXCLUDED.business_scope,');
  lines.push('  reg_capital = COALESCE(EXCLUDED.reg_capital, companies.reg_capital),');
  lines.push('  established = COALESCE(EXCLUDED.established, companies.established);');
  return lines.join('\n');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
