const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
const base = s.indexOf('<script>', 100000) + 8;
const js = s.slice(base);

// Extract renderProjectDetail completely  
function extractComplete(name, asyncFlag) {
  const prefix = asyncFlag ? 'async function ' : 'function ';
  let i = js.indexOf(prefix + name + '(');
  if (i < 0) { console.log('NOT FOUND:', name); return ''; }
  let d = 0, p = js.indexOf('{', i + prefix.length) + 1;
  while (d >= 0 && p < js.length) {
    if (js[p] === '{') d++;
    else if (js[p] === '}') { d--; if (d === 0) break; }
    p++;
  }
  return js.slice(i, p + 1);
}

const rpd = extractComplete('renderProjectDetail', true);
console.log('=== renderProjectDetail (FULL, ' + rpd.length + ' bytes) ===');
console.log(rpd);
console.log('\n\n=== switchDetailTab (FULL) ===');
const sdt = extractComplete('switchDetailTab', false);
console.log(sdt);

// Also check what comes after switchDetailTab
const sdtEnd = js.indexOf('function switchDetailTab(');
if (sdtEnd >= 0) {
  let d = 0, p = js.indexOf('{', sdtEnd) + 1;
  while (d >= 0 && p < js.length) { if (js[p] === '{') d++; else if (js[p] === '}') { d--; if (d === 0) break; } p++; }
  console.log('\nAfter switchDetailTab (next 200 chars):');
  console.log(js.slice(p + 1, p + 200));
}
