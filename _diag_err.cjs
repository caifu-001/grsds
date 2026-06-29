const fs = require('fs');
const vm = require('vm');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
let ls = s.lastIndexOf('<script>');
let le = s.lastIndexOf('</script>');
let js = s.slice(ls+8, le);

try {
  new vm.Script(js);
  console.log('JS OK');
} catch(e) {
  let msg = e.message;
  console.log('Error:', msg);
  // Try to find exact line
  let lines = js.split('\n');
  // Try parsing with line numbers via eval
  try {
    new vm.Script(js, { filename: 'inline' });
  } catch(e2) {
    let m = e2.stack.match(/inline:(\d+)/);
    if (m) {
      let ln = parseInt(m[1]);
      console.log('Line:', ln);
      for (let k = Math.max(0,ln-5); k < Math.min(lines.length, ln+3); k++) {
        console.log('L'+(k+1)+':', (lines[k]||'').substring(0, 200));
      }
    }
  }
}

// Also check for the specific issues
console.log('\n--- workflows branches ---');
let allWf = [];
let idx = 0;
while ((idx = js.indexOf("tab==='workflows'", idx)) > 0) {
  allWf.push({pos: idx, ctx: js.slice(idx, idx+150)});
  idx += 1;
}
allWf.forEach(w => console.log('  at', w.pos, ':', w.ctx.substring(0, 100)));

console.log('\n--- wfSetAssignee(num, ---');
let re = /wfSetAssignee\((\d+),/g;
let m;
while ((m = re.exec(js)) !== null) {
  console.log('  at', m.index, ':', js.slice(m.index, m.index+50));
}

console.log('\n--- staffId ---');
let si = js.indexOf('staffId');
while (si > 0) {
  console.log('  at', si, ':', js.slice(Math.max(0,si-20), si+40));
  si = js.indexOf('staffId', si+1);
}
