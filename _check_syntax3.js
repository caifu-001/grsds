var fs=require('fs');
var html=fs.readFileSync('D:/1kaifa/grsds/index.html','utf8');

// Main script block starts at ~2532, ends at 11692
var startMarker = '✅ 主脚本未加载或已崩溃';
var idx = html.indexOf(startMarker);
// Find the <script> before this div
var scriptStart = html.indexOf('<script>', idx);
var scriptEnd = html.indexOf('</script>', scriptStart);
var mainScript = html.substring(scriptStart, scriptEnd);

console.log('Script length:', mainScript.length);

// Try to find the exact error position by bisecting
function checkPrefix(prefix) {
    try { new Function(prefix); return true; }
    catch(e) { return false; }
}

// Binary search for the problem location
var lines = mainScript.split('\n');
// Check blocks of 100 lines
var blockSize = 200;
for (var i = 0; i < lines.length; i += blockSize) {
    var block = lines.slice(i, Math.min(i + blockSize, lines.length)).join('\n');
    try {
        new Function(block);
    } catch(e) {
        console.log('Error in lines', i+1, '-', Math.min(i+blockSize, lines.length), ':', e.message);
        // Print last 5 lines of this block
        var end = Math.min(i+blockSize, lines.length);
        for (var j = Math.max(i, end-5); j < end; j++) {
            console.log('  L'+(j+1)+':', lines[j].substring(0,150));
        }
        break;
    }
}
