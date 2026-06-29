const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Find the JS error location (Unexpected token '<')
// Check if there's raw HTML tag in JS
let ss = s.indexOf('<script>');
let se = s.indexOf('</script>', ss + 8);
// The main script is the last one
let lastScript = s.lastIndexOf('<script>');
let lastScriptEnd = s.lastIndexOf('</script>');
let js = s.slice(lastScript + 8, lastScriptEnd);

// Find '<' in JS that's not part of a string - check near doCheckIn
let dci = js.indexOf('async function doCheckIn(');
if (dci > 0) {
  // Find the end of doCheckIn
  let end = js.indexOf('\nasync function loadFWVisits', dci);
  if (end < 0) end = js.indexOf('\nfunction loadFWTrack', dci);
  let fn = js.slice(dci, end);
  
  // Look for unmatched < in the function
  let lines = fn.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<') && !lines[i].includes('\\<') && !lines[i].includes('"<') && !lines[i].includes("'<")) {
      // Check if it's inside a string
      let trimmed = lines[i].trim();
      if (!trimmed.startsWith('//') && !trimmed.startsWith('*')) {
        console.log('Line', i, 'contains <:', trimmed.substring(0, 100));
      }
    }
  }
  
  // Also check for rogue HTML tags
  let rogueTags = fn.match(/<[a-zA-Z][^>]*>/g);
  if (rogueTags) console.log('Rogue HTML tags:', rogueTags);
}

// Check for the specific issue - tags like <option> in JS strings
let optionInJs = js.match(/<option/g);
console.log('\n<option in JS:', optionInJs ? optionInJs.length : 0);
