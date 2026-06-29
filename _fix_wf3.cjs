const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Bug 3: staffId missing quotes in onchange
// onchange=wfSetAssignee('+idx+',staffId,this.value)  ->  onchange="wfSetAssignee('+idx+',\'staffId\',this.value)"
let badStaff = "onchange=wfSetAssignee('+idx+',staffId,this.value)";
let goodStaff = "onchange=\"wfSetAssignee('+idx+',\\\\'staffId\\\\',this.value)\"";
let cnt1 = 0;
s = s.replace(new RegExp(badStaff.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), function(){cnt1++; return goodStaff;});
console.log('staffId quotes fix:', cnt1);

// Bug 2: wfShowProps - approval approverRole dropdown uses allRoles
// Check if allRoles is loaded in wfShowProps context. The dropdown iterates allRoles.
// Let's check if the template editor page loads allRoles
let tIdx = s.indexOf('function renderWorkflowTemplates');
if (tIdx > 0) {
  let end = s.indexOf('\nfunction', tIdx + 50);
  console.log('\nrenderWorkflowTemplates:' + s.slice(tIdx, Math.min(tIdx+800, end)).replace(/\n/g,'\\n'));
}

// Also check if loadAdminData loads roles  
let ladIdx = s.indexOf('allRoles=roles||[];');
console.log('\nallRoles load context:', s.slice(ladIdx-80, ladIdx+80).replace(/\n/g,'\\n'));

// Check switchAdminTab for workflows to ensure allRoles is loaded
let satIdx = s.indexOf('function switchAdminTab');
let satEnd = s.indexOf('\nfunction', satIdx + 50);
console.log('\nswitchAdminTab:', s.slice(satIdx, Math.min(satIdx+3000, satEnd)).substring(0, 1500));

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');
console.log('\nWritten', s.length);
