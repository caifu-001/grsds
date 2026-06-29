const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
const lines = s.split(/\r?\n/);

// Find line 1143 and extract the <script> block content
// Line 1143 is the line with "<script>" (line index 1142)
let inScript = false;
let scriptLines = [];
let scriptStart = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<script>') && lines[i].indexOf('src=') < 0) {
    if (!inScript) {
      inScript = true;
      scriptStart = i + 1;
      // Extract the rest of this line after <script>
      const afterTag = lines[i].substring(lines[i].indexOf('<script>') + 8);
      if (afterTag.trim()) scriptLines.push(afterTag);
    }
  } else if (lines[i].includes('</script>')) {
    if (inScript) {
      const beforeTag = lines[i].substring(0, lines[i].indexOf('</script>'));
      if (beforeTag.trim()) scriptLines.push(beforeTag);
      break;
    }
  } else if (inScript) {
    scriptLines.push(lines[i]);
  }
}

const code = scriptLines.join('\n');
console.log('Script lines:', scriptLines.length, 'chars:', code.length);
console.log('Starts at line:', scriptStart);

// Check for constructs that can cause unexpected end
// 1. try without catch
const tryCount = (code.match(/\btry\s*\{/g) || []).length;
const catchCount = (code.match(/\}?\s*\bcatch\s*\(/g) || []).length;
console.log('try:', tryCount, 'catch:', catchCount);

// 2. Unclosed brackets
const openBraces = (code.match(/\{/g) || []).length;
const closeBraces = (code.match(/\}/g) || []).length;
console.log('Braces: {', openBraces, '}', closeBraces, 'diff:', openBraces - closeBraces);

const openParens = (code.match(/\(/g) || []).length;
const closeParens = (code.match(/\)/g) || []).length;
console.log('Parens: (', openParens, ')', closeParens, 'diff:', openParens - closeParens);

// 3. Check for template literal issues
const backtickOpen = (code.match(/`/g) || []).length;
console.log('Backticks:', backtickOpen, '(even:', backtickOpen % 2 === 0, ')');

// 4. Try vm.Script
try {
  const vm = require('vm');
  new vm.Script(code);
  console.log('vm.Script: OK');
} catch(e) {
  console.error('vm.Script FAIL:', e.message);
}

// 5. Check the last 30 lines
console.log('\nLast 30 lines:');
for (let i = Math.max(0, scriptLines.length - 30); i < scriptLines.length; i++) {
  console.log(`  ${i + 1}: ${scriptLines[i].substring(0, 120)}`);
}
