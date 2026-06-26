var fs=require('fs');
var js=fs.readFileSync('_last_script.js','utf8');

// Each new Chart(ctx,{ should end with });
// Find all opening brace positions after "new Chart(ctx,"
var re=/new Chart\(ctx,\{/g;
var fixes=[];
var m;
while((m=re.exec(js))!==null){
  var pos=m.index;
  var depth=0;
  var end=-1;
  for(var i=pos;i<js.length;i++){
    if(js[i]==='{')depth++;
    else if(js[i]==='}')depth--;
    if(depth===0){end=i;break}
  }
  if(end<0)continue;
  var after=js.substring(end+1,end+30);
  // After the last }, we should have )};
  // Check: do we already have }); ?
  if(after.substring(0,3)!=='});'){
    // Check if we have }) but missing ;
    var nextTokens=after.replace(/\s/g,'').substring(0,3);
    if(nextTokens==='})')console.log('Line '+ (js.substring(0,end).split('\n').length) +': ends with }), missing ;');
    else if(nextTokens.substring(0,1)===')')console.log('Line '+ (js.substring(0,end).split('\n').length) +': ends with ), missing };');
    else console.log('Line '+ (js.substring(0,end).split('\n').length) +': ends completely broken, next tokens: '+JSON.stringify(nextTokens));
    fixes.push({pos:end,line:js.substring(0,end).split('\n').length,after:after});
  }
}
console.log('Total fixes needed:',fixes.length);
// Show first 3 and last 3
fixes.slice(0,3).concat(fixes.slice(-3)).forEach(function(f){
  console.log('Fix at offset '+f.pos+' line '+f.line+': ...'+js.substring(Math.max(0,f.pos-40),f.pos+5).replace(/\n/g,'\\n')+');
});
