const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
// Find admin tabs (different patterns)
const patterns = ['admin-tab-bar', 'admin-subtab" onclick', 'admin-subtab"'];
patterns.forEach(p => {
  let count = 0, i = 0;
  while ((i = s.indexOf(p, i+1)) > 0) count++;
  console.log(p, '=', count);
});
// Get the workflow tab button
const wf = s.indexOf('admin-workflows"');
if (wf > 0) {
  const before = s.lastIndexOf('<button', wf);
  console.log('\nWorkflow tab button:');
  console.log(s.slice(before, wf+20));
}
// Look for "subs[N].classList.add('active')" for all N
const re = /subs\[(\d+)\]\.classList\.add\('active'\)/g;
let m;
const seen = new Set();
while ((m = re.exec(s)) !== null) seen.add(m[1]);
console.log('\nsubs[] indices used:', Array.from(seen).sort((a,b)=>+a-+b).join(','));
