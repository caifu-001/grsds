const s = require('fs').readFileSync('D:/1kaifa/grsds/index.html','utf8');

// 1. Double async check
const re = /async\s+async\s+function/g;
let m, cnt = 0;
while ((m = re.exec(s)) !== null) {
  cnt++;
  const lineno = s.substring(0, m.index).split(/\r?\n/).length;
  console.log('DOUBLE async at line', lineno);
}
console.log('Double async count:', cnt);

// 2. Full renderProjectDetail + check all await calls are in async
const rpd = s.indexOf('async function renderProjectDetail(');
let d = 0, p = s.indexOf('{', rpd) + 1;
while (d >= 0 && p < s.length) {
  if (s[p] === '{') d++;
  else if (s[p] === '}') { d--; if (d === 0) break; }
  p++;
}
const body = s.slice(rpd, p + 1);
const lines = body.split('\n');
console.log('\nrenderProjectDetail ALL lines:');
lines.forEach((l, i) => console.log(`  ${i + 1}: ${l.trim()}`));

// 3. Check if loadTemplates is properly async
const lt = s.indexOf('function loadTemplates(');
console.log('\nloadTemplates is async:', s.slice(lt, lt + 50));

// 4. Check if renderDetailBlocks is called from switchDetailTab properly
const sdt = s.indexOf('function switchDetailTab(');
console.log('\nswitchDetailTab body:');
if (sdt > 0) {
  let d2 = 0, sp = s.indexOf('{', sdt) + 1;
  while (d2 >= 0 && sp < s.length) {
    if (s[sp] === '{') d2++;
    else if (s[sp] === '}') { d2--; if (d2 === 0) break; }
    sp++;
  }
  console.log(s.slice(sdt, sp + 1));
}

// 5. Check closeProjectDetail restores main-screen properly
const cpd = s.indexOf('function closeProjectDetail(');
console.log('\ncloseProjectDetail body:');
if (cpd > 0) {
  let d3 = 0, cp = s.indexOf('{', cpd) + 1;
  while (d3 >= 0 && cp < s.length) {
    if (s[cp] === '{') d3++;
    else if (s[cp] === '}') { d3--; if (d3 === 0) break; }
    cp++;
  }
  console.log(s.slice(cpd, cp + 1));
}

// 6. Check if projects-view has proper project-list for current state
console.log('\nproject-detail-view HTML exists:', s.includes('id="project-detail-view"'));
console.log('project-detail-view NOT hidden:', !s.includes('project-detail-view" class="hidden"') ? 'FOUND class=hidden' : 'class=hidden is present');

// 7. Check saveProject and deleteOpp - are there other functions with await but no async?
const funcRe = /^(?!async )function\s+(\w+)\([^)]*\)\s*\{/gm;
const blocks = [];
while ((m = funcRe.exec(s)) !== null) {
  const name = m[1];
  let fd = 0, fp = s.indexOf('{', m.index + m[0].length - 1) + 1;
  while (fd >= 0 && fp < s.length) {
    if (s[fp] === '{') fd++;
    else if (s[fp] === '}') { fd--; if (fd === 0) break; }
    fp++;
  }
  const fbody = s.slice(m.index, fp + 1);
  if (fbody.includes('await ') && !s.slice(m.index, m.index + 20).startsWith('async')) {
    blocks.push({name, line: s.substring(0, m.index).split(/\r?\n/).length});
  }
}
if (blocks.length > 0) {
  console.log('\n⚠️ Functions with await but NO async:');
  blocks.forEach(b => console.log(' ', b.name, 'at line', b.line));
} else {
  console.log('\n✅ No non-async functions with await');
}
