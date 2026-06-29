const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html','utf8');

// Find all from('notifications') contexts
let pos = 0;
while (true) {
  const idx = s.indexOf(".from('notifications')", pos);
  if (idx < 0) break;
  const ctx = s.slice(idx, idx + 200).replace(/\n/g, '\\n');
  console.log('at', idx, ':', ctx.slice(0, 200));
  pos = idx + 1;
}

// Also check activity_logs and announcements
pos = 0;
while (true) {
  const idx = s.indexOf(".from('activity_logs')", pos);
  if (idx < 0) break;
  const ctx = s.slice(idx, idx + 200).replace(/\n/g, '\\n');
  console.log('activity_logs at', idx, ':', ctx.slice(0, 200));
  pos = idx + 1;
}

pos = 0;
while (true) {
  const idx = s.indexOf(".from('announcements')", pos);
  if (idx < 0) break;
  const ctx = s.slice(idx, idx + 200).replace(/\n/g, '\\n');
  console.log('announcements at', idx, ':', ctx.slice(0, 200));
  pos = idx + 1;
}
