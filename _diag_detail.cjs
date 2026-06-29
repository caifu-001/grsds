const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html','utf8');
const base = s.indexOf('<script>', 100000) + 8;
const js = s.slice(base);
const html = s.slice(0, base);

console.log('project-detail-view HTML:', html.includes('id="project-detail-view"'));
console.log('pd-title HTML:', html.includes('id="pd-title"'));
console.log('switchDetailTab JS:', js.includes('function switchDetailTab('));

// Find project-detail-view in HTML
const idx = html.indexOf('project-detail-view');
if (idx >= 0) {
  console.log('HTML context:', html.slice(Math.max(0, idx - 50), idx + 200));
} else {
  console.log('project-detail-view NOT in HTML!');
  
  // Search for similar patterns
  const alt = html.match(/project.*detail|detail.*project/gi);
  console.log('Similar patterns:', alt);
}

// Find switchDetailTab function  
const sdt = js.indexOf('function switchDetailTab(');
if (sdt >= 0) {
  let d = 0, p = js.indexOf('{', sdt) + 1;
  while (d >= 0 && p < js.length) {
    if (js[p] === '{') d++;
    else if (js[p] === '}') { d--; if (d === 0) break; }
    p++;
  }
  console.log('\nswitchDetailTab:', js.slice(sdt, p + 1).slice(0, 500));
} else {
  console.log('switchDetailTab NOT FOUND!');
}
