const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
console.log('size:', s.length);
console.log('has hardcoded wfSetAssignee(2,', s.includes('wfSetAssignee(2,'));
console.log('has wfSetAssignee idx fix:', s.includes("wfSetAssignee('+idx+','value'"));
console.log('has bare <option value=>:', s.includes('<option value=>'));
console.log('has workflows await loadAdminData:', s.includes("if(!allRoles||!allRoles.length||!allDepartments||!allDepartments.length)await loadAdminData()"));
console.log('has doSaveCheckIn:', s.includes('doSaveCheckIn'));
console.log('has setTimeout 8000:', s.includes('setTimeout(function(){if(!settled)'));
