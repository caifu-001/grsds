const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Check Promise.race code
let i = s.indexOf('Promise.race');
if (i > 0) {
  console.log('Promise.race context:');
  console.log(s.slice(i, i + 400));
}

// Check doCheckIn full function
i = s.indexOf('async function doCheckIn(');
let end = s.indexOf('\nasync function loadFWVisits');
if (end < 0) end = s.indexOf('\nfunction loadFWVisits');
if (end < 0) end = s.indexOf('\nfunction loadFWTrack');
console.log('\n--- doCheckIn (key parts) ---');
let fn = s.slice(i, end);
// Show the Promise.race part
let raceStart = fn.indexOf('Promise.race');
if (raceStart > 0) {
  let raceBlock = fn.slice(raceStart, raceStart + 250);
  console.log(raceBlock);
}
// Show the fallback part
let fbStart = fn.indexOf('// Fallback');
if (fbStart > 0) {
  console.log('\nFallback:', fn.slice(fbStart, fbStart + 400));
}
