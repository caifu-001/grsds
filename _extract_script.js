var fs=require('fs');
var html=fs.readFileSync('D:/1kaifa/grsds/index.html','utf8');

// Extract just the JS content between <script>...</script> for the main block
var idx = html.indexOf('✅ 主脚本未加载或已崩溃');
idx = html.indexOf('<script>', idx);
var endIdx = html.indexOf('</script>', idx);
var script = html.substring(idx + 8, endIdx);

// Write to temp file
fs.writeFileSync('D:/1kaifa/grsds/_temp_check.js', script, 'utf8');
console.log('Wrote', script.length, 'bytes');
