const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Find confirmLocation function
let i = s.indexOf('function confirmLocation(){');
if (i > 0) {
  let end = s.indexOf('\nfunction', i + 50);
  let fn = s.slice(i, end);
  console.log('confirmLocation:');
  console.log(fn.slice(0, 700));
  console.log('---');
}

// Find closeLocationConfirm
i = s.indexOf('function closeLocationConfirm(){');
if (i > 0) {
  let end = s.indexOf('\nfunction', i + 50);
  let fn = s.slice(i, end);
  console.log('closeLocationConfirm:');
  console.log(fn.slice(0, 500));
}

// Find doCheckIn 
i = s.indexOf('async function doCheckIn(');
if (i > 0) {
  let end = s.indexOf('\n}async function loadFWVisits');
  let fn = s.slice(i, end);
  console.log('\ndoCheckIn tail (last 1000):');
  console.log(fn.slice(fn.length - 1000));
}
