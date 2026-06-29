const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
let di = s.indexOf('async function doCheckIn(');
// Find what comes right after doCheckIn ends
let after = s.slice(di+30);
// Find the next top-level function marker
let m = after.match(/\n(async )?function (\w+)/);
if (m) { let endPos = di+30+m.index; console.log('Next fn:', m[2], 'at', endPos, 'len', endPos-di);
  console.log('Tail:', s.slice(endPos-200, endPos+50));
}
// Also find all functions near doCheckIn
let nearby = [];
let fnRegex = /\n(async )?function (\w+)/g;
let match;
while ((match = fnRegex.exec(s)) !== null) {
  let pos = match.index;
  if (Math.abs(pos-di) < 10000) nearby.push({name:match[2], pos});
}
nearby.sort((a,b)=>a.pos-b.pos);
nearby.forEach(n=>console.log(n.name, n.pos, 'dist from doCheckIn:', n.pos-di));
