const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Find switchAdminTab workflows branch
let i = s.indexOf("else if(tab==='workflows')");
console.log('workflows branch at:', i);
if (i > 0) {
  // Find the closing } of this else if block
  let depth = 1; let pos = i;
  while (depth > 0 && pos < i + 500) {
    let open = s.indexOf('{', pos+1);
    let close = s.indexOf('}', pos+1);
    if (open >= 0 && open < close) { depth++; pos = open; }
    else { depth--; pos = close; }
  }
  console.log('workflows branch:', s.slice(i, pos+1+50).replace(/\n/g,'\\n'));
}

// Check allRoles usage in wfShowProps
let w = s.indexOf('wgSetApproval('+idx+',');
if (w > 0) {
  console.log('\nApproval dropdown context:');
  console.log(s.slice(w-100, w+250).replace(/\n/g,'\\n'));
}

// Verify staffId fix applied
let si = s.indexOf('staffId,this.value');
console.log('\nstaffId raw:', si);
si = s.indexOf("'staffId',this.value");
console.log("staffId quoted:", si);

// Check doCheckIn has Promise.race
let di = s.indexOf('Promise.race');
console.log('\nPromise.race in file:', di);
let di2 = s.indexOf('async function doCheckIn');
console.log('doCheckIn at:', di2);
