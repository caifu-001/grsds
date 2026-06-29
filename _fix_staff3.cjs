const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Find the broken line
let i = s.indexOf('wf-staff-dd-');
console.log('Found at', i);
let frag = s.slice(i, i + 200);
console.log('Raw:', JSON.stringify(frag).slice(0, 200));

// The broken pattern is: id="wf-staff-dd-'" + idx + "'" onchange="...
// Should be: id="wf-staff-dd-'+idx+'" onchange="...
// Let me just fix it directly
let bad1 = "id=\"wf-staff-dd-'\" + idx + \"'\"";
let good1 = "id=\"wf-staff-dd-'+idx+'\"";
if (s.includes(bad1)) {
  s = s.replace(bad1, good1);
  console.log('Fixed id attr');
}

// Fix the <option value=""> that became <option value=\"\">
// The closing of onchange attribute also needs to be checked
// Let's find the exact staff section
let staffSection = s.indexOf("指定员工</label><select");
if (staffSection > 0) {
  console.log('\nStaff section:', s.slice(staffSection, staffSection + 400));
}

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');
