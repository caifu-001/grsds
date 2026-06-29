const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// 1. Replace function wfFindUserByRole -> wfFindUserByDept (name + all calls)
s = s.split('wfFindUserByRole(').join('wfFindUserByDept(');
s = s.split('wfFindUserByRole').join('wfFindUserByDept');

// Replace function body
const oldBody = `function wfFindUserByDept(roleName){\n  if(!allUsers||!allUsers.length)return null;\n  for(var i=0;i<allUsers.length;i++){\n    var u=allUsers[i];\n    if(u.role===roleName)return u;\n    // Also check role_id mapped name\n    if(u.role_id&&allRoles){\n      for(var k=0;k<allRoles.length;k++){\n        if(allRoles[k].id===u.role_id&&allRoles[k].name===roleName)return u;\n      }\n    }\n  }\n  return null;\n}`;
const newBody = `function wfFindUserByDept(deptId){\n  if(!allUsers||!allUsers.length||!deptId)return null;\n  for(var i=0;i<allUsers.length;i++){\n    var u=allUsers[i];\n    if(u.department_id===deptId)return u;\n  }\n  return null;\n}`;
s = s.split(oldBody).join(newBody);
console.log('wfFindUserByDept present:', s.includes('function wfFindUserByDept('));
console.log('wfFindUserByRole present:', s.includes('wfFindUserByRole'));
console.log('department_id check:', s.includes('department_id===deptId'));

// 2. Replace the dropdown in wfShowProps
const roleLabel = '负责人角色</label><select onchange=\"wfSetAssignee(';
const idx = s.indexOf(roleLabel);
if (idx > 0) {
  const selEnd = s.indexOf('</select>', idx);
  const divEnd = s.indexOf('</div></div>', selEnd);
  const match = s.slice(idx + roleLabel.length, selEnd).match(/\d+/);
  const assignIdx = match ? match[0] : 'idx';
  
  const newDropdown = '授权部门</label><select onchange="wfSetAssignee('+assignIdx+',\\\'value\\\',this.value)"><option value="">无</option>\';\n  for(var di=0;di<(allDepartments||[]).length;di++){h+=\'<option value="\'+escHtml(allDepartments[di].id)+\'"\'+(asg.value===allDepartments[di].id?\' selected\':\'\')+\'>\'+escHtml(allDepartments[di].name)+\'</option>\';}\n  h+=\'</select>';

  s = s.slice(0, idx - 7) + newDropdown + s.slice(divEnd + 12);
  console.log('Dropdown replaced at', idx);
} else {
  console.log('Dropdown NOT FOUND, searching broader...');
  const alt = s.indexOf('负责人角色');
  if (alt > 0) console.log('found at', alt, s.slice(alt, alt+100).replace(/\n/g,'\\n'));
}

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');
console.log('Written', s.length);
