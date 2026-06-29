const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
const ids = ['fw-vm-client','fw-vm-purpose','fw-vm-notes','fw-vm-result','fw-vm-date','visit-form-modal','fw-visit-list','fw-visit-filter'];
for (const id of ids) {
  const i = s.indexOf('id="' + id + '"');
  console.log(id + ':', i > 0 ? 'YES @' + i : 'MISSING');
}
