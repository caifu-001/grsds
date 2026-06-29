const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Find the modal HTML
let i = s.indexOf('id="fw-location-confirm"');
if (i > 0) {
  let end = s.indexOf('</div>', i + 2000);
  // Find the actual end of this modal (nested divs)
  let depth = 1;
  let pos = i + 26;
  while (depth > 0 && pos < end + 2000) {
    let open = s.indexOf('<div', pos);
    let close = s.indexOf('</div>', pos);
    if (open < 0 && close < 0) break;
    if (close >= 0 && (open < 0 || close < open)) { depth--; pos = close + 6; }
    else if (open >= 0) { depth++; pos = open + 4; }
  }
  let html = s.slice(i - 50, pos);
  console.log('Modal HTML (' + html.length + ' bytes):');
  console.log(html.slice(0, 2000).replace(/\n/g, '\\n'));
}

// Check showLocationConfirm
i = s.indexOf('function showLocationConfirm(');
if (i > 0) {
  let end = s.indexOf('\nfunction', i + 50);
  console.log('\nshowLocationConfirm:');
  console.log(s.slice(i, i + 2000));
}

// Check if hidden class has display:none
i = s.indexOf('.fw-location-modal');
if (i > 0) {
  console.log('\nCSS for fw-location-modal:');
  console.log(s.slice(i, i + 200));
}
i = s.indexOf('#fw-location-confirm');
if (i > 0) {
  console.log('\nCSS for fw-location-confirm:');
  console.log(s.slice(i, i + 300));
}

// Check if there's z-index issue
let zIdx = s.indexOf('z-index', i || 0);
if (zIdx > i) {
  console.log('\nNearby z-index:', s.slice(zIdx - 20, zIdx + 30));
}
