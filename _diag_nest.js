var c=require('fs').readFileSync('D:/1kaifa/grsds/index.html','utf8');

// Find body
var bodyStart=c.indexOf('<body');
var bodyEnd=c.indexOf('</body>');
console.log('body at',bodyStart,'to',bodyEnd);

// Find login-screen position
var login=c.indexOf('id="login-screen"');
var cr=c.indexOf('id="company-reg-screen"');
var ms=c.indexOf('id="main-screen"');

console.log('login-screen at',login);
console.log('company-reg-screen at',cr);
console.log('main-screen at',ms);

// Check if there's a wrapper div between body and login-screen
var segment=c.substring(bodyStart,login);
var wrapperMatches=segment.match(/<div[^>]*id="([^"]*)"[^>]*>/g);
console.log('Wrappers between body and login-screen:',wrapperMatches);

// Check between login-screen close and company-reg-screen
// Find login-screen close  
var afterLogin=c.substring(login+50);
var nextScreen=afterLogin.indexOf('id="company-reg-screen"');
var between=c.substring(login+50,login+50+nextScreen);
var betweenDivs=between.match(/<div/g);
var betweenCloseDivs=between.match(/<\/div>/g);
console.log('\nBetween login-screen and company-reg-screen:');
console.log('  content:',between.substring(0,200).replace(/\n/g,'\\n'));
console.log('  <div> count:',betweenDivs?betweenDivs.length:0);
console.log('  </div> count:',betweenCloseDivs?betweenCloseDivs.length:0);

// Check nesting: walk from body to find if company-reg-screen's parent is hidden
// Find first <div after bodyStart
var pos=bodyStart;
var depth=0;
var parents=[];
while(pos<cr){
  var nextOpen=c.indexOf('<div',pos);
  var nextClose=c.indexOf('</div>',pos);
  if(nextOpen<0&&nextClose<0)break;
  if(nextClose<nextOpen||nextOpen<0){
    depth--;
    if(parents.length>0)parents.pop();
    pos=nextClose+6;
  }else if(nextOpen<cr){
    // Check if this div has an id or class
    var divTag=c.substring(nextOpen,c.indexOf('>',nextOpen)+1);
    var idMatch=divTag.match(/id="([^"]*)"/);
    var classMatch=divTag.match(/class="([^"]*)"/);
    if(idMatch||classMatch){
      parents.push({offset:nextOpen,tag:divTag.substring(0,80)});
    }else{
      parents.push({offset:nextOpen,tag:'<div>'});
    }
    depth++;
    pos=c.indexOf('>',nextOpen)+1;
  }else{
    break;
  }
}
console.log('\nParent stack for company-reg-screen:');
for(var i=0;i<parents.length;i++){
  console.log('  depth',i,':',parents[i].tag.replace(/\n/g,'\\n').substring(0,120));
}
