const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
const i = s.indexOf('<select id="wf-staff-dd-');
console.log('select at:', i);
if (i < 0) process.exit(0);
// Find the line this is on
const before = s.lastIndexOf('h+=\'', i);
const after = s.indexOf("';", i);
console.log('line range:', before, after);
console.log('=== generated select line ===');
console.log(s.slice(before, after+2));
console.log('=== full assignee section (3 lines) ===');
const prev = s.lastIndexOf('h+=\'', before - 5);
const next = s.indexOf("h+='", after);
console.log(s.slice(prev, next));
