var fsMod=require('fs');
var h=fsMod.readFileSync('D:/1kaifa/grsds/index.html','utf8');

var cvOpen=h.lastIndexOf('<div',h.indexOf('id="collab-view"'));
var depth=0,cvClose=0;
for(var p=cvOpen;p<h.length;p++){
  if(h.startsWith('<div',p)){depth++;p+=3}
  else if(h.startsWith('</div>',p)){depth--;p+=5;if(depth===0){cvClose=p;break}}
}
console.log('collab-view:',cvOpen,'-',cvClose,'depth 0 at',cvClose);
console.log('');

var allIn=true;
['collab-schedule-panel','collab-task-panel','collab-approval-panel','collab-followup-panel','collab-comment-panel','collab-msg-panel','mo-overview','mo-docs'].forEach(id=>{
  var pos=h.indexOf('id="'+id+'"');
  var inside=pos>cvOpen&&pos<cvClose;
  if(!inside)allIn=false;
  console.log(id,inside?'✓':'✗',pos);
});

console.log('\nAll panels inside collab-view:',allIn);

// Verify syntax
try{new Function(h.split('</script>')[0].split('<script>')[1]);console.log('Syntax: OK')}catch(e){console.log('Syntax:',e.message)}
