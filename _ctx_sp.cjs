const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Search for the saveProject function - find the exact pattern
const marker = 'closeOppForm()';
const idx = s.indexOf(marker, 842700); // the main saveProject
const ctx = s.slice(idx - 30, idx + 200);
console.log('Context:', ctx.replace(/\n/g, '\\n'));
