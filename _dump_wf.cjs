const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
// Find the wfShowProps function body
let i = s.indexOf('function wfShowProps(');
let j = s.indexOf('\nfunction ', i+10);
console.log('wfShowProps at:', i, 'end:', j);
console.log('=== FULL FUNCTION ===');
console.log(s.slice(i, j));
