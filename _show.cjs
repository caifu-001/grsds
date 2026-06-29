const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
const i = s.indexOf('function wfShowProps');
const j = s.indexOf('\nfunction ', i+30);
console.log(s.slice(i, j).substring(0, 1500));
