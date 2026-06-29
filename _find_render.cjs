const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
const base = s.indexOf('<script>', 100000) + 8;
const js = s.slice(base);

// Find ALL lines that write to pm-project-list
const lines = js.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('pm-project-list')) {
    console.log(`L${idx + 1}: ${line.trim().slice(0, 120)}`);
  }
});

// Also find project card onclick patterns
console.log('\n=== onclick with project ===');
lines.forEach((line, idx) => {
  if (line.includes('renderProjectDetail') || line.includes('openProjectWorkbench') || line.includes('onclick') && line.includes('project')) {
    console.log(`L${idx + 1}: ${line.trim().slice(0, 150)}`);
  }
});
