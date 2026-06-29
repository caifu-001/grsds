const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
const i = s.indexOf('function switchFWTab');
if (i < 0) { console.log('not found'); process.exit(0); }
const j = s.indexOf('\nfunction ', i+30);
console.log(s.slice(i, j));
