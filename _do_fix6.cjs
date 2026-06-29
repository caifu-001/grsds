const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html');
// We want to find the bytes "鎺堟潈閮ㄩ棬</label><select" and replace with "<label>鎺堟潈閮ㄩ棬</label><select"
// The terminal printed text uses garbled characters - those are UTF-8 bytes that LOOK like garbled when displayed in Windows console
// Actual bytes we want to find: the UTF-8 sequence for "授权部门</label><select"
// "授" = E6 8E 88
// "权" = E6 9D 83
// "部" = E9 83 A8
// "门" = E9 97 A8
// So bytes: e6 8e 88 e6 9d 83 e9 83 a8 e9 97 a8 3c 2f 6c 61 62 65 6c 3e 3c 73 65 6c 65 63 74
// That's 21 bytes for "授权部门</label><select"
const searchBytes = Buffer.from([0xe6, 0x8e, 0x88, 0xe6, 0x9d, 0x83, 0xe9, 0x83, 0xa8, 0xe9, 0x97, 0xa8, 0x3c, 0x2f, 0x6c, 0x61, 0x62, 0x65, 0x6c, 0x3e, 0x3c, 0x73, 0x65, 0x6c, 0x65, 0x63, 0x74]);
console.log('searching for', searchBytes.length, 'bytes');
const i = s.indexOf(searchBytes);
console.log('Found at:', i);

if (i < 0) process.exit(0);

// We need to insert "<label>" (7 bytes: 3c 6c 61 62 65 6c 3e) before the chinese bytes
const insertBytes = Buffer.from('<label>', 'utf8');
const before = s.slice(0, i);
const after = s.slice(i);
s = Buffer.concat([before, insertBytes, after]);
console.log('Inserted <label>, new size:', s.length);

fs.writeFileSync('D:/1kaifa/grsds/index.html', s);

// Verify
const s2 = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
const ls = s2.lastIndexOf('<script>'), le = s2.lastIndexOf('</script>');
try { new (require('vm').Script)(s2.slice(ls+8, le)); console.log('JS: OK'); }
catch(e) { console.log('JS FAIL:', e.message.substring(0,200)); }
const o=(s2.match(/<div[\s>]/g)||[]).length, c=(s2.match(/<\/div>/g)||[]).length;
console.log('Div:',o,c,o-c);
