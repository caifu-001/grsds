const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
console.log('Start:', s.length);

// === FIX 1: workflows tab — await loadAdminData before renderWorkflowTemplates ===
let wfOld = "else if(tab==='workflows'){var wf=document.getElementById('admin-workflows');wf.classList.remove('hidden');subs[12].classList.add('active');renderWorkflowTemplates();}";
let wfNew = "else if(tab==='workflows'){(async function(){var wf=document.getElementById('admin-workflows');wf.classList.remove('hidden');subs[12].classList.add('active');if(!allRoles||!allRoles.length||!allDepartments||!allDepartments.length)await loadAdminData();renderWorkflowTemplates();})();}";
s = s.replace(wfOld, wfNew);
console.log('FIX1 (workflows tab):', s.includes(wfNew) ? 'OK' : 'FAIL');

// === FIX 2: wfSetAssignee(2, → wfSetAssignee('+idx+, ===
s = s.replace("wfSetAssignee(2,\\'value\\',this.value)", "wfSetAssignee('+idx+','value',this.value)");
let check2 = s.indexOf("wfSetAssignee(2,");
console.log('FIX2 (assignee idx):', check2 < 0 ? 'OK (no more hardcoded 2)' : 'FAIL still at '+check2);

// === FIX 3: Clean up the staff dropdown section in wfShowProps ===
// The problem: id=..., onchange=..., value=..., staffId all without quotes in generated HTML
// Generated JS line: h+='<label>指定员工</label><select id=wf-staff-dd-'+idx+' onchange=wfSetAssignee('+idx+',staffId,this.value)><option value=>无</option>';
// Fix: add quotes around HTML attributes and use "staffId"
// Also fix the option value= without quotes
let old3 = "<select id=wf-staff-dd-'+idx+' onchange=wfSetAssignee('+idx+',staffId,this.value)><option value=>";
let new3 = '<select id=\"wf-staff-dd-'+idx+'\" onchange=\"wfSetAssignee('+idx+',\"staffId\",this.value)\"><option value=\"\">';
s = s.replace(old3, new3);
// Also fix: h+='<option value='+escHtml → h+='<option value="'+escHtml
s = s.replace("h+='<option value='+escHtml(allUsers[ui].user_id)+\"", 'h+=\'<option value=\"'+escHtml(allUsers[ui].user_id)+\"');
console.log('FIX3 (staff dropdown): applied');

// === FIX 4: Rewrite doCheckIn with setTimeout ===
let gpsRaw = fs.readFileSync('D:/1kaifa/grsds/_gps_new.txt', 'utf8').trim();
let dc = s.indexOf('async function doCheckIn(type){');
let ov = s.indexOf('\nfunction openVisitForm', dc);
s = s.slice(0, dc) + gpsRaw + '\n' + s.slice(ov);
console.log('FIX4 (GPS): replaced, delta=', (dc+gpsRaw.length+(s.length-ov-dc-gpsRaw.length)));

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');
console.log('Size:', s.length);

// Verify
let ls = s.lastIndexOf('<script>'), le = s.lastIndexOf('</script>');
try { new (require('vm').Script)(s.slice(ls+8, le)); console.log('JS: OK'); }
catch(e) { console.log('JS FAIL:', e.message.substring(0,150)); }
let o=(s.match(/<div[\s>]/g)||[]).length, c=(s.match(/<\/div>/g)||[]).length;
console.log('Div:',o,c,o-c);
