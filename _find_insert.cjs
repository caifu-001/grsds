var fs=require('fs');var h=fs.readFileSync('index.html','utf8');
var start=h.indexOf('id="analytics-view"');
var depth=0;
for(var i=start;i<h.length;i++){
  if(h.substring(i,i+4)==='<div')depth++;
  else if(h.substring(i,i+6)==='</div>'){
    depth--;
    if(depth===0){console.log('analytics-view closes at offset',i+6);break}
  }
}
// Find last view closing - find </div></div> after analytics-view
// that closes main-screen
var after=h.substring(i+6,i+6+200);
console.log('After analytics-view:',JSON.stringify(after.substring(0,120)));

// Show the block where we need to insert fieldwork-view
// Before </div>...</div> ... <!-- end main-screen -->
var ms=h.indexOf('<!-- end main-screen');
console.log('end main-screen at',ms);
// var ctx=h.substring(ms-120,ms);
// console.log('Before end main-screen:',JSON.stringify(ctx));
