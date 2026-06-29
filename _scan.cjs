const fs = require('fs');
const h = fs.readFileSync('D:/1kaifa/grsds/index.html','utf8');

// Find analytics-view start and end
const avIdx = h.indexOf('<div id="analytics-view"');
console.log('analytics-view starts at', avIdx);

// Find the next sibling view div or the closing of analytics-view
// Look for next </div> that closes analytics-view
// Strategy: count div depth from this point
let depth = 0;
let ap = avIdx;
// Find the opening div
ap = h.indexOf('<div', ap);
// Skip to end of this opening tag
ap = h.indexOf('>', ap) + 1;
depth = 1;

while (ap < h.length && depth > 0) {
  // Find next <div or </div
  const nextOpen = h.indexOf('<div', ap);
  const nextClose = h.indexOf('</div>', ap);
  
  if (nextClose < 0) break;
  if (nextOpen >= 0 && nextOpen < nextClose) {
    // Opening div
    // Check if it's a self-closing or non-div
    const afterTag = h.indexOf('>', nextOpen);
    depth++;
    ap = afterTag + 1;
  } else {
    // Closing div
    depth--;
    ap = nextClose + 6;
    if (depth === 0) {
      console.log('analytics-view ends at', ap);
      break;
    }
  }
}

// Extract the analytics-view block
const block = h.slice(avIdx, ap);
console.log('Block size:', block.length);
console.log('Block preview (first 200):', block.slice(0, 200));
console.log('Block ending:', block.slice(-100));
