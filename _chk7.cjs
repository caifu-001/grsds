const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
// Find all elements with class admin-subtab
const re = /class="[^"]*admin-subtab[^"]*"[^>]*>([^<]+)/g;
let m, idx = 0;
while ((m = re.exec(s)) !== null) {
  console.log(idx + ': ' + m[1].trim());
  idx++;
}
console.log('\nTotal:', idx);
