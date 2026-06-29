const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
// Check the dept label line
const i = s.indexOf("wfSetAssignee('+idx+',\\'value\\',this.value)");
if (i > 0) {
  const lineStart = s.lastIndexOf("h+='", i);
  const lineEnd = s.indexOf("';", i);
  console.log('dept line:', s.slice(lineStart, lineEnd+2));
}
const j = s.indexOf("wfSetAssignee('+idx+',\\'staffId\\',this.value)");
if (j > 0) {
  const lineStart = s.lastIndexOf("h+='", j);
  const lineEnd = s.indexOf("';", j);
  console.log('staff line:', s.slice(lineStart, lineEnd+2));
}
// Check wfRefreshStaffDD
const k = s.indexOf('function wfRefreshStaffDD');
const ke = s.indexOf('\nfunction ', k+10);
console.log('\nwfRefreshStaffDD:');
console.log(s.slice(k, ke));
