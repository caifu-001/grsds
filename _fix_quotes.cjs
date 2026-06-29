const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Fix the 3 occurrences: openVisitForm, deleteVisit
// The wrong text: 'onclick="openVisitForm(''+v.id+'')">'
// Should be: 'onclick="openVisitForm(\'+v.id+\')">'
const oldPattern = 'onclick="openVisitForm(\'\'+v.id+\'\')"';
const newPattern = 'onclick="openVisitForm(\'+v.id+\')"';
if (s.includes(oldPattern)) {
  s = s.split(oldPattern).join(newPattern);
  console.log('Fixed openVisitForm onclick');
}

const oldPattern2 = 'onclick="deleteVisit(\'\'+v.id+\'\')"';
const newPattern2 = 'onclick="deleteVisit(\'+v.id+\')"';
if (s.includes(oldPattern2)) {
  s = s.split(oldPattern2).join(newPattern2);
  console.log('Fixed deleteVisit onclick');
}

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');

const ls = s.lastIndexOf('<script>'), le = s.lastIndexOf('</script>');
try { new (require('vm').Script)(s.slice(ls+8, le)); console.log('JS: OK'); }
catch(e) { 
  console.log('JS FAIL:', e.message.substring(0,200));
  const m = (e.stack||'').match(/inline:(\d+)/);
  if (m) {
    const ln = parseInt(m[1]);
    const lines = s.slice(ls+8, le).split('\n');
    for (let k = Math.max(0,ln-3); k < Math.min(lines.length, ln+2); k++)
      console.log('L'+(k+1)+': '+(lines[k]||'').substring(0,200));
  }
}
const o=(s.match(/<div[\s>]/g)||[]).length, c=(s.match(/<\/div>/g)||[]).length;
console.log('Div:',o,c,o-c);
