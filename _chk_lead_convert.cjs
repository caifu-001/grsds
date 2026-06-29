const s = require('fs').readFileSync('D:/1kaifa/grsds/index.html','utf8');

// Find saveProject function to check if it updates lead status
const sp = s.indexOf('async function saveProject(');
if (sp > 0) {
  let d = 0, p = s.indexOf('{', sp) + 1;
  while (d >= 0 && p < s.length) {
    if (s[p] === '{') d++;
    else if (s[p] === '}') { d--; if (d === 0) break; }
    p++;
  }
  const body = s.slice(sp, p + 1);
  console.log('saveProject body (' + body.length + ' chars):');
  console.log(body.slice(0, 3000));
  
  if (body.includes('converted')) console.log('\n✅ Has converted status update');
  else console.log('\n❌ MISSING converted status update');
}
