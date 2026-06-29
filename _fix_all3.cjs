const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
let gps = fs.readFileSync('D:/1kaifa/grsds/_gps_new.txt', 'utf8');

// FIX 1: workflows tab - add loadAdminData call
let wfOld = "else if(tab==='workflows'){var wf=document.getElementById('admin-workflows');wf.classList.remove('hidden');subs[12].classList.add('active');renderWorkflowTemplates();}";
let wfNew = "else if(tab==='workflows'){(async function(){var wf=document.getElementById('admin-workflows');wf.classList.remove('hidden');subs[12].classList.add('active');if(!allRoles||!allRoles.length||!allDepartments||!allDepartments.length)await loadAdminData();renderWorkflowTemplates();})();}";
if (s.includes(wfOld)) { s = s.replace(wfOld, wfNew); console.log('WF: fixed'); }
else { console.log('WF: NOT FOUND - checking near'); let i = s.indexOf("tab==='workflows'"); if(i>0) console.log(s.slice(i-10,i+200)); }

// FIX 2: wfSetAssignee(2, → wfSetAssignee('+idx+',
let aOld = "wfSetAssignee(2,\\'value\\',this.value)";
let aNew = "wfSetAssignee('+idx+','value',this.value)";
if (s.includes(aOld)) { s = s.replace(aOld, aNew); console.log('ASSIGN: fixed'); }
else { console.log('ASSIGN: NOT FOUND'); }

// FIX 3: doCheckIn → setTimeout hard timeout
let dc = s.indexOf('async function doCheckIn(type){');
let ov = s.indexOf('\nfunction openVisitForm', dc);
console.log('GPS:', dc, ov, ov-dc);
s = s.slice(0, dc) + gps.trim() + '\n' + s.slice(ov);
console.log('GPS: replaced, size:', s.length);

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');

let ls = s.lastIndexOf('<script>'), le = s.lastIndexOf('</script>');
try { new (require('vm').Script)(s.slice(ls+8, le)); console.log('JS: OK'); }
catch(e) { console.log('JS FAIL:', e.message.substring(0,150)); }
let o=(s.match(/<div[\s>]/g)||[]).length, c=(s.match(/<\/div>/g)||[]).length;
console.log('Div:',o,c,o-c);
console.log('Final size:', s.length);
