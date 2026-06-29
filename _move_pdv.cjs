const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Find project-detail-view block 
const pdv = s.indexOf('<!-- ===== 项目详情页(独立视图) ===== -->');
if (pdv < 0) { console.log('NOT FOUND comment'); process.exit(1); }

// Find end of this block - next major section after the </style> tag
const styleEnd = s.indexOf('</style>', pdv + 2000);
console.log('pdv comment at', pdv, 'style end at', styleEnd);

// The project-detail-view div + style block:
// It starts at the comment and ends after the closing </style>
// But we need to also check if there's more after the style

const afterStyle = s.slice(styleEnd + 8, styleEnd + 200);
console.log('After style:', afterStyle.slice(0, 100));

// Find the div close for project-detail-view
// Navigate from the opening <div after the comment
const divStart = s.indexOf('<div id="project-detail-view"', pdv);
let divDepth = 0, divEnd = divStart;
for (let i = divStart; i < s.length; i++) {
  if (s.slice(i, i + 4) === '<div') divDepth++;
  else if (s.slice(i, i + 6) === '</div>') {
    divDepth--;
    if (divDepth === 0) { divEnd = i + 6; break; }
  }
}
console.log('div start:', divStart, 'div end:', divEnd);

// Check what comes after the closing </div> 
console.log('After closing div:', s.slice(divEnd, divEnd + 200));

// The full block to move is from pdv comment to divEnd
console.log('\n=== BLOCK TO MOVE ===');
console.log('Start:', pdv, 'End:', divEnd, 'Size:', divEnd - pdv, 'bytes');

// Now find admin-view 
const adminStart = s.indexOf('id="admin-view"');
console.log('\nadmin-view starts at:', adminStart);
console.log('Is pdv inside admin?', pdv > adminStart);

// Check what closes admin-view - find </div> of admin-view
// Count from adminStart  
let ad = 0, adminEnd = adminStart;
for (let i = adminStart; i < s.length; i++) {
  if (s.slice(i, i + 4) === '<div') ad++;
  else if (s.slice(i, i + 6) === '</div>') {
    ad--;
    if (ad === 0) { adminEnd = i + 6; break; }
  }
}
console.log('admin-view ends at:', adminEnd);
console.log('Is pdv inside admin?', pdv > adminStart && divEnd < adminEnd);
