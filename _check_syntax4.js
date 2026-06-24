var fs=require('fs');
var html=fs.readFileSync('D:/1kaifa/grsds/index.html','utf8');

// Main script block: find the last big <script> (not CDN)
var matches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
var mainScript = '', mainIdx = 0;
for (var m of matches) {
  if (m[1].length > 100000) { mainScript = m[1]; mainIdx = m.index; break; }
}

console.log('Main script length:', mainScript.length);
var lines = mainScript.split('\n');
console.log('Total lines:', lines.length);

// Check last 300 lines
for (var i = Math.max(0, lines.length-80); i < lines.length; i++) {
  console.log('L'+(i+1)+':', lines[i]);
}
