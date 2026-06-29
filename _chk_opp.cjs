const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Find oppLeadId null assignments
let idx = 0, count = 0;
while (true) {
  idx = s.indexOf('oppLeadId', idx);
  if (idx < 0) break;
  const ctx = s.slice(idx - 50, idx + 80).replace(/\n/g, '\\n');
  console.log(count, idx, ctx);
  idx++;
  count++;
}

console.log('\ncloseOppForm:');
const cf = s.indexOf('function closeOppForm()');
if (cf > 0) {
  const end = s.indexOf('\nfunction ', cf + 50);
  console.log(s.slice(cf, end || cf + 300));
}
