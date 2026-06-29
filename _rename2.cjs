const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Rename my second openFWVisitForm (the one I just added) to openFVisit
// And closeFWVisitForm to closeFVisit
// The new one is the second occurrence
// Find them by their unique body content

// My new openFWVisitForm has: "fwVisitEditId=id||null;fwVisitClientId=null"
// Original (existing) has: "svEditId=id||null;"
const oldMyOpen = "function openFWVisitForm(id){\n  fwVisitEditId=id||null;\n  fwVisitClientId=null;";
const newMyOpen = "function openFVisit(id){\n  fwVisitEditId=id||null;\n  fwVisitClientId=null;";
if (s.includes(oldMyOpen)) {
  s = s.split(oldMyOpen).join(newMyOpen);
  console.log('Renamed my new openFWVisitForm → openFVisit');
} else {
  console.log('My new openFWVisitForm NOT found');
}

// Similarly for closeFWVisitForm - the new one has "fwVisitEditId=null;fwVisitClientId=null;"
// Original has "svEditId=null"
const oldMyClose = "function closeFWVisitForm(){\n  fwVisitEditId=null;fwVisitClientId=null;";
const newMyClose = "function closeFVisit(){\n  fwVisitEditId=null;fwVisitClientId=null;";
if (s.includes(oldMyClose)) {
  s = s.split(oldMyClose).join(newMyClose);
  console.log('Renamed my new closeFWVisitForm → closeFVisit');
}

// Now fix the references INSIDE my new functions
s = s.split("openFWVisitForm('+v.id+')").join("openFVisit('+v.id+')");
s = s.split("closeFWVisitForm()").join("closeFVisit()");
console.log('Updated internal references');

// And the HTML button
const oldBtn = 'onclick="openFWVisitForm()" style="padding:6px 16px';
const newBtn = 'onclick="openFVisit()" style="padding:6px 16px';
if (s.includes(oldBtn)) {
  s = s.split(oldBtn).join(newBtn);
  console.log('Fixed inline button');
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
