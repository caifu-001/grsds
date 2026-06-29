const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// staffId fix didn't apply - try wider pattern
let cnt = 0;
// The JS string inside the HTML has escaped quotes. The raw bytes in the file are:
// onchange=wfSetAssignee('+idx+',staffId,this.value)
// Actually it's in a JS string concatenation, so in the HTML file it's literal text
// Let's search for the exact raw bytes
s = s.replace(/,staffId,/g, function() { cnt++; return ",'staffId',"; });
console.log('staffId global replace:', cnt);

// Also need to fix the id= and onchange= without quotes in raw HTML output
// The generated HTML attributes need quotes. Check:
let i = s.indexOf('id=wf-staff-dd-');
if (i > 0) console.log('wf-staff-dd raw:', s.slice(i, i+60));
i = s.indexOf('onchange=wfSetAssignee');
if (i > 0) console.log('onchange raw:', s.slice(i, i+80));

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');

// Re-verify JS
try {
  let vm = require('vm');
  let ss = s.indexOf('<script>');
  let se = s.lastIndexOf('</script>');
  let js = s.slice(ss+8, se);
  new vm.Script(js);
  console.log('JS: OK');
} catch(e) {
  console.log('JS FAIL:', e.message.substring(0, 100));
}
