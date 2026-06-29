const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Find the department dropdown section near wfSetAssignee(2
let marker1 = s.indexOf("wfSetAssignee(2,\\'value\\',this.value)");
if (marker1 < 0) { console.log('marker1 not found'); process.exit(1); }

// We already fixed the (2 -> idx in the first replace above, but let's check
console.log('marker1 at:', marker1);
console.log('context:', JSON.stringify(s.slice(Math.max(0,marker1-200), marker1+200)).slice(0,300));

// Now find the closing </div></div> after the department section
let closeMarker = s.indexOf("// 缂栬緫鏉冮檺璁剧疆", marker1);
console.log('\ncloseMarker at:', closeMarker, 'distance:', closeMarker - marker1);

// Find the department section boundaries more carefully
// The section is between the assignee open div and the permissions section  
let marker2 = s.lastIndexOf("鎸囧畾璐熻矗浜?/label>';", marker1 + 100);
console.log('\nmarker2 at:', marker2, 'distance from marker1:', marker1 - marker2);
