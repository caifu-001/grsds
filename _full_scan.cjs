const s = require('fs').readFileSync('D:/1kaifa/grsds/index.html','utf8');

// Report all async async occurrences
const re = /async\s+async\s+function/g;
let m;
const findings = [];
while ((m = re.exec(s)) !== null) {
  const lineno = s.slice(0, m.index).split(/\r?\n/).length;
  const ctx = s.slice(m.index - 20, m.index + 60).replace(/\r?\n/g, '\\n');
  findings.push({line: lineno, ctx});
}

if (findings.length > 0) {
  console.log(`FOUND ${findings.length} double-async: async async function`);
  findings.forEach(x => console.log(`  line ${x.line}: ${x.ctx}`));
} else {
  console.log('CLEAN: no async async function in file');
}

// Also check if there are any non-async functions using await (the regex issue)
// This time account for spaces before "function"
const funcRe = /^\s*function\s+(\w+)\s*\(/gm;
let m2;
let missing = 0;
while ((m2 = funcRe.exec(s)) !== null) {
  const funcStart = m2.index;
  const name = m2[1];
  if (name === 'super' || name === 'new') continue;
  // find closing brace
  let d2 = 0, p2 = s.indexOf('{', funcStart + m2[0].length) + 1;
  while (d2 >= 0 && p2 < s.length) {
    if (s[p2] === '{') d2++;
    else if (s[p2] === '}') { d2--; if (d2 === 0) break; }
    p2++;
  }
  const body = s.slice(funcStart, p2 + 1);
  if (body.includes('await ')) {
    // Check if it's `async function`
    const lineStart = s.lastIndexOf('\n', funcStart) + 1;
    const prefix = s.slice(lineStart, funcStart + 30).trimStart();
    if (!prefix.startsWith('async ')) {
      const lineno = s.slice(0, m2.index).split(/\r?\n/).length;
      console.log(`MISSING async: ${name}() at line ${lineno}`);
      missing++;
    }
  }
}
if (missing === 0) console.log('All functions with await are properly async');
