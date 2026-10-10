// ==========================================================================
// grsds · 14-hr-config.js  —  员工管理 · 操作日志 · 配置中心 · 数据安全
// 源: js/app_v2.js 第 9874-10402 行（机械切片，未改一行代码）
// ==========================================================================
/* ===== EMPLOYEE MANAGEMENT ===== */
async function renderAdminEmployees(){
  var el=document.getElementById('admin-emp-list');if(!el)return;
  var q=(document.getElementById('admin-emp-search').value||'').toLowerCase();
  var df=document.getElementById('emp-dept-filter').value;
  var sf=document.getElementById('emp-status-filter').value;
  // Build dept filter options
  var ds=document.getElementById('emp-dept-filter');
  ds.innerHTML='<option value="">全部部门</option>';
  if(allDepartments)for(var i=0;i<allDepartments.length;i++){var d=allDepartments[i];ds.innerHTML+='<option value="'+escHtml(d.id)+'">'+escHtml(d.name)+'</option>';}
  ds.value=df;
  var list=(allUsers||[]).filter(function(u){
    if(!isSuperAdmin&&currentCompanyId!==null&&u.company_id!==currentCompanyId)return false;
    return true;
  });
  if(df)list=list.filter(function(u){return u.dept_id==df;});
  if(sf)list=list.filter(function(u){return u.status===sf;});
  if(q)list=list.filter(function(u){return (u.display_name||'').toLowerCase().indexOf(q)>=0||(u.email||'').toLowerCase().indexOf(q)>=0||(u.position||'').toLowerCase().indexOf(q)>=0;});
  var h='<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:2px solid var(--border)"><th style="padding:10px 8px;text-align:left">姓名</th><th style="padding:10px 8px;text-align:left">邮箱</th><th style="padding:10px 8px;text-align:left">公司</th><th style="padding:10px 8px;text-align:left">手机</th><th style="padding:10px 8px;text-align:left">岗位</th><th style="padding:10px 8px;text-align:left">角色</th><th style="padding:10px 8px;text-align:left">部门</th><th style="padding:10px 8px;text-align:left">状态</th><th style="padding:10px 8px;text-align:left">最后登录</th><th style="padding:10px 8px;text-align:center">操作</th></tr></thead><tbody>';
  for(var j=0;j<list.length;j++){
    var u=list[j];var dn=u.display_name||'';var em=u.email||'';var rn=u.role||'';var did=u.department_id||u.dept_id||'';
    var deptName='';for(var k=0;k<(allDepartments||[]).length;k++){if(allDepartments[k].id==did){deptName=allDepartments[k].name;break;}}
    var companyName='-';var cab2=typeof allAdminCompanies!=='undefined'?allAdminCompanies:allCompanies||[];for(var ci=0;ci<cab2.length;ci++){if(cab2[ci].id===u.company_id){companyName=cab2[ci].name;break}}
    var statusLabel=u.status==='inactive'?'<span style="color:#ef4444">离职</span>':'<span style="color:#10b981">在职</span>';
    h+='<tr style="border-bottom:1px solid var(--border)"><td style="padding:8px">'+escHtml(dn)+'</td><td style="padding:8px">'+escHtml(em)+'</td><td style="padding:8px">'+escHtml(companyName)+'</td><td style="padding:8px">'+escHtml(u.phone||'-')+'</td><td style="padding:8px">'+escHtml(u.position||'-')+'</td><td style="padding:8px">'+escHtml(rn)+'</td><td style="padding:8px">'+escHtml(deptName)+'</td><td style="padding:8px">'+statusLabel+'</td><td style="padding:8px;font-size:12px;color:var(--text3)">'+escHtml(u.last_login_at?formatDateTime(u.last_login_at):'从未登录')+'</td><td style="padding:8px;text-align:center;white-space:nowrap"><a href="javascript:void(0)" onclick="openUserEditForm(\''+u.user_id+'\')" style="color:var(--primary);font-size:13px">编辑</a> <a href="javascript:void(0)" onclick="openResetPwdForm(\''+u.user_id+'\',\''+jsStr(dn||em)+'\')" style="color:var(--warning);font-size:13px;margin-left:8px">重置密码</a></td></tr>';
  }
  h+='</tbody></table>';
  if(list.length===0)h='<div style="text-align:center;padding:40px;color:var(--text3)">暂无匹配员工</div>';
  el.innerHTML=h;
}

// === Email Invitation ===
function openInviteModal(){
  document.getElementById('invite-email').value='';
  document.getElementById('invite-msg').value='';
  document.getElementById('invite-err').style.display='none';
  document.getElementById('invite-modal').style.display='flex';
}
function closeInviteModal(){
  document.getElementById('invite-modal').style.display='none';
}
async function sendInvitationByEmail(){
  var email=document.getElementById('invite-email').value.trim();
  var msgEl=document.getElementById('invite-msg');
  var message=(msgEl&&msgEl.value?msgEl.value.trim():'');
  if(!email){document.getElementById('invite-err').textContent='请输入邮箱地址';document.getElementById('invite-err').style.display='block';return}
  if(!/^[^@]+@[^@]+$/.test(email)){document.getElementById('invite-err').textContent='邮箱格式不正确';document.getElementById('invite-err').style.display='block';return}
  try{
    var check=await callAdmin('select','invitations',{query:'*',filters:[{col:'to_email',op:'eq',val:email},{col:'from_company_id',op:'eq',val:currentCompanyId},{col:'status',op:'eq',val:'pending'}]});
    if(check&&check.data){var existing=check.data;if(existing&&existing.length>0){document.getElementById('invite-err').textContent='该邮箱已有待处理的邀请';document.getElementById('invite-err').style.display='block';return}}
    var userCheck=await callAdmin('select','profiles',{query:'user_id,company_id',filters:[{col:'email',op:'eq',val:email}]});
    var userData=null;if(userCheck&&userCheck.data){var ua=userCheck.data;if(ua&&ua.length>0)userData=ua[0]}
    var r=await callAdmin('insert','invitations',{payload:{from_company_id:currentCompanyId,to_email:email,message:message||null}});
    if(r&&r.error){var j=r.error.catch(function(){});document.getElementById('invite-err').textContent='发送失败: '+(j&&j.message||r.statusText);document.getElementById('invite-err').style.display='block';return}
    closeInviteModal();
    var msg=userData&&userData.company_id?'该用户当前在职，但已发送邀请（需先离职才能接受）。':'邀请已发送，用户将在通知面板看到邀请。';
    if(!userData)msg='邀请已发送。该邮箱尚未注册，用户注册后将自动看到邀请。';
    showToast(msg);
  }catch(e){document.getElementById('invite-err').textContent='发送失败: '+e.message;document.getElementById('invite-err').style.display='block'}
}

// === Employee side: load my invitations ===


// === Free Agent Pool ===
var allFreeAgents=[];
async function loadFreeAgents(){
  try{
    var r=await callAdmin('select','profiles',{query:'user_id,email,display_name,phone,status,invited_company_id,invited_at',filters:[{col:'status',op:'eq',val:'leave'},{col:'company_id',op:'is',val:null},{col:'',op:'order',val:'invited_at.asc.nullslast'}]});
    if(r&&r.data)allFreeAgents=r.data;
    else allFreeAgents=[];
  }catch(e){allFreeAgents=[];console.error('loadFreeAgents',e)}
}
function renderFreeAgents(){
  var el=document.getElementById('admin-fa-list');
  var q=(document.getElementById('fa-search').value||'').trim().toLowerCase();
  var list=allFreeAgents;
  if(q)list=list.filter(function(u){return(u.email||'').toLowerCase().indexOf(q)>=0||(u.display_name||'').toLowerCase().indexOf(q)>=0||(u.phone||'').toLowerCase().indexOf(q)>=0});
  if(list.length===0){el.innerHTML='<div style="text-align:center;padding:40px;color:var(--muted)">暂无自由员工</div>';return}
  var h='<table class="data-table"><thead><tr><th>姓名</th><th>邮箱</th><th>电话</th><th>状态</th><th>操作</th></tr></thead><tbody>';
  for(var i=0;i<list.length;i++){
    var u=list[i];
    var badge='离职';
    if(u.invited_company_id)badge='已邀请';
    h+='<tr><td>'+escHtml(u.display_name||'-')+'</td><td>'+escHtml(u.email||'-')+'</td><td>'+escHtml(u.phone||'-')+'</td><td><span class="badge '+(u.invited_company_id?'badge-info':'badge-warn')+'">'+badge+'</span></td><td>';
    if(!u.invited_company_id){
      h+='<button class="btn-save" style="padding:4px 12px;font-size:12px" onclick="inviteFreeAgent(\''+u.user_id+'\',\''+escHtml(u.email||'')+'\')">邀请入职</button>';
    }else{
      h+='<span style="font-size:12px;color:var(--muted)">等待接受</span>';
    }
    h+='</td></tr>';
  }
  h+='</tbody></table>';
  el.innerHTML=h;
}
async function inviteFreeAgent(uid,email){
  if(!await uiConfirm('确认邀请 '+email+' 入职本公司？'))return;
  try{
    var r=await callAdmin('update','profiles',{payload:{invited_company_id:currentCompanyId,invited_at:new Date().toISOString()},filters:[{col:'user_id',op:'eq',val:uid}],query:'*'});
    if(r&&r.error){var j=r.error.catch(function(){});showToast('邀请失败: '+(j&&j.message||r.statusText));return}
    showToast('邀请已发送');
    await loadFreeAgents();renderFreeAgents();
  }catch(e){showToast('邀请失败: '+e.message)}
}



// === Resignation ===
function openResignForm(){
  var today=new Date();today.setDate(today.getDate()+30);
  document.getElementById('resign-date').value=today.toISOString().split('T')[0];
  document.getElementById('resign-reason').value='';
  document.getElementById('resign-form-err').style.display='none';
  document.getElementById('resign-form-modal').style.display='flex';
}
function closeResignForm(){
  document.getElementById('resign-form-modal').style.display='none';
}
async function submitResignation(){
  var dateVal=document.getElementById('resign-date').value;
  var reason=document.getElementById('resign-reason').value.trim();
  if(!dateVal){document.getElementById('resign-form-err').textContent='请选择预期离职日期';document.getElementById('resign-form-err').style.display='block';return}
  var d=new Date(dateVal);var today=new Date();today.setHours(0,0,0,0);
  if(d<today){document.getElementById('resign-form-err').textContent='离职日期不能是过去';document.getElementById('resign-form-err').style.display='block';return}
  try{
    var r=await callAdmin('update','profiles',{payload:{resignation_status:'pending',resignation_date:dateVal,resignation_reason:reason||null,resignation_requested_at:new Date().toISOString()},filters:[{col:'user_id',op:'eq',val:currentUser.id}],query:'*'});
    if(r&&r.error){var j=r.error.catch(function(){});document.getElementById('resign-form-err').textContent='提交失败: '+(j&&j.message||r.statusText);document.getElementById('resign-form-err').style.display='block';return}
    closeResignForm();showToast('离职申请已提交，等待管理员审批');
    document.getElementById('my-resign-btn').style.display='none';
  }catch(e){document.getElementById('resign-form-err').textContent='提交失败: '+e.message;document.getElementById('resign-form-err').style.display='block'}
}
var allResignations=[];
async function loadResignations(){
  try{
    var r=await callAdmin('select','profiles',{query:'user_id,email,display_name,phone,position,department_id,resignation_status,resignation_date,resignation_reason,resignation_requested_at',filters:[{col:'company_id',op:'eq',val:currentCompanyId},{col:'resignation_status',op:'not.is',val:null},{col:'',op:'order',val:'resignation_requested_at.desc'}]});
    if(r&&r.data)allResignations=r.data;
    else allResignations=[];
  }catch(e){allResignations=[];console.error('loadResignations',e)}
}
function renderResignations(){
  var el=document.getElementById('admin-resign-list');
  var filter=document.getElementById('resign-filter').value;
  var list=allResignations;
  if(filter!=='all')list=list.filter(function(r){return r.resignation_status===filter});
  if(list.length===0){el.innerHTML='<div style="text-align:center;padding:40px;color:var(--muted)">暂无离职申请</div>';return}
  var h='<table class="data-table"><thead><tr><th>姓名</th><th>邮箱</th><th>岗位</th><th>离职日期</th><th>原因</th><th>状态</th><th>操作</th></tr></thead><tbody>';
  for(var i=0;i<list.length;i++){
    var r=list[i];
    var statusText={'pending':'待审批','approved':'已通过','rejected':'已拒绝'}[r.resignation_status]||r.resignation_status;
    var statusCls={'pending':'badge-warn','approved':'badge-success','rejected':'badge-danger'}[r.resignation_status]||'';
    h+='<tr><td>'+escHtml(r.display_name||'-')+'</td><td>'+escHtml(r.email||'-')+'</td><td>'+escHtml(r.position||'-')+'</td><td>'+escHtml(r.resignation_date||'-')+'</td><td>'+escHtml((r.resignation_reason||'').substring(0,30))+'</td><td><span class="badge '+statusCls+'">'+statusText+'</span></td><td>';
    if(r.resignation_status==='pending'){
      h+='<button class="btn-save" style="padding:4px 12px;font-size:12px;margin-right:4px" onclick="approveResignation(\''+r.user_id+'\')">通过</button>';
      h+='<button class="btn-cancel" style="padding:4px 12px;font-size:12px" onclick="rejectResignation(\''+r.user_id+'\')">拒绝</button>';
    }
    h+='</td></tr>';
  }
  h+='</tbody></table>';
  el.innerHTML=h;
}
async function approveResignation(uid){
  if(!await uiConfirm('确认通过该离职申请？'))return;
  try{
    var r=await callAdmin('update','profiles',{payload:{resignation_status:'approved'},filters:[{col:'user_id',op:'eq',val:uid}],query:'*'});
    if(r&&r.error){var j=r.error.catch(function(){});showToast('操作失败: '+(j&&j.message||r.statusText));return}
    showToast('已通过离职申请，到期后将自动解除');
    await loadResignations();renderResignations();
  }catch(e){showToast('操作失败: '+e.message)}
}
async function rejectResignation(uid){
  if(!await uiConfirm('确认拒绝该离职申请？'))return;
  try{
    var r=await callAdmin('update','profiles',{payload:{resignation_status:'rejected'},filters:[{col:'user_id',op:'eq',val:uid}],query:'*'});
    if(r&&r.error){var j=r.error.catch(function(){});showToast('操作失败: '+(j&&j.message||r.statusText));return}
    showToast('已拒绝离职申请');
    await loadResignations();renderResignations();
  }catch(e){showToast('操作失败: '+e.message)}
}


/* ===== OPERATION LOGS ===== */
var allOpLogs=[];var logsError=null;
async function loadOperationLogs(){
  try{
    var resp=await callAdmin('select','operation_logs',{query:'*',filters:[{col:'company_id',op:'eq',val:currentCompanyId},{col:'',op:'order',val:'created_at.desc'},{col:'',op:'limit',val:500}]});
    if(resp&&resp.data){allOpLogs=resp.data;logsError=null;}
    else{allOpLogs=[];var t=await resp.text();logsError='HTTP '+resp.status+(' '+t.substring(0,120));console.error('loadOperationLogs:',resp.status,t.substring(0,200));}
  }catch(e){allOpLogs=[];logsError=e.message;console.error('loadOperationLogs:',e);}
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
  if(list.length===0){
    if(logsError)h='<div style="text-align:center;padding:40px;color:var(--text3)"><p>&#x26A0;&#xFE0F; 日志加载失败</p><p style="font-size:12px;margin-top:8px;color:var(--text3)">'+escHtml(logsError)+'</p><p style="font-size:11px;margin-top:12px;color:var(--primary);cursor:pointer" onclick="navigator.clipboard.writeText(\'operation_logs.sql\').then(function(){showToast(\'已复制文件名\')})">📋 请执行 operation_logs.sql → 点此复制文件名</p></div>';
    else h='<div style="text-align:center;padding:40px;color:var(--text3)">暂无操作记录</div>';
  }
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
    await callAdmin('rpc','write_op_log',{payload:body});
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
  var resp=await callAdmin('select','custom_field_defs',{query:'*',filters:[{col:'company_id',op:'eq',val:currentCompanyId},{col:'entity_type',op:'eq',val:et},{col:'',op:'order',val:'sort_order.asc'}]});
  if(resp&&resp.data)allCustomFields=resp.data;else allCustomFields=[];
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
  refreshCaptcha();
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
    resp=await callAdmin('update','custom_field_defs',{payload:body,filters:[{col:'id',op:'eq',val:fieldEditId}],query:'*'});
  }else{
    body.sort_order=allCustomFields.length;body.created_at=new Date().toISOString();
    resp=await callAdmin('insert','custom_field_defs',{payload:body});
  }
  if(resp&&resp.data){showToast('字段已保存');closeFieldForm();renderCustomFields();await writeOpLog(fieldEditId?'update':'create','custom_field',fieldEditId||'',label);}
  else{showToast('保存失败')}
}
async function deleteField(id){
  if(!await uiConfirm('确认删除此字段？'))return;
  var resp=await callAdmin('delete','custom_field_defs',{filters:[{col:'id',op:'eq',val:id}]});
  if(resp&&resp.data){showToast('已删除');renderCustomFields();}else{showToast('删除失败')}
}

/* Custom Forms */
var allCustomForms=[];
async function renderCustomForms(){
  var el=document.getElementById('cfg-form-list');if(!el)return;
  var resp=await callAdmin('select','custom_forms',{query:'*',filters:[{col:'company_id',op:'eq',val:currentCompanyId},{col:'',op:'order',val:'created_at.desc'}]});
  if(resp&&resp.data)allCustomForms=resp.data;else allCustomForms=[];
  var h='';
  for(var i=0;i<allCustomForms.length;i++){
    var f=allCustomForms[i];var fc=typeof f.fields==='string'?JSON.parse(f.fields):(f.fields||[]);
    h+='<div class="card" style="padding:12px 16px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between"><div><strong>'+escHtml(f.form_name)+'</strong><span style="font-size:12px;color:var(--text3);margin-left:8px">'+escHtml(f.entity_type)+' · '+fc.length+'个字段</span></div><div><a href="javascript:void(0)" onclick="editForm('+f.id+')" style="color:var(--primary);font-size:13px;margin-right:8px">编辑</a><a href="javascript:void(0)" onclick="deleteForm('+f.id+')" style="color:#ef4444;font-size:13px">删除</a></div></div>';
  }
  if(allCustomForms.length===0)h='<div style="text-align:center;padding:40px;color:var(--text3)">暂无自定义表单</div>';
  el.innerHTML=h;
}
async function openFormBuilder(){
  var name=await uiPrompt('请输入表单名称:');if(!name)return;
  var et=await uiPrompt('实体类型(client/order/lead):','client');if(!et)return;
  // Simple: create with empty fields
  callAdmin('insert','custom_forms',{payload:{company_id:currentCompanyId,form_name:name,entity_type:et,fields:[],created_at:new Date().toISOString()}}).then(function(r){if(r.data){showToast('Form created');renderCustomForms();}}).catch(function(){showToast('Create failed');});
}
async function deleteForm(id){if(!await uiConfirm('确认删除？'))return;await callAdmin('delete','custom_forms',{filters:[{col:'id',op:'eq',val:id}]});renderCustomForms();showToast('已删除');}

/* Sales Stages */
var allSalesStages=[],stageEditId=null;
async function renderSalesStages(){
  var el=document.getElementById('cfg-stage-list');if(!el)return;
  var resp=await callAdmin('select','sales_stages_def',{query:'*',filters:[{col:'company_id',op:'eq',val:currentCompanyId},{col:'',op:'order',val:'sort_order.asc'}]});
  if(resp&&resp.data)allSalesStages=resp.data;else allSalesStages=[];
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
    resp=await callAdmin('update','sales_stages_def',{payload:body,filters:[{col:'id',op:'eq',val:stageEditId}],query:'*'});
  }else{
    body.sort_order=allSalesStages.length+1;body.created_at=new Date().toISOString();
    resp=await callAdmin('insert','sales_stages_def',{payload:body});
  }
  if(resp&&resp.data){showToast('阶段已保存');closeStageForm();renderSalesStages();}else{showToast('保存失败')}
}
async function deleteStage(id){if(!await uiConfirm('确认删除？'))return;await callAdmin('delete','sales_stages_def',{filters:[{col:'id',op:'eq',val:id}]});renderSalesStages();showToast('已删除');}

/* Custom Tags */
var allCustomTags=[],tagEditId=null;
async function renderCustomTags(){
  var el=document.getElementById('cfg-tag-list');if(!el)return;
  var resp=await callAdmin('select','custom_tags',{query:'*',filters:[{col:'company_id',op:'eq',val:currentCompanyId},{col:'',op:'order',val:'sort_order.asc'}]});
  if(resp&&resp.data)allCustomTags=resp.data;else allCustomTags=[];
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
    resp=await callAdmin('update','custom_tags',{payload:body,filters:[{col:'id',op:'eq',val:tagEditId}],query:'*'});
  }else{
    body.sort_order=allCustomTags.length;body.created_at=new Date().toISOString();
    resp=await callAdmin('insert','custom_tags',{payload:body});
  }
  if(resp&&resp.data){showToast('标签已保存');closeTagForm();renderCustomTags();}else{showToast('保存失败')}
}
async function deleteTag(id){if(!await uiConfirm('确认删除？'))return;await callAdmin('delete','custom_tags',{filters:[{col:'id',op:'eq',val:id}]});renderCustomTags();}

/* Numbering Rules */
var allNumRules=[],numEditId=null;
async function renderNumberingRules(){
  var el=document.getElementById('cfg-number-list');if(!el)return;
  var resp=await callAdmin('select','numbering_rules',{query:'*',filters:[{col:'company_id',op:'eq',val:currentCompanyId},{col:'',op:'order',val:'created_at.desc'}]});
  if(resp&&resp.data)allNumRules=resp.data;else allNumRules=[];
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
    resp=await callAdmin('update','numbering_rules',{payload:body,filters:[{col:'id',op:'eq',val:numEditId}],query:'*'});
  }else{
    body.current_seq=1;body.created_at=new Date().toISOString();
    resp=await callAdmin('insert','numbering_rules',{payload:body});
  }
  if(resp&&resp.data){showToast('规则已保存');closeNumberForm();renderNumberingRules();}else{showToast('保存失败')}
}
async function deleteNumRule(id){if(!await uiConfirm('确认删除？'))return;await callAdmin('delete','numbering_rules',{filters:[{col:'id',op:'eq',val:id}]});renderNumberingRules();}

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
  var resp=await callAdmin('update','roles',{payload:{func_perms:{allow_export:checked}},filters:[{col:'id',op:'eq',val:roleId}],query:'*'});
  if(resp&&resp.data)showToast('导出权限已更新');else showToast('更新失败');
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
    var resp=await callAdmin('select',(t==='products'?'products':t),{query:'*',filters:[{col:'company_id',op:'eq',val:currentCompanyId},{col:'',op:'limit',val:'10000'}]});
    if(resp&&resp.data){var data=resp.data;allData[t]=data;totalCount+=data.length;}
  }
  var json=JSON.stringify(allData,null,2);
  var blob=new Blob(['\uFEFF'+json],{type:'application/json;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='backup_'+currentCompanyId+'_'+new Date().toISOString().slice(0,10)+'.json';a.click();
  // Log backup
  try{
    await callAdmin('insert','backup_logs',{payload:{company_id:currentCompanyId,user_id:currentUser?currentUser.id:null,backup_type:'manual',entity_types:types,record_count:totalCount,file_name:'backup_'+currentCompanyId+'.json',file_size:json.length,created_at:new Date().toISOString()}});
  }catch(e){}
  showToast('备份完成！共'+totalCount+'条记录');
  await writeOpLog('export','backup','','数据备份',{types:types,count:totalCount});
}
async function loadBackupHistory(){
  var el=document.getElementById('bk-history');if(!el)return;
  var resp=await callAdmin('select','backup_logs',{query:'*',filters:[{col:'company_id',op:'eq',val:currentCompanyId},{col:'',op:'order',val:'created_at.desc'},{col:'',op:'limit',val:20}]});
  if(resp&&resp.error){el.innerHTML='加载失败';return}
  var logs=resp.data;
  if(logs.length===0){el.innerHTML='暂无备份记录';return}
  var h='<table style="width:100%;font-size:12px;margin-top:8px"><thead><tr style="border-bottom:1px solid var(--border)"><th style="padding:6px;text-align:left">时间</th><th style="padding:6px;text-align:left">类型</th><th style="padding:6px;text-align:left">记录数</th></tr></thead><tbody>';
  for(var i=0;i<logs.length;i++){
    var l=logs[i];h+='<tr><td style="padding:6px">'+new Date(l.created_at).toLocaleString('zh-CN')+'</td><td style="padding:6px">'+(l.backup_type==='auto'?'自动':'手动')+'</td><td style="padding:6px">'+(l.record_count||0)+'</td></tr>';
  }
  h+='</tbody></table>';el.innerHTML=h;
}

