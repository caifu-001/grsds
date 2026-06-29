var h=require('fs').readFileSync('D:/1kaifa/grsds/index.html','utf8');
var idx=h.indexOf('function renderMyOfficeOverview');
// Show 400 chars around it
console.log(h.slice(Math.max(0,idx-200),idx+400));
