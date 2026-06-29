const fs = require('fs');
const buf = fs.readFileSync('D:/1kaifa/grsds/index.html');
// Find the wf-staff-dd line
const i = buf.indexOf(Buffer.from('wf-staff-dd-', 'utf8'));
console.log('wf-staff-dd at byte:', i);
// Find the <option value=""> just before or after
const optStart = buf.indexOf(Buffer.from('<option value="">', 'utf8'), Math.max(0, i-500));
console.log('option start at:', optStart);
// Read 30 bytes from optStart
const piece = buf.slice(optStart, optStart+30);
console.log('hex:', [...piece].map(b => b.toString(16).padStart(2,'0')).join(' '));
console.log('as utf8:', JSON.stringify(piece.toString('utf8')));
console.log('as gbk:', JSON.stringify(piece.toString('gbk')));
console.log('as latin1:', JSON.stringify(piece.toString('latin1')));
