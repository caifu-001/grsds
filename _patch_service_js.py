# -*- coding: utf-8 -*-
"""After-Sales JS functions injector"""
import re

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Insert before closing </script> 
# Find insertion point: a unique anchor near the end of the script
anchor = '// Inventory tab switching'
if anchor not in html:
    # Fallback: find the inventory section divider
    anchor2 = '// ═══════════ INVENTORY ═══════════'
    if anchor2 in html:
        pass
    else:
        print('Anchor not found, searching...')
        # Find the last function before </script>
        idx = html.rfind('function ')
        print(f'Last function at index {idx}: {html[idx:idx+60]}')

# Better: insert just before the INVENTORY divider
inventory_divider = '// ═══════════ INVENTORY ═══════════'
after_sales_js = '''// ═══════════ AFTER-SALES SERVICE ═══════════
var svEditId=null; var allTickets=[],allVisits=[],allWarranties=[],allMaintenance=[],allKB=[];

function switchServiceTab(sub){
  var tabs=document.querySelectorAll('#moresubs-after .sub-tab');
  for(var i=0;i<tabs.length;i++)tabs[i].classList.remove('active');
  var panels=['sv-tickets','sv-visits','sv-warranty','sv-kb'];
  for(var j=0;j<panels.length;j++){var p=document.getElementById(panels[j]);if(p)p.classList.add('hidden')}
  var tp=document.getElementById('sv-'+sub);if(tp)tp.classList.remove('hidden');
  var btns=document.querySelectorAll('#moresubs-after .sub-tab');
  var map={tickets:0,visits:1,warranty:2,kb:3};
  if(btns[map[sub]]!=null)btns[map[sub]].classList.add('active');
  if(sub==='tickets')loadTickets();
  else if(sub==='visits'){loadVisits();loadVisitTasks()}
  else if(sub==='warranty'){loadWarranties();loadMaintenancePlans()}
  else if(sub==='kb')loadKB();
}

// ── Tickets ──
async function loadTickets(){
  var grid=document.getElementById('ticket-grid');grid.innerHTML='<div class="loading"><span class="spinner"></span>加载中...</div>';
  var{data,error}=await sb.from('service_tickets').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
  if(error){grid.innerHTML='<div class="empty">加载失败: '+error.message+'</div>';return}
  allTickets=data||[];renderTickets();
}
function renderTickets(){
  var list=allTickets||[];
  var sf=document.getElementById('ticket-status-filter'),tf=document.getElementById('ticket-type-filter');
  var sr=document.getElementById('ticket-search');
  if(sf&&sf.value!=='all')list=list.filter(function(x){return x.status===sf.value});
  if(tf&&tf.value!=='all')list=list.filter(function(x){return x.type===tf.value});
  if(sr){var sq=sr.value.trim().toLowerCase();if(sq)list=list.filter(function(x){return(x.title||'').toLowerCase().indexOf(sq)>=0||(x.description||'').toLowerCase().indexOf(sq)>=0})}
  var grid=document.getElementById('ticket-grid'),empty=document.getElementById('ticket-empty');
  if(!list.length){grid.innerHTML='';empty.classList.remove('hidden');return}
  empty.classList.add('hidden');
  var sm={pending:'待处理',dispatched:'已派单',in_progress:'处理中',completed:'已完成',confirmed:'已确认',closed:'已关闭'};
  var tm={complaint:'投诉',repair:'报修',service:'服务',other:'其他'};
  var pm={urgent:'🔴紧急',high:'🟠高',normal:'🟢普通',low:'⚪低'};
  var h='';for(var i=0;i<list.length;i++){var t=list[i];
    h+='<div class="lead-card" onclick="openTicketForm(\''+t.id+'\')">';
    h+='<div class="lead-name">'+h(t.title)+' <span style="font-size:11px;color:var(--text3)">#'+(t.ticket_no||t.id)+'</span></div>';
    h+='<div class="lead-meta"><span class="lead-status-badge '+t.status+'">'+(sm[t.status]||t.status)+'</span>';
    h+='<span>'+h(tm[t.type]||t.type)+'</span><span>'+h(pm[t.priority]||'')+'</span>';
    if(t.engineer_name)h+='<span>🔧 '+h(t.engineer_name)+'</span>';
    h+='</div>';
    if(t.description)h+='<div style="font-size:12px;color:var(--text2);margin-top:4px">'+h(t.description).substring(0,80)+'</div>';
    h+='<div class="lead-actions"><button class="btn-lead-primary" onclick="event.stopPropagation();changeTicketStatus(\''+t.id+'\',\''+(t.status==='pending'?'dispatched':t.status==='dispatched'?'in_progress':t.status==='in_progress'?'completed':t.status==='completed'?'confirmed':'closed')+'\')">'+(t.status==='pending'?'派单':t.status==='dispatched'?'开始处理':t.status==='in_progress'?'完工':'关闭')+'</button>';
    h+='<button onclick="event.stopPropagation();openTicketForm(\''+t.id+'\')">编辑</button><button class="btn-lead-danger" onclick="event.stopPropagation();confirmDialog(\'确定删除该工单？\',async function(){await sb.from(\'service_tickets\').delete().eq(\'id\',\''+t.id+'\');loadTickets()})">删除</button></div></div>';
  }
  grid.innerHTML=h;
}
function openTicketForm(id){
  svEditId=id||null;
  var t=id?allTickets.find(function(x){return x.id===id}):null;
  document.getElementById('ticket-form-title').textContent=id?'编辑工单':'新建工单';
  document.getElementById('tf-title').value=t?t.title||'':'';
  document.getElementById('tf-type').value=t?t.type||'service':'service';
  document.getElementById('tf-priority').value=t?t.priority||'normal':'normal';
  document.getElementById('tf-engineer').value=t?t.engineer_name||'':'';
  document.getElementById('tf-desc').value=t?t.description||'':'';
  document.getElementById('tf-completion').value=t?t.completion_notes||'':'';
  document.getElementById('tf-satisfaction').value=t?t.satisfaction_rating||5:5;
  // Populate client dropdown
  var cs=document.getElementById('tf-client');cs.innerHTML='<option value="">不关联</option>';
  if(allClients)for(var i=0;i<allClients.length;i++){var c=allClients[i];cs.innerHTML+='<option value="'+c.id+'"'+(t&&t.client_id===c.id?' selected':'')+'>'+h(c.name)+'</option>'}
  document.getElementById('ticket-modal').classList.remove('hidden');
}
function closeTicketForm(){document.getElementById('ticket-modal').classList.add('hidden');svEditId=null}
async function saveTicket(){
  var title=document.getElementById('tf-title').value.trim();if(!title){showToast('请输入标题');return}
  var data={company_id:currentCompanyId,user_id:currentUser.id,title:title,
    type:document.getElementById('tf-type').value,priority:document.getElementById('tf-priority').value,
    client_id:document.getElementById('tf-client').value||null,
    engineer_name:document.getElementById('tf-engineer').value.trim(),
    description:document.getElementById('tf-desc').value.trim(),
    completion_notes:document.getElementById('tf-completion').value.trim(),
    satisfaction_rating:parseInt(document.getElementById('tf-satisfaction').value)||null,
    updated_at:new Date().toISOString()};
  if(!svEditId)data.ticket_no='TK-'+Date.now().toString(36).toUpperCase();
  var error;
  if(svEditId){var r=await sb.from('service_tickets').update(data).eq('id',svEditId);error=r.error}
  else{data.created_at=new Date().toISOString();var r2=await sb.from('service_tickets').insert(data);error=r2.error}
  if(error){showToast('保存失败: '+error.message);return}
  closeTicketForm();await loadTickets();showToast(svEditId?'工单已更新':'工单已创建');
}
async function changeTicketStatus(id,newStatus){
  await sb.from('service_tickets').update({status:newStatus,updated_at:new Date().toISOString()}).eq('id',id);
  loadTickets();showToast('状态已更新');
}

// ── Visits ──
async function loadVisits(){
  var{data,error}=await sb.from('client_visits').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
  if(error){console.error(error);return}
  allVisits=data||[];renderVisits();
}
function renderVisits(){
  var list=allVisits||[];
  var tf=document.getElementById('visit-type-filter'),sf=document.getElementById('visit-status-filter');
  var sr=document.getElementById('visit-search');
  if(tf&&tf.value!=='all')list=list.filter(function(x){return x.visit_type===tf.value});
  if(sf&&sf.value!=='all')list=list.filter(function(x){return x.status===sf.value});
  if(sr){var sq=sr.value.trim().toLowerCase();if(sq)list=list.filter(function(x){return(x.title||'').toLowerCase().indexOf(sq)>=0||(x.content||'').toLowerCase().indexOf(sq)>=0})}
  var grid=document.getElementById('visit-grid'),empty=document.getElementById('visit-empty');
  if(!list.length){grid.innerHTML='';empty.classList.remove('hidden');return}
  empty.classList.add('hidden');
  var vm={post_sale:'成交回访',care:'关怀回访',churn:'流失回访',other:'其他'};
  var mth={phone:'📞',wechat:'💬',email:'📧',visit:'🏠',other:'📋'};
  var ss={planned:'planning',completed:'success',cancelled:'cancelled'};
  var h='';for(var i=0;i<list.length;i++){var v=list[i];var cn='';if(v.client_id&&allClients){var cc=allClients.find(function(x){return x.id===v.client_id});cn=cc?cc.name:''}
    h+='<div class="lead-card">';
    h+='<div class="lead-name">'+h(v.title||'回访记录')+' <span style="font-size:11px;color:var(--text3)">'+h(cn)+'</span></div>';
    h+='<div class="lead-meta"><span class="lead-status-badge '+(ss[v.status]||'')+'">'+(v.status==='planned'?'计划中':v.status==='completed'?'已完成':'已取消')+'</span>';
    h+='<span>'+h(vm[v.visit_type]||v.visit_type)+'</span><span>'+(mth[v.visit_method]||'📋')+' '+h(v.visit_method||'')+'</span>';
    if(v.planned_date)h+='<span>📅 '+v.planned_date+'</span>';
    if(v.satisfaction)h+='<span>⭐ '+v.satisfaction+'</span>';
    h+='</div>';
    if(v.content)h+='<div style="font-size:12px;color:var(--text2);margin-top:4px">'+h(v.content).substring(0,100)+'</div>';
    h+='<div class="lead-actions"><button onclick="event.stopPropagation();openVisitForm('+v.id+')">编辑</button><button class="btn-lead-danger" onclick="event.stopPropagation();confirmDialog(\'确定删除？\',async function(){await sb.from(\'client_visits\').delete().eq(\'id\','+v.id+');loadVisits()})">删除</button></div></div>';
  }
  grid.innerHTML=h;
}
function openVisitForm(id){
  svEditId=id||null;
  var v=id?allVisits.find(function(x){return x.id===id}):null;
  document.getElementById('visit-form-title').textContent=id?'编辑回访':'新建回访';
  document.getElementById('vf-title').value=v?v.title||'':'';
  document.getElementById('vf-type').value=v?v.visit_type||'care':'care';
  document.getElementById('vf-method').value=v?v.visit_method||'phone':'phone';
  document.getElementById('vf-planned-date').value=v?v.planned_date||'':'';
  document.getElementById('vf-content').value=v?v.content||'':'';
  document.getElementById('vf-satisfaction').value=v?v.satisfaction||'':'';
  var cs=document.getElementById('vf-client');cs.innerHTML='<option value="">不关联</option>';
  if(allClients)for(var i=0;i<allClients.length;i++){var cc=allClients[i];cs.innerHTML+='<option value="'+cc.id+'"'+(v&&v.client_id===cc.id?' selected':'')+'>'+h(cc.name)+'</option>'}
  document.getElementById('visit-modal').classList.remove('hidden');
}
function closeVisitForm(){document.getElementById('visit-modal').classList.add('hidden');svEditId=null}
async function saveVisit(){
  var title=document.getElementById('vf-title').value.trim();if(!title){showToast('请输入标题');return}
  var data={company_id:currentCompanyId,user_id:currentUser.id,title:title,
    visit_type:document.getElementById('vf-type').value,visit_method:document.getElementById('vf-method').value,
    client_id:document.getElementById('vf-client').value||null,
    planned_date:document.getElementById('vf-planned-date').value||null,
    content:document.getElementById('vf-content').value.trim(),
    satisfaction:parseInt(document.getElementById('vf-satisfaction').value)||null,
    updated_at:new Date().toISOString()};
  var error;
  if(svEditId){var r=await sb.from('client_visits').update(data).eq('id',svEditId);error=r.error}
  else{data.created_at=new Date().toISOString();var r2=await sb.from('client_visits').insert(data);error=r2.error}
  if(error){showToast('保存失败: '+error.message);return}
  closeVisitForm();await loadVisits();showToast(svEditId?'回访已更新':'回访已创建');
}

// ── Visit Tasks ──
var visitTasks=[];
async function loadVisitTasks(){
  var{data,error}=await sb.from('visit_tasks').select('*').eq('company_id',currentCompanyId).order('scheduled_date');
  if(error){console.error(error);return}
  visitTasks=data||[];
  var ab=document.getElementById('visit-tasks-alert');
  if(visitTasks.length){ab.style.display='block';ab.innerHTML='📅 <b>待办回访任务:</b> '+visitTasks.filter(function(x){return x.status==='pending'}).length+' 个待处理';ab.onclick=function(){showVisitTaskList()}}else ab.style.display='none';
}
function openVisitTaskForm(){var n=document.getElementById('vf-title').value||'';var c=prompt('回访任务标题:',n);if(!c)return;
  var date=prompt('计划日期 (YYYY-MM-DD):',new Date().toISOString().split('T')[0]);if(!date)return;
  sb.from('visit_tasks').insert([{company_id:currentCompanyId,user_id:currentUser.id,title:c,task_type:'care',scheduled_date:date,status:'pending',created_at:new Date().toISOString()}]).then(function(r){
    if(r.error)showToast('创建失败: '+r.error.message);else{loadVisitTasks();showToast('回访任务已创建')}
  });
}
function showVisitTaskList(){
  var rows=visitTasks.map(function(t){return '• '+t.title+' ['+t.scheduled_date+'] '+(t.status==='pending'?'待处理':'已完成')}).join('\n');
  alert('回访任务列表:\n\n'+rows);
}

// ── Warranties ──
async function loadWarranties(){
  var{data,error}=await sb.from('warranties').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
  if(error){console.error(error);return}
  allWarranties=data||[];renderWarranties();
}
function renderWarranties(){
  var list=allWarranties||[];
  var sf=document.getElementById('warranty-status-filter'),sr=document.getElementById('warranty-search');
  if(sf&&sf.value!=='all')list=list.filter(function(x){return x.status===sf.value});
  if(sr){var sq=sr.value.trim().toLowerCase();if(sq)list=list.filter(function(x){return(x.product_name||'').toLowerCase().indexOf(sq)>=0||(x.serial_no||'').toLowerCase().indexOf(sq)>=0})}
  var grid=document.getElementById('warranty-grid'),empty=document.getElementById('warranty-empty');
  if(!list.length){grid.innerHTML='';empty.classList.remove('hidden');}else{empty.classList.add('hidden')}
  // Expiring alert
  var now=new Date(),expiring=allWarranties.filter(function(w){if(!w.warranty_end||w.status!=='active')return false;var ed=new Date(w.warranty_end);var d=Math.ceil((ed-now)/86400000);return d>=0&&d<=30});
  var ab=document.getElementById('warranty-alert');
  if(expiring.length){ab.style.display='block';ab.innerHTML='⚠️ <b>即将到期:</b> '+expiring.length+' 项质保在30天内到期，请关注续费！'}else ab.style.display='none';
  if(!list.length)return;
  var ss={active:'🟢有效',expired:'🔴过期',void:'⚫作废',claimed:'🟡理赔'};
  var h='';for(var i=0;i<list.length;i++){var w=list[i];var cn='';if(w.client_id&&allClients){var cc=allClients.find(function(x){return x.id===w.client_id});cn=cc?cc.name:''}
    var endLabel=w.warranty_end||'';if(w.status==='active'&&w.warranty_end){var dd=Math.ceil((new Date(w.warranty_end)-now)/86400000);endLabel+=' ('+(dd>0?dd+'天':'已到期')+')'}
    h+='<div class="lead-card">';
    h+='<div class="lead-name">'+h(w.product_name)+' <span style="font-size:11px;color:var(--text3)">'+h(cn)+'</span></div>';
    h+='<div class="lead-meta"><span>'+h(ss[w.status]||w.status)+'</span>';
    if(w.serial_no)h+='<span># '+h(w.serial_no)+'</span>';
    h+='<span>📅 '+h(w.warranty_start||'')+' → '+h(endLabel)+'</span>';
    h+='<span>'+h(w.warranty_type||'')+'</span>';
    h+='</div>';
    h+='<div class="lead-actions"><button onclick="event.stopPropagation();openWarrantyForm('+w.id+')">编辑</button><button class="btn-lead-danger" onclick="event.stopPropagation();confirmDialog(\'确定删除？\',async function(){await sb.from(\'warranties\').delete().eq(\'id\','+w.id+');loadWarranties()})">删除</button></div></div>';
  }
  grid.innerHTML=h;
}
function openWarrantyForm(id){
  svEditId=id||null;
  var w=id?allWarranties.find(function(x){return x.id===id}):null;
  document.getElementById('warranty-form-title').textContent=id?'编辑质保':'新建质保';
  document.getElementById('wf-product').value=w?w.product_name||'':'';
  document.getElementById('wf-serial').value=w?w.serial_no||'':'';
  document.getElementById('wf-start').value=w?w.warranty_start||'':'';
  document.getElementById('wf-end').value=w?w.warranty_end||'':'';
  document.getElementById('wf-type').value=w?w.warranty_type||'standard':'standard';
  document.getElementById('wf-terms').value=w?w.terms||'':'';
  var cs=document.getElementById('wf-client');cs.innerHTML='<option value="">不关联</option>';
  if(allClients)for(var i=0;i<allClients.length;i++){var cc=allClients[i];cs.innerHTML+='<option value="'+cc.id+'"'+(w&&w.client_id===cc.id?' selected':'')+'>'+h(cc.name)+'</option>'}
  document.getElementById('warranty-modal').classList.remove('hidden');
}
function closeWarrantyForm(){document.getElementById('warranty-modal').classList.add('hidden');svEditId=null}
async function saveWarranty(){
  var pn=document.getElementById('wf-product').value.trim();if(!pn){showToast('请输入产品名称');return}
  var data={company_id:currentCompanyId,user_id:currentUser.id,product_name:pn,
    serial_no:document.getElementById('wf-serial').value.trim(),
    client_id:document.getElementById('wf-client').value||null,
    warranty_start:document.getElementById('wf-start').value||null,
    warranty_end:document.getElementById('wf-end').value||null,
    warranty_type:document.getElementById('wf-type').value,
    terms:document.getElementById('wf-terms').value.trim(),
    updated_at:new Date().toISOString()};
  var error;
  if(svEditId){var r=await sb.from('warranties').update(data).eq('id',svEditId);error=r.error}
  else{data.created_at=new Date().toISOString();var r2=await sb.from('warranties').insert(data);error=r2.error}
  if(error){showToast('保存失败: '+error.message);return}
  closeWarrantyForm();await loadWarranties();showToast(svEditId?'质保已更新':'质保已创建');
}

// ── Maintenance Plans ──
async function loadMaintenancePlans(){
  var{data,error}=await sb.from('maintenance_plans').select('*').eq('company_id',currentCompanyId).order('next_maintenance');
  if(error){console.error(error);return}
  allMaintenance=data||[];renderMaintenancePlans();
}
function renderMaintenancePlans(){
  var list=allMaintenance||[];
  var grid=document.getElementById('maintenance-grid'),empty=document.getElementById('maintenance-empty');
  if(!list.length){grid.innerHTML='';empty.classList.remove('hidden');return}
  empty.classList.add('hidden');
  var ss={scheduled:'计划中',in_progress:'进行中',completed:'已完成',overdue:'已逾期',cancelled:'已取消'};
  var sc={scheduled:'planning',in_progress:'active',completed:'success',overdue:'urgent',cancelled:'cancelled'};
  var h='';for(var i=0;i<list.length;i++){var m=list[i];var cn='';if(m.client_id&&allClients){var cc=allClients.find(function(x){return x.id===m.client_id});cn=cc?cc.name:''}
    h+='<div class="lead-card">';
    h+='<div class="lead-name">🔧 '+h(m.product_name||'维保计划')+' <span style="font-size:11px;color:var(--text3)">'+h(cn)+'</span></div>';
    h+='<div class="lead-meta"><span class="lead-status-badge '+(sc[m.status]||'')+'">'+h(ss[m.status]||m.status)+'</span>';
    h+='<span>'+h(m.plan_type||'')+'</span><span>🔄 '+h(m.schedule_interval||'')+'</span>';
    if(m.next_maintenance)h+='<span>📅 下次: '+m.next_maintenance+'</span>';
    h+='</div>';
    h+='<div class="lead-actions"><button onclick="event.stopPropagation();openMaintenanceForm('+m.id+')">编辑</button><button class="btn-lead-danger" onclick="event.stopPropagation();confirmDialog(\'确定删除？\',async function(){await sb.from(\'maintenance_plans\').delete().eq(\'id\','+m.id+');loadMaintenancePlans()})">删除</button></div></div>';
  }
  grid.innerHTML=h;
}
function openMaintenanceForm(id){
  svEditId=id||null;
  var m=id?allMaintenance.find(function(x){return x.id===id}):null;
  document.getElementById('maintenance-form-title').textContent=id?'编辑维保计划':'新建维保计划';
  document.getElementById('mf-product').value=m?m.product_name||'':'';
  document.getElementById('mf-type').value=m?m.plan_type||'preventive':'preventive';
  document.getElementById('mf-interval').value=m?m.schedule_interval||'monthly':'monthly';
  document.getElementById('mf-next').value=m?m.next_maintenance||'':'';
  document.getElementById('mf-assigned').value=m?(getAssignedName(m.assigned_to)||''):'';
  document.getElementById('mf-notes').value=m?m.notes||'':'';
  var cs=document.getElementById('mf-client');cs.innerHTML='<option value="">不关联</option>';
  if(allClients)for(var i=0;i<allClients.length;i++){var cc=allClients[i];cs.innerHTML+='<option value="'+cc.id+'"'+(m&&m.client_id===cc.id?' selected':'')+'>'+h(cc.name)+'</option>'}
  document.getElementById('maintenance-modal').classList.remove('hidden');
}
function closeMaintenanceForm(){document.getElementById('maintenance-modal').classList.add('hidden');svEditId=null}
async function saveMaintenance(){
  var pn=document.getElementById('mf-product').value.trim();if(!pn){showToast('请输入产品名称');return}
  var data={company_id:currentCompanyId,user_id:currentUser.id,product_name:pn,
    client_id:document.getElementById('mf-client').value||null,
    plan_type:document.getElementById('mf-type').value,schedule_interval:document.getElementById('mf-interval').value,
    next_maintenance:document.getElementById('mf-next').value||null,
    notes:document.getElementById('mf-notes').value.trim(),
    updated_at:new Date().toISOString()};
  var error;
  if(svEditId){var r=await sb.from('maintenance_plans').update(data).eq('id',svEditId);error=r.error}
  else{data.created_at=new Date().toISOString();var r2=await sb.from('maintenance_plans').insert(data);error=r2.error}
  if(error){showToast('保存失败: '+error.message);return}
  closeMaintenanceForm();await loadMaintenancePlans();showToast(svEditId?'维保计划已更新':'维保计划已创建');
}
function getAssignedName(uid){if(!uid||!allUsers)return'';var u=allUsers.find(function(x){return x.user_id===uid});return u?(u.display_name||u.email||''):''}

// ── Knowledge Base ──
async function loadKB(){
  var{data,error}=await sb.from('kb_articles').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
  if(error){console.error(error);return}
  allKB=data||[];renderKB();
}
function renderKB(){
  var list=allKB||[];
  var cf=document.getElementById('kb-category-filter'),sr=document.getElementById('kb-search');
  if(cf&&cf.value!=='all')list=list.filter(function(x){return x.category===cf.value});
  if(sr){var sq=sr.value.trim().toLowerCase();if(sq)list=list.filter(function(x){return(x.title||'').toLowerCase().indexOf(sq)>=0||(x.content||'').toLowerCase().indexOf(sq)>=0||(x.tags||[]).some(function(t){return t.toLowerCase().indexOf(sq)>=0}))}
  var grid=document.getElementById('kb-grid'),empty=document.getElementById('kb-empty');
  if(!list.length){grid.innerHTML='';empty.classList.remove('hidden');return}
  empty.classList.add('hidden');
  var cm={faq:'❓常见问题',solution:'💡解决方案',script:'📝标准话术',policy:'📜政策法规',other:'📋其他'};
  var h='';for(var i=0;i<list.length;i++){var k=list[i];
    h+='<div class="lead-card" style="cursor:pointer" onclick="toggleKBDetail('+k.id+')">';
    h+='<div class="lead-name">'+h(k.title)+' <span style="font-size:11px;color:var(--text3)">'+h(cm[k.category]||k.category)+'</span></div>';
    h+='<div class="lead-meta">';
    if(k.tags&&k.tags.length)h+='<span>'+k.tags.map(function(t){return '#'+t}).join(' ')+'</span>';
    if(k.related_products)h+='<span>📦 '+h(k.related_products)+'</span>';
    h+='<span>👁 '+k.view_count+'</span>';
    h+='</div>';
    h+='<div id="kb-detail-'+k.id+'" style="display:none;padding:12px 0;font-size:13px;color:var(--text);line-height:1.7;white-space:pre-wrap;border-top:1px solid var(--border);margin-top:8px">'+h(k.content||'')+'</div>';
    h+='<div class="lead-actions"><button onclick="event.stopPropagation();openKBForm('+k.id+')">编辑</button><button class="btn-lead-danger" onclick="event.stopPropagation();confirmDialog(\'确定删除？\',async function(){await sb.from(\'kb_articles\').delete().eq(\'id\','+k.id+');loadKB()})">删除</button></div></div>';
  }
  grid.innerHTML=h;
}
function toggleKBDetail(id){
  var el=document.getElementById('kb-detail-'+id);if(!el)return;
  if(el.style.display==='none'){el.style.display='block';sb.from('kb_articles').update({view_count:((allKB.find(function(x){return x.id===id})||{}).view_count||0)+1}).eq('id',id)}
  else el.style.display='none';
}
function openKBForm(id){
  svEditId=id||null;
  var k=id?allKB.find(function(x){return x.id===id}):null;
  document.getElementById('kb-form-title').textContent=id?'编辑文章':'新建文章';
  document.getElementById('kbf-title').value=k?k.title||'':'';
  document.getElementById('kbf-category').value=k?k.category||'faq':'faq';
  document.getElementById('kbf-products').value=k?k.related_products||'':'';
  document.getElementById('kbf-tags').value=k?(k.tags||[]).join(','):'';
  document.getElementById('kbf-content').value=k?k.content||'':'';
  document.getElementById('kb-modal').classList.remove('hidden');
}
function closeKBForm(){document.getElementById('kb-modal').classList.add('hidden');svEditId=null}
async function saveKB(){
  var title=document.getElementById('kbf-title').value.trim();if(!title){showToast('请输入标题');return}
  var tags=(document.getElementById('kbf-tags').value||'').split(',').map(function(t){return t.trim()}).filter(Boolean);
  var data={company_id:currentCompanyId,user_id:currentUser.id,title:title,
    category:document.getElementById('kbf-category').value,
    content:document.getElementById('kbf-content').value.trim(),
    tags:'{'+tags.map(function(t){return'"'+t.replace(/"/g,'\\"')+'"'}).join(',')+'}',
    related_products:document.getElementById('kbf-products').value.trim(),
    updated_at:new Date().toISOString()};
  var error;
  if(svEditId){var r=await sb.from('kb_articles').update(data).eq('id',svEditId);error=r.error}
  else{data.created_at=new Date().toISOString();var r2=await sb.from('kb_articles').insert(data);error=r2.error}
  if(error){showToast('保存失败: '+error.message);return}
  closeKBForm();await loadKB();showToast(svEditId?'文章已更新':'文章已创建');
}

'''
if inventory_divider in html:
    html = html.replace(inventory_divider, after_sales_js + '\n' + inventory_divider)
    print('JS injection OK')
else:
    print('JS injection FAILED: divider not found')
    # Try alternate anchor
    alt = '// === INVENTORY: Load Products ==='
    if alt in html:
        html = html.replace(alt, after_sales_js + '\n' + alt)
        print('JS injection OK (alt)')
    else:
        print('Both anchors not found')

with open(r'D:\1kaifa\grsds\index.html', 'w', encoding='utf-8') as f:
    f.write(html)

# Verify brace balance
scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
total = 0
for idx, s in enumerate(scripts):
    d = s.count('{') - s.count('}')
    if d != 0:
        # Find the function name context at the imbalance
        lines = s.splitlines()
        depth = 0
        for li, l in enumerate(lines):
            depth += l.count('{') - l.count('}')
            if abs(depth - d) < 3 and depth != 0:
                pass
        print(f'Brace imbalance script {idx}: diff={d}')
        total += d
        
print(f'Brace balance diff: {total}')
print(f'Lines: {len(html.splitlines())}')
