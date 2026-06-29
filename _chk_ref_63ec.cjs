const fs = require('fs');

// Read 63ecd6d version of renderProjects
const ref = fs.readFileSync('D:/1kaifa/grsds/_ref_63ec.html', 'utf8');
const base = ref.indexOf('<script>', 100000) + 8;
const js = ref.slice(base);

function extractBody(name) {
  let i = js.indexOf('function ' + name + '(');
  if (i < 0) i = js.indexOf('async function ' + name + '(');
  if (i < 0) { console.log('NOT FOUND:', name); return ''; }
  let d = 0, p = js.indexOf('{', i) + 1;
  while (d >= 0 && p < js.length) {
    if (js[p] === '{') d++;
    else if (js[p] === '}') { d--; if (d === 0) break; }
    p++;
  }
  return js.slice(i, Math.min(p + 1, p + 50));
}

console.log('63ecd6d renderProjects:');
const body = extractBody('renderProjects');
console.log(body);
console.log('\nLength:', body.length);

// Check if it has onclick
const onclickMatch = body.match(/onclick="[^"]*"/g);
console.log('Onclicks:', onclickMatch ? onclickMatch.length : 0);
if (onclickMatch) onclickMatch.forEach(m => console.log('  ', m));
