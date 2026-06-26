var fs=require('fs');var h=fs.readFileSync('index.html','utf8');

// Verify fieldwork is gone from leads-view
var lv=h.indexOf('id="leads-view"');
var fw=h.indexOf('id="fieldwork-view"');
var depth=1,i=lv;
while(depth>0 && i<h.length){
  if(h.slice(i,i+4)==='<div')depth++;
  if(h.slice(i,i+6)==='</div>')depth--;i++;
}
var lvEnd=i;
console.log('leads-view ends at:',lvEnd);
console.log('fieldwork-view at:',fw);
console.log('fw inside leads?',fw>lv&&fw<lvEnd);

// Count divs
console.log('Divs:',(h.match(/<div/g)||[]).length,(h.match(/<\/div>/g)||[]).length);
