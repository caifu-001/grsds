const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
const base = s.indexOf('<script>', 100000) + 8;
const js = s.slice(base);

// Extract full renderProjects
function extractFunc(name) {
  let i = js.indexOf('function ' + name + '(');
  if (i < 0) i = js.indexOf('async function ' + name + '(');
  if (i < 0) return 'NOT FOUND';
  let d = 0, p = js.indexOf('{', i) + 1;
  while (d >= 0 && p < js.length) {
    if (js[p] === '{') d++;
    else if (js[p] === '}') { d--; if (d === 0) break; }
    p++;
  }
  return js.slice(i, p + 1);
}

console.log('=== renderProjects FULL ===');
console.log(extractFunc('renderProjects'));

// Also check what's in projects-view HTML
console.log('\n=== projects-view HTML ===');
const htmlStart = s.indexOf('id="projects-view"');
const htmlEnd = s.indexOf('<!-- projects-view', htmlStart);
console.log(s.slice(htmlStart, htmlStart + 2000));

// Check loadProjects
console.log('\n=== loadProjects ===');
const lp = extractFunc('loadProjects');
console.log(lp ? lp.slice(0, 500) : 'NOT FOUND');
