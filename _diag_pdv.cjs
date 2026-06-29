const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Find project-detail-view
const start = s.indexOf('id="project-detail-view"');
if (start < 0) { console.log('NOT FOUND'); return; }

// Find the closing div - navigate by depth
let d = 0, p = start;
while (p < s.length) {
  if (s[p] === '<' && s.slice(p, p + 4) === '<div') d++;
  else if (s[p] === '<' && s.slice(p, p + 5) === '</div') {
    d--;
    if (d === 0) {
      const end = p + 6;
      console.log('project-detail-view: ' + (end - start) + ' bytes');
      console.log(s.slice(start, end));
      return;
    }
  }
  p++;
}
console.log('Could not find closing tag, scanned to', p);
