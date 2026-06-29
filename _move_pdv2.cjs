const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// block to move: id="project-detail-view" through its closing </div> + <style> block
const tagStart = 136216;
const styleEnd = 140745; // </style> + >

const block = s.slice(tagStart, styleEnd);
console.log('Block len:', block.length);

// Remove from current position
const before = s.slice(0, tagStart);
const after = s.slice(styleEnd);

// Find </body>
const bodyEnd = after.indexOf('</body>');
const newContent = before + after.slice(0, bodyEnd) + '\n' + block + '\n' + after.slice(bodyEnd);

// Verify braces
const jsStart = newContent.indexOf('<script>', 100000);
const jsEnd = newContent.indexOf('</script>', jsStart);
const js = newContent.slice(jsStart + 8, jsEnd);
const openBraces = (js.match(/\{/g) || []).length;
const closeBraces = (js.match(/\}/g) || []).length;
console.log('Braces:', openBraces, closeBraces, 'diff:', openBraces - closeBraces);

// Verify JS
try { new (require('vm')).Script(js); console.log('JS: OK'); } catch(e) { console.log('JS FAIL:', e.message.slice(0, 80)); }

// Write
fs.writeFileSync('D:/1kaifa/grsds/index.html', newContent, 'utf8');
console.log('Written:', newContent.length, 'bytes');

// Verify pdv not inside admin
const adminStart2 = newContent.indexOf('id="admin-view"');
const pdvStart2 = newContent.indexOf('id="project-detail-view"');
let ad2 = 1, adminEnd2 = adminStart2 + 50;
for (let i = adminStart2 + 50; i < newContent.length; i++) {
  if (newContent.slice(i, i + 4) === '<div') ad2++;
  else if (newContent.slice(i, i + 6) === '</div>') { ad2--; if (ad2 === 0) { adminEnd2 = i + 6; break; } }
}
console.log('pdv inside admin:', pdvStart2 > adminStart2 && pdvStart2 < adminEnd2);
