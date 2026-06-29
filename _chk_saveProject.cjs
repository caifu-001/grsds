const s = require('fs').readFileSync('D:/1kaifa/grsds/index.html','utf8');

// Find saveProject - use brace counting to extract full function
const sp = s.indexOf('async function saveProject(');
let d = 0, p = s.indexOf('{', sp) + 1;
while (d >= 0 && p < s.length) {
  if (s[p] === '{') d++;
  else if (s[p] === '}') { d--; if (d === 0) break; }
  p++;
}
const body = s.slice(sp, p + 1);
console.log('saveProject body (' + body.length + ' chars)');

// Search for lead_pool / converted / leadId references
const lines = body.split('\n');
lines.forEach((l, i) => {
  if (l.includes('lead') || l.includes('pool') || l.includes('convert') || l.includes('oppLeadId') || l.includes('lead_id')) {
    console.log(`  L${i + 1}:`, l.trim());
  }
});

// Also find where oppLeadId is used
const oi = body.indexOf('oppLeadId');
console.log('\noppLeadId refs:', oi > 0 ? 'FOUND' : 'NOT FOUND');
if (oi > 0) {
  console.log('  Context:', body.slice(Math.max(0, oi - 40), oi + 80).replace(/\n/g, '\\n'));
}

// Check the end of the function for any lead update
const last200 = body.slice(-400);
console.log('\nLast 400 chars of saveProject:');
console.log(last200.replace(/\n/g, '\\n'));
