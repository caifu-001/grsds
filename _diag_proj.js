var c=require('fs').readFileSync('D:/1kaifa/grsds/index.html','utf8');
var idx=c.indexOf("project_step_assignees");
var segment=c.substring(idx-50,idx+200);
console.log(segment);
