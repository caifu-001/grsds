var h=require('fs').readFileSync('D:/1kaifa/grsds/index.html','utf8');
var idx=h.indexOf('function renderMyOfficeOverview');
var d=0,p=h.indexOf('{',idx);
while(p<h.length){if(h[p]=='{')d++;else if(h[p]=='}'){d--;if(d===0)break}p++}
var body=h.slice(idx,p+1);
console.log('Full function body ('+body.length+' chars):');
console.log(body);
console.log('\n--- Checking for issues ---');

// Is there a previous function that bleeds in?
var prev=h.lastIndexOf('function ',idx-1);
console.log('Previous function:',h.slice(prev,idx).substring(0,200));

// Does renderMyOfficeDocs also have the same issue?
var idx2=h.indexOf('function renderMyOfficeDocs');
var prev2=h.lastIndexOf('function ',idx2-1);
console.log('\nrenderMyOfficeDocs previous:',h.slice(prev2,idx2).substring(0,200));
