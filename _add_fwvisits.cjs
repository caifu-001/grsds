const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Add loadFWVisits function - place it after loadFWCheckin
// Find the end of loadFWCheckin function (next \nfunction or \nasync function)
const checkinEnd = s.indexOf('async function loadFWTrack');
if (checkinEnd < 0) { console.log('loadFWTrack not found'); process.exit(0); }

// The end of loadFWCheckin is right before \n  } (closing brace) + \nasync function loadFWTrack
// Find the last } before loadFWTrack
let pos = checkinEnd;
while (pos > 0 && s[pos-1] !== '}') pos--;
console.log('loadFWCheckin ends at:', pos);
console.log('Context:', JSON.stringify(s.slice(pos-2, pos+50)));

const newFn = `
async function loadFWVisits(){
  var list=document.getElementById('fw-visit-list');
  if(!list)return;
  list.innerHTML='<div style="color:var(--text3);font-size:13px">加载中...</div>';
  try{
    var filter=(document.getElementById('fw-visit-filter')||{}).value||'today';
    var q=sb.from('field_visits').select('*').eq('user_id',currentUser.id).eq('company_id',currentCompanyId);
    if(filter==='today'){
      var today=new Date().toISOString().substring(0,10);
      q=q.eq('visit_date',today);
    }else if(filter==='week'){
      var wa=new Date();wa.setDate(wa.getDate()-7);q=q.gte('visit_date',wa.toISOString().substring(0,10));
    }else if(filter==='month'){
      var ma=new Date();ma.setMonth(ma.getMonth()-1);q=q.gte('visit_date',ma.toISOString().substring(0,10));
    }
    var {data:visits,error}=await q.order('visit_date',{ascending:false}).order('start_time',{ascending:false});
    if(error){list.innerHTML='<div style="color:var(--danger);font-size:13px">加载失败: '+error.message+'</div>';return}
    if(!visits||!visits.length){list.innerHTML='<div style="color:var(--text3);font-size:13px;text-align:center;padding:20px">暂无拜访记录</div>';return}
    var html='';
    for(var i=0;i<visits.length;i++){
      var v=visits[i];
      html+='<div class="fw-visit-card" style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px">';
      html+='<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">';
      html+='<div style="font-weight:600;font-size:14px">'+escHtml(v.client_name||'未命名客户')+'</div>';
      html+='<div style="display:flex;gap:6px">';
      html+='<button onclick="openVisitForm(\''+v.id+'\')" style="padding:3px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);font-size:12px;cursor:pointer">编辑</button>';
      html+='<button onclick="deleteVisit(\''+v.id+'\')" style="padding:3px 10px;border:1px solid #ef4444;border-radius:6px;background:#fef2f2;color:#ef4444;font-size:12px;cursor:pointer">删除</button>';
      html+='</div></div>';
      html+='<div style="font-size:12px;color:var(--text2);margin-bottom:4px">📅 '+escHtml(v.visit_date||'')+(v.start_time?' '+escHtml(v.start_time):'')+'</div>';
      if(v.purpose)html+='<div style="font-size:13px;margin-bottom:2px"><b>目的:</b> '+escHtml(v.purpose)+'</div>';
      if(v.result)html+='<div style="font-size:13px;margin-bottom:2px"><b>结果:</b> '+escHtml(v.result)+'</div>';
      if(v.notes)html+='<div style="font-size:13px;margin-bottom:2px"><b>备注:</b> '+escHtml(v.notes)+'</div>';
      if(v.latitude&&v.longitude)html+='<div style="font-size:11px;color:var(--text3);margin-top:4px">📍 '+v.latitude.toFixed(6)+', '+v.longitude.toFixed(6)+'</div>';
      html+='</div>';
    }
    list.innerHTML=html;
  }catch(e){list.innerHTML='<div style="color:var(--danger);font-size:13px">加载失败: '+(e.message||e)+'</div>';console.error('loadFWVisits:',e)}
}

function openVisitForm(id){
  fwVisitEditId=id||null;
  fwVisitClientId=null;
  var modal=document.getElementById('visit-form-modal');
  if(!modal){showToast('表单未找到');return}
  if(id){
    sb.from('field_visits').select('*').eq('id',id).single().then(function(r){
      if(r.error||!r.data){showToast('记录不存在');return}
      var v=r.data;
      document.getElementById('fw-vm-client').value=v.client_name||'';
      document.getElementById('fw-vm-purpose').value=v.purpose||'';
      document.getElementById('fw-vm-notes').value=v.notes||'';
      document.getElementById('fw-vm-result').value=v.result||'';
      document.getElementById('fw-vm-date').value=v.visit_date||new Date().toISOString().substring(0,10);
      fwVisitClientId=v.client_id||null;
      modal.classList.remove('hidden');
    });
  }else{
    document.getElementById('fw-vm-client').value='';
    document.getElementById('fw-vm-purpose').value='';
    document.getElementById('fw-vm-notes').value='';
    document.getElementById('fw-vm-result').value='';
    document.getElementById('fw-vm-date').value=new Date().toISOString().substring(0,10);
    modal.classList.remove('hidden');
  }
}

function closeVisitForm(){
  fwVisitEditId=null;fwVisitClientId=null;
  var modal=document.getElementById('visit-form-modal');
  if(modal)modal.classList.add('hidden');
}

async function deleteVisit(id){
  if(!confirm('确定删除该拜访记录？'))return;
  try{
    var r=await sb.from('field_visits').delete().eq('id',id);
    if(r.error){showToast('删除失败: '+r.error.message);return}
    showToast('已删除');
    loadFWVisits();loadFWOverview();
  }catch(e){showToast('删除失败: '+(e.message||e))}
}
`;

s = s.slice(0, pos) + newFn + s.slice(pos);
console.log('Inserted loadFWVisits + openVisitForm + closeVisitForm + deleteVisit');

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
console.log('Size:', s.length);
