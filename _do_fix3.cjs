const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
console.log('Start:', s.length);

// ============================================
// FIX 1: wfShowProps - auto-load allDepartments/allRoles/allUsers if empty
// ============================================
// Replace function signature
const oldSig = "function wfShowProps(idx){\n  var panel=document.getElementById('wf-props-panel');\n  if(!panel)return;\n  if(idx<0||idx>=wfEditorSteps.length){\n    panel.innerHTML='<h4>鑺傜偣灞炴€?/h4><p style=\"font-size:12px;color:var(--text2)\">鐐瑰嚮鐢诲竷涓殑鑺傜偣杩涜缂栬緫</p>';\n    return;\n  }\n  var s=wfEditorSteps[idx];\n  var h='<h4>鑺傜偣 #'+s.seq+' 灞炴€?/h4>';";
const newSig = "function wfShowProps(idx){\n  var panel=document.getElementById('wf-props-panel');\n  if(!panel)return;\n  // Auto-load admin data if not yet loaded\n  if(!allDepartments||!allDepartments.length||!allRoles||!allRoles.length){\n    (async function(){\n      try{\n        var d=await sb.from('departments').select('*').eq('company_id',currentCompanyId).order('name');\n        if(!d.error)allDepartments=d.data||[];\n        var r=await sb.from('roles').select('*').eq('company_id',currentCompanyId).order('name');\n        if(!r.error)allRoles=r.data||[];\n      }catch(e){console.error('wfShowProps preload:',e)}\n      wfShowProps(idx);\n    })();\n    panel.innerHTML='<p style=\"font-size:12px;color:var(--text2);padding:20px\">鍔犺浇涓?..</p>';\n    return;\n  }\n  if(idx<0||idx>=wfEditorSteps.length){\n    panel.innerHTML='<h4>鑺傜偣灞炴€?/h4><p style=\"font-size:12px;color:var(--text2)\">鐐瑰嚮鐢诲竷涓殑鑺傜偣杩涜缂栬緫</p>';\n    return;\n  }\n  var s=wfEditorSteps[idx];\n  var h='<h4>鑺傜偣 #'+s.seq+' 灞炴€?/h4>';";

if (s.includes(oldSig)) {
  s = s.split(oldSig).join(newSig);
  console.log('FIX1 wfShowProps preload: OK');
} else {
  console.log('FIX1: pattern not found, trying flexible match');
  // Find function start
  const fi = s.indexOf('function wfShowProps(idx)');
  if (fi > 0) {
    const body = s.indexOf('var panel=document.getElementById', fi);
    const cond = s.indexOf('if(idx<0', body);
    console.log('Body starts at:', body, 'cond at:', cond);
    console.log('Sample:', s.slice(body, body+300));
  }
}

// ============================================
// FIX 2: Fix the "鑱?/option>" garbled text in wfShowProps
// ============================================
// Replace <option value="">鏃?/option> with <option value="">--</option>
// for the staff dropdown specifically
// We can't easily target just the staff one, so replace all "鏃?/option>" in wfShowProps area
// Actually safer: replace the entire "指定员工" select line
const oldStaff = "<label>閹稿洤鐣鹃崨妯轰紣</label><select id=\"wf-staff-dd-'+idx+'\" onchange=\"wfSetAssignee('+idx+',\\'staffId\\',this.value)\"><option value=\"\">閺?/option>';";
const newStaff = "<label>鎸囧畾鍛樺伐</label><select id=\"wf-staff-dd-'+idx+'\" onchange=\"wfSetAssignee('+idx+',\\'staffId\\',this.value)\"><option value=\"\">--</option>';";
if (s.includes(oldStaff)) {
  s = s.split(oldStaff).join(newStaff);
  console.log('FIX2 staff dropdown text: OK');
} else {
  console.log('FIX2: not found exactly, looking for variation');
  const i = s.indexOf('wf-staff-dd-');
  if (i > 0) {
    const lineStart = s.lastIndexOf("h+='", i);
    const lineEnd = s.indexOf("';", i);
    console.log('Current line:', JSON.stringify(s.slice(lineStart, lineEnd+2)));
  }
}

// ============================================
// FIX 3: Fix the redundant </label> before "鎺堟潈閮ㄩ棬</label>"
// The line: h+='鎺堟潈閮ㄩ棬</label><select ...>
// Should be: h+='<label>鎺堟潈閮ㄩ棬</label><select ...>'
// But actually "鎺堟潈閮ㄩ棬" is also garbled ("授权部门")
// Let me check what the actual file has
const oldDept = "h+='鎺堟潈閮ㄩ棬</label><select onchange=\"wfSetAssignee('+idx+',\\'value\\',this.value)\"><option value=\"\">鏃?/option>';";

// Find the actual byte sequence
const deptIdx = s.indexOf("wfSetAssignee('+idx+',\\'value\\',this.value)");
if (deptIdx > 0) {
  const lineStart = s.lastIndexOf("h+='", deptIdx);
  const lineEnd = s.indexOf("';", deptIdx);
  console.log('Current dept line:', JSON.stringify(s.slice(lineStart, lineEnd+2)));
}

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');

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
console.log('Size:', s.length);
