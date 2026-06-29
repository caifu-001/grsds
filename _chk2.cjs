const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
let i = s.indexOf('wf-staff-dd-');
console.log('staff at:', i);
if (i > 0) {
  // Find the start of the line containing it
  let lineStart = s.lastIndexOf("h+='", i);
  let lineEnd = s.indexOf("';", i);
  console.log('Line:', JSON.stringify(s.slice(lineStart, lineEnd+2)).slice(0, 400));
}
let j = s.indexOf('<option value=>');
console.log('bare value=> at:', j);
// Also check the actual rendering code
let selIdx = s.indexOf('h+=\'<select id="wf-staff-dd-');
if (selIdx > 0) {
  let le = s.indexOf("';", selIdx);
  console.log('\n=== Generated select h+= ===');
  console.log(s.slice(selIdx, le+2));
}
let dd = s.indexOf('id="wf-staff-dd-');
console.log('\nrendered id at:', dd);
if (dd > 0) console.log(s.slice(dd, dd+200));
