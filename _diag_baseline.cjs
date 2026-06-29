const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// === DIAG: Check what's actually in 7dac066 ===
// wfSetAssignee with hardcoded number
let re = /wfSetAssignee\(\d+,/g;
let m;
console.log('=== wfSetAssignee(num, ===');
while((m=re.exec(s)) !== null) {
  let end = s.indexOf(')', m.index + 20);
  console.log('AT', m.index, ':', s.slice(m.index, end+1));
}

// workflows tab
let wfi = s.indexOf("tab==='workflows'");
if (wfi > 0) {
  let ctx = s.slice(wfi, wfi+200);
  console.log('\n=== workflows tab ===');
  console.log(ctx);
}

// staffId issues
let si = s.indexOf("staffId");
while (si > 0 && si < 1000000) {
  let ctx = s.slice(Math.max(0,si-10), si+40);
  if (ctx.includes('onchange') || ctx.includes('h+=') || ctx.includes('wfSetAssignee') || ctx.includes('selStaff')) {
    console.log('\nstaffId at', si, ':');
    console.log(s.slice(si-30, si+50));
  }
  si = s.indexOf('staffId', si+1);
}

// doCheckIn
let dc = s.indexOf('async function doCheckIn');
let ov = s.indexOf('\nfunction openVisitForm', dc);
console.log('\n=== doCheckIn ===');
console.log('pos:', dc, 'next:', ov, 'len:', ov-dc);
