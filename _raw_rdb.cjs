const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Find renderDetailBlocks in the raw file
const idx = s.indexOf('function renderDetailBlocks()');
if (idx < 0) { console.log('NOT FOUND'); process.exit(1); }

console.log('Found at byte', idx);
console.log('Context before:', s.slice(idx - 50, idx));
console.log('=== RAW (next 1000 bytes) ===');
console.log(s.slice(idx, idx + 1000));
