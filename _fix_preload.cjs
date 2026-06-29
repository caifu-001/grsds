const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Find the preload block - replace it with a version that times out and shows error
const oldPreload = `if(!allDepartments||!allDepartments.length||!allRoles||!allRoles.length){
    (async function(){
      try{
        var d=await sb.from('departments').select('*').eq('company_id',currentCompanyId).order('name');
        if(!d.error)allDepartments=d.data||[];
        var r=await sb.from('roles').select('*').eq('company_id',currentCompanyId).order('name');
        if(!r.error)allRoles=r.data||[];
        if(!allUsers||!allUsers.length){
          var ur=await fetch(SUPABASE_URL+'/rest/v1/profiles?select=*&company_id=eq.'+encodeURIComponent(currentCompanyId),{headers:{'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY}});
          if(ur.ok){var ud=await ur.json();allUsers=ud;}
        }
      }catch(e){console.error('wfShowProps preload:',e)}
      wfShowProps(idx);
    })();
    panel.innerHTML='<p style="font-size:12px;color:var(--text2);padding:20px">加载中...</p>';
    return;
  }`;

const newPreload = `if(!allDepartments||!allDepartments.length||!allRoles||!allRoles.length){
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

if (s.includes(oldPreload)) {
  s = s.split(oldPreload).join(newPreload);
  console.log('Replaced preload block: OK');
} else {
  console.log('Preload block NOT found');
}

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');

// Verify
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
console.log('Size:', s.length);
