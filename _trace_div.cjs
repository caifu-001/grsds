var fsMod=require('fs');
var h=fsMod.readFileSync('D:/1kaifa/grsds/index.html','utf8');

// Trace div nesting from collab-view to mo-docs area
var cv=h.indexOf('id="collab-view"');
var depth=0,lastZero=0;
for(var p=cv;p<h.length;p++){
  if(h.startsWith('<div',p))depth++;
  else if(h.startsWith('</div>',p)){depth--;if(depth===0){console.log('ZERO at',p,'text:',JSON.stringify(h.slice(Math.max(0,p-30),p+10)));}}
  if(p>180500)break;
}

// Show the chunk between msg-panel end and mo-overview start
var msgEnd=h.indexOf('id="collab-msg-panel"');
var msgDiv=h.lastIndexOf('<div',msgEnd);
var d=0,q=msgDiv;
while(q<h.length){if(h.startsWith('<div',q))d++;else if(h.startsWith('</div>',q)){d--;if(d===0){q+=6;break}}q++}
console.log('\nMsg panel ends at:',q);
var moOv=h.indexOf('id="mo-overview"');
console.log('Mo-overview starts at:',moOv);
console.log('\nBetween msg-end and mo-overview:');
console.log(JSON.stringify(h.slice(q,moOv).replace(/\r\n/g,'\\n').replace(/\n/g,'\\n')));
