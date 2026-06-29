const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Find saveNewUser
let i = s.indexOf('async function saveNewUser(){');
if (i > 0) {
  let end = s.indexOf('\nfunction', i + 50);
  if (end > 0 && end - i < 3000) {
    console.log('=== saveNewUser ===');
    console.log(s.slice(i, end));
  } else {
    console.log('saveNewUser too long, showing first 2500');
    console.log(s.slice(i, i + 2500));
  }
}

// Find renderAdminUsers  
i = s.indexOf('function renderAdminUsers(){');
if (i > 0) {
  let end = s.indexOf('\nfunction', i + 50);
  console.log('\n=== renderAdminUsers ===');
  console.log(s.slice(i, end || i + 1500));
}

// Find loadAdminData (the part that loads users)
i = s.indexOf('async function loadAdminData(){');
if (i > 0) {
  let end = s.indexOf('\nfunction', i + 100);
  console.log('\n=== loadAdminData (first 2000) ===');
  console.log(s.slice(i, i + 2000));
}
