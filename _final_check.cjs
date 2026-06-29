const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
const checks = [
  ['fw-visit-modal', s.indexOf('id="fw-visit-modal"')],
  ['openFWVisitForm def', s.indexOf('function openFWVisitForm')],
  ['closeFWVisitForm def', s.indexOf('function closeFWVisitForm')],
  ['loadFWVisits def', s.indexOf('async function loadFWVisits')],
  ['deleteVisit def', s.indexOf('async function deleteVisit')],
  ['openVisitForm def (should be 0)', s.indexOf('function openVisitForm')],
  ['closeVisitForm def (should be 0)', s.indexOf('function closeVisitForm')],
];
for (const [k, v] of checks) console.log(k + ':', v > 0 ? 'YES @' + v : 'NO');
