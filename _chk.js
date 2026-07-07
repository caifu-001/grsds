var c=require('fs').readFileSync('D:/1kaifa/grsds/index.html','utf8');
var d_open=(c.match(/<div/g)||[]).length;
var d_close=(c.match(/<\/div>/g)||[]).length;
var b_open=(c.match(/\{/g)||[]).length;
var b_close=(c.match(/\}/g)||[]).length;
console.log('div:',d_open-d_close,'{}: ',b_open-b_close);
