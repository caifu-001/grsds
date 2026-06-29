const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Rename my new functions to avoid collision
// My openVisitForm uses 'visit-form-modal' which doesn't exist; original uses 'fw-visit-modal' / 'visit-modal'
// Rename to openFWVisitForm
const r1 = 'function openVisitForm(id){';
const r1n = 'function openFWVisitForm(id){';
if (s.includes(r1)) {
  s = s.split(r1).join(r1n);
  console.log('Renamed openVisitForm → openFWVisitForm');
}

const r2 = 'function closeVisitForm(){';
const r2n = 'function closeFWVisitForm(){';
if (s.includes(r2)) {
  s = s.split(r2).join(r2n);
  console.log('Renamed closeVisitForm → closeFWVisitForm');
}

// Now fix the modal name in openFWVisitForm
// Original code: 'var modal=document.getElementById(\'visit-form-modal\');'
// Should use 'fw-visit-modal'
const oldModal = "var modal=document.getElementById('visit-form-modal');";
const newModal = "var modal=document.getElementById('fw-visit-modal');";
if (s.includes(oldModal)) {
  s = s.split(oldModal).join(newModal);
  console.log('Fixed modal id: visit-form-modal → fw-visit-modal');
}

const oldModal2 = "var modal=document.getElementById('visit-form-modal');\n  if(!modal){showToast('表单未找到');return}";
const newModal2 = "var modal=document.getElementById('fw-visit-modal');\n  if(!modal){showToast('表单未找到');return}";
if (s.includes(oldModal2)) {
  s = s.split(oldModal2).join(newModal2);
  console.log('Fixed modal id (alt)');
}

const oldModal3 = "var modal=document.getElementById('visit-form-modal');\n  if(modal)modal.classList.add('hidden');";
const newModal3 = "var modal=document.getElementById('fw-visit-modal');\n  if(modal)modal.classList.add('hidden');";
if (s.includes(oldModal3)) {
  s = s.split(oldModal3).join(newModal3);
  console.log('Fixed close modal id');
}

// Also fix the inline onclick in the HTML "新增拜访" button
// Original HTML: <button onclick="openVisitForm()">+ 新增拜访</button>
// But original is in fw-visits panel, change to openFWVisitForm
// Find the button in fw-visits
const oldBtn = '<button onclick="openVisitForm()" style="padding:6px 16px';
const newBtn = '<button onclick="openFWVisitForm()" style="padding:6px 16px';
if (s.includes(oldBtn)) {
  s = s.split(oldBtn).join(newBtn);
  console.log('Fixed inline button onclick');
}

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');

const ls = s.lastIndexOf('<script>'), le = s.lastIndexOf('</script>');
try { new (require('vm').Script)(s.slice(ls+8, le)); console.log('JS: OK'); }
catch(e) { 
  console.log('JS FAIL:', e.message.substring(0,200));
  const m = (e.stack||'').match(/inline:(\d+)/);
  if (m) {
    const ln = parseInt(m[1]);
    const lines = s.slice(ls+8, le).split('\n');
    for (let k = Math.max(0,ln-3); k < Math.min(lines.length, ln+2); k++)
      console.log('L'+(k+1)+': '+(lines[k]||'').substring(0,200));
  }
}
const o=(s.match(/<div[\s>]/g)||[]).length, c=(s.match(/<\/div>/g)||[]).length;
console.log('Div:',o,c,o-c);
