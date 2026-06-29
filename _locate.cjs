const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
const ls = s.lastIndexOf('<script>'), le = s.lastIndexOf('</script>');
const code = s.slice(ls+8, le);
const lines = code.split('\n');
console.log('Total lines:', lines.length);
// Find line 938... wait that's byte position not line
// Find the inserted loadFWVisits
const i = code.indexOf('async function loadFWVisits');
const startLine = code.substring(0, i).split('\n').length;
console.log('loadFWVisits at line:', startLine);
for (let k = Math.max(0, startLine-2); k < Math.min(lines.length, startLine+25); k++)
  console.log('L'+(k+1)+': '+(lines[k]||'').substring(0,200));
