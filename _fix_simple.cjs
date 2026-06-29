const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
let gps = fs.readFileSync('D:/1kaifa/grsds/_gps_new.txt', 'utf8');

// FIX 1: Just replace the hardcoded '2' with '+idx+'
let pat1 = "wfSetAssignee(2,";
let rep1 = "wfSetAssignee('+idx+',";
while (s.includes(pat1)) { s = s.replace(pat1, rep1); }
console.log('FIX1 done');

// FIX 2: GPS - find doCheckIn boundaries
let dc = s.indexOf('async function doCheckIn(type){');
let ov = s.indexOf('\nfunction openVisitForm', dc);
console.log('GPS:', dc, ov, ov-dc);
s = s.slice(0, dc) + gps.trim() + '\n' + s.slice(ov);
console.log('FIX2 done, size:', s.length);

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');

let ls = s.lastIndexOf('<script>'), le = s.lastIndexOf('</script>');
try { require('vm').Script; new (require('vm').Script)(s.slice(ls+8, le)); console.log('JS: OK'); }
catch(e) { console.log('JS FAIL:', e.message.substring(0,150)); }
let o=(s.match(/<div[\s>]/g)||[]).length, c=(s.match(/<\/div>/g)||[]).length;
console.log('Div:',o,c,o-c);
