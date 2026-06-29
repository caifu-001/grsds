const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
// Check SUPABASE_SERVICE_KEY definition
const i = s.indexOf('SUPABASE_SERVICE_KEY');
console.log('KEY occurrences:', (s.match(/SUPABASE_SERVICE_KEY/g) || []).length);
let m, samples = [];
const re = /SUPABASE_SERVICE_KEY[^\n]{0,80}/g;
while ((m = re.exec(s)) !== null) samples.push(m[0]);
console.log('Sample lines:');
samples.slice(0, 5).forEach(s => console.log('  ' + s));

// Check currentCompanyId usage
console.log('\ncurrentCompanyId samples:');
const re2 = /currentCompanyId[^\n]{0,60}/g;
let n = 0;
while ((m = re2.exec(s)) !== null && n < 3) { console.log('  ' + m[0]); n++; }

// Find the preload block
const pi = s.indexOf("if(!allDepartments||!allDepartments.length");
console.log('\nPreload block:');
console.log(s.slice(pi, pi+800));
