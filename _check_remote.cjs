const https = require('https');
https.get('https://raw.githubusercontent.com/caifu-001/grsds/main/index.html', res => {
  let d = '';
  res.on('data', c => d += c.toString());
  res.on('end', () => {
    console.log('Remote size:', d.length);
    console.log('has hardcoded wfSetAssignee(2,:', d.includes('wfSetAssignee(2,'));
    console.log('has doSaveCheckIn:', d.includes('doSaveCheckIn'));
    console.log('has bare <option value=>:', d.includes('<option value=>'));
    console.log('has workflows await loadAdminData:', d.includes("if(!allRoles||!allRoles.length||!allDepartments||!allDepartments.length)await loadAdminData()"));
    require('fs').writeFileSync('D:/1kaifa/grsds/_remote_8aa5.html', d);
  });
});
