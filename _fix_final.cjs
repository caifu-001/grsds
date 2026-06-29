const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Fix 1: hardcoded wfSetAssignee(2 → wfSetAssignee('+idx+'
let fix1 = s.replace("wfSetAssignee(2,\\'value\\',this.value)", "wfSetAssignee('+idx+',\\\\'value\\\\',this.value)");
console.log('Fix 1 (hardcoded 2):', fix1 !== s ? 'applied' : 'already fixed');

// Fix 2: staffId unescaped quotes in onchange
// Current: onchange="wfSetAssignee('+idx+','staffId',this.value)"
// Problem: 'staffId' has unescaped single quotes inside a JS string '...'
// Fix: onchange=\"wfSetAssignee('+idx+',\'staffId\',this.value)\"
// But wait - in the raw file, this is inside: h+='...onchange="wfSetAssignee('+idx+','staffId',this.value)"...';
// The raw bytes are: ,'staffId',this.value 
// This is already inside a string concatenation expression, so the raw text IS:
//   onchange="wfSetAssignee('+idx+','staffId',this.value)"
// The problem is when the JS PARSER reads the file, it sees:
//   h+='...onchange="wfSetAssignee('+idx+','staffId',this.value)"...'
// The first ' before +idx+ closes the outer string!
// Actually no — the ' before +idx+ is part of the onchange attribute value, not the JS string.
// Wait, let me re-read:
// h+='<select id="wf-staff-dd-'+idx+'" onchange="wfSetAssignee('+idx+','staffId',this.value)">
// The outer string delimiter is ' (single quote)
// '+idx+' breaks it with concatenation
// Then 'staffId' — the first ' after wfSetAssignee( closes the resumed string!
// So JS sees: h+='...onchange="wfSetAssignee(' + idx + ','staffId',this.value)"...'
//                                          ^ string ends here  ^ stray identifier
// So the fix is to ESCAPE the inner single quotes:
// h+='...onchange="wfSetAssignee('+idx+',\'staffId\',this.value)"...'
// In raw text: \'staffId\'

let badStaff = ",staffId',this.value)";
let goodStaff = ",\\\\'staffId\\\\',this.value)";
// Wait — in the raw file, the backslash before the quote in the JS string needs to be \\' to become \' in the string
// Actually no — the file content IS the JS source code. So in the file:
// h+='...' + idx + ',\'staffId\',this.value"...
// The raw content needs: ,\'staffId\',this.value
// But we need to write \ in the file, which in our Node script means \\ 
// So the replacement: bad=",staffId',this.value)" → good=",\'staffId\',this.value)"
// No wait — the file literal has ',staffId', — this is literal text in the .html file.
// The file contains: onchange="wfSetAssignee('+idx+','staffId',this.value)"
// To fix, we need: onchange="wfSetAssignee('+idx+',\'staffId\',this.value)"
// The \ before ' in the JS source needs to be a real backslash in the file.
// In Node: '\\' produces \, and '\'' produces '.
// So the replacement string should be: ",\\'staffId\\',this.value)"
// Actually simpler: just replace the raw pattern in the file.
let orig = "wfSetAssignee('+idx+','staffId',this.value)";
let fixed = "wfSetAssignee('+idx+',\\\\'staffId\\\\',this.value)";
// Hmm, in Node string: '\\\\' → \\ in the file, '\' → \\ which JS interpret as escaped quote
// Actually: in the file we need: \'staffId'
// A backslash in the file is written as \\ in Node string
// A single quote in the file is written as ' in Node string
// So: \\'staffId\\' in Node → \'staffId\' in file
// But that's still wrong. Let me think again...
// 
// The file content (raw bytes) should be:
//   wfSetAssignee('+idx+',\'staffId\',this.value)
// For Node string literal to produce that:
//   - ' → need plain ' (no escape needed for ' inside "")
//   - \ → need \\
// So: "wfSetAssignee('+idx+',\\'staffId\\',this.value)"
// Let's verify: \\' → \ and ' → ' (no, ' ends the "" string!)
// 
// OK the Node string uses " as delimiter so ' is fine:
// "wfSetAssignee('+idx+',\\'staffId\\',this.value)"
// This produces in file: wfSetAssignee('+idx+',\'staffId\',this.value)
// When JS parser reads this file, it sees:
// h+='...onchange="wfSetAssignee('+idx+',\'staffId\',this.value)"...'
// The \' inside the string means literal single quote, doesn't break the string.
// Perfect.
let fixPattern = "wfSetAssignee('+idx+','staffId',this.value)";
let fixReplacement = "wfSetAssignee('+idx+',\\'staffId\\',this.value)";
let cnt2 = 0;
while (fix1.includes(fixPattern)) {
  fix1 = fix1.replace(fixPattern, fixReplacement);
  cnt2++;
}
console.log('Fix 2 (staffId escape):', cnt2, 'occurrences');

// Also fix <option value='+escHtml... -> <option value="'+escHtml...
// Current: h+='<option value='+escHtml(allUsers[ui].user_id)+''+...
// This is fine, value='+' is a concat. But the closing of onchange also needs check.

fs.writeFileSync('D:/1kaifa/grsds/index.html', fix1, 'utf8');

// Verify
try {
  let vm = require('vm');
  let ls = fix1.lastIndexOf('<script>');
  let le = fix1.lastIndexOf('</script>');
  let js = fix1.slice(ls+8, le);
  new vm.Script(js);
  console.log('JS: OK');
} catch(e) {
  console.log('JS FAIL:', e.message.substring(0, 120));
}

let opens = (fix1.match(/<div[\s>]/g) || []).length;
let closes = (fix1.match(/<\/div>/g) || []).length;
console.log('Div:', opens, closes, 'diff:', opens - closes);
console.log('Written', fix1.length);
