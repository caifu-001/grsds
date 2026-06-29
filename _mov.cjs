const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Find project-detail-view 
const pdv = s.indexOf('id="project-detail-view"');
console.log('pdv at:', pdv);

// Find the opening <div tag
const tagStart = s.lastIndexOf('<div', pdv);
console.log('tag starts at:', tagStart);

// Find the closing </div> - navigate by depth
let depth = 1, p = pdv + 50;
while (p < s.length && depth > 0) {
  if (s.slice(p, p + 4) === '<div') depth++;
  else if (s.slice(p, p + 6) === '</div>') { depth--; if (depth === 0) { console.log('pdv closes at:', p + 6); break; } }
  p++;
}

// Also find the <style> block after the closing </div>
const closeDiv = p + 6;
const next = s.slice(closeDiv, closeDiv + 200);
console.log('After close:', next.slice(0, 80));

// Find where </style> is after pdv
const styleTag = s.indexOf('</style>', closeDiv);
console.log('</style> at:', styleTag);

// Full block: from tagStart to styleTag + 8
const block = s.slice(tagStart, styleTag + 8);
console.log('\nBlock size:', block.length);

// Check admin-view range
const adminStart = s.indexOf('id="admin-view"');
let ad = 1, adminEnd = adminStart + 50;
for (let i = adminStart + 50; i < s.length; i++) {
  if (s.slice(i, i + 4) === '<div') ad++;
  else if (s.slice(i, i + 6) === '</div>') { ad--; if (ad === 0) { adminEnd = i + 6; break; } }
}
console.log('\nadmin-view:', adminStart, '-', adminEnd);
console.log('pdv inside admin:', tagStart > adminStart && styleTag + 8 < adminEnd);

// Find </body>
const bodyEnd = s.indexOf('</body>');
console.log('</body> at:', bodyEnd);
console.log('chars before </body>:', bodyEnd - styleTag - 8);
