var fs=require('fs');var h=fs.readFileSync('index.html','utf8');

// Get fieldwork-view current position
var fw=h.indexOf('id="fieldwork-view"');
// Get leads-view
var lv=h.indexOf('id="leads-view"');

// Walk ancestors of fieldwork-view
var depth=0,anc=[];
for(var i=fw-1;i>=0;i--){
  if(h.substring(i,i+6)==='</div>')depth++;
  else if(h.substring(i,i+4)==='<div'){
    if(depth===0){
      var te=h.indexOf('>',i);
      var tag=h.substring(i,te+1);
      var idm=tag.match(/id="([^"]*)"/);
      anc.push(idm?('#'+idm[1]):tag.substring(0,60));
    }
    depth--;
  }
  if(anc.length>=5)break;
}
console.log('Ancestors (bottom-up):');
anc.forEach(function(a,i){console.log('  '+(i+1)+': '+a)});

// Check if fieldwork is inside leads-view
depth=0;var lvEnd=-1;
for(var i=lv;i<h.length;i++){
  if(h.substring(i,i+4)==='<div')depth++;
  else if(h.substring(i,i+6)==='</div>'){depth--;if(depth===0){lvEnd=i+6;break}}
}
console.log('\nleads-view: open='+lv+' close='+lvEnd);
console.log('fieldwork-view at '+fw);
console.log('Is fieldwork INSIDE leads-view?',fw>lv&&fw<lvEnd);

// Check the actual byte context around leads-view close
console.log('\n--- 200 chars starting at leads-view close ---');
console.log(h.substring(lvEnd,lvEnd+200));
