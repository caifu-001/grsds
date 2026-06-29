const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Extract script content between first <script> and first </script>
const scriptStart = s.indexOf('<script>');
const scriptEnd = s.indexOf('</script>', scriptStart);
if (scriptStart < 0 || scriptEnd < 0) {
  console.log('No script block found');
  process.exit(1);
}

const js = s.slice(scriptStart + 8, scriptEnd);
console.log('Script size:', js.length, 'chars');
console.log('Script starts at byte', scriptStart, 'ends at', scriptEnd);
console.log('Last 200 chars of script:');
console.log(js.slice(-200));

// Try native vm.Script
try {
  const vm = require('vm');
  new vm.Script(js);
  console.log('vm.Script: OK');
} catch(e) {
  console.error('vm.Script FAIL:', e.message);
}

// Count braces, parens, brackets
const openBraces = (js.match(/\{/g) || []).length;
const closeBraces = (js.match(/\}/g) || []).length;
const openParens = (js.match(/\(/g) || []).length;
const closeParens = (js.match(/\)/g) || []).length;
const openBrackets = (js.match(/\[/g) || []).length;
const closeBrackets = (js.match(/\]/g) || []).length;

console.log('Braces: {', openBraces, '} ', closeBraces, 'diff:', openBraces - closeBraces);
console.log('Parens: (', openParens, ') ', closeParens, 'diff:', openParens - closeParens);
console.log('Brackets: [', openBrackets, '] ', closeBrackets, 'diff:', openBrackets - closeBrackets);

// Find template literal issues
const backtickOpen = (js.match(/`/g) || []).length;
console.log('Backticks:', backtickOpen, '(should be even, diff:', backtickOpen % 2, ')');

// Check for unclosed comments /* without */
const blockComments = js.match(/\/\*/g);
if (blockComments) console.log('/* count:', blockComments.length);
const blockEnds = js.match(/\*\//g);
if (blockEnds) console.log('*/ count:', blockEnds.length);
if (blockComments && blockEnds && blockComments.length !== blockEnds.length) {
  console.log('WARNING: unclosed block comment!');
}
