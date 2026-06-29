const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
const base = s.indexOf('<script>', 100000) + 8;
const js = s.slice(base);

function extractBody(name, async = false) {
  const prefix = async ? 'async function ' : 'function ';
  let i = js.indexOf(prefix + name + '(');
  if (i < 0) { console.log('NOT FOUND:', name); return ''; }
  let d = 0, p = js.indexOf('{', i + prefix.length) + 1;
  while (d >= 0 && p < js.length) {
    if (js[p] === '{') d++;
    else if (js[p] === '}') { d--; if (d === 0) break; }
    p++;
  }
  return js.slice(i, p + 1);
}

const body = extractBody('renderProjects');
if (body) {
  // Find all onclick handlers with renderProjectDetail
  const matches = [...body.matchAll(/onclick="([^"]*)"/g)];
  console.log('All onclick handlers:');
  matches.forEach((m, i) => console.log(`  ${i}: ${m[1]}`));
  
  // Find closest one to renderProjectDetail
  const rpd = body.match(/renderProjectDetail/g);
  console.log('\nrenderProjectDetail refs:', rpd ? rpd.length : 0);
  
  // Check what the actual click handler text is
  const idx = body.indexOf('renderProjectDetail');
  if (idx >= 0) {
    console.log('\nContext around renderProjectDetail:');
    console.log(body.slice(Math.max(0, idx - 80), idx + 80));
  } else {
    console.log('\nrenderProjectDetail NOT referenced in renderProjects!');
    
    // Try to find any function call that opens project detail
    const viewMatch = body.match(/onclick="([^"]*project[^"]*|render[^"]*Detail[^"]*)"/i);
    console.log('Project-related onclick:', viewMatch ? viewMatch[0] : 'NONE');
  }
}

// Also check openProjectView
if (js.includes('function openProjectView(')) {
  console.log('\n=== openProjectView found ===');
  console.log(extractBody('openProjectView', true).slice(0, 300));
}

// Check for any onclick with pid reference  
const pidClicks = [...body.matchAll(/onclick="[^"]*pid[^"]*"/gi)];
console.log('\nonclick with pid:', pidClicks.length);
pidClicks.forEach(m => console.log('  ', m[0]));
