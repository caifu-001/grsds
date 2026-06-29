const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Get the whole saveProject function (the main one at 842694)
const start = s.indexOf('async function saveProject(){');
const next = s.indexOf('\nasync function', start + 100);
const func = s.slice(start, next);

const lines = func.split('\n');
lines.forEach((l, i) => {
  if (l.length > 5 && l.includes('closeOppForm') || l.includes('oppLeadId') || l.includes('showToast') || l.includes('loadLeads') || l.includes('loadProjects')) {
    console.log(i, l.trim().slice(0, 120));
  }
});
