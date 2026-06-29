const fs = require('fs');

const ref = fs.readFileSync('D:/1kaifa/grsds/_ref_0894.html', 'utf8');
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
  const body = js.slice(i, p + 1);
  return { body, start: i, end: p + 1 };
}

const rp = extractBody('renderProjects');
console.log('renderProjects length:', rp.body.length);
console.log('First 500:', rp.body.slice(0, 500));
console.log('\nLast 300:', rp.body.slice(-300));

const onclickMatch = [...rp.body.matchAll(/onclick="([^"]*)"/g)];
console.log('\nonclick handlers:', onclickMatch.length);
onclickMatch.forEach(m => console.log('  ', m[1]));
