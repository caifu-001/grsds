const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Remove the dead Promise.race block
const oldBlock = `  if(!allDepartments||!allDepartments.length||!allRoles||!allRoles.length){
    // 同步尝试加载 (不等 async)
    try{
      var dP=Promise.race([
        sb.from('departments').select('*').eq('company_id',currentCompanyId).order('name'),
        new Promise(function(res){setTimeout(function(){res({data:[],error:{message:'timeout'}})},5000)})
      ]);
      // Fire-and-forget the async; render synchronously with empty data first, then re-render when loaded
      sb.from('departments').select('*').eq('company_id',currentCompanyId).order('name').then(function(d){if(!d.error)allDepartments=d.data||[];wfShowProps(idx);});
      sb.from('roles').select('*').eq('company_id',currentCompanyId).order('name').then(function(d){if(!d.error)allRoles=d.data||[];wfShowProps(idx);});
    }catch(e){console.error('wfShowProps preload:',e)}
  }`;

const newBlock = `  // 后台加载部门/角色（fire-and-forget），加载完自动重渲染
  if(!allDepartments||!allDepartments.length){
    sb.from('departments').select('*').eq('company_id',currentCompanyId).order('name').then(function(d){if(!d.error){allDepartments=d.data||[];wfShowProps(idx);}});
  }
  if(!allRoles||!allRoles.length){
    sb.from('roles').select('*').eq('company_id',currentCompanyId).order('name').then(function(d){if(!d.error){allRoles=d.data||[];wfShowProps(idx);}});
  }`;

if (s.includes(oldBlock)) {
  s = s.split(oldBlock).join(newBlock);
  console.log('OK: replaced with clean fire-and-forget');
} else {
  console.log('NOT FOUND');
}

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');

const ls = s.lastIndexOf('<script>'), le = s.lastIndexOf('</script>');
try { new (require('vm').Script)(s.slice(ls+8, le)); console.log('JS: OK'); }
catch(e) { 
  console.log('JS FAIL:', e.message.substring(0,200));
  const m = (e.stack||'').match(/inline:(\d+)/);
  if (m) {
    const ln = parseInt(m[1]);
    const lines = s.slice(ls+8, le).split('\n');
    for (let k = Math.max(0,ln-3); k < Math.min(lines.length, ln+2); k++)
      console.log('L'+(k+1)+': '+(lines[k]||'').substring(0,200));
  }
}
const o=(s.match(/<div[\s>]/g)||[]).length, c=(s.match(/<\/div>/g)||[]).length;
console.log('Div:',o,c,o-c);
