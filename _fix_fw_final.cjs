var fs=require('fs');var h=fs.readFileSync('index.html','utf8');var lines=h.split('\n');

// Find leads-view and fieldwork-view
var lvLine=-1,fwLine=-1;
for(var i=0;i<lines.length;i++){
  if(lines[i].indexOf('id="leads-view"')>-1)lvLine=i;
  if(lines[i].indexOf('id="fieldwork-view"')>-1)fwLine=i;
}
console.log('leads-view: line',lvLine+1,fwLine+1);

// Find leads-view REAL closing (track <div> depth from leads-view open)
// First, remove fieldwork block temporarily to find the real close
var fwComment=h.indexOf('<!-- ══════════ 外勤管理 ══════════ -->');
var fwOpen=h.indexOf('<div id="fieldwork-view"',fwComment);
var depth=0,fwClose=-1;
for(var i=fwOpen;i<h.length;i++){
  if(h.substring(i,i+4)==='<div')depth++;
  else if(h.substring(i,i+6)==='</div>'){depth--;if(depth===0){fwClose=i+6;break}}
}
var fwBlock=h.substring(fwComment,fwClose);

// Create temp file without fieldwork
var temp=h.substring(0,fwComment)+h.substring(fwClose);

// Find leads-view close in temp
var lv2=temp.indexOf('id="leads-view"');
depth=0;var lvEnd=-1;
for(var i=lv2;i<temp.length;i++){
  if(temp.substring(i,i+4)==='<div')depth++;
  else if(temp.substring(i,i+6)==='</div>'){depth--;if(depth===0){lvEnd=i+6;break}}
}
console.log('leads-view real close (without fieldwork):',lvEnd);

// Show lines around close
var seg=temp.substring(0,lvEnd);
var lineNum=(seg.match(/\n/g)||[]).length;
console.log('leads-view close line:',lineNum+1);

// Now insert fieldwork at the right place in the ORIGINAL
// Actually, let's just rebuild from temp + fieldwork at right spot
temp=temp.substring(0,lvEnd)+'\n  '+fwBlock+temp.substring(lvEnd);

// Verify final state
var fw3=temp.indexOf('id="fieldwork-view"');
depth=0;var anc=[],isBad=false;
for(var i=fw3-1;i>=0;i--){
  if(temp.substring(i,i+6)==='</div>')depth++;
  else if(temp.substring(i,i+4)==='<div'){
    if(depth===0){
      var te=temp.indexOf('>',i);
      var idm=temp.substring(i,te+1).match(/id="([^"]*)"/);
      var name=idm?idm[1]:temp.substring(i,Math.min(i+60,te+1));
      if(name==='leads-view'){isBad=true}
      anc.push(name);
    }
    depth--;
  }
  if(anc.length>=4)break;
}
console.log('Ancestors:',anc.reverse().join(' > '));
console.log(isBad?'❌ INSIDE leads-view':'✅ NOT inside leads-view');
console.log('Divs:',(temp.match(/<div/g)||[]).length,'/',(temp.match(/<\/div>/g)||[]).length);

if(!isBad&&(temp.match(/<div/g)||[]).length===(temp.match(/<\/div>/g)||[]).length){
  fs.writeFileSync('index.html',temp,'utf8');
  console.log('✅ Written. Size:',temp.length);
} else {
  console.log('❌ NOT written - ancestors or div mismatch');
}
