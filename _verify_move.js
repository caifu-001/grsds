var c=require('fs').readFileSync('D:/1kaifa/grsds/index.html','utf8');
var ms=c.indexOf('id="main-screen"');
var cr=c.indexOf('id="company-reg-screen"');
console.log('company-reg-screen:',cr,'main-screen:',ms,'delta:',ms-cr);
if(cr<ms){console.log('OK: company-reg-screen is BEFORE main-screen')}
else{console.log('STILL INSIDE')}
