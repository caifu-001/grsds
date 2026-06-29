const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// L11697 raw output shows: \'staffId\' — the backslashes ARE in the file
// But the issue is that in the JS context, \' is fine inside a string delimited by '
// Let me check what the actual error is by looking at the JS script block
let ls = s.lastIndexOf('<script>');
let le = s.lastIndexOf('</script>');
let js = s.slice(ls+8, le);

// Find the exact line that errors
let lines = js.split('\n');
for (let i = 0; i < lines.length; i++) {
  let l = lines[i];
  // Look for suspicious patterns
  if (l.includes('onchange="wfSetAssignee') && l.includes('staffId')) {
    console.log('Found target line (#' + (i+1) + '):');
    console.log(l.substring(0, 200));
    
    // Analyze the quoting structure
    // The line is: h+='<select ... onchange="wfSetAssignee('+idx+',\'staffId\',this.value)">...';
    // In the raw file this is one line. Let's see how JS parses it.
    // 
    // The outer delimiter is '
    // Break it down:
    // h+='<select id="wf-staff-dd-'
    //    ^ string start              ^ string continues (unclosed yet)
    // +idx+
    // '" onchange="wfSetAssignee('
    //    ^ string continues          ^ wait - the ' before +idx+ in original was breaking the string
    // Let me look at the actual characters...
    
    // Print the raw bytes between the two outer ' delimiters
    let idx = l.indexOf("h+='");
    if (idx >= 0) {
      let after = l.substring(idx + 4);
      console.log('After h+=:', after.substring(0, 200));
    }
  }
}

// Let me also do a proper quote analysis
let line = lines.find(l => l.includes('staffId'));
if (line) {
  console.log('\n=== Quote analysis ===');
  let state = 'code';
  let depth = 0;
  let current = '';
  for (let i = 0; i < line.length; i++) {
    let ch = line[i];
    if (state === 'code') {
      if (ch === "'") { state = 'string_sq'; current = "'"; }
      else if (ch === '"') { state = 'string_dq'; current = '"'; }
      else { /* code */ }
    } else if (state === 'string_sq') {
      if (ch === '\\') { i++; } // skip escaped char
      else if (ch === "'") { state = 'code'; }
    } else if (state === 'string_dq') {
      if (ch === '\\') { i++; } // skip escaped char
      else if (ch === '"') { state = 'code'; }
    }
  }
  console.log('Final state:', state, '(should be code)');
}
