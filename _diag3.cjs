const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// 1. Check doCheckIn
let dc = s.indexOf('async function doCheckIn(');
console.log('=== doCheckIn ===');
console.log(s.slice(dc, dc+200));

// 2. Check wfSetAssignee function itself
let wfs = s.indexOf('function wfSetAssignee(');
console.log('\n=== wfSetAssignee at', wfs, '===');
if (wfs > 0) console.log(s.slice(wfs, wfs+500));

// 3. Check wfShowProps - the part that renders the department dropdown onchange
let wsp = s.indexOf('function wfShowProps(');
if (wsp > 0) {
  // Find the select generation part
  let sel = s.indexOf('授权部门', wsp);
  console.log('\n=== Select gen ===');
  if (sel > 0) console.log(s.slice(sel-100, sel+200));
}

// 4. Check loadAdminData - does it load roles/departments?
let lad = s.indexOf('async function loadAdminData(');
console.log('\n=== loadAdminData at', lad, '===');
if (lad > 0) console.log(s.slice(lad, lad+200));

// 5. Check showLocationConfirm
let slc = s.indexOf('function showLocationConfirm(');
console.log('\n=== showLocationConfirm at', slc, '===');
if (slc > 0) console.log(s.slice(slc, slc+200));

// 6. Does doCheckIn call showLocationConfirm?
let c1 = s.indexOf('showLocationConfirm', dc);
console.log('\nshowLocationConfirm in doCheckIn at offset:', c1-dc, 'from dc');
if (c1 > 0) console.log(s.slice(c1-10, c1+100));

// 7. Check if doSaveCheckIn exists
let dsc = s.indexOf('function doSaveCheckIn(');
console.log('\ndoSaveCheckIn at:', dsc);
if (dsc > 0) console.log(s.slice(dsc, dsc+100));
