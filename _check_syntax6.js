var fs=require('fs');
var html=fs.readFileSync('D:/1kaifa/grsds/index.html','utf8');

var re=/<script>([\s\S]*?)<\/script>/g;
var m;
while((m=re.exec(html))!==null){
  if(m[1].length > 100000){
    var script = m[1];
    var lines = script.split('\n');
    console.log('Total lines:', lines.length);
    
    // Check chunks of 50 lines
    for (var lo = 0; lo < lines.length; lo += 50) {
      var hi = Math.min(lines.length, lo + 50);
      var chunk = lines.slice(lo, hi).join('\n');
      try {
        new Function(chunk);
      } catch(e) {
        console.log('ERROR in lines', lo+1, '-', hi, ':', e.message);
        for (var j = lo; j < Math.min(hi, lo+10); j++) {
          console.log('  L'+(j+1)+':', lines[j].substring(0,120));
        }
        // If we found the error, stop
        break;
      }
    }
    break;
  }
}
