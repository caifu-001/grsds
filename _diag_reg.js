var c = require('fs').readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
var ms = c.indexOf('id="main-screen"');
var cr = c.indexOf('id="company-reg-screen"');
console.log('main-screen at', ms, ', company-reg-screen at', cr);

// Find the matching </div> for main-screen by counting
var mainStart = c.indexOf('>', ms) + 1;
var depth = 1;
var pos = mainStart;
while (depth > 0 && pos < c.length) {
  var nextOpen = c.indexOf('<div', pos);
  var nextClose = c.indexOf('</div>', pos);
  if (nextClose < 0) break;
  if (nextOpen >= 0 && nextOpen < nextClose) {
    depth++;
    pos = nextOpen + 4;
  } else {
    depth--;
    if (depth === 0) {
      console.log('main-screen closing div at', nextClose);
      if (cr > ms && cr < nextClose) {
        console.log('BUG: company-reg-screen is INSIDE main-screen (between', ms, 'and', nextClose, ')');
      } else {
        console.log('OK: company-reg-screen is OUTSIDE main-screen');
      }
      break;
    }
    pos = nextClose + 6;
  }
}
