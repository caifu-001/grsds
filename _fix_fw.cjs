var fs=require('fs');var h=fs.readFileSync('index.html','utf8');

// 1. Extract fieldwork block precisely
var fwComment=h.indexOf('<!-- ══════════ 外勤管理 ══════════ -->');
// Find fieldwork-view div open
var fwOpen=h.indexOf('<div id="fieldwork-view"',fwComment);
// Count depth from here
var depth=1,i=fwOpen+1;
while(depth>0 && i<h.length){
  if(h.slice(i,i+4)==='<div')depth++;
  if(h.slice(i,i+6)==='</div>'){depth--;if(depth===0)break}i++;
}
// i now points to the char after the closing </div>
var fwBlock=h.slice(fwComment,i);
console.log('fwBlock:',fwBlock.length,'chars');
console.log('Block divs:',(fwBlock.match(/<div/g)||[]).length,(fwBlock.match(/<\/div>/g)||[]).length);

// 2. Remove it
h=h.slice(0,fwComment)+h.slice(i);
console.log('After removal divs:',(h.match(/<div/g)||[]).length,(h.match(/<\/div>/g)||[]).length);

// 3. Find leads-view close
var lv=h.indexOf('id="leads-view"');
depth=1;i=lv+1;
while(depth>0&&i<h.length){
  if(h.slice(i,i+4)==='<div')depth++;
  if(h.slice(i,i+6)==='</div>'){depth--;if(depth===0)break}i++;
}
var lvEnd=i;
console.log('leads-view close at:',lvEnd);

// 4. Insert after leads-view close
var nl=h.indexOf('\n',lvEnd);
h=h.slice(0,nl+1)+fwBlock+'\n'+h.slice(nl+1);

// 5. Verify: check if fieldwork-view appears before leads-view close in the file
var fwPos=h.indexOf('id="fieldwork-view"');
var lvPos=h.indexOf('id="leads-view"');
var lvClosePos2=(function(){
  var d=1,i2=lvPos+1;
  while(d>0&&i2<h.length){
    if(h.slice(i2,i2+4)==='<div')d++;
    if(h.slice(i2,i2+6)==='</div>'){d--;if(d===0)return i2}i2++;
  }return -1;
})();
console.log('fwPos:',fwPos,'lvClosePos:',lvClosePos2);
console.log('fw AFTER leads-view close?',fwPos>lvClosePos2);
console.log('fw BEFORE leads-view close?',fwPos<lvClosePos2);

// 6. Check ancestors properly
// Walk backward from fwPos counting opening divs that are direct ancestors
var ancestors=[],depth2=0;
for(var j=fwPos-1;j>=0;j--){
  if(h.slice(j,j+6)==='</div>')depth2++;
  else if(h.slice(j,j+4)==='<div'){
    if(depth2===0){
      var te=h.indexOf('>',j);
      var m=h.slice(j,te+1).match(/id="([^"]+)"/);
      ancestors.push(m?m[1]:'-');
    }else depth2--;
  }
  if(ancestors.length>=8)break;
}
console.log('Ancestors (fixed):',ancestors.join(' > '));
console.log('Divs:',(h.match(/<div/g)||[]).length,(h.match(/<\/div>/g)||[]).length);

if(fwPos>lvClosePos2 && (h.match(/<div/g)||[]).length===(h.match(/<\/div>/g)||[]).length){
  fs.writeFileSync('index.html',h,'utf8');
  console.log('✅ Written:',h.length);
}else{
  console.log('❌ ABORTED');
}
