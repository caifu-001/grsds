const s = require('fs').readFileSync('D:/1kaifa/grsds/index.html','utf8');

// Find Supabase client creation
const re = /const\s+\w+\s*=\s*supabase\s*\.\s*createClient|let\s+\w+\s*=\s*supabase\s*\.\s*createClient|var\s+\w+\s*=\s*supabase\s*\.\s*createClient|window\.\w+\s*=\s*supabase\s*\.\s*createClient/g;
let m;
while ((m = re.exec(s)) !== null) {
  console.log('createClient at', m.index, ':', s.slice(m.index, Math.min(m.index + 120, s.length)).replace(/\n/g, '\\n'));
}

// Check global sb or supabase references
console.log('\nGlobal supabase refs:');
['sb', '_sb', 'db', 'supa', 'client'].forEach(name => {
  const r = new RegExp('(var|let|const)\\s+' + name + '\\s*=', 'g');
  const match = r.exec(s);
  if (match) console.log('  ' + name + ' at ' + match.index, ':', s.slice(match.index, match.index + 100).replace(/\n/g, '\\n'));
});

// Check onLoginSuccess for client init
const ols = s.indexOf('function onLoginSuccess(');
if (ols > 0) {
  const ctx = s.slice(ols, ols + 4000);
  const sc = ctx.match(/(\w+)\s*=\s*supabase\.createClient/);
  if (sc) console.log('\nonLoginSuccess supabase:', sc[0]);
}

// Check existing function calls pattern
console.log('\nTypical db call patterns:');
const re2 = /(\w+)\.from\(/g;
const calls = new Set();
while ((m = re2.exec(s)) !== null) calls.add(m[1]);
console.log('  .from() callers:', [...calls].slice(0, 10));
