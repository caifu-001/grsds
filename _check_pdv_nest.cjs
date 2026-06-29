const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Find project-detail-view block
const pdvStart = s.indexOf('id="project-detail-view"');
console.log('pdvStart:', pdvStart);

// Find context before it - what container is it in?
const before = s.slice(pdvStart - 500, pdvStart);
console.log('=== BEFORE ===');
console.log(before.slice(-300));

// Find the full block end
let d = 0, p = pdvStart;
while (p < s.length) {
  if (s[p] === '<' && s.slice(p, p + 4) === '<div') d++;
  if (p === pdvStart) {
    // Starting depth, count opening tag
    d = 1;
  }
  else if (s[p] === '<' && s.slice(p, p + 5) === '</div') {
    d--;
    if (d === 0) {
      console.log('pdvEnd:', p + 6);
      break;
    }
  }
  p++;
}

// Find the immediate parent div start
let parentStart = pdvStart - 1;
let depth = 0;
while (parentStart > 0) {
  if (s.slice(parentStart - 4, parentStart) === '<div') {
    if (depth === 0) {
      // Find the ID of this div
      const match = s.slice(parentStart - 4, parentStart + 50).match(/<div[^>]*id="([^"]*)"[^>]*>/);
      if (match) {
        console.log('Parent div ID:', match[1]);
      } else {
        console.log('Parent div (no ID) at', parentStart - 4);
        console.log(s.slice(parentStart - 4, parentStart + 40));
      }
      break;
    }
    depth--;
  }
  if (s.slice(parentStart - 5, parentStart) === '</div') depth++;
  parentStart--;
}
