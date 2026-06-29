const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// 1. Find the 下班签退 button onclick
let out = s.indexOf('fw-btn-out');
console.log('=== fw-btn-out buttons ===');
let idx = 0;
while ((idx = s.indexOf('fw-btn-out', idx)) > 0 && idx < 1000000) {
  let ctx = s.slice(Math.max(0,idx-200), idx+200);
  console.log('AT', idx, ':', ctx.substring(0, 300));
  idx += 1;
  if (idx - out > 20000) break;
}

// 2. Check doCheckIn is async (for await usage)
let dc = s.indexOf('async function doCheckIn(');
console.log('\n=== doCheckIn header ===');
console.log(s.slice(dc, dc+60));

// 3. Load templates flow
let lt = s.indexOf('renderWorkflowTemplates');
idx = 0;
console.log('\n=== renderWorkflowTemplates ===');
while ((idx = s.indexOf('renderWorkflowTemplates', idx)) > 0 && idx < 1000000) {
  console.log('AT', idx, ':', s.slice(Math.max(0,idx-60), idx+120).substring(0, 180));
  idx += 1;
}

// 4. allRoles usage in renderWorkflowTemplates
idx = s.indexOf('function renderWorkflowTemplates');
if (idx > 0) {
  let end = s.indexOf('\nfunction ', idx+30);
  console.log('\n=== renderWorkflowTemplates body ===');
  console.log(s.slice(idx, end).substring(0, 1000));
}

// 5. Check if allDepartments is loaded
let ad = s.indexOf('allDepartments||[]');
console.log('\n=== allDepartments refs ===');
for (let i = 0; i < s.length; i++) {
  if (s.slice(i, i+16) === 'allDepartments||[') {
    let ctx = s.slice(Math.max(0,i-30), i+60);
    console.log('AT', i, ':', ctx);
  }
}

// 6. Check the actual select generation in wfShowProps more carefully
let wsp = s.indexOf('function wfShowProps(');
if (wsp > 0) {
  let selSection = s.slice(wsp, wsp+3000);
  // Find department section
  let dp = selSection.indexOf('授权部门');
  if (dp > 0) {
    console.log('\n=== Auth dept section (+after) ===');
    console.log(selSection.slice(dp-30, dp+300));
    // Staff section after
    let staff = selSection.indexOf('指定员工', dp);
    if (staff > 0) console.log('\n=== Staff section ===', selSection.slice(staff-30, staff+300));
  }
}
