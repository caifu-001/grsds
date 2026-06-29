const fs=require('fs');
let h=fs.readFileSync('D:/1kaifa/grsds/index.html','utf8');

let s=0,c=0;
while(c<5){s=h.indexOf('<script>',s+1);c++}
let e=h.indexOf('</script>',s);
let code=h.slice(h.indexOf('>',s)+1,e);

try{
 new Function(code);
 console.log('BLOCK5: OK');
}catch(err){
 console.log('BLOCK5 ERROR:',err.message);
 // Find line from error
 let m=err.stack?.match(/at eval.*?:(\d+):(\d+)/);
 if(m){
  let ln=parseInt(m[1]);
  let lines=code.split('\n');
  console.log('Line',ln,':',(lines[ln-1]||'').substring(0,200));
  if(ln>1) console.log('Line',ln-1,':',(lines[ln-2]||'').substring(0,200));
  if(lines[ln]) console.log('Line',ln+1,':',(lines[ln]||'').substring(0,200));
 }
}
