const fs = require('fs');

// Scan ALL commits for renderProjects  
const execSync = require('child_process').execSync;
const log = execSync('git log --oneline -100', { cwd: 'D:/1kaifa/grsds' }).toString();

// Try each commit
const commits = log.trim().split('\n').map(l => l.split(' ')[0]);

for (const sha of commits.slice(0, 30)) {
  try {
    const content = execSync(`git show ${sha}:index.html`, { cwd: 'D:/1kaifa/grsds', maxBuffer: 10 * 1024 * 1024 }).toString();
    const base = content.indexOf('<script>', 100000);
    if (base < 0) { console.log(sha, 'NO SCRIPT'); continue; }
    const js = content.slice(base + 8);
    
    // Find renderProjects
    let idx = js.indexOf('function renderProjects(');
    if (idx < 0) idx = js.indexOf('async function renderProjects(');
    if (idx < 0) {
      console.log(sha, 'MISSING');
      continue;
    }
    
    // Count body size
    let d = 0, p = js.indexOf('{', idx) + 1;
    let started = false;
    while (p < js.length) {
      if (js[p] === '{') { d++; started = true; }
      else if (js[p] === '}') { d--; if (d === 0 && started) break; }
      p++;
    }
    const size = p - idx + 1;
    const hasOnclick = js.slice(idx, p + 1).includes('onclick=');
    console.log(`${sha} size=${size} onclick=${hasOnclick}`);
  } catch (e) {
    console.log(sha, 'ERROR:', e.message.slice(0, 80));
  }
}
