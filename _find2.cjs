const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
const st = s.indexOf('<script>', 100000);
const base = st + 8;
const start = 527053;

let depth = 1;
let lastBraceEnd = -1;
for (let i = start; i < 200000; i++) {
  if (s[base + i] === '{') depth++;
  else if (s[base + i] === '}') {
    depth--;
    if (depth === 0) {
      lastBraceEnd = i;
      console.log('} at', i, 'depth 0');
      break;
    }
  }
}
console.log('Final depth:', depth);

// Now extract the function text between start and lastBraceEnd+1
if (lastBraceEnd > 0) {
  const func = s.slice(base + start, base + lastBraceEnd + 1);
  console.log('Function body size:', func.length);
  console.log('First 100:', func.slice(0, 100));
  console.log('Last 100:', func.slice(-100));
  
  // Count internal braces
  const o = (func.match(/\{/g) || []).length;
  const c = (func.match(/\}/g) || []).length;
  console.log('Internal braces: {', o, '}', c, 'diff:', o - c);
}

// Now find the exact unmatched { - let's look at what comes after 527053
// What function is this?
const before = s.slice(base + start - 200, base + start);
console.log('\nBefore unmatched {:', before);

// Count depth at key points  
let d = 0;
for (let i = 0; i < 527053; i++) {
  if (s[base + i] === '{') d++;
  else if (s[base + i] === '}') d--;
}
console.log('Depth at unmatched {: ', d);
