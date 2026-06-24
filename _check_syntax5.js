var fs=require('fs');
var html=fs.readFileSync('D:/1kaifa/grsds/index.html','utf8');

var re=/<script>([\s\S]*?)<\/script>/g;
var m;
while((m=re.exec(html))!==null){
  if(m[1].length > 100000){
    var script = m[1];
    console.log('Main block at char', m.index, 'length', script.length);
    try {
      new Function(script);
      console.log('SYNTAX OK');
    } catch(e) {
      console.log('ERROR:', e.message);
      var errLine = (e.lineNumber || 1);
      var lines = script.split('\n');
      var lo = Math.max(0, errLine-3);
      var hi = Math.min(lines.length, errLine+3);
      for(var i=lo; i<hi; i++){
        console.log('  L'+(i+1)+':', lines[i].substring(0,120));
      }
    }
    break;
  }
}
