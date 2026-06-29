const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
// Find fw-visits panel
const i = s.indexOf('id="fw-visits"');
if (i < 0) { console.log('fw-visits not found'); process.exit(0); }
const j = s.indexOf('<!--', i+10);
console.log(s.slice(i, Math.min(i+2000, j > 0 ? j+100 : i+2000)));
