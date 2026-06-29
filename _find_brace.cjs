const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Find all script blocks and count braces
let blocks = [];
let idx = 0;
while (true) {
  let open = s.indexOf('<script', idx);
  if (open < 0) break;
  let close = s.indexOf('</script>', open);
  if (close < 0) close = s.length;
  let content = s.slice(open, close);
  let opens = (content.match(/\{/g) || []).length;
  let closes = (content.match(/\}/g) || []).length;
  blocks.push({ start: open, diff: opens - closes, opens, closes });
  idx = close + 9;
}

for (let b of blocks) {
  if (b.diff !== 0) {
    console.log('Block at', b.start, 'diff', b.diff, 'open', b.opens, 'close', b.closes);
    // Find the unclosed brace
    let content = s.slice(b.start, s.indexOf('</script>', b.start));
    let depth = 0;
    let lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      for (let j = 0; j < lines[i].length; j++) {
        if (lines[i][j] === '{') depth++;
        if (lines[i][j] === '}') depth--;
      }
    }
    console.log('Final depth in block:', depth);
    if (depth > 0) {
      // Walk backwards through functions to find which function is unclosed
      let funcs = [];
      let rest = content;
      let prev = 0;
      while (true) {
        let fi = rest.indexOf('function ', prev);
        if (fi < 0) break;
        let funcLine = rest.lastIndexOf('\n', fi);
        console.log('Function starts near:', rest.slice(funcLine, funcLine + 60).trim());
        prev = fi + 8;
      }
    }
  }
}
console.log('Total blocks:', blocks.length);
