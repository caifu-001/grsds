const fs = require('fs');
const h = fs.readFileSync('D:/1kaifa/grsds/index.html','utf-8');
// Extract all script blocks
const scripts = [];
let idx = 0;
while (true) {
  const start = h.indexOf('<script', idx);
  if (start < 0) break;
  const end = h.indexOf('</script>', start);
  if (end < 0) break;
  // Find the > that closes the script tag
  const tagClose = h.indexOf('>', start);
  scripts.push({start: tagClose+1, end: end, content: h.substring(tagClose+1, end).trim()});
  idx = end + 9;
}
console.log(`Found ${scripts.length} script blocks`);
// The largest one is the main JS
scripts.sort((a,b) => b.content.length - a.content.length);
console.log(`Largest: ${scripts[0].content.length} chars at byte ${scripts[0].start}-${scripts[0].end}`);
// Try to parse it
try {
  new Function(scripts[0].content);
  console.log('✅ JS syntax OK');
} catch(e) {
  console.log(`❌ JS SYNTAX ERROR: ${e.message}`);
  console.log(`   Line approx: ${e.lineNumber}`);
}
