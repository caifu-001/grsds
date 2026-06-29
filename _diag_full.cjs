const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Check doCheckIn exists and if old version leaked through
let d1 = s.indexOf('async function doCheckIn(');
console.log('doCheckIn at:', d1);
if (d1 > 0) console.log('First 200:', s.slice(d1, d1+200));

// Check doSaveCheckIn
let d2 = s.indexOf('function doSaveCheckIn');
console.log('\ndoSaveCheckIn at:', d2);

// Check for old wfSetAssignee(2 hardcode
let d3 = s.indexOf('wfSetAssignee(2,');
console.log('\nwfSetAssignee(2,:', d3);
if (d3 > 0) console.log('Context:', s.slice(d3-20, d3+80));

// Check staffId pattern
let d4 = s.indexOf(',staffId,');
let d5 = s.indexOf(',"staffId",');
console.log('\n,staffId, at:', d4, ',"staffId", at:', d5);

// Check workflows tab in switchAdminTab
let wf = s.indexOf("tab==='workflows'");
console.log('\nworkflows branch at:', wf);
if (wf > 0) {
  let frag = s.slice(wf, wf + 200);
  console.log('Context:', frag);
}

// Check: is there any loadAdminData call in the workflows branch?
let ld = s.indexOf('loadAdminData()', wf);
console.log('loadAdminData after workflows:', ld, 'distance:', ld-wf);

// Page size
console.log('\nFile size:', s.length);
