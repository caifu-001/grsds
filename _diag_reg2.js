var fs = require('fs');
var c = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Find the three screens block
var regStart = c.indexOf('<!-- Reg/Invite/Pending screens inside main -->');
var fallbackStart = c.indexOf('<div id="company-reg-screen"');
var invStart = c.indexOf('<!-- Invitation Dialog -->');
var pendStart = c.indexOf('<!-- Pending Approval -->');
var perfStart = c.indexOf('<!-- Performance View -->');

console.log('company-reg-screen at', fallbackStart);
console.log('Invitation Dialog at', invStart);
console.log('Pending Approval at', pendStart);
console.log('Performance View at', perfStart);

// Find what's right before company-reg-screen
if (fallbackStart > 0) {
  var before = c.substring(fallbackStart - 200, fallbackStart);
  console.log('BEFORE company-reg-screen:\n', before.split('\n').slice(-5).join('\n'));
}

// Find main-screen open
var mainStart = c.indexOf('id="main-screen"');
var mainOpen = c.lastIndexOf('<div', mainStart);
var mainDivStart = c.indexOf('>', mainStart) + 1;
console.log('\nmain-screen div at', mainOpen, ', content starts at', mainDivStart);

// See what's after pending-screen and before performance-view
if (pendStart > 0 && perfStart > 0) {
  var between = c.substring(pendStart + 100, perfStart);
  console.log('\nBetween pending-screen end and Performance View:\n', between);
}
