const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
const i = s.indexOf('fw-vm-client');
const j = s.indexOf('</div>', i+1500);
console.log(s.slice(i-200, Math.min(i+2000, j+10)));
