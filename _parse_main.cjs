const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Find the MAIN script block (the big one, not the tiny ones)
// The main script starts at line 1143 (byte ~112k)
// Let's find all <script> tags with their byte offsets
const allScriptTags = [];
const tagRe = /<script[^>]*>/g;
let m;
while ((m = tagRe.exec(s)) !== null) {
  allScriptTags.push({ offset: m.index, tag: m[0], isClose: s[m.index + 1] === '/' });
}

console.log('Script tags:');
allScriptTags.forEach(t => console.log(`  byte ${t.offset}: ${t.tag.slice(0, 60)}`));

// Main script: opening at line 1143's byte, closing at line 15387
// Find the byte offsets
const mainOpenLine = 1143;
const mainCloseLine = 15387;
const lines = s.split(/\r?\n/);

// Get actual byte ranges
let mainOpenByte = -1, mainCloseByte = -1;
for (let i = 0; i < lines.length && mainOpenByte < 0; i++) {
  const idx = lines[i].indexOf('<script>');
  if (i >= mainOpenLine - 1 && idx >= 0 && lines[i].indexOf('src=') < 0) {
    mainOpenByte = lines.slice(0, i).join('\r\n').length + (i > 0 ? 2 : 0) + idx + 8;
  }
}

for (let i = 0; i < lines.length && mainCloseByte < 0; i++) {
  const idx = lines[i].indexOf('</script>');
  if (i >= mainCloseLine - 1 && idx >= 0) {
    mainCloseByte = lines.slice(0, i).join('\r\n').length + (i > 0 ? 2 : 0) + idx;
  }
}

console.log('Main script: byte', mainOpenByte, 'to', mainCloseByte);
const code = s.slice(mainOpenByte, mainCloseByte);
console.log('Code size:', code.length, 'chars');
console.log('First 100:', code.slice(0, 100));
console.log('Last 100:', code.slice(-100));

// Analyze
const openBraces = (code.match(/\{/g) || []).length;
const closeBraces = (code.match(/\}/g) || []).length;
console.log('Braces: {', openBraces, '}', closeBraces, 'diff:', openBraces - closeBraces);

const tryCount = (code.match(/\btry\s*\{/g) || []).length;
const catchCount = (code.match(/\}?\s*\bcatch\s*\(/g) || []).length;
console.log('try:', tryCount, 'catch:', catchCount);

// Full parse
try {
  const vm = require('vm');
  new vm.Script(code);
  console.log('vm.Script: OK');
} catch(e) {
  console.error('vm.Script FAIL:', e.message);
}

// Check the END of the try to understand what's missing
const lastTry = code.lastIndexOf('try{');
if (lastTry > 0) {
  console.log('Last try at offset', lastTry, 'in main code');
  console.log('Context:', code.slice(Math.max(0, lastTry - 50), lastTry + 150));
}

// Check the catch/close structure near renderProjectDetail
const rpdIdx = code.indexOf('async function renderProjectDetail(');
if (rpdIdx > 0) {
  // find matching close
  let d = 0, p = code.indexOf('{', rpdIdx) + 1;
  while (d >= 0 && p < code.length) {
    if (code[p] === '{') d++;
    else if (code[p] === '}') { d--; if (d === 0) break; }
    p++;
  }
  console.log('\nrenderProjectDetail ends at main code offset', p);
  console.log('Around end:', JSON.stringify(code.slice(Math.max(0, p - 30), p + 50)));
}
