const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Simulate what wfShowProps produces
const idx = 0;
const allDepartments = [{id: 'd1', name: '市场部'}, {id: 'd2', name: '财务部'}];
const allUsers = [];
const allRoles = [];
const escHtml = x => String(x).replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));

let h = '';
h += '<label style="display:flex;align-items:center;gap:6px;font-size:12px"><input type="checkbox" onchange="wfSetAssignee('+idx+',\'enabled\',this.checked)"> 指定负责人</label>';
h += '授权部门</label><select onchange="wfSetAssignee('+idx+',\'value\',this.value)"><option value="">无</option>';
for (let di = 0; di < allDepartments.length; di++) {
  h += '<option value="'+escHtml(allDepartments[di].id)+'">'+escHtml(allDepartments[di].name)+'</option>';
}
h += '</select>';
h += '<label>指定员工</label><select id="wf-staff-dd-'+idx+'" onchange="wfSetAssignee('+idx+',\'staffId\',this.value)"><option value="">无</option>';
h += '</select>';

console.log('=== Generated HTML ===');
console.log(h);
console.log('\n=== Parsed DOM check ===');
// Check what the HTML parser sees
const { JSDOM } = require('jsdom');
try {
  const dom = new JSDOM('<html><body>' + h + '</body></html>');
  const doc = dom.window.document;
  const selects = doc.querySelectorAll('select');
  console.log('Selects found:', selects.length);
  selects.forEach((s, i) => {
    console.log(`Select #${i}: id="${s.id}"`);
    console.log(`  options: ${s.children.length}`);
    Array.from(s.children).forEach(o => console.log(`    - <option value="${o.value}">${o.textContent}</option>`));
  });
  const inputs = doc.querySelectorAll('input');
  console.log('Inputs found:', inputs.length);
} catch(e) {
  console.log('JSDOM not available, doing manual check...');
  // Manual: find all <input> positions
  let m, re = /<input[^>]*>/g;
  while ((m = re.exec(h)) !== null) {
    console.log('Input at', m.index, ':', m[0]);
  }
}
