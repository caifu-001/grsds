var fs = require('fs');
var c = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// 1. Extract the three-screen block (from company-reg-screen to just before Performance View)
var regStart = c.indexOf('<div id="company-reg-screen"');
var perfStart = c.indexOf('<!-- Performance View -->');

// The block we need to move: everything from regStart to perfStart
// Find the exact end — the </div> </div> before <!-- Performance View -->
var searchEnd = perfStart;
var segment = c.substring(regStart, searchEnd);
// Find the last </div> in this segment
var lastClose = segment.lastIndexOf('</div>');
// Then find the one before it (the pending-screen close)
var secondLastClose = segment.lastIndexOf('</div>', lastClose - 1);
// The actual end of the three-screen block is at regStart + lastClose + 6
var blockEnd = regStart + lastClose + 6;
// Verify: what's right after blockEnd?
var after = c.substring(blockEnd, blockEnd + 100).trim();
console.log('After blockEnd:', after.substring(0, 80));

// 2. Find where login-screen ends (where to insert)
// Find login-screen's closing </div>
var loginStart = c.indexOf('id="login-screen"');
var loginDivStart = c.lastIndexOf('<div', loginStart);
// Walk to find matching close
var depth = 1;
var pos = c.indexOf('>', loginDivStart) + 1;
while (depth > 0 && pos < c.length) {
  var nextOpen = c.indexOf('<div', pos);
  var nextClose = c.indexOf('</div>', pos);
  if (nextClose < 0) break;
  if (nextOpen >= 0 && nextOpen < nextClose) {
    // skip self-closing-like <div ... />
    var afterDiv = c.substring(nextOpen + 4, nextOpen + 20).trim();
    if (afterDiv.startsWith('/') || nextOpen > nextClose) {
      pos = nextOpen + 4;
      continue;
    }
    depth++;
    pos = nextOpen + 4;
  } else {
    depth--;
    if (depth === 0) {
      pos = nextClose + 6;
      break;
    }
    pos = nextClose + 6;
  }
}
var loginClose = pos;
console.log('login-screen closes at', loginClose);

// 3. Extract the block to move
var block = c.substring(regStart, blockEnd);
console.log('Block to move length:', block.length);

// 4. Construct new HTML
// Remove from old position, insert after login-screen
var mainStart = c.indexOf('id="main-screen"');
var mainDivStart = c.lastIndexOf('<div', mainStart);

// Before main-screen: everything from file start to main-screen
var beforeMain = c.substring(0, mainDivStart);

// But login-screen is before main-screen. Let me check order:
console.log('login-screen div start:', loginDivStart, 'main-screen div start:', mainDivStart);

var prefix = c.substring(0, mainDivStart);
var mainAndAfter = c.substring(mainDivStart);

// Remove the block from mainAndAfter
var blockInMain = mainAndAfter.indexOf(block);
console.log('Block found in mainAndAfter at offset', blockInMain);

if (blockInMain >= 0) {
  // Remove block and any whitespace/newlines between it and what follows
  var afterBlock = mainAndAfter.substring(blockInMain + block.length);
  // Clean leading whitespace/newlines
  afterBlock = afterBlock.replace(/^\s+/, '');
  mainAndAfter = mainAndAfter.substring(0, blockInMain) + afterBlock;
  console.log('Block removed from mainAndAfter');
}

// Insert the block after login-screen close, before main-screen div
var posForBlock = prefix.indexOf('</div>', loginClose - 10);
if (posForBlock < 0) posForBlock = loginClose;
// Find the actual line after login-screen
var afterLoginClose = prefix.substring(loginClose);
var nextDiv = afterLoginClose.indexOf('<div');
if (nextDiv >= 0) {
  posForBlock = loginClose + nextDiv - 1; // insert right before the next div
} else {
  posForBlock = loginClose;
}
// But loginClose is after mainDivStart since login is inside main? Let me check
console.log('loginClose:', loginClose, 'mainDivStart:', mainDivStart);

// Oh wait - login-screen might be BEFORE main-screen (in the DOM). Let me verify:
if (loginClose > mainDivStart) {
  console.log('login-screen is INSIDE main-screen too! This is a bigger problem.');
  // Both login-screen and company-reg-screen are inside main-screen
  // We need to move both out, or just move company-reg-screen outside
}

// Actually the real issue is: showCompanyRegScreen does:
//   document.getElementById('main-screen').classList.add('hidden')
// If company-reg-screen is inside main-screen, hiding main-screen hides everything.
// Solution: DON'T hide main-screen when showing company-reg-screen, OR move it out.

// Simpler fix: just move company-reg-screen out to before main-screen's <div>
// Let me find the <div for main-screen
var mainDivIdx = c.substring(0, mainStart).lastIndexOf('<div');
console.log('main-screen div starts at', mainDivIdx, 'text:', c.substring(mainDivIdx, mainDivIdx + 50));

var newHtml = c.substring(0, mainDivIdx) + block + '\n' + c.substring(mainDivIdx, regStart) + c.substring(blockEnd);

// Verify
var d_open = (newHtml.match(/<div/g) || []).length;
var d_close = (newHtml.match(/<\/div>/g) || []).length;
var b_open = (newHtml.match(/\{/g) || []).length;
var b_close = (newHtml.match(/\}/g) || []).length;
console.log('div balance:', d_open - d_close, '{}: balance:', b_open - b_close);

if (d_open === d_close && b_open === b_close) {
  fs.writeFileSync('D:/1kaifa/grsds/index.html', newHtml, 'utf8');
  console.log('DONE - index.html updated');
} else {
  console.log('BALANCE ERROR - not writing');
}
