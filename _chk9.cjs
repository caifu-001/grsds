const fs = require('fs');
const buf = fs.readFileSync('D:/1kaifa/grsds/index.html');
// Find "wfSetAssignee('+idx+',\'value\'"
const key = Buffer.from("wfSetAssignee('+idx+',\\'value\\',this.value)", 'utf8');
const i = buf.indexOf(key);
console.log('key at:', i);
if (i < 0) process.exit(0);
// Look 200 bytes before
const before = buf.slice(Math.max(0, i-200), i);
console.log('Before (hex):');
console.log([...before].map(b => b.toString(16).padStart(2,'0')).join(' '));
console.log('Before (utf8):');
console.log(before.toString('utf8'));

// Try to find specific byte sequence
const tgt = Buffer.from("鎺堟潈閮ㄩ棬</label><select", 'utf8');
console.log('\ntarget bytes:', [...tgt].map(b => b.toString(16).padStart(2,'0')).join(' '));
const i2 = buf.indexOf(tgt);
console.log('target at:', i2);
