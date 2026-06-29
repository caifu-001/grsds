const fs = require('fs');
const buf = fs.readFileSync('D:/1kaifa/grsds/index.html');
// Find '<option value="">' and read next 5 bytes
const optTag = Buffer.from('<option value="">', 'utf8');
let i = buf.indexOf(optTag);
console.log('option tag at byte:', i);
let count = 0;
while (i > 0 && count < 8) {
  console.log('---');
  console.log('at', i, ':', JSON.stringify(buf.slice(i, i+30).toString('utf8')));
  console.log('hex:', [...buf.slice(i, i+30)].map(b => b.toString(16).padStart(2, '0')).join(' '));
  i = buf.indexOf(optTag, i+1);
  count++;
}
