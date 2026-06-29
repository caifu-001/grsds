const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// The section we want to modify: between the department select close and the closing </div></div>
// Current: h+='</select>'; h+='</div></div>'; // 编辑权限设置
// We want to insert staff dropdown before the closing tags

// Find the exact position using ASCII-only markers
let deptSelectEnd = s.indexOf("h+='</select>';\n  h+='</div></div>';\n  // ");
if (deptSelectEnd > 0) {
  console.log('Found deptSelectEnd at:', deptSelectEnd);
  // Check it's near wfShowProps
  let wfidx = s.lastIndexOf('function wfShowProps(', deptSelectEnd);
  let nextFn = s.indexOf('\nfunction ', deptSelectEnd);
  console.log('wfShowProps at:', wfidx, 'nextFn at:', nextFn, 'between:', wfidx < deptSelectEnd && deptSelectEnd < nextFn);
  
  // This is the line to replace - add staff dropdown before the closing
  let oldStr = "h+='</select>';\n  h+='</div></div>';\n  // ";
  let newStr = "h+='</select>';\n  h+='<label>鎸囧畾鍛樺伐</label><select id=wf-staff-dd-'+idx+' onchange=wfSetAssignee('+idx+',staffId,this.value)><option value=>鏃?/option>';\n  var selDept=asg.value||'';var selStaff=asg.staffId||'';\n  if(selDept&&allUsers){for(var ui=0;ui<allUsers.length;ui++){if(String(allUsers[ui].department_id)===String(selDept)){h+='<option value='+escHtml(allUsers[ui].user_id)+''+(selStaff===allUsers[ui].user_id?' selected':'')+'>'+escHtml(allUsers[ui].display_name||allUsers[ui].email)+'</option>';}}}\n  h+='</select>';\n  h+='</div></div>';\n  // ";
  
  s = s.slice(0, deptSelectEnd) + newStr + s.slice(deptSelectEnd + oldStr.length);
} else {
  console.log('deptSelectEnd NOT found, trying alternative markers');
  // Try: h+='</select>'; without the closing divs
  let alt = s.indexOf("h+='</select>';h+='</div></div>'");
  console.log('alt marker:', alt);
  if (alt > 0) {
    let oldStr = "h+='</select>';h+='</div></div>'";
    let newStr = "h+='</select>';h+='<label>鎸囧畾鍛樺伐</label><select id=wf-staff-dd-'+idx+' onchange=wfSetAssignee('+idx+',staffId,this.value)><option value=>鏃?/option>';var selDept=asg.value||'';var selStaff=asg.staffId||'';if(selDept&&allUsers){for(var ui=0;ui<allUsers.length;ui++){if(String(allUsers[ui].department_id)===String(selDept)){h+='<option value='+escHtml(allUsers[ui].user_id)+''+(selStaff===allUsers[ui].user_id?' selected':'')+'>'+escHtml(allUsers[ui].display_name||allUsers[ui].email)+'</option>';}}}h+='</select>';h+='</div></div>'";
    s = s.slice(0, alt) + newStr + s.slice(alt + oldStr.length);
  }
}

// Add wfRefreshStaffDD function before wfShowProps
let wfIdx = s.indexOf('function wfShowProps(');
if (wfIdx > 0) {
  let fn = 'function wfRefreshStaffDD(idx){var dd=document.getElementById(\'wf-staff-dd-\'+idx);if(!dd)return;var st=wfEditorSteps[idx];var asg=st.assignee||{enabled:false,type:\'dept\',value:\'\',staffId:\'\'};var deptId=asg.value||\'\';var staffId=asg.staffId||\'\';dd.innerHTML=\'<option value=\"\">鏃?/option>\';if(deptId&&allUsers){for(var ui=0;ui<allUsers.length;ui++){if(String(allUsers[ui].department_id)===String(deptId)){dd.innerHTML+=\'<option value=\"\'+escHtml(allUsers[ui].user_id)+\'\"\'+(staffId===allUsers[ui].user_id?\' selected\':\'\')+\'>\'+escHtml(allUsers[ui].display_name||allUsers[ui].email)+\'</option>\';}}}}\n\n';
  s = s.slice(0, wfIdx) + fn + s.slice(wfIdx);
}

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');
console.log('Written', s.length, 'bytes');
