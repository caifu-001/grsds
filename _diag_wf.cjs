const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// 1. Find wfShowProps - the whole function
let wsp = s.indexOf('function wfShowProps(');
let wspEnd = s.indexOf('\nfunction wfSetApproval', wsp);
if (wspEnd < 0) wspEnd = s.indexOf('\nfunction wfSetAssignee', wsp+30);
console.log('wfShowProps:', wsp, '->', wspEnd, 'len', wspEnd-wsp);
console.log(s.slice(wsp, wspEnd));

// 2. Find wfRefreshStaffDD
let rsd = s.indexOf('function wfRefreshStaffDD');
console.log('\n=== wfRefreshStaffDD ===');
if (rsd > 0) {
  let rsdEnd = s.indexOf('\nfunction ', rsd+30);
  console.log(s.slice(rsd, rsdEnd));
} else {
  console.log('NOT FOUND');
}

// 3. Find all Departments loading in loadAdminData
let lad = s.indexOf('async function loadAdminData');
if (lad > 0) {
  let ladEnd = s.indexOf('\nfunction ', lad+30);
  console.log('\n=== loadAdminData (first 1000 chars) ===');
  console.log(s.slice(lad, Math.min(lad+1000, ladEnd||999999)));
}

// 4. Find wfSetAssignee and wfFindUserByDept
let wfa = s.indexOf('\nfunction wfSetAssignee(');
console.log('\n=== wfSetAssignee ===');
if (wfa > 0) console.log(s.slice(wfa, wfa+300));

let fud = s.indexOf('function wfFindUserByDept');
console.log('\n=== wfFindUserByDept ===');
if (fud > 0) {
  let fudEnd = s.indexOf('\nfunction ', fud+30);
  console.log(s.slice(fud, fudEnd));
} else {
  console.log('NOT FOUND - searching for wfFindUser');
  let fu = s.indexOf('wfFindUser');
  if (fu > 0) console.log('wfFindUser at', fu, ':', s.slice(fu, fu+200));
}
