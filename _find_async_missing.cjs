const s = require('fs').readFileSync('D:/1kaifa/grsds/index.html','utf8');

// Find ALL function declarations that are NOT async but contain await
const funcRe = /function\s+(\w+)\s*\([^)]*\)\s*\{/g;
const matches = [];
let m;
while ((m = funcRe.exec(s)) !== null) {
  // Check if this function actually starts with "async function"
  const start = s.lastIndexOf('\n', m.index) + 1;
  const prefix = s.slice(start, m.index + m[0].length);
  if (prefix.startsWith('async')) continue; // skip already async ones
  
  const name = m[1];
  // Find matching closing brace
  let d = 0, p = m.index + m[0].length;
  while (d >= 0 && p < s.length) {
    if (s[p] === '{') { d++; }
    else if (s[p] === '}') { d--; if (d === 0) break; }
    p++;
  }
  const body = s.slice(m.index, p + 1);
  if (body.includes('await ')) {
    const lineno = s.substring(0, m.index).split(/\r?\n/).length;
    matches.push({ name, line: lineno });
  }
}

if (matches.length > 0) {
  console.log('NON-async functions using await:');
  matches.forEach(x => console.log('  ' + x.name + '() at line ' + x.line));
} else {
  console.log('All good - no non-async functions with await');
}
