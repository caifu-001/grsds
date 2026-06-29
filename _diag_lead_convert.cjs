const s = require('fs').readFileSync('D:/1kaifa/grsds/index.html','utf8');

// 1. Check oppLeadId assignment - where is it set?
const re = /oppLeadId\s*=/g;
let m;
const refs = [];
while ((m = re.exec(s)) !== null) {
  refs.push({pos: m.index, ctx: s.slice(Math.max(0, m.index - 50), m.index + 80).replace(/\n/g, '\\n')});
}
console.log('oppLeadId assignments:');
refs.forEach(r => console.log('  at', r.pos, r.ctx));

// 2. Check lead_pool update in saveProject
const sp = s.indexOf('function saveProject(');
let d = 0, p = s.indexOf('{', sp) + 1;
while (d >= 0 && p < s.length) {
  if (s[p] === '{') d++;
  else if (s[p] === '}') { d--; if (d === 0) break; }
  p++;
}
const body = s.slice(sp, p + 1);

// Show the lead conversion block
const lc = body.indexOf('oppLeadId');
if (lc > 0) {
  console.log('\nLead conversion block in saveProject:');
  console.log(body.slice(Math.max(0, lc - 50), lc + 250).replace(/\n/g, '\\n'));
}

// 3. Check if saveProject is async - this is critical
console.log('\nsaveProject is async:', body.trimStart().startsWith('async function'));

// 4. Check loadLeads() filter
const ll = s.indexOf('function loadLeads(');
let d2 = 0, lp = s.indexOf('{', ll) + 1;
while (d2 >= 0 && lp < s.length) {
  if (s[lp] === '{') d2++;
  else if (s[lp] === '}') { d2--; if (d2 === 0) break; }
  lp++;
}
const loadLeadsBody = s.slice(ll, lp + 1);
console.log('\nloadLeads filter:');
const statusMatch = loadLeadsBody.match(/\.in\([^)]*status[^\)]*\)/g);
if (statusMatch) console.log('  status filter:', statusMatch[0]);
console.log('  includes converted:', loadLeadsBody.includes('converted'));

// 5. Check if there's also a "线索" tab that loads differently
const loadPoolLeads = s.indexOf('function loadPoolLeads(');
if (loadPoolLeads > 0) {
  let d3 = 0, lpp = s.indexOf('{', loadPoolLeads) + 1;
  while (d3 >= 0 && lpp < s.length) {
    if (s[lpp] === '{') d3++;
    else if (s[lpp] === '}') { d3--; if (d3 === 0) break; }
    lpp++;
  }
  console.log('\nloadPoolLeads body:');
  console.log(s.slice(loadPoolLeads, lpp + 1).slice(0, 500));
}

// 6. Check the onclick on the "转项目" button
const tz = s.indexOf('转项目');
console.log('\n转项目 button context:');
if (tz > 0) {
  console.log(s.slice(Math.max(0, tz - 200), tz + 200).replace(/\n/g, '\\n'));
}
