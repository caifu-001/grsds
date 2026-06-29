const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html','utf8');
const ss = s.indexOf('<script>');
const js = s.slice(ss + 8, s.indexOf('</script>', ss));

// Find all 'await' occurrences and check if they're inside an async function
const lines = js.split('\n');
let asyncDepth = 0;
let issues = [];

for (let i = 0; i < lines.length; i++) {
  const ln = lines[i].trim();
  if (/^(async\s+function|async\s+\w)/.test(ln) || ln.startsWith('async function')) {
    asyncDepth++;
  }
  if (/^\}$/.test(ln) || /^\};$/.test(ln)) {
    // check if this closes an async function
  }
  if (/\bawait\b/.test(ln) && !ln.startsWith('//') && !ln.startsWith('*') && asyncDepth === 0) {
    // Check if this is inside a function
    issues.push({line: i + 1, text: ln.trim()});
  }
}

// Better approach: find each `await` and walk backwards to find enclosing function
const awaitRegex = /\bawait\b/g;
let m;
while ((m = awaitRegex.exec(js)) !== null) {
  const pos = m.index;
  // Find the start of the enclosing function by walking backwards
  let depth = 0;
  let funcStart = -1;
  for (let p = pos; p >= 0; p--) {
    if (js[p] === '}') depth++;
    else if (js[p] === '{') {
      depth--;
      if (depth < 0) {
        // Found opening brace, check what precedes it
        funcStart = p;
        break;
      }
    }
  }
  if (funcStart >= 0) {
    // Check if there's a function keyword before this brace
    let prefix = js.slice(Math.max(0, funcStart - 80), funcStart + 1);
    if (!/function\s+\w+\s*\(/.test(prefix)) {
      const lineNum = js.slice(0, pos).split('\n').length;
      console.log('AWAIT outside function at line', lineNum, ':', js.slice(Math.max(0, pos - 20), pos + 40).replace(/\n/g, '\\\\n'));
    }
  }
}
