var c=require('fs').readFileSync('D:/1kaifa/grsds/index.html','utf8');
var cr=c.indexOf('id="company-reg-screen"');
var before=c.substring(Math.max(0,cr-500),cr);
var lines=before.split('\n');
console.log(lines.slice(-6).join('\n'));
console.log('=== COMPANY-REG-SCREEN ===');
console.log(c.substring(cr,cr+600));
console.log('=== PARENT SEARCH ===');
// Walk backward to find parent <div
var pos=cr;
var depth=0;
while(pos>0){
  pos--;
  if(c.substring(pos,pos+6)==='</div>')depth++;
  else if(c.substring(pos,pos+4)==='<div'){
    if(depth===0){
      console.log('Parent div at',pos,':',c.substring(pos,pos+100).replace(/\n/g,'\\n'));
      break;
    }
    depth--;
  }
}
