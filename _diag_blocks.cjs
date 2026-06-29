const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
const base = s.indexOf('<script>', 100000) + 8;
const js = s.slice(base);
const html = s.slice(0, base);

console.log('pd-blocks-container in HTML:', html.includes('pd-blocks-container'));
console.log('pd-perm-info in HTML:', html.includes('pd-perm-info'));
console.log('pd-owner-info in HTML:', html.includes('pd-owner-info'));

// Extract renderDetailBlocks
function extractComplete(name) {
  let i = js.indexOf('function ' + name + '(');
  if (i < 0) { console.log('NOT FOUND:', name); return ''; }
  let d = 0, p = js.indexOf('{', i) + 1;
  while (d >= 0 && p < js.length) {
    if (js[p] === '{') d++;
    else if (js[p] === '}') { d--; if (d === 0) break; }
    p++;
  }
  return js.slice(i, p + 1);
}

const rdb = extractComplete('renderDetailBlocks');
console.log('\n=== renderDetailBlocks (' + rdb.length + ' bytes) ===');
console.log(rdb.slice(0, 800));

// Check project-detail-view entire content
const pdv = html.indexOf('id="project-detail-view"');
const pdvEnd = html.indexOf('<!-- =====', pdv + 100);
console.log('\nproject-detail-view ends at:', pdvEnd);
console.log(html.slice(pdv, pdvEnd));
