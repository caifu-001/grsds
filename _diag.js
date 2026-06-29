const s = require('fs').readFileSync('D:/1kaifa/grsds/index.html','utf8');

// 1. Double async check
const re = /async\s+async\s+function/g;
const findings = [];
let m;
while ((m = re.exec(s)) !== null) {
  findings.push(m.index);
}
console.log('Double async:', findings.length);

// 2. Non-async functions with await
let missing = 0;
const funcRe = /function\s+(\w+)\s*\(/g;
while ((m2 = funcRe.exec(s)) !== null) {
  const funcStart = m2.index;
  const name = m2[1];
  // Get context before to check if it's "async function" or "async function "
  const beforeStart = Math.max(0, funcStart - 50);
  const before = s.slice(beforeStart, funcStart + m2[0].length);
  if (/\basync\s+function/.test(before)) continue;
  
  let d = 0, p = s.indexOf('{', funcStart + m2[0].length) + 1;
  while (d >= 0 && p < s.length) {
    if (s[p] === '{') d++;
    else if (s[p] === '}') { d--; if (d === 0) break; }
    p++;
  }
  if (p < s.length) {
    const body = s.slice(funcStart, p + 1);
    if (body.includes('await ')) {
      const lineno = s.slice(0, funcStart).split('\n').length;
      console.log(`MISSING async: ${name}() at line ${lineno}`);
      missing++;
    }
  }
}
console.log('Missing async:', missing);

// 3. JS syntax
let ok = false;
try {
  new Function(s.replace(/^.*<script[^>]*>/g, '').replace(/<\/script>.*$/g, ''));
  ok = true;
} catch(e) {
  console.log('JS error:', e.message);
}
console.log('JS OK:', ok);

// 4. Div balance
const opens = (s.match(/<\w+\b/g) || []).length;
const closes = (s.match(/<\/\w+\b/g) || []).length;
const selfClosing = (s.match(/<(\w+)[^>]*\/\s*>/g) || []).length;
console.log('Div: opens', opens, 'closes', closes, 'self-closing', selfClosing, 'diff', closes - opens + selfClosing);
