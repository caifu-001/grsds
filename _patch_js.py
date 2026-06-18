content = open(r"D:\1kaifa\grsds\index.html", 'r', encoding='utf-8').read()

# ============================================================
# PATCH 3: Extend switchAdminTab for new tabs
# ============================================================
old_switch = '''  else if(tab==='companies'){ct.classList.remove('hidden');subs[5].classList.add('active');loadPendingCompanies();}
}'''

new_switch = '''  else if(tab==='companies'){ct.classList.remove('hidden');subs[5].classList.add('active');loadPendingCompanies();}
  else if(tab==='employees'){var ep=document.getElementById('admin-employees');ep.classList.remove('hidden');subs[6].classList.add('active');await loadAdminData();renderAdminEmployees();}
  else if(tab==='logs'){var lp=document.getElementById('admin-logs');lp.classList.remove('hidden');subs[7].classList.add('active');await loadOperationLogs();renderOperationLogs();}
  else if(tab==='config'){var cp=document.getElementById('admin-config');cp.classList.remove('hidden');subs[8].classList.add('active');switchConfigTab('fields');}
  else if(tab==='security'){var sp=document.getElementById('admin-security');sp.classList.remove('hidden');subs[9].classList.add('active');renderSecurityPanel();}
}'''

if old_switch in content:
    content = content.replace(old_switch, new_switch)
    print('PATCH 3 OK: switchAdminTab extended')
else:
    print('PATCH 3 FAIL: switchAdminTab anchor not found')

# Also update hidden logic at top of switchAdminTab
old_hide = '''  ut.classList.add('hidden');dt.classList.add('hidden');rt.classList.add('hidden');if(pt)pt.classList.add('hidden');ct.classList.add('hidden');if(cm)cm.classList.add('hidden');'''
new_hide = '''  ut.classList.add('hidden');dt.classList.add('hidden');rt.classList.add('hidden');if(pt)pt.classList.add('hidden');ct.classList.add('hidden');if(cm)cm.classList.add('hidden');
  var ep=document.getElementById('admin-employees');if(ep)ep.classList.add('hidden');
  var lp=document.getElementById('admin-logs');if(lp)lp.classList.add('hidden');
  var cp=document.getElementById('admin-config');if(cp)cp.classList.add('hidden');
  var sp=document.getElementById('admin-security');if(sp)sp.classList.add('hidden');'''
if old_hide in content:
    content = content.replace(old_hide, new_hide)
    print('PATCH 3b OK: hide logic extended')
else:
    print('PATCH 3b FAIL: hide anchor not found')

# ============================================================
# PATCH 4: Insert all new JS functions
# Find a good insertion point - before the closing </script> tag
# ============================================================
script_end = content.rfind('</script>')
insert_pos = script_end

new_js = r'''
/* ===== EMPLOYEE MANAGEMENT ===== */
var empEditId=null;
async function renderAdminEmployees(){
  var el=document.getElementById('admin-emp-list');if(!el)return;
  var q=(document.getElementById('admin-emp-search').value||'').toLowerCase();
  var df=document.getElementById('emp-dept-filter').value;
  var sf=document.getElementById('emp-status-filter').value;
  // Build dept filter options
  var ds=document.getElementById('emp-dept-filter');
  ds.innerHTML='<option value="">全部部门</option>';
  if(allDepts)for(var i=0;i<allDepts.length;i++){var d=allDepts[i];ds.innerHTML+='<option value="'+escHtml(d.id)+'">'+escHtml(d.name)+'</option>';}
  ds.value=df;
  var list=allUsers||[];
  if(df)list=list.filter(function(u){return u.dept_id==df;});
  if(sf)list=list.filter(function(u){return u.status===sf;});
  if(q)list=list.filter(function(u){return (u.display_name||'').toLowerCase().indexOf(q)>=0||(u.email||'').toLowerCase().indexOf(q)>=0;});
  var h='<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:2px solid var(--border)"><th style="padding:10px 8px;text-align:left">姓名</th><th style="padding:10px 8px;text-align:left">邮箱</th><th style="padding:10px 8px;text-align:left">角色</th><th style="padding:10px 8px;text-align:left">部门</th><th style="padding:10px 8px;text-align:left">数据范围</th><th style="padding:10px 8px;text-align:left">状态</th><th style="padding:10px 8px;text-align:center">操作</th></tr></thead><tbody>';
  for(var j=0;j<list.length;j++){
    var u=list[j];var dn=u.display_name||'';var em=u.email||'';var rn=u.role||'';var did=u.dept_id||'';
    var deptName='';for(var k=0;k<(allDepts||[]).length;k++){if(allDepts[k].id==did){deptName=allDepts[k].name;break;}}
    var scopes={own:'仅自己',dept:'本部门',all:'全部'};var dsLabel=scopes[u.data_scope]||'全部';
    var statusLabel=u.status==='inactive'?'<span style="color:#ef4444">离职</span>':'<span style="color:#10b981">在职</span>';
    h+='<tr style="border-bottom:1px solid var(--border)"><td style="padding:8px">'+escHtml(dn)+'</td><td style="padding:8px">'+escHtml(em)+'</td><td style="padding:8px">'+escHtml(rn)+'</td><td style="padding:8px">'+escHtml(deptName)+'</td><td style="padding:8px;font-size:12px;color:var(--text3)">'+dsLabel+'</td><td style="padding:8px">'+statusLabel+' <a href="javascript:void(0)" style="font-size:11px;margin-left:6px" onclick="toggleEmpStatus(\''+u.user_id+'\',\''+(u.status==='active'?'inactive':'active')+'\')">'+(u.status==='active'?'设为离职':'设为在职')+'</a></td><td style="padding:8px;text-align:center"><a href="javascript:void(0)" onclick="editEmployee(\''+u.user_id+'\')" style="color:var(--primary);font-size:13px">编辑</a></td></tr>';
  }
  h+='</tbody></table>';
  if(list.length===0)h='<div style="text-align:center;padding:40px;color:var(--text3)">暂无匹配员工</div>';
  el.innerHTML=h;
}
function openEmployeeForm(){
  empEditId=null;document.getElementById('emp-form-title').textContent='添加员工';
  document.getElementById('ef-name').value='';document.getElementById('ef-email').value='';
  document.getElementById('ef-status').value='active';document.getElementById('ef-data-scope').value='all';
  document.getElementById('ef-reassign-row').style.display='none';
  // Populate roles
  var rs=document.getElementById('ef-role');rs.innerHTML='';
  for(var i=0;i<allRoles.length;i++)rs.innerHTML+='<option value="'+escHtml(allRoles[i].name)+'">'+escHtml(allRoles[i].name)+'</option>';
  // Populate depts
  var ds=document.getElementById('ef-dept');ds.innerHTML='<option value="">未分配</option>';
  if(allDepts)for(var j=0;j<allDepts.length;j++)ds.innerHTML+='<option value="'+allDepts[j].id+'">'+escHtml(allDepts[j].name)+'</option>';
  // Populate reassign
  var rs2=document.getElementById('ef-reassign');rs2.innerHTML='<option value="">回收公共池</option>';
  if(allUsers)for(var k=0;k<allUsers.length;k++)rs2.innerHTML+='<option value="'+allUsers[k].user_id+'">'+escHtml(allUsers[k].display_name||allUsers[k].email)+'</option>';
  document.getElementById('emp-form-modal').style.display='flex';
}
function closeEmployeeForm(){document.getElementById('emp-form-modal').style.display='none';}
async function editEmployee(uid){
  var u=null;if(allUsers)for(var i=0;i<allUsers.length;i++){if(allUsers[i].user_id===uid){u=allUsers[i];break;}}
  if(!u){showToast('员工不存在');return}
  empEditId=uid;document.getElementById('emp-form-title').textContent='编辑员工';
  document.getElementById('ef-name').value=u.display_name||'';document.getElementById('ef-email').value=u.email||'';
  document.getElementById('ef-status').value=u.status||'active';document.getElementById('ef-data-scope').value=u.data_scope||'all';
  // Populate role
  var rs=document.getElementById('ef-role');rs.innerHTML='';
  for(var j=0;j<allRoles.length;j++){rs.innerHTML+='<option value="'+escHtml(allRoles[j].name)+'"'+(allRoles[j].name===u.role?' selected':'')+'>'+escHtml(allRoles[j].name)+'</option>';}
  // Populate depts
  var ds=document.getElementById('ef-dept');ds.innerHTML='<option value="">未分配</option>';
  if(allDepts)for(var k=0;k<allDepts.length;k++){ds.innerHTML+='<option value="'+allDepts[k].id+'"'+(allDepts[k].id==u.dept_id?' selected':'')+'>'+escHtml(allDepts[k].name)+'</option>';}
  // Reassign row
  var rs2=document.getElementById('ef-reassign');rs2.innerHTML='<option value="">回收公共池</option>';
  if(allUsers)for(var m=0;m<allUsers.length;m++){if(allUsers[m].user_id!==uid)rs2.innerHTML+='<option value="'+allUsers[m].user_id+'">'+escHtml(allUsers[m].display_name||allUsers[m].email)+'</option>';}
  if(u.status==='inactive'){document.getElementById('ef-reassign-row').style.display='block';}
  else{document.getElementById('ef-reassign-row').style.display='none';}
  document.getElementById('emp-form-modal').style.display='flex';
}
async function saveEmployee(){
  var name=document.getElementById('ef-name').value.trim();if(!name){showToast('请输入姓名');return}
  var email=document.getElementById('ef-email').value.trim();if(!email){showToast('请输入邮箱');return}
  var role=document.getElementById('ef-role').value;
  var deptId=document.getElementById('ef-dept').value||null;
  var status=document.getElementById('ef-status').value;
  var dataScope=document.getElementById('ef-data-scope').value;
  var reassignTo=document.getElementById('ef-reassign').value||null;
  // Update via SERVICE_KEY
  var body={display_name:name,email:email,role:role,dept_id:deptId,status:status,data_scope:dataScope};
  if(empEditId){
    var resp=await fetch(SUPABASE_URL+'/rest/v1/profiles?user_id=eq.'+encodeURIComponent(empEditId),{method:'PATCH',headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(body)});
    if(resp.ok){
      if(status==='inactive'){await fetch(SUPABASE_URL+'/rest/v1/rpc/reassign_clients_on_deactivate',{method:'POST',headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_user_id:empEditId,p_company_id:currentCompanyId,p_reassign_to:reassignTo||null})});showToast('员工已更新，客户已交接');}
      else showToast('员工已更新');
      closeEmployeeForm();await loadAdminData();renderAdminEmployees();
    }else{showToast('更新失败')}
  }else{showToast('新建员工请使用"添加用户"功能')}
}
async function toggleEmpStatus(uid,newStatus){
  if(!confirm('确认将员工设为'+(newStatus==='inactive'?'离职':'在职')+'？'))return;
  if(newStatus==='inactive'){
    var reassign=prompt('输入交接员工ID（留空回收公共池）:','');
    var body2={status:newStatus,data_scope:'own'};
    await fetch(SUPABASE_URL+'/rest/v1/profiles?user_id=eq.'+encodeURIComponent(uid),{method:'PATCH',headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(body2)});
    if(reassign)await fetch(SUPABASE_URL+'/rest/v1/rpc/reassign_clients_on_deactivate',{method:'POST',headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_user_id:uid,p_company_id:currentCompanyId,p_reassign_to:reassign})});
    else await fetch(SUPABASE_URL+'/rest/v1/rpc/reassign_clients_on_deactivate',{method:'POST',headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_user_id:uid,p_company_id:currentCompanyId,p_reassign_to:null})});
    showToast('员工已设为离职，客户已回收');
  }else{
    await fetch(SUPABASE_URL+'/rest/v1/profiles?user_id=eq.'+encodeURIComponent(uid),{method:'PATCH',headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify({status:newStatus})});
    showToast('员工已设为在职');
  }
  await loadAdminData();renderAdminEmployees();
}

/* ===== OPERATION LOGS ===== */
var allOpLogs=[];
async function loadOperationLogs(){
  var resp=await fetch(SUPABASE_URL+'/rest/v1/operation_logs?company_id=eq.'+currentCompanyId+'&order=created_at.desc&limit=500',{headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY}});
  if(resp.ok)allOpLogs=await resp.json();else allOpLogs=[];
}
function renderOperationLogs(){
  var el=document.getElementById('admin-log-list');if(!el)return;
  var af=document.getElementById('log-action').value;
  var ef=document.getElementById('log-entity').value;
  var q=(document.getElementById('log-search').value||'').toLowerCase();
  var list=allOpLogs;
  if(af)list=list.filter(function(l){return l.action===af;});
  if(ef)list=list.filter(function(l){return l.entity_type===ef;});
  if(q)list=list.filter(function(l){return (l.user_name||'').toLowerCase().indexOf(q)>=0||(l.entity_name||'').toLowerCase().indexOf(q)>=0;});
  var h='<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:2px solid var(--border)"><th style="padding:10px 8px;text-align:left;width:140px">时间</th><th style="padding:10px 8px;text-align:left;width:80px">操作人</th><th style="padding:10px 8px;text-align:left;width:60px">动作</th><th style="padding:10px 8px;text-align:left;width:80px">类型</th><th style="padding:10px 8px;text-align:left">目标</th><th style="padding:10px 8px;text-align:left">详情</th></tr></thead><tbody>';
  var actions={create:'创建',update:'更新',delete:'删除',export:'导出',login:'登录'};
  for(var i=0;i<list.length;i++){
    var l=list[i];var dt=new Date(l.created_at).toLocaleString('zh-CN');
    var detail='';try{var d=typeof l.detail==='string'?JSON.parse(l.detail):l.detail;detail=JSON.stringify(d).substring(0,80);}catch(e){}
    h+='<tr style="border-bottom:1px solid var(--border)"><td style="padding:8px;font-size:12px;color:var(--text3)">'+dt+'</td><td style="padding:8px">'+escHtml(l.user_name||'')+'</td><td style="padding:8px">'+(actions[l.action]||l.action)+'</td><td style="padding:8px;font-size:12px;color:var(--text3)">'+escHtml(l.entity_type)+'</td><td style="padding:8px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escHtml(l.entity_name||'')+'</td><td style="padding:8px;font-size:11px;color:var(--text3)">'+escHtml(detail)+'</td></tr>';
  }
  h+='</tbody></table>';
  if(list.length===0)h='<div style="text-align:center;padding:40px;color:var(--text3)">暂无操作记录</div>';
  el.innerHTML=h;
}
async function exportOperationLogs(){
  var csv='时间,操作人,动作,类型,目标,详情\n';
  for(var i=0;i<allOpLogs.length;i++){
    var l=allOpLogs[i];var dt=new Date(l.created_at).toLocaleString('zh-CN');
    var detail='';try{var d=typeof l.detail==='string'?JSON.parse(l.detail):l.detail;detail=JSON.stringify(d);}catch(e){}
    csv+=[dt,l.user_name||'',l.action,l.entity_type,l.entity_name||'',detail.replace(/"/g,'""')].map(function(c){return '"'+c+'"';}).join(',')+'\n';
  }
  var blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='operation_logs_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
  showToast('日志已导出');
}

/* ===== RPC: write operation log ===== */
async function writeOpLog(action,entityType,entityId,entityName,detail){
  try{
    var body={p_company_id:currentCompanyId,p_user_id:currentUser?currentUser.id:null,p_user_name:(currentUser&&currentUser.email)||'',p_action:action,p_entity_type:entityType,p_entity_id:String(entityId||''),p_entity_name:entityName||'',p_detail:detail?JSON.stringify(detail):null};
    await fetch(SUPABASE_URL+'/rest/v1/rpc/write_op_log',{method:'POST',headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
  }catch(e){}
}

/* ===== SYSTEM CONFIGURATION ===== */
function switchConfigTab(t){
  var tabs=document.querySelectorAll('#admin-config .admin-subtab');
  var panels={fields:document.getElementById('cfg-fields'),forms:document.getElementById('cfg-forms'),stages:document.getElementById('cfg-stages'),tags:document.getElementById('cfg-tags'),numbering:document.getElementById('cfg-numbering')};
  for(var k in panels)panels[k].classList.add('hidden');
  for(var i=0;i<tabs.length;i++)tabs[i].classList.remove('active');
  var idx={fields:0,forms:1,stages:2,tags:3,numbering:4};
  panels[t].classList.remove('hidden');tabs[idx[t]].classList.add('active');
  if(t==='fields')renderCustomFields();
  else if(t==='forms')renderCustomForms();
  else if(t==='stages')renderSalesStages();
  else if(t==='tags')renderCustomTags();
  else if(t==='numbering')renderNumberingRules();
}

/* Custom Fields */
var allCustomFields=[],fieldEditId=null;
async function renderCustomFields(){
  var el=document.getElementById('cfg-field-list');if(!el)return;
  var et=document.getElementById('cfg-field-entity').value;
  var resp=await fetch(SUPABASE_URL+'/rest/v1/custom_field_defs?company_id=eq.'+currentCompanyId+'&entity_type=eq.'+et+'&order=sort_order.asc',{headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY}});
  if(resp.ok)allCustomFields=await resp.json();else allCustomFields=[];
  var typeNames={text:'文本',number:'数字',date:'日期',select:'下拉',textarea:'多行文本'};
  var h='<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:2px solid var(--border)"><th style="padding:10px 8px;text-align:left">标识</th><th style="padding:10px 8px;text-align:left">显示名称</th><th style="padding:10px 8px;text-align:left">类型</th><th style="padding:10px 8px;text-align:left">必填</th><th style="padding:10px 8px;text-align:center">操作</th></tr></thead><tbody>';
  for(var i=0;i<allCustomFields.length;i++){
    var f=allCustomFields[i];
    h+='<tr style="border-bottom:1px solid var(--border)"><td style="padding:8px;font-family:monospace;font-size:12px">'+escHtml(f.field_name)+'</td><td style="padding:8px">'+escHtml(f.field_label)+'</td><td style="padding:8px;font-size:12px;color:var(--text3)">'+(typeNames[f.field_type]||f.field_type)+'</td><td style="padding:8px">'+(f.required?'<span style="color:#ef4444">是</span>':'否')+'</td><td style="padding:8px;text-align:center"><a href="javascript:void(0)" onclick="editField('+f.id+')" style="color:var(--primary);font-size:13px">编辑</a>&nbsp;<a href="javascript:void(0)" onclick="deleteField('+f.id+')" style="color:#ef4444;font-size:13px">删除</a></td></tr>';
  }
  h+='</tbody></table>';
  if(allCustomFields.length===0)h='<div style="text-align:center;padding:40px;color:var(--text3)">暂无自定义字段</div>';
  el.innerHTML=h;
}
function openFieldForm(){
  fieldEditId=null;document.getElementById('field-form-title').textContent='添加自定义字段';
  document.getElementById('fif-entity').value=document.getElementById('cfg-field-entity').value;
  document.getElementById('fif-name').value='';document.getElementById('fif-label').value='';
  document.getElementById('fif-type').value='text';document.getElementById('fif-options').value='';
  document.getElementById('fif-required').checked=false;
  document.getElementById('fif-options-row').style.display='none';
  document.getElementById('field-form-modal').style.display='flex';
}
function closeFieldForm(){document.getElementById('field-form-modal').style.display='none';}
document.addEventListener('DOMContentLoaded',function(){
  var ft=document.getElementById('fif-type');if(ft)ft.onchange=function(){document.getElementById('fif-options-row').style.display=this.value==='select'?'block':'none';};
});
async function editField(id){
  var f=null;for(var i=0;i<allCustomFields.length;i++){if(allCustomFields[i].id===id){f=allCustomFields[i];break;}}
  if(!f)return;fieldEditId=id;document.getElementById('field-form-title').textContent='编辑字段';
  document.getElementById('fif-entity').value=f.entity_type;
  document.getElementById('fif-name').value=f.field_name;document.getElementById('fif-label').value=f.field_label;
  document.getElementById('fif-type').value=f.field_type;document.getElementById('fif-required').checked=f.required;
  var opts=typeof f.options==='string'?JSON.parse(f.options):(f.options||[]);
  document.getElementById('fif-options').value=Array.isArray(opts)?opts.join(','):'';
  document.getElementById('fif-options-row').style.display=f.field_type==='select'?'block':'none';
  document.getElementById('field-form-modal').style.display='flex';
}
async function saveField(){
  var entity=document.getElementById('fif-entity').value;
  var name=document.getElementById('fif-name').value.trim();if(!name){showToast('请输入字段标识');return}
  var label=document.getElementById('fif-label').value.trim();if(!label){showToast('请输入显示名称');return}
  var type=document.getElementById('fif-type').value;
  var required=document.getElementById('fif-required').checked;
  var optionsStr=document.getElementById('fif-options').value;var opts=optionsStr?optionsStr.split(',').map(function(s){return s.trim();}).filter(Boolean):[];
  var body={company_id:currentCompanyId,entity_type:entity,field_name:name,field_label:label,field_type:type,options:opts,required:required,updated_at:new Date().toISOString()};
  var resp;
  if(fieldEditId){
    resp=await fetch(SUPABASE_URL+'/rest/v1/custom_field_defs?id=eq.'+fieldEditId,{method:'PATCH',headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(body)});
  }else{
    body.sort_order=allCustomFields.length;body.created_at=new Date().toISOString();
    resp=await fetch(SUPABASE_URL+'/rest/v1/custom_field_defs',{method:'POST',headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(body)});
  }
  if(resp.ok){showToast('字段已保存');closeFieldForm();renderCustomFields();await writeOpLog(fieldEditId?'update':'create','custom_field',fieldEditId||'',label);}
  else{showToast('保存失败')}
}
async function deleteField(id){
  if(!confirm('确认删除此字段？'))return;
  var resp=await fetch(SUPABASE_URL+'/rest/v1/custom_field_defs?id=eq.'+id,{method:'DELETE',headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY}});
  if(resp.ok){showToast('已删除');renderCustomFields();}else{showToast('删除失败')}
}

/* Custom Forms */
var allCustomForms=[];
async function renderCustomForms(){
  var el=document.getElementById('cfg-form-list');if(!el)return;
  var resp=await fetch(SUPABASE_URL+'/rest/v1/custom_forms?company_id=eq.'+currentCompanyId+'&order=created_at.desc',{headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY}});
  if(resp.ok)allCustomForms=await resp.json();else allCustomForms=[];
  var h='';
  for(var i=0;i<allCustomForms.length;i++){
    var f=allCustomForms[i];var fc=typeof f.fields==='string'?JSON.parse(f.fields):(f.fields||[]);
    h+='<div class="card" style="padding:12px 16px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between"><div><strong>'+escHtml(f.form_name)+'</strong><span style="font-size:12px;color:var(--text3);margin-left:8px">'+escHtml(f.entity_type)+' · '+fc.length+'个字段</span></div><div><a href="javascript:void(0)" onclick="editForm('+f.id+')" style="color:var(--primary);font-size:13px;margin-right:8px">编辑</a><a href="javascript:void(0)" onclick="deleteForm('+f.id+')" style="color:#ef4444;font-size:13px">删除</a></div></div>';
  }
  if(allCustomForms.length===0)h='<div style="text-align:center;padding:40px;color:var(--text3)">暂无自定义表单</div>';
  el.innerHTML=h;
}
function openFormBuilder(){
  var name=prompt('请输入表单名称:');if(!name)return;
  var et=prompt('实体类型(client/order/lead):','client');if(!et)return;
  // Simple: create with empty fields
  fetch(SUPABASE_URL+'/rest/v1/custom_forms',{method:'POST',headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify({company_id:currentCompanyId,form_name:name,entity_type:et,fields:[],created_at:new Date().toISOString()})}).then(function(r){if(r.ok){showToast('表单已创建');renderCustomForms();}}).catch(function(){showToast('创建失败')});
}
async function deleteForm(id){if(!confirm('确认删除？'))return;await fetch(SUPABASE_URL+'/rest/v1/custom_forms?id=eq.'+id,{method:'DELETE',headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY}});renderCustomForms();showToast('已删除');}

/* Sales Stages */
var allSalesStages=[],stageEditId=null;
async function renderSalesStages(){
  var el=document.getElementById('cfg-stage-list');if(!el)return;
  var resp=await fetch(SUPABASE_URL+'/rest/v1/sales_stages_def?company_id=eq.'+currentCompanyId+'&order=sort_order.asc',{headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY}});
  if(resp.ok)allSalesStages=await resp.json();else allSalesStages=[];
  var h='';
  for(var i=0;i<allSalesStages.length;i++){
    var s=allSalesStages[i];
    h+='<div class="card" style="padding:10px 16px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between"><div style="display:flex;align-items:center;gap:10px"><span style="width:12px;height:12px;border-radius:50%;background:'+escHtml(s.color)+';display:inline-block;flex-shrink:0"></span><strong>'+escHtml(s.stage_name)+'</strong><span style="font-size:11px;color:var(--text3)">'+escHtml(s.stage_key)+' · '+s.probability+'%</span></div><div><a href="javascript:void(0)" onclick="editStage('+s.id+')" style="color:var(--primary);font-size:13px;margin-right:8px">编辑</a><a href="javascript:void(0)" onclick="deleteStage('+s.id+')" style="color:#ef4444;font-size:13px">删除</a></div></div>';
  }
  if(allSalesStages.length===0)h='<div style="text-align:center;padding:40px;color:var(--text3)">暂无阶段定义</div>';
  el.innerHTML=h;
}
function openStageForm(){
  stageEditId=null;document.getElementById('stage-form-title').textContent='添加销售阶段';
  document.getElementById('sgf-name').value='';document.getElementById('sgf-key').value='';
  document.getElementById('sgf-color').value='#4F6EF7';document.getElementById('sgf-prob').value='50';
  document.getElementById('stage-form-modal').style.display='flex';
}
function closeStageForm(){document.getElementById('stage-form-modal').style.display='none';}
async function editStage(id){
  var s=null;for(var i=0;i<allSalesStages.length;i++){if(allSalesStages[i].id===id){s=allSalesStages[i];break;}}
  if(!s)return;stageEditId=id;document.getElementById('stage-form-title').textContent='编辑阶段';
  document.getElementById('sgf-name').value=s.stage_name;document.getElementById('sgf-key').value=s.stage_key;
  document.getElementById('sgf-color').value=s.color;document.getElementById('sgf-prob').value=s.probability;
  document.getElementById('stage-form-modal').style.display='flex';
}
async function saveStage(){
  var name=document.getElementById('sgf-name').value.trim();if(!name){showToast('请输入名称');return}
  var key=document.getElementById('sgf-key').value.trim();if(!key){showToast('请输入标识');return}
  var color=document.getElementById('sgf-color').value;
  var prob=parseInt(document.getElementById('sgf-prob').value)||0;
  var body={company_id:currentCompanyId,stage_name:name,stage_key:key,color:color,probability:prob,updated_at:new Date().toISOString()};
  var resp;
  if(stageEditId){
    resp=await fetch(SUPABASE_URL+'/rest/v1/sales_stages_def?id=eq.'+stageEditId,{method:'PATCH',headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(body)});
  }else{
    body.sort_order=allSalesStages.length+1;body.created_at=new Date().toISOString();
    resp=await fetch(SUPABASE_URL+'/rest/v1/sales_stages_def',{method:'POST',headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(body)});
  }
  if(resp.ok){showToast('阶段已保存');closeStageForm();renderSalesStages();}else{showToast('保存失败')}
}
async function deleteStage(id){if(!confirm('确认删除？'))return;await fetch(SUPABASE_URL+'/rest/v1/sales_stages_def?id=eq.'+id,{method:'DELETE',headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY}});renderSalesStages();showToast('已删除');}

/* Custom Tags */
var allCustomTags=[],tagEditId=null;
async function renderCustomTags(){
  var el=document.getElementById('cfg-tag-list');if(!el)return;
  var resp=await fetch(SUPABASE_URL+'/rest/v1/custom_tags?company_id=eq.'+currentCompanyId+'&order=sort_order.asc',{headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY}});
  if(resp.ok)allCustomTags=await resp.json();else allCustomTags=[];
  var h='';
  for(var i=0;i<allCustomTags.length;i++){
    var t=allCustomTags[i];
    h+='<div style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:16px;background:'+escHtml(t.tag_color)+'20;border:1px solid '+escHtml(t.tag_color)+';color:'+escHtml(t.tag_color)+';font-size:13px;cursor:pointer" onclick="editTag('+t.id+')">'+escHtml(t.tag_name)+'<span onclick="event.stopPropagation();deleteTag('+t.id+')" style="cursor:pointer;font-size:16px;line-height:1">&times;</span></div>';
  }
  if(allCustomTags.length===0)h='<div style="text-align:center;padding:40px;color:var(--text3);width:100%">暂无标签，点击上方添加</div>';
  el.innerHTML=h;
}
function openTagForm(){
  tagEditId=null;document.getElementById('tag-form-title').textContent='添加标签';
  document.getElementById('tgf-name').value='';document.getElementById('tgf-color').value='#4F6EF7';
  document.getElementById('tag-form-modal').style.display='flex';
}
function closeTagForm(){document.getElementById('tag-form-modal').style.display='none';}
async function editTag(id){
  var t=null;for(var i=0;i<allCustomTags.length;i++){if(allCustomTags[i].id===id){t=allCustomTags[i];break;}}
  if(!t)return;tagEditId=id;document.getElementById('tag-form-title').textContent='编辑标签';
  document.getElementById('tgf-name').value=t.tag_name;document.getElementById('tgf-color').value=t.tag_color;
  document.getElementById('tag-form-modal').style.display='flex';
}
async function saveTag(){
  var name=document.getElementById('tgf-name').value.trim();if(!name){showToast('请输入标签名');return}
  var color=document.getElementById('tgf-color').value;
  var body={company_id:currentCompanyId,tag_name:name,tag_color:color,entity_type:'client',updated_at:new Date().toISOString()};
  var resp;
  if(tagEditId){
    resp=await fetch(SUPABASE_URL+'/rest/v1/custom_tags?id=eq.'+tagEditId,{method:'PATCH',headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(body)});
  }else{
    body.sort_order=allCustomTags.length;body.created_at=new Date().toISOString();
    resp=await fetch(SUPABASE_URL+'/rest/v1/custom_tags',{method:'POST',headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(body)});
  }
  if(resp.ok){showToast('标签已保存');closeTagForm();renderCustomTags();}else{showToast('保存失败')}
}
async function deleteTag(id){if(!confirm('确认删除？'))return;await fetch(SUPABASE_URL+'/rest/v1/custom_tags?id=eq.'+id,{method:'DELETE',headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY}});renderCustomTags();}

/* Numbering Rules */
var allNumRules=[],numEditId=null;
async function renderNumberingRules(){
  var el=document.getElementById('cfg-number-list');if(!el)return;
  var resp=await fetch(SUPABASE_URL+'/rest/v1/numbering_rules?company_id=eq.'+currentCompanyId+'&order=created_at.desc',{headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY}});
  if(resp.ok)allNumRules=await resp.json();else allNumRules=[];
  var entityNames={client:'客户',order:'订单',quotation:'报价',contract:'合同'};
  var h='';
  for(var i=0;i<allNumRules.length;i++){
    var r=allNumRules[i];var sample=r.prefix+'-'+(r.date_format==='none'?'' : '20260118')+'-'+String(r.current_seq).padStart(r.seq_length,'0');
    h+='<div class="card" style="padding:10px 16px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between"><div><strong style="font-family:monospace">'+escHtml(sample)+'</strong><span style="font-size:12px;color:var(--text3);margin-left:8px">'+(entityNames[r.entity_type]||r.entity_type)+'</span></div><div><a href="javascript:void(0)" onclick="editNumRule('+r.id+')" style="color:var(--primary);font-size:13px;margin-right:8px">编辑</a><a href="javascript:void(0)" onclick="deleteNumRule('+r.id+')" style="color:#ef4444;font-size:13px">删除</a></div></div>';
  }
  if(allNumRules.length===0)h='<div style="text-align:center;padding:40px;color:var(--text3)">暂未配置编号规则</div>';
  el.innerHTML=h;
}
function openNumberRule(){
  numEditId=null;document.getElementById('num-form-title').textContent='添加编号规则';
  document.getElementById('nmf-entity').value='client';document.getElementById('nmf-prefix').value='KH';
  document.getElementById('nmf-datefmt').value='YYYYMMDD';document.getElementById('nmf-seqlength').value='3';
  document.getElementById('num-form-modal').style.display='flex';
}
function closeNumberForm(){document.getElementById('num-form-modal').style.display='none';}
async function editNumRule(id){
  var r=null;for(var i=0;i<allNumRules.length;i++){if(allNumRules[i].id===id){r=allNumRules[i];break;}}
  if(!r)return;numEditId=id;document.getElementById('num-form-title').textContent='编辑编号规则';
  document.getElementById('nmf-entity').value=r.entity_type;document.getElementById('nmf-prefix').value=r.prefix||'';
  document.getElementById('nmf-datefmt').value=r.date_format||'YYYYMMDD';document.getElementById('nmf-seqlength').value=r.seq_length||3;
  document.getElementById('num-form-modal').style.display='flex';
}
async function saveNumberRule(){
  var entity=document.getElementById('nmf-entity').value;
  var prefix=document.getElementById('nmf-prefix').value.trim();
  var datefmt=document.getElementById('nmf-datefmt').value;
  var seqlength=parseInt(document.getElementById('nmf-seqlength').value)||3;
  var body={company_id:currentCompanyId,entity_type:entity,prefix:prefix,date_format:datefmt,seq_length:seqlength,updated_at:new Date().toISOString()};
  var resp;
  if(numEditId){
    resp=await fetch(SUPABASE_URL+'/rest/v1/numbering_rules?id=eq.'+numEditId,{method:'PATCH',headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(body)});
  }else{
    body.current_seq=1;body.created_at=new Date().toISOString();
    resp=await fetch(SUPABASE_URL+'/rest/v1/numbering_rules',{method:'POST',headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(body)});
  }
  if(resp.ok){showToast('规则已保存');closeNumberForm();renderNumberingRules();}else{showToast('保存失败')}
}
async function deleteNumRule(id){if(!confirm('确认删除？'))return;await fetch(SUPABASE_URL+'/rest/v1/numbering_rules?id=eq.'+id,{method:'DELETE',headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY}});renderNumberingRules();}

/* ===== DATA SECURITY ===== */
async function renderSecurityPanel(){
  // Export permission for each role
  var el=document.getElementById('sec-export-roles');if(!el)return;
  var h='';var roles=(allRoles||[]).slice();
  for(var i=0;i<roles.length;i++){
    var r=roles[i];var fp=typeof r.func_perms==='string'?JSON.parse(r.func_perms):(r.func_perms||{});
    var canExport=fp.allow_export===true;
    h+='<label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;cursor:pointer"><input type="checkbox" '+(canExport?'checked':'')+' onchange="toggleRoleExport(\''+escHtml(r.name)+'\','+r.id+',this.checked)"> '+escHtml(r.name)+'</label>';
  }
  el.innerHTML=h;
  // Load masking settings from localStorage
  var dm=JSON.parse(localStorage.getItem('dataMasking_'+currentCompanyId)||'{}');
  document.getElementById('dm-mobile').checked=!!dm.hide_mobile;
  document.getElementById('dm-price').checked=!!dm.hide_price;
  document.getElementById('dm-email').checked=!!dm.hide_email;
}
function toggleDataMasking(){
  var dm={hide_mobile:document.getElementById('dm-mobile').checked,hide_price:document.getElementById('dm-price').checked,hide_email:document.getElementById('dm-email').checked};
  localStorage.setItem('dataMasking_'+currentCompanyId,JSON.stringify(dm));
  showToast('脱敏设置已保存');
}
async function toggleRoleExport(roleName,roleId,checked){
  var resp=await fetch(SUPABASE_URL+'/rest/v1/roles?id=eq.'+roleId,{method:'PATCH',headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify({func_perms:{allow_export:checked}})});
  if(resp.ok)showToast('导出权限已更新');else showToast('更新失败');
}
async function doBackup(){
  var types=[];
  var checks={clients:'bk-clients',contacts:'bk-contacts',orders:'bk-orders',products:'bk-products'};
  var labels={clients:'客户',contacts:'联系人',orders:'订单',products:'产品'};
  for(var k in checks){if(document.getElementById(checks[k]).checked)types.push(k);}
  if(types.length===0){showToast('请选择要备份的数据类型');return}
  showToast('正在备份...');
  var allData={};var totalCount=0;
  for(var i=0;i<types.length;i++){
    var t=types[i];
    var resp=await fetch(SUPABASE_URL+'/rest/v1/'+(t==='products'?'products':t)+'?company_id=eq.'+currentCompanyId+'&limit=10000',{headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY}});
    if(resp.ok){var data=await resp.json();allData[t]=data;totalCount+=data.length;}
  }
  var json=JSON.stringify(allData,null,2);
  var blob=new Blob(['\uFEFF'+json],{type:'application/json;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='backup_'+currentCompanyId+'_'+new Date().toISOString().slice(0,10)+'.json';a.click();
  // Log backup
  try{
    await fetch(SUPABASE_URL+'/rest/v1/backup_logs',{method:'POST',headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'Content-Type':'application/json'},body:JSON.stringify({company_id:currentCompanyId,user_id:currentUser?currentUser.id:null,backup_type:'manual',entity_types:types,record_count:totalCount,file_name:'backup_'+currentCompanyId+'.json',file_size:json.length,created_at:new Date().toISOString()})});
  }catch(e){}
  showToast('备份完成！共'+totalCount+'条记录');
  await writeOpLog('export','backup','','数据备份',{types:types,count:totalCount});
}
async function loadBackupHistory(){
  var el=document.getElementById('bk-history');if(!el)return;
  var resp=await fetch(SUPABASE_URL+'/rest/v1/backup_logs?company_id=eq.'+currentCompanyId+'&order=created_at.desc&limit=20',{headers:{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_KEY}});
  if(!resp.ok){el.innerHTML='加载失败';return}
  var logs=await resp.json();
  if(logs.length===0){el.innerHTML='暂无备份记录';return}
  var h='<table style="width:100%;font-size:12px;margin-top:8px"><thead><tr style="border-bottom:1px solid var(--border)"><th style="padding:6px;text-align:left">时间</th><th style="padding:6px;text-align:left">类型</th><th style="padding:6px;text-align:left">记录数</th></tr></thead><tbody>';
  for(var i=0;i<logs.length;i++){
    var l=logs[i];h+='<tr><td style="padding:6px">'+new Date(l.created_at).toLocaleString('zh-CN')+'</td><td style="padding:6px">'+(l.backup_type==='auto'?'自动':'手动')+'</td><td style="padding:6px">'+(l.record_count||0)+'</td></tr>';
  }
  h+='</tbody></table>';el.innerHTML=h;
}

/* ===== EXTEND PERMISSION MATRIX ===== */
/* ADD data scope / func perms / field perms to renderAdminPerms */
/* Override: extend renderAdminPerms to include advanced permissions */
var _origRenderAdminPerms=null;
function extendPermissionMatrix(){
  // This is called after the original renderAdminPerms if needed
  // For now, the existing permission matrix handles module-level perms
  // Advanced perms (data scope, func, field) are managed via employee panel
}
'''

if insert_pos > 0:
    content = content[:insert_pos] + new_js + '\n</script>\n</body>\n</html>'
    print('PATCH 4 OK: JS functions inserted')
else:
    print('PATCH 4 FAIL: insert point not found')

with open(r"D:\1kaifa\grsds\index.html", 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
print(f'Final file: {len(content.splitlines())} lines')
