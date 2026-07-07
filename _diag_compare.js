var c=require('fs').readFileSync('D:/1kaifa/grsds/index.html','utf8');
var idx=c.indexOf('refreshScoutingCompare');
console.log('refreshScoutingCompare at',idx);
if(idx>=0){
  var segment=c.substring(idx,idx+2000);
  console.log(segment);
}
