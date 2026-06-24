var fs=require('fs');
var html=fs.readFileSync('D:/1kaifa/grsds/index.html','utf8');

var re=/<script>([\s\S]*?)<\/script>/g;
var m;
while((m=re.exec(html))!==null){
  if(m[1].length > 100000){
    var script = m[1];
    // Check if there are HTML entities left in the script
    var entities = script.match(/&[a-zA-Z]+;/g);
    if(entities) {
      // Count types
      var counts = {};
      entities.forEach(function(e){counts[e]=(counts[e]||0)+1;});
      console.log('HTML entities in script:', JSON.stringify(counts, null, 2));
    }
    // Check for unescaped template literals with ${
    var templateMatches = script.match(/\$\{[^}]*\}/g);
    console.log('Template literal expressions found:', templateMatches ? templateMatches.length : 0);
    if(templateMatches && templateMatches.length > 0 && templateMatches.length < 20) {
      templateMatches.forEach(function(t, i){ console.log('  ', i, ':', t.substring(0, 80)); });
    }
    
    // Try parsing with acorn if available
    try {
      var acorn = require('acorn');
      acorn.parse(script, {ecmaVersion: 2020});
      console.log('PARSED OK');
    } catch(e) {
      console.log('Acorn not available, trying manual...');
    }
    break;
  }
}
