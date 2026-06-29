const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Find all wfSetAssignee with staffId (missing quotes)
let pos = 0;
let found = [];
while (true) {
  let i = s.indexOf("wfSetAssignee('+idx+',staffId", pos);
  if (i < 0) break;
  found.push(i);
  pos = i + 1;
}
console.log('staffId raw refs:', found.length);
found.forEach(function(i) {
  console.log('  at', i, ':', JSON.stringify(s.slice(Math.max(0,i-20), i+60)));
});

// Also check wf-staff-dd onchange
pos = 0; found = [];
while (true) {
  let i = s.indexOf("wf-staff-dd", pos);
  if (i < 0) break;
  found.push(i);
  pos = i + 1;
}
console.log('\nwf-staff-dd refs:', found.length);
found.forEach(function(i) {
  console.log('  at', i, ':', s.slice(i, i+250).replace(/\n/g,'\\n'));
});

// Check allRoles loading
let ri = s.indexOf('allRoles=');
if (ri > 0) {
  console.log('\nallRoles assignments:');
  let end = s.indexOf('\n', ri);
  console.log(s.slice(ri, ri+200));
}

let ri2 = s.indexOf('var allRoles');
if (ri2 > 0) {
  console.log('\nvar allRoles at', ri2, s.slice(ri2, ri2+100));
}
