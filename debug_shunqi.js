// 调试：对比 fetch vs xbrowser 获取 b2b.11467.com 搜索结果
const { execSync } = require('fs');
const fs = require('fs');
const path = require('path');

const nodeBin = process.env.QCLAW_CLI_NODE_BINARY || 'node';
const xb = 'D:\\Program Files\\QClaw\\v0.2.31.600\\resources\\openclaw\\config\\skills\\xbrowser\\scripts\\xb.cjs';

function xbRun(cmd, timeoutMs = 30000) {
  const full = `powershell -Command "& '${nodeBin}' '${xb}' run --browser default ${cmd}"`;
  const r = require('child_process').execSync(full, { timeout: timeoutMs, encoding: 'utf8', maxBuffer: 10*1024*1024, windowsHide: true });
  try { return JSON.parse(r); } catch(e) { return { raw: r, error: e.message }; }
}

async function main() {
  // Test URL: 外贸广州 第3页 (known to have real companies)
  const url = 'https://b2b.11467.com/search/-59168d385e7f5dde-pn3.htm';
  const outDir = __dirname;

  // 1. Node fetch
  console.log('=== Node fetch ===');
  try {
    const r = await fetch(url);
    const html = await r.text();
    fs.writeFileSync(path.join(outDir, 'shunqi_fetch.html'), html, 'utf8');
    console.log(`  Size: ${html.length} bytes`);
    // count /guangzhou/co/ links
    const coLinks = (html.match(/\/guangzhou\/co\/\d+\.htm/g) || []);
    console.log(`  /guangzhou/co/ links: ${coLinks.length}`);
    console.log(`  包含 "广州靓装": ${html.includes('广州靓装')}`);
    console.log(`  包含 "公司黄页": ${html.includes('公司黄页')}`);
  } catch(e) {
    console.log(`  Error: ${e.message}`);
  }

  // 2. xbrowser
  console.log('\n=== xbrowser ===');
  const openR = xbRun(`open "${url}"`, 20000);
  console.log(`  Open: ${openR.ok}`);
  const waitR = xbRun('wait --load networkidle', 20000);
  console.log(`  Wait: ${waitR.ok}`);
  const textR = xbRun('get text body', 15000);
  const rawText = textR.ok && textR.data?.result?.data?.text ? textR.data.result.data.text : '';
  fs.writeFileSync(path.join(outDir, 'shunqi_xb.txt'), rawText, 'utf8');
  console.log(`  Size: ${rawText.length}`);
  console.log(`  包含 "广州靓装": ${rawText.includes('广州靓装')}`);
  console.log(`  包含 "公司黄页": ${rawText.includes('公司黄页')}`);
  // Count co/XXXXX patterns in text
  const coMatches = (rawText.match(/\/guangzhou\/co\/\d+/g) || []);
  console.log(`  /guangzhou/co/ links: ${coMatches.length}`);
}

main().catch(e => console.error(e));
