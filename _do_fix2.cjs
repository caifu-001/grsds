const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// FIX 1
const wfOld = "else if(tab==='workflows'){var wf=document.getElementById('admin-workflows');wf.classList.remove('hidden');subs[12].classList.add('active');renderWorkflowTemplates();}";
const wfNew = "else if(tab==='workflows'){(async function(){var wf=document.getElementById('admin-workflows');wf.classList.remove('hidden');subs[12].classList.add('active');if(!allRoles||!allRoles.length||!allDepartments||!allDepartments.length)await loadAdminData();renderWorkflowTemplates();})();}";
s = s.split(wfOld).join(wfNew);

// FIX 2
s = s.split("wfSetAssignee(2,").join("wfSetAssignee('+idx+',");

// FIX 3a: <select id=wf-staff-dd-'+idx+' onchange=wfSetAssignee('+idx+',staffId,this.value)><option value=>
// → <select id="wf-staff-dd-'+idx+'" onchange="wfSetAssignee('+idx+',\'staffId\',this.value)"><option value="">
// Use String.raw to avoid escape hell
const old3a = String.raw`<select id=wf-staff-dd-'+idx+' onchange=wfSetAssignee('+idx+',staffId,this.value)><option value=>`;
const new3a = String.raw`<select id="wf-staff-dd-'+idx+'" onchange="wfSetAssignee('+idx+',\'staffId\',this.value)"><option value="">`;
if (s.includes(old3a)) {
  s = s.split(old3a).join(new3a);
  console.log('FIX3a OK');
} else {
  console.log('FIX3a NOT found, search:');
  let i = s.indexOf('wf-staff-dd-');
  if (i > 0) console.log(JSON.stringify(s.slice(i, i+120)));
}

// FIX 3b: h+='<option value='+escHtml(allUsers[ui].user_id)+'
// → h+='<option value="'+escHtml(allUsers[ui].user_id)+'
const old3b = String.raw`h+='<option value='+escHtml(allUsers[ui].user_id)+'`;
const new3b = String.raw`h+='<option value="'+escHtml(allUsers[ui].user_id)+'`;
if (s.includes(old3b)) {
  s = s.split(old3b).join(new3b);
  console.log('FIX3b OK');
} else {
  console.log('FIX3b NOT found');
  let i = s.indexOf('escHtml(allUsers[ui].user_id)');
  if (i > 0) console.log(JSON.stringify(s.slice(Math.max(0,i-30), i+50)));
}

// FIX 4: doCheckIn → setTimeout
const gps = fs.readFileSync('D:/1kaifa/grsds/_gps_inline.txt', 'utf8').trim();
const dcStart = s.indexOf('async function doCheckIn(type){');
const dcEnd = s.indexOf('\nfunction openVisitForm', dcStart);
if (dcStart > 0 && dcEnd > dcStart) {
  s = s.slice(0, dcStart) + gps + '\n' + s.slice(dcEnd);
  console.log('FIX4 OK');
} else {
  console.log('FIX4 NOT found');
}

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');
console.log('Size:', s.length);

// Verify
const ls = s.lastIndexOf('<script>'), le = s.lastIndexOf('</script>');
try { new (require('vm').Script)(s.slice(ls+8, le)); console.log('JS: OK'); }
catch(e) { 
  console.log('JS FAIL:', e.message.substring(0,200));
  const m = (e.stack||'').match(/inline:(\d+)/);
  if (m) {
    const ln = parseInt(m[1]);
    const lines = s.slice(ls+8, le).split('\n');
    for (let k = Math.max(0,ln-3); k < Math.min(lines.length, ln+2); k++)
      console.log('L'+(k+1)+': '+(lines[k]||'').substring(0,200));
  }
}
const o=(s.match(/<div[\s>]/g)||[]).length, c=(s.match(/<\/div>/g)||[]).length;
console.log('Div:',o,c,o-c);

// Print final state of fixed sections for sanity
console.log('\n--- Final staff dropdown line ---');
let i = s.indexOf('wf-staff-dd-');
if (i > 0) console.log(s.slice(i, i+150));
console.log('\n--- Final workflows branch ---');
let w = s.indexOf("tab==='workflows'");
if (w > 0) console.log(s.slice(w, w+250));
console.log('\n--- Final wfSetAssignee calls ---');
let m, re = /wfSetAssignee\([^)]+\)/g;
while ((m = re.exec(s)) !== null) {
  if (m[0].includes('value') || m[0].includes('staffId')) {
    console.log(m[0]);
  }
}
