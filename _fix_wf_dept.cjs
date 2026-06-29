const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

let changed = 0;

// 1. Change type:'role' to type:'dept' in assignee default
let old1 = "{enabled:false,type:'role',value:''}";
let new1 = "{enabled:false,type:'dept',value:''}";
let count = s.split(old1).length - 1;
if (count > 0) {
  fs.writeFileSync('D:/1kaifa/grsds/index.html', s.split(old1).join(new1), 'utf8');
  console.log('Change 1: type:role -> type:dept (' + count + ' occurrences)');
  changed++;
}

// 2. Change the role dropdown to department dropdown
// Re-read file
const s2 = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Find the exact label+select for assignee role
const pattern2 = "负责人角色</label><select onchange=\"wfSetAssignee(";
const idx2 = s2.indexOf(pattern2);
if (idx2 > 0) {
  // Find end of this select element
  const selectEnd = s2.indexOf('</select>', idx2);
  // Find the closing </select> and the comment after it
  const nextDiv = s2.indexOf('</div></div>', selectEnd);
  
  // The old text from label to end of this div block
  const oldBlock = s2.slice(idx2 - 7, nextDiv + 12); // "<label>负责人角色..." to "</div></div>"
  console.log('Old block length:', oldBlock.length);
  
  // New block with department dropdown
  const newBlock = '授权部门</label><select onchange="wfSetAssignee(' + oldBlock.match(/wfSetAssignee\((\d+)/)[1] + ',\\\'value\\\',this.value)"><option value="">无</option>\';\n  for(var di=0;di<(allDepartments||[]).length;di++){h+=\'<option value="\'+escHtml(allDepartments[di].id)+\'"\'+(asg.value===allDepartments[di].id?\' selected\':\'\')+\'>\'+escHtml(allDepartments[di].name)+\'</option>\';}\n  h+=\'</select>';
  
  const newFile = s2.slice(0, idx2 - 7) + newBlock + s2.slice(nextDiv + 12);
  fs.writeFileSync('D:/1kaifa/grsds/index.html', newFile, 'utf8');
  console.log('Change 2: role dropdown -> dept dropdown');
  changed++;
}

// 3. Rename wfFindUserByRole -> wfFindUserByDept and change logic
const s3 = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

const wfRoleFn = 'function wfFindUserByRole(roleName){\n  if(!allUsers||!allUsers.length)return null;\n  for(var i=0;i<allUsers.length;i++){\n    var u=allUsers[i];\n    if(u.role===roleName)return u;\n    // Also check role_id mapped name\n    if(u.role_id&&allRoles){\n      for(var k=0;k<allRoles.length;k++){\n        if(allRoles[k].id===u.role_id&&allRoles[k].name===roleName)return u;\n      }\n    }\n  }\n  return null;\n}';

const wfDeptFn = 'function wfFindUserByDept(deptId){\n  if(!allUsers||!allUsers.length||!deptId)return null;\n  for(var i=0;i<allUsers.length;i++){\n    var u=allUsers[i];\n    if(u.department_id===deptId)return u;\n  }\n  return null;\n}';

if (s3.includes(wfRoleFn)) {
  const newFile3 = s3.split(wfRoleFn).join(wfDeptFn);
  fs.writeFileSync('D:/1kaifa/grsds/index.html', newFile3, 'utf8');
  console.log('Change 3: wfFindUserByRole -> wfFindUserByDept');
  changed++;
}

// 4. Update all calls to wfFindUserByRole -> wfFindUserByDept
const s4 = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
const newFile4 = s4.split('wfFindUserByRole').join('wfFindUserByDept');
if (newFile4 !== s4) {
  fs.writeFileSync('D:/1kaifa/grsds/index.html', newFile4, 'utf8');
  console.log('Change 4: all wfFindUserByRole calls -> wfFindUserByDept');
  changed++;
}

// 5. Update the assignee reference in workflow state init from role to dept
const s5 = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
const newFile5 = s5.split("type:'role'").join("type:'dept'");
if (newFile5 !== s5) {
  fs.writeFileSync('D:/1kaifa/grsds/index.html', newFile5, 'utf8');
  console.log('Change 5: remaining type:role -> type:dept');
  changed++;
}

console.log('\nTotal changes:', changed);
