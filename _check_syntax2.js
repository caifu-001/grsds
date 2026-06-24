var fs=require('fs');
var html=fs.readFileSync('D:/1kaifa/grsds/index.html','utf8');

// Find all script blocks
var re=/<script[^>]*>([\s\S]*?)<\/script>/gi;
var blocks=[], m;
while((m=re.exec(html))!==null){
  blocks.push({start: m.index, end: m.index+m[0].length, text: m[1]});
}

console.log('Total script blocks:', blocks.length);

// Try parsing each block
for(var i=0; i<blocks.length; i++){
  try{
    new Function(blocks[i].text);
    // OK
  }catch(e){
    var before = html.substring(Math.max(0,blocks[i].start-30), blocks[i].start);
    var after = html.substring(blocks[i].end, Math.min(html.length, blocks[i].end+30));
    console.log('BLOCK',i+1,'ERROR:', e.message);
    console.log('  Context before:', JSON.stringify(before.slice(-40)));
    console.log('  Context after:', JSON.stringify(after.slice(0,40)));
    // Try to narrow down
    var lines = blocks[i].text.split('\n');
    for(var j=Math.max(0,lines.length-10); j<lines.length; j++){
      console.log('  Line '+(j+1)+':', lines[j].substring(0,120));
    }
    break;
  }
}
