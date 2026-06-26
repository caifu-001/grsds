var fs=require('fs');var h=fs.readFileSync('index.html','utf8');

// 1. Extract fieldwork block
var fwComment=h.indexOf('<!-- ══════════ 外勤管理 ══════════ -->');
var fwOpen=h.indexOf('<div id="fieldwork-view"',fwComment);
var d=0,fwClose=-1;
for(var i=fwOpen;i<h.length;i++){
  if(h.substring(i,i+4)==='<div')d++;
  else if(h.substring(i,i+6)==='</div>'){d--;if(d===0){fwClose=i+6;break}}
}
var fwBlock=h.substring(fwComment,fwClose);
console.log('Fieldwork block: '+fwBlock.length+' chars');

// 2. Delete fieldwork from current position
h=h.substring(0,fwComment)+h.substring(fwClose);

// 3. Find leads-view. Its closing is now correct since fieldwork is gone.
var lv=h.indexOf('id="leads-view"');
d=0;var lvEnd=-1;
for(var i=lv;i<h.length;i++){
  if(h.substring(i,i+4)==='<div')d++;
  else if(h.substring(i,i+6)==='</div>'){d--;if(d===0){lvEnd=i+6;break}}
}
console.log('leads-view close at '+lvEnd);

// 4. Find the line of leads-view close
var before=lvEnd>200?h.substring(lvEnd-80,lvEnd):h.substring(0,lvEnd);
console.log('Before close: '+before.replace(/\n/g,'\\n').substring(before.length-80));

// 5. Insert AFTER leads-view close  
var lineEnd=h.indexOf('\n',lvEnd);
h=h.substring(0,lineEnd+1)+fwBlock+'\n'+h.substring(lineEnd+1);

// 6. Verify ancestors with correct nesting check
var fw2=h.indexOf('id="fieldwork-view"');
d=0;var anc=[],isBad=false;
for(var i=fw2-1;i>=0;i--){
  if(h.substring(i,i+6)==='</div>')d++;
  else if(h.substring(i,i+4)==='<div'){
    if(d===0){
      var te=h.indexOf('>',i);
      var idm=h.substring(i,te+1).match(/id="([^"]*)"/);
      var name=idm?idm[1]:'-';
      if(name==='leads-view'){isBad=true;console.log('❌ Still inside leads-view!')}
      anc.push(name);
    }
    d--;
  }
  if(anc.length>=4)break;
}
if(!isBad)console.log('✅ Ancestors:',anc.reverse().join(' > '));

// Div check
console.log('Divs:',(h.match(/<div/g)||[]).length,'/',(h.match(/<\/div>/g)||[]).length);

fs.writeFileSync('index.html',h,'utf8');
console.log('Done. Size:',h.length);
