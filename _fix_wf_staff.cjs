const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Fix 1: Replace hardcoded wfSetAssignee(2 with correct idx
const badAssign = "wfSetAssignee(2,\\'value\\',this.value)";
const goodAssign = "wfSetAssignee('+idx+',\\\\'value\\\\',this.value);wfRefreshStaffDD('+idx+')";
// Actually let's do a simpler approach - replace the line directly

// Fix 2: Add staff dropdown after department dropdown, and add wfRefreshStaffDD function
// First, fix the hardcoded '2' in the onchange
s = s.replace(
  "wfSetAssignee(2,\\'value\\',this.value)\"><option value=\"\">",
  "wfSetAssignee('+idx+',\\\\'value\\\\',this.value);wfRefreshStaffDD('+idx+')\"><option value=\"\">"
);

// Now find the department dropdown closing tag + the closing </div></div>
// Pattern: department select close + h+='</select>'; + h+='</div></div>';
let oldDD = `  h+='鎺堟潈閮ㄩ棨</label><select onchange="wfSetAssignee('+idx+',\\\\'value\\\\',this.value);wfRefreshStaffDD('+idx+')\"><option value=\"\">鏃?/option>';\n  for(var di=0;di<(allDepartments||[]).length;di++){h+='<option value=\"'+escHtml(allDepartments[di].id)+'\"'+(asg.value===allDepartments[di].id?' selected':'')+'>'+escHtml(allDepartments[di].name)+'</option>';}\n  h+='</select>';\n  h+='</div></div>';`;

let foundDD = s.indexOf("鎺堟潈閮ㄩ棨</label><select onchange=");
if (foundDD < 0) {
  console.log('department dropdown not found');
  process.exit(1);
}

let newDD = `  h+='鎺堟潈閮ㄩ棨</label><select onchange="wfSetAssignee('+idx+',\\\\'value\\\\',this.value);wfRefreshStaffDD('+idx+')\"><option value=\"\">鏃?/option>';\n  for(var di=0;di<(allDepartments||[]).length;di++){h+='<option value=\"'+escHtml(allDepartments[di].id)+'\"'+(asg.value===allDepartments[di].id?' selected':'')+'>'+escHtml(allDepartments[di].name)+'</option>';}\n  h+='</select>';\n  h+='<label>鎸囧畾鍛樺伐</label><select id=\"wf-staff-dd-'+idx+'\" onchange=\"wfSetAssignee('+idx+',\\\\'staffId\\\\',this.value)\"><option value=\"\">鏃?/option>';\n  var selDept=asg.value||'';var selStaff=asg.staffId||'';\n  if(selDept&&allUsers){for(var ui=0;ui<allUsers.length;ui++){if(String(allUsers[ui].department_id)===String(selDept)){h+='<option value=\"'+escHtml(allUsers[ui].user_id)+'\"'+(selStaff===allUsers[ui].user_id?' selected':'')+'>'+escHtml(allUsers[ui].display_name||allUsers[ui].email)+'</option>';}}}\n  h+='</select>';\n  h+='</div></div>';`;

// Find the exact department section
let ddStart = foundDD;
let endMarker = "// 缂栬緫鏉冮檺璁剧疆";
let ddEnd = s.indexOf(endMarker, ddStart);
if (ddEnd < 0) { console.log('end marker not found'); process.exit(1); }

let oldSection = s.slice(ddStart, ddEnd);
console.log('Old section length:', oldSection.length);

s = s.slice(0, ddStart) + newDD + s.slice(ddEnd);

// Now add wfRefreshStaffDD function - insert before wfShowProps
let wfShowProps = s.indexOf('function wfShowProps(');
if (wfShowProps < 0) { console.log('wfShowProps not found'); process.exit(1); }

let refreshFn = `function wfRefreshStaffDD(idx){\n  var dd=document.getElementById('wf-staff-dd-'+idx);\n  if(!dd)return;\n  var s=wfEditorSteps[idx];\n  var asg=s.assignee||{enabled:false,type:'dept',value:'',staffId:''};\n  var deptId=asg.value||'';\n  var staffId=asg.staffId||'';\n  dd.innerHTML='<option value=\"\">鏃?/option>';\n  if(deptId&&allUsers){for(var ui=0;ui<allUsers.length;ui++){if(String(allUsers[ui].department_id)===String(deptId)){dd.innerHTML+='<option value=\"'+escHtml(allUsers[ui].user_id)+'\"'+(staffId===allUsers[ui].user_id?' selected':'')+'>'+escHtml(allUsers[ui].display_name||allUsers[ui].email)+'</option>';}}}\n}\n\n`;

s = s.slice(0, wfShowProps) + refreshFn + s.slice(wfShowProps);

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');
console.log('Written', s.length, 'bytes');
