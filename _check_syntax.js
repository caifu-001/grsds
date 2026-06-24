var fs=require('fs');
var html=fs.readFileSync('D:/1kaifa/grsds/index.html','utf8');
var re=/<script[^>]*>([\s\S]*?)<\/script>/gi;
var scripts=''; var m;
while((m=re.exec(html))!==null){ scripts+=m[1]+'\n'; }
try{ new Function(scripts); console.log('SYNTAX OK'); }
catch(e){ console.log('SYNTAX ERROR:',e.message); }
