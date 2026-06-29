const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
console.log('Start size:', s.length);

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
}

// ============================================
// FIX 1: workflows tab
// ============================================
const wfOld = "else if(tab==='workflows'){var wf=document.getElementById('admin-workflows');wf.classList.remove('hidden');subs[12].classList.add('active');renderWorkflowTemplates();}";
const wfNew = "else if(tab==='workflows'){(async function(){var wf=document.getElementById('admin-workflows');wf.classList.remove('hidden');subs[12].classList.add('active');if(!allRoles||!allRoles.length||!allDepartments||!allDepartments.length)await loadAdminData();renderWorkflowTemplates();})();}";
s = s.split(wfOld).join(wfNew);
check('FIX1 workflows tab', s.includes("if(!allRoles||!allRoles.length||!allDepartments||!allDepartments.length)await loadAdminData()"));

// ============================================
// FIX 2: wfSetAssignee(2, → wfSetAssignee('+idx+',
// ============================================
// Raw text in file: wfSetAssignee(2,\'value\',this.value)
// Note: in the file the \' is two chars: backslash + apostrophe
// We want to replace just the "2," with "'+idx+',"
s = s.split("wfSetAssignee(2,").join("wfSetAssignee('+idx+',");
check('FIX2 assignee idx', s.indexOf("wfSetAssignee(2,") < 0);

// ============================================
// FIX 3a: <select id=wf-staff-dd-'+idx+' onchange=wfSetAssignee('+idx+',staffId,this.value)><option value=>
// In the raw file, this is exactly the bytes shown (no escape needed for our search since it's all plain chars)
// We want to fix the generated HTML: add quotes around attribute values and around staffId
// New raw bytes: <select id="wf-staff-dd-'+idx+'" onchange="wfSetAssignee('+idx+',\'staffId\',this.value)"><option value="">
// In the file, the onchange attribute needs the staffId to be a quoted string in the GENERATED HTML.
// Since the outer JS string is delimited by ', we need to write \' inside.
const old3a = "<select id=wf-staff-dd-'+idx+' onchange=wfSetAssignee('+idx+',staffId,this.value)><option value=>";
const new3a = "<select id=\"wf-staff-dd-'+idx+'\" onchange=\"wfSetAssignee('+idx+',\\'staffId\\',this.value)\"><option value=\"\">";
// Wait, in the raw file: we want the literal bytes:
//   <select id="wf-staff-dd-'+idx+'" onchange="wfSetAssignee('+idx+',\'staffId\',this.value)"><option value="">
// The \" in the raw file just means the actual " character. The \' is literally backslash + apostrophe.
// In Node string: '<select id="wf-staff-dd-\''+idx+'\'" onchange="wfSetAssignee('+idx+',\\\'staffId\\\',this.value)"><option value="">'
// Hmm let me think. Node: '\'' produces the chars \'. To produce literal \" in a file using a Node string
// with " delimiter, we just write ".
// To produce literal \' in a file, we write \\' in Node (the \\ produces a single \ in the output string).
// To produce literal ' in a file, we write ' in Node (since we're using " as delimiter).
// 
// Desired file bytes (one string with escapes shown):
//   <select id="wf-staff-dd-'+idx+'" onchange="wfSetAssignee('+idx+',\'staffId\',this.value)"><option value="">
// Char by char: < s e l e c t SPACE i d = " w f - s t a f f - d d - ' + i d x + ' " SPACE o n c h a n g e = " w f S e t A s s i g n e e ( ' + i d x + ' , \ ' s t a f f I d \ ' , t h i s . v a l u e ) " > < o p t i o n SPACE v a l u e = " " >
// 
// In Node using " delimiter:
//   "<select id=\"wf-staff-dd-'+idx+'\" onchange=\"wfSetAssignee('+idx+',\\'staffId\\',this.value)\"><option value=\"\">"
// 
// Or using ' delimiter (simpler, no need to escape "):
//   '<select id="wf-staff-dd-\''+idx+'\'" onchange="wfSetAssignee('+idx+',\\'staffId\\',this.value)"><option value="">'
// Wait that doesn't work because the inner 's would end the Node string.
// 
// Let me use " with escapes:
// new3a = '<select id="wf-staff-dd-\''+idx+'\'" onchange="wfSetAssignee('+idx+',\\'staffId\\',this.value)"><option value="">'
// This is a single quote delimited Node string.
// It contains: <select id="wf-staff-dd- (then a literal ' from \')+idx+(literal ' from \')" onchange="wfSetAssignee('+idx+', (then literal \ from \\) (then literal ' from \') staffId (then literal \ from \\) (then literal ' from \') ,this.value)"><option value="">
// Hmm, that's not what I want. Let me re-think.
// 
// Actually, the simplest approach: write the raw bytes I want to a temp file, then read it back.

fs.writeFileSync('D:/1kaifa/grsds/_pat3a_new.txt', '<select id="wf-staff-dd-\''+idx+'\'" onchange="wfSetAssignee('+idx+',\\\'staffId\\\',this.value)"><option value="">', 'utf8');
const new3aFromFile = fs.readFileSync('D:/1kaifa/grsds/_pat3a_new.txt', 'utf8');
console.log('new3aFromFile bytes:', JSON.stringify(new3aFromFile).slice(0, 200));
// Expected output: <select id="wf-staff-dd-'+idx+'" onchange="wfSetAssignee('+idx+',\'staffId\',this.value)"><option value="">
// Note the \' is a literal backslash + apostrophe in the file

// Now do the replacement
if (s.includes(old3a)) {
  s = s.split(old3a).join(new3aFromFile);
  check('FIX3a staff select', !s.includes('staffId,this.value")><option'));
} else {
  console.log('FIX3a pattern NOT found in file');
  // Check what's actually in the file
  let i = s.indexOf('wf-staff-dd-');
  if (i > 0) console.log('  near:', JSON.stringify(s.slice(i, i+100)));
  fail++;
}

// ============================================
// FIX 3b: option value quotes in dropdown
// ============================================
// Raw text in file: h+='<option value='+escHtml(allUsers[ui].user_id)+'+(selStaff===allUsers[ui].user_id?' selected':'')+'>'
// We want: h+='<option value="'+escHtml(allUsers[ui].user_id)+'"'+(selStaff===allUsers[ui].user_id?' selected':'')+'>'
// In file bytes: <option value="'+escHtml(allUsers[ui].user_id)+"'"+(selStaff===...
// The +"'" is a JS concat pattern. In raw bytes: +, ", ', closing the JS string '

// Find the old text
const old3b = "h+='<option value='+escHtml(allUsers[ui].user_id)+'";
const new3bFromFile = fs.readFileSync('D:/1kaifa/grsds/_pat3b_new.txt', 'utf8');
fs.writeFileSync('D:/1kaifa/grsds/_pat3b_new.txt', "h+='<option value=\"'+escHtml(allUsers[ui].user_id)+'", 'utf8');
const new3b = fs.readFileSync('D:/1kaifa/grsds/_pat3b_new.txt', 'utf8');
console.log('new3b bytes:', JSON.stringify(new3b));

if (s.includes(old3b)) {
  s = s.split(old3b).join(new3b);
  check('FIX3b option value', s.includes("value=\\\"\\'+escHtml"));
} else {
  console.log('FIX3b pattern NOT found');
  fail++;
}

// ============================================
// FIX 4: doCheckIn → setTimeout
// ============================================
const gps = fs.readFileSync('D:/1kaifa/grsds/_gps_inline.txt', 'utf8').trim();
const dcStart = s.indexOf('async function doCheckIn(type){');
const dcEnd = s.indexOf('\nfunction openVisitForm', dcStart);
if (dcStart > 0 && dcEnd > dcStart) {
  s = s.slice(0, dcStart) + gps + '\n' + s.slice(dcEnd);
  check('FIX4 doCheckIn', s.includes('doSaveCheckIn'));
} else {
  console.log('FIX4: doCheckIn boundaries not found');
  fail++;
}

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');
console.log('\nFinal size:', s.length);
console.log('Pass:', pass, 'Fail:', fail);

// Verify
const ls = s.lastIndexOf('<script>'), le = s.lastIndexOf('</script>');
try { new (require('vm').Script)(s.slice(ls+8, le)); console.log('JS: OK'); }
catch(e) { 
  console.log('JS FAIL:', e.message.substring(0,200));
  const stack = e.stack || '';
  const m = stack.match(/inline:(\d+)/);
  if (m) {
    const ln = parseInt(m[1]);
    const lines = s.slice(ls+8, le).split('\n');
    for (let k = Math.max(0,ln-3); k < Math.min(lines.length, ln+2); k++)
      console.log('L'+(k+1)+': '+(lines[k]||'').substring(0,200));
  }
}
const o=(s.match(/<div[\s>]/g)||[]).length, c=(s.match(/<\/div>/g)||[]).length;
console.log('Div:',o,c,o-c);
