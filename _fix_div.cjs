const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Find the broken section: after '</select>'; should be 'h+=\'</div></div>\';' but is directly '// 编辑权限'
const marker = "h+='</select>';\n  // ";
const idx = s.indexOf(marker, 748000);
if (idx > 0) {
  const ctx = s.slice(idx - 50, idx + 100);
  console.log('Found at', idx);
  console.log('Context:', ctx.replace(/\n/g, '\\n'));
  
  // Insert missing h+='</div></div>';
  const insert = "h+='</select>';\n  h+='</div></div>';\n  // ";
  s = s.slice(0, idx) + insert + s.slice(idx + marker.length + 3);
  
  fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');
  console.log('Fixed, written', s.length);
} else {
  console.log('Pattern not found');
}
