const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// The problematic line needs to produce: ,'staffId',this.value
// But 'staffId' breaks the outer JS single-quoted string.
// Fix: use \x27 (hex escape for ') which works in any JS string context
// Replace raw pattern: ,\'staffId\',this.value -> ,\\x27staffId\\x27,this.value
// But the raw file already has backslashes. Let's just target the literal string.

// Find all occurrences of the broken pattern in the file
let target = ",staffId,this.value";
let fixed = ",\\x27staffId\\x27,this.value";
let cnt = 0;
while (s.includes(target)) {
  s = s.replace(target, fixed);
  cnt++;
}
console.log('staffId hex replace:', cnt);

// Also fix any legacy \'staffId\' patterns  
target = ",\\'staffId\\',this.value";
while (s.includes(target)) {
  s = s.replace(target, fixed);
  cnt++;
}
console.log('staffId escaped replace:', cnt, 'total');

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');

try {
  let vm = require('vm');
  let ls = s.lastIndexOf('<script>');
  let le = s.lastIndexOf('</script>');
  let js = s.slice(ls+8, le);
  new vm.Script(js);
  console.log('JS: OK');
} catch(e) {
  console.log('JS FAIL:', e.message.substring(0, 120));
  // Find the error location
  let m = e.message.match(/line (\d+)/);
  if (m) {
    let el = parseInt(m[1]);
    let jlines = js.split('\n');
    console.log('Error at JS line', el, ':', jlines[el-1] ? jlines[el-1].substring(0, 150) : 'n/a');
  }
}

let opens = (s.match(/<div[\s>]/g) || []).length;
let closes = (s.match(/<\/div>/g) || []).length;
console.log('Div:', opens, closes, 'diff:', opens - closes);
