const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
const base = s.indexOf('<script>', 100000) + 8;
const js = s.slice(base);

function extractBody(name, async = false) {
  const prefix = async ? 'async function ' : 'function ';
  let i = js.indexOf(prefix + name + '(');
  if (i < 0) { console.log('NOT FOUND:', name); return ''; }
  let d = 0, p = js.indexOf('{', i + prefix.length) + 1;
  while (d >= 0 && p < js.length) {
    if (js[p] === '{') d++;
    else if (js[p] === '}') { d--; if (d === 0) break; }
    p++;
  }
  return js.slice(i, p + 1);
}

const body = extractBody('renderProjects');
console.log('=== renderProjects full body ===');
console.log(body);
console.log('\n=== Total length:', body.length);
