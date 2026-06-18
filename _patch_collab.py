# -*- coding: utf-8 -*-
# Inject collab office module HTML + JS into index.html
import os, re

fpath = r'D:\1kaifa\grsds\index.html'
with open(fpath, 'r', encoding='utf-8') as f:
    html = f.read()

# --- Add topbar tab "协同" ---
html = html.replace(
    '<button class="topbar-tab" id="tab-reports" onclick="switchTab(\'reports\')">报表</button>',
    '<button class="topbar-tab" id="tab-collab" onclick="switchTab(\'collab\')">协同</button>\n    <button class="topbar-tab" id="tab-reports" onclick="switchTab(\'reports\')">报表</button>'
)

# --- Add collab-view after leads-view ---
collab_view = '''
 <div id="collab-view" class="hidden">
  <div class="collab-subtabs">
   <button class="collab-subtab active" data-ctab="schedule" onclick="switchCollabTab('schedule')">日程</button>
   <button class="collab-subtab" data-ctab="task" onclick="switchCollabTab('task')">任务</button>
   <button class="collab-subtab" data-ctab="approval" onclick="switchCollabTab('approval')">审批</button>
   <button class="collab-subtab" data-ctab="comment" onclick="switchCollabTab('comment')">协作</button>
  </div>
  <div id="collab-schedule-panel" class="collab-panel">
   <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
    <h3 style="font-size:16px;font-weight:700;margin:0">日程安排</h3>
    <button class="btn-sm btn-sm-primary" onclick="openScheduleForm()">+ 新建日程</button>
   </div>
   <div id="schedule-list">加载中...</div>
  </div>
  <div id="collab-task-panel" class="collab-panel hidden">
   <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
    <h3 style="font-size:16px;font-weight:700;margin:0">任务管理</h3>
    <select id="task-filter" onchange="loadTasks()" style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px">
     <option value="todo">待办</option><option value="in_progress">进行中</option><option value="done">已完成</option><option value="all">全部</option>
    </select>
    <button class="btn-sm btn-sm-primary" onclick="openTaskForm()">+ 新建任务</button>
   </div>
   <div id="task-list">加载中...</div>
  </div>
  <div id="collab-approval-panel" class="collab-panel hidden">
   <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
    <h3 style="font-size:16px;font-weight:700;margin:0">审批流程</h3>
    <select id="approval-filter" onchange="loadApprovals()" style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px">
     <option value="pending">待审批</option><option value="approved">已通过</option><option value="rejected">已驳回</option><option value="all">全部</option>
    </select>
    <button class="btn-sm btn-sm-primary" onclick="openApprovalForm()">+ 发起审批</button>
   </div>
   <div id="approval-list">加载中...</div>
  </div>
  <div id="collab-comment-panel" class="collab-panel hidden">
   <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
    <h3 style="font-size:16px;font-weight:700;margin:0">客户协作</h3>
    <select id="comment-client-filter" onchange="loadComments()" style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px">
     <option value="">全部客户</option>
    </select>
    <button class="btn-sm btn-sm-primary" onclick="openCommentForm()">+ 添加评论</button>
   </div>
   <div id="comment-list">加载中...</div>
  </div>
 </div>
'''

html = html.replace('<div id="leads-view" class="hidden">', collab_view + '<div id="leads-view" class="hidden">')

# --- Add switchTab('collab') branch (before the closing brace of switchTab) ---
# Find: 'document.getElementById(\'topbar-title\').textContent=\'组织管理\';'
# The branch right after admin
collab_tab_case = '''else if(tab==='collab'){
  var colv=document.getElementById('collab-view');
  colv.classList.remove('hidden');document.getElementById('tab-collab').classList.add('active');
  document.getElementById('topbar-title').textContent='协同办公';
  switchCollabTab('schedule');
}'''

old_admin = "switchAdminTab('users');\n  }\n}"
new_admin = "switchAdminTab('users');\n  }"+collab_tab_case+"\n}"

# Actually need to find the exact pattern... let me search for it
# The switchTab ends with admin case
marker_end = "switchAdminTab('users');\n  }\n}"
if marker_end in html:
    html = html.replace(marker_end, "switchAdminTab('users');\n  }"+collab_tab_case+'\n}')
    print('switchTab patched OK')
else:
    print('switchTab marker NOT found, trying alternatives...')
    idx = html.find("switchAdminTab('users')")
    if idx > 0:
        print('Context:', repr(html[idx-40:idx+60]))

# --- Add collab-view to allViews array in switchTab ---
# Find: if(lv)allViews.push(lv)
html = html.replace(
    'if(lv)allViews.push(lv);if(purchv)allViews.push(purchv);',
    'if(lv)allViews.push(lv);var colv2=document.getElementById(\'collab-view\');if(colv2)allViews.push(colv2);if(purchv)allViews.push(purchv);'
)

# --- Add tab-collab to allTabs array ---
html = html.replace(
    "var allTabs=[thm,tc,to,tr,ta,ti];",
    "var allTabs=[thm,tc,to,document.getElementById('tab-collab'),tr,ta,ti];"
)

# --- Inject CSS for collab ---
collab_css = '''
.collab-subtabs{display:flex;gap:6px;padding:6px 12px;border-bottom:1px solid var(--border);flex-wrap:wrap;background:var(--card);border-radius:12px 12px 0 0}
.collab-subtab{padding:8px 18px;border:none;background:none;font-size:14px;color:var(--text2);cursor:pointer;border-radius:8px 8px 0 0;transition:all .2s;border-bottom:2px solid transparent}
.collab-subtab:hover{color:var(--primary);background:var(--primary-light)}
.collab-subtab.active{color:var(--primary);font-weight:700;background:var(--primary-light);border-bottom-color:var(--primary)}
.collab-panel{padding:16px;background:var(--card);border-radius:0 0 12px 12px}
.schedule-item,.task-item,.approval-item,.comment-item{background:var(--bg);border-radius:10px;padding:14px;margin-bottom:10px;border-left:4px solid var(--primary)}
.schedule-item .sch-title,.task-item .task-title,.approval-item .appr-title,.comment-item .cmt-title{font-weight:600;font-size:15px;margin-bottom:4px}
.schedule-item .sch-meta,.task-item .task-meta,.approval-item .appr-meta,.comment-item .cmt-meta{font-size:12px;color:var(--text2)}
.task-priority-urgent{border-left-color:#EF4444!important}
.task-priority-high{border-left-color:#F59E0B!important}
.task-priority-normal{border-left-color:#4F6EF7!important}
.task-priority-low{border-left-color:#94A3B8!important}
.approval-pending{border-left-color:#F59E0B!important;background:#FFFBEB}
.approval-approved{border-left-color:#10B981!important;background:#F0FDF4}
.approval-rejected{border-left-color:#EF4444!important;background:#FEF2F2}
.status-badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}
.status-todo{background:#DBEAFE;color:#1D4ED8}
.status-progress{background:#FEF3C7;color:#92400E}
.status-done{background:#D1FAE5;color:#065F46}
.status-cancelled{background:#F1F5F9;color:#64748B}
'''

css_marker = '.inv-subtabs{display:flex;gap:8px;'
html = html.replace(css_marker, collab_css+'\n'+css_marker)

# --- Now inject collab JS functions ---
collab_js = '''
// ============== COLLAB OFFICE MODULE ==============
var collabActiveTab='schedule';

function switchCollabTab(tab){
  collabActiveTab=tab;
  var tabs=document.querySelectorAll('.collab-subtab');
  for(var i=0;i<tabs.length;i++)tabs[i].classList.toggle('active',tabs[i].getAttribute('data-ctab')===tab);
  document.getElementById('collab-schedule-panel').classList.toggle('hidden',tab!=='schedule');
  document.getElementById('collab-task-panel').classList.toggle('hidden',tab!=='task');
  document.getElementById('collab-approval-panel').classList.toggle('hidden',tab!=='approval');
  document.getElementById('collab-comment-panel').classList.toggle('hidden',tab!=='comment');
  if(tab==='schedule')loadSchedules();
  else if(tab==='task')loadTasks();
  else if(tab==='approval')loadApprovals();
  else if(tab==='comment')loadComments();
}

// === 1. Schedules ===
async function loadSchedules(){
  if(!currentCompanyId)return;
  var today=new Date().toISOString().slice(0,10);
  var {data}=await sb.from('schedules').select('*').eq('company_id',currentCompanyId).gte('start_time',today).order('start_time');
  var list=document.getElementById('schedule-list');
  if(!data||!data.length){list.innerHTML='<div class="empty" style="padding:20px">今日暂无日程</div>';return}
  var h='';
  for(var i=0;i<data.length;i++){
    var s=data[i];
    var time=s.all_day?'全天':new Date(s.start_time).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
    h+='<div class="schedule-item" style="border-left-color:'+(s.color||'#4F6EF7')+'"><div class="sch-title">'+h(s.title)+' <span style="font-size:11px;color:var(--text3)">'+time+'</span></div>'+(s.description?'<div style="font-size:13px;color:var(--text2)">'+h(s.description)+'</div>':'')+(s.location?'<div class="sch-meta">📍 '+h(s.location)+'</div>':'')+'<div style="margin-top:6px;display:flex;gap:6px"><button class="btn-sm" style="font-size:11px;padding:2px 8px" onclick="editSchedule(\''+s.id+'\')">编辑</button><button class="btn-sm" style="font-size:11px;padding:2px 8px;color:var(--danger)" onclick="deleteSchedule(\''+s.id+'\')">删除</button></div></div>';
  }
  list.innerHTML=h;
}

function openScheduleForm(id){
  var s=id?allSchedules.find(function(x){return x.id===id}):null;
  var h='<div class="modal-overlay" id="schedule-modal"><div class="modal-sheet"><h3>'+(s?'编辑日程':'新建日程')+'</h3>';
  h+='<div class="form-group"><label>标题 *</label><input id="sch-title" value="'+(s?escAttr(s.title):'')+'"></div>';
  h+='<div class="form-row"><div class="form-group"><label>开始时间 *</label><input type="datetime-local" id="sch-start" value="'+(s?s.start_time.slice(0,16):'')+'"></div><div class="form-group"><label>结束时间</label><input type="datetime-local" id="sch-end" value="'+(s&&s.end_time?s.end_time.slice(0,16):'')+'"></div></div>';
  h+='<div class="form-row"><div class="form-group"><label><input type="checkbox" id="sch-allday" '+(s&&s.all_day?'checked':'')+'> 全天</label></div><div class="form-group"><label>颜色</label><input type="color" id="sch-color" value="'+(s?s.color||'#4F6EF7':'#4F6EF7')+'"></div></div>';
  h+='<div class="form-group"><label>地点</label><input id="sch-location" value="'+(s?escAttr(s.location||''):'')+'"></div>';
  h+='<div class="form-group"><label>描述</label><textarea id="sch-desc" rows="2">'+(s?escHtml(s.description||''):'')+'</textarea></div>';
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest(\'.modal-overlay\').remove()">取消</button><button class="btn-save" onclick="saveSchedule(\''+(s?s.id:'')+'\')">保存</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',h);
}

async function saveSchedule(id){
  var title=document.getElementById('sch-title').value.trim();
  if(!title){showToast('请输入标题');return}
  var start=document.getElementById('sch-start').value;
  if(!start){showToast('请选择开始时间');return}
  var end=document.getElementById('sch-end').value||null;
  var allDay=document.getElementById('sch-allday').checked;
  var color=document.getElementById('sch-color').value;
  var location=document.getElementById('sch-location').value.trim();
  var desc=document.getElementById('sch-desc').value.trim();
  var obj={title:title,start_time:new Date(start).toISOString(),end_time:end?new Date(end).toISOString():null,all_day:allDay,color:color,location:location||null,description:desc||null,company_id:currentCompanyId,user_id:currentUser.id};
  var err;
  if(id){var r=await sb.from('schedules').update(obj).eq('id',id);err=r.error}
  else{var r2=await sb.from('schedules').insert(obj);err=r2.error}
  document.getElementById('schedule-modal').remove();
  if(err){showToast('保存失败: '+err.message);return}
  loadSchedules();showToast('已保存');
}

async function deleteSchedule(id){
  await sb.from('schedules').delete().eq('id',id);
  loadSchedules();showToast('已删除');
}

// === 2. Tasks ===
async function loadTasks(){
  if(!currentCompanyId)return;
  var filter=document.getElementById('task-filter').value;
  var q=sb.from('tasks').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false});
  if(filter!=='all')q=q.eq('status',filter);
  var {data}=await q;
  var list=document.getElementById('task-list');
  if(!data||!data.length){list.innerHTML='<div class="empty" style="padding:20px">暂无任务</div>';return}
  var h='';
  for(var i=0;i<data.length;i++){
    var t=data[i];
    var prio=t.priority||'normal';
    var statusLabel={todo:'待办',in_progress:'进行中',done:'已完成',cancelled:'已取消'}[t.status]||t.status;
    h+='<div class="task-item task-priority-'+prio+'"><div class="task-title">'+h(t.title)+' <span class="status-badge status-'+(t.status==='in_progress'?'progress':t.status)+'">'+statusLabel+'</span></div>'+(t.description?'<div style="font-size:13px;color:var(--text2)">'+h(t.description)+'</div>':'')+(t.due_date?'<div class="task-meta">📅 截止: '+t.due_date+'</div>':'')+'<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><button class="btn-sm" style="font-size:11px;padding:2px 8px" onclick="editTask(\''+t.id+'\')">编辑</button><button class="btn-sm" style="font-size:11px;padding:2px 8px;color:var(--danger)" onclick="deleteTask(\''+t.id+'\')">删除</button></div></div>';
  }
  list.innerHTML=h;
}

function openTaskForm(id){
  var t=id?allTasks.find(function(x){return x.id===id}):null;
  var h='<div class="modal-overlay" id="task-modal"><div class="modal-sheet"><h3>'+(t?'编辑任务':'新建任务')+'</h3>';
  h+='<div class="form-group"><label>标题 *</label><input id="ta-title" value="'+(t?escAttr(t.title):'')+'"></div>';
  h+='<div class="form-group"><label>描述</label><textarea id="ta-desc" rows="2">'+(t?escHtml(t.description||''):'')+'</textarea></div>';
  h+='<div class="form-row"><div class="form-group"><label>优先级</label><select id="ta-priority"><option value="urgent"'+(t&&t.priority==='urgent'?' selected':'')+'>紧急</option><option value="high"'+(t&&t.priority==='high'?' selected':'')+'>高</option><option value="normal"'+(t&&t.priority==='normal'?' selected':'')+'>普通</option><option value="low"'+(t&&t.priority==='low'?' selected':'')+'>低</option></select></div><div class="form-group"><label>截止日期</label><input type="date" id="ta-due" value="'+(t&&t.due_date?t.due_date:'')+'"></div></div>';
  h+='<div class="form-row"><div class="form-group"><label>状态</label><select id="ta-status"><option value="todo"'+(t&&t.status==='todo'?' selected':'')+'>待办</option><option value="in_progress"'+(t&&t.status==='in_progress'?' selected':'')+'>进行中</option><option value="done"'+(t&&t.status==='done'?' selected':'')+'>已完成</option></select></div><div class="form-group"><label>分配给</label><select id="ta-assigned">'+(function(){var o='<option value="">自己</option>';for(var k=0;k<allUsers.length;k++){var u=allUsers[k];o+='<option value="'+u.user_id+'"'+(t&&t.assigned_to===u.user_id?' selected':'')+'>'+(u.display_name||u.email||u.user_id)+'</option>'}return o})()+'</select></div></div>';
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest(\'.modal-overlay\').remove()">取消</button><button class="btn-save" onclick="saveTask(\''+(t?t.id:'')+'\')">保存</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',h);
}

async function saveTask(id){
  var title=document.getElementById('ta-title').value.trim();
  if(!title){showToast('请输入标题');return}
  var desc=document.getElementById('ta-desc').value.trim();
  var priority=document.getElementById('ta-priority').value;
  var due=document.getElementById('ta-due').value||null;
  var status=document.getElementById('ta-status').value;
  var assigned=document.getElementById('ta-assigned').value||currentUser.id;
  var obj={title:title,description:desc||null,priority:priority,due_date:due,status:status,assigned_to:assigned,assigned_by:currentUser.id,company_id:currentCompanyId};
  if(status==='done')obj.completed_at=new Date().toISOString();
  var err;
  if(id){var r=await sb.from('tasks').update(obj).eq('id',id);err=r.error}
  else{var r2=await sb.from('tasks').insert(obj);err=r2.error}
  document.getElementById('task-modal').remove();
  if(err){showToast('保存失败: '+err.message);return}
  loadTasks();showToast('已保存');
}

async function deleteTask(id){
  await sb.from('tasks').delete().eq('id',id);
  loadTasks();showToast('已删除');
}

function editTask(id){openTaskForm(id)}
function editSchedule(id){openScheduleForm(id)}

// === 3. Approvals ===
async function loadApprovals(){
  if(!currentCompanyId)return;
  var filter=document.getElementById('approval-filter').value;
  var q=sb.from('approval_requests').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false});
  if(filter!=='all')q=q.eq('status',filter);
  var {data}=await q;
  var list=document.getElementById('approval-list');
  if(!data||!data.length){list.innerHTML='<div class="empty" style="padding:20px">暂无审批</div>';return}
  var h='',statusMap={pending:'待审批',approved:'已通过',rejected:'已驳回',cancelled:'已取消'};
  for(var i=0;i<data.length;i++){
    var a=data[i];
    h+='<div class="approval-item approval-'+(a.status==='pending'?'pending':a.status==='approved'?'approved':a.status==='rejected'?'rejected':'')+'"><div class="appr-title">'+h(a.title)+' <span class="status-badge status-'+(a.status==='pending'?'progress':a.status==='approved'?'done':a.status==='rejected'?'cancelled':'cancelled')+'">'+statusMap[a.status]+'</span></div><div class="appr-meta">'+h(a.type)+' · 步骤 '+a.current_step+'/'+a.total_steps+' · '+new Date(a.created_at).toLocaleDateString('zh-CN')+'</div>'+(a.status==='pending'?'<div style="margin-top:6px"><button class="btn-sm" style="font-size:11px;padding:2px 8px;background:#10B981;color:#fff;border:none;border-radius:4px;margin-right:4px" onclick="approveAction(\''+a.id+'\',\'approve\')">通过</button><button class="btn-sm" style="font-size:11px;padding:2px 8px;background:#EF4444;color:#fff;border:none;border-radius:4px" onclick="approveAction(\''+a.id+'\',\'reject\')">驳回</button></div>':'')+'</div>';
  }
  list.innerHTML=h;
}

function openApprovalForm(){
  var types=['报价审批','合同审批','折扣审批','出差申请','报销申请','客户转移','自定义'];
  var h='<div class="modal-overlay" id="approval-modal"><div class="modal-sheet"><h3>发起审批</h3>';
  h+='<div class="form-group"><label>审批类型</label><select id="ap-type">';
  for(var i=0;i<types.length;i++)h+='<option value="'+types[i]+'">'+types[i]+'</option>';
  h+='</select></div>';
  h+='<div class="form-group"><label>标题 *</label><input id="ap-title" placeholder="审批标题"></div>';
  h+='<div class="form-group"><label>内容说明</label><textarea id="ap-content" rows="3" placeholder="请输入审批内容和理由..."></textarea></div>';
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest(\'.modal-overlay\').remove()">取消</button><button class="btn-save" onclick="submitApproval()">提交</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',h);
}

async function submitApproval(){
  var type=document.getElementById('ap-type').value;
  var title=document.getElementById('ap-title').value.trim();
  var content=document.getElementById('ap-content').value.trim();
  if(!title){showToast('请输入标题');return}
  var {error}=await sb.from('approval_requests').insert({company_id:currentCompanyId,requestor_id:currentUser.id,title:title,type:type,content:{detail:content||''},status:'pending',total_steps:1});
  document.getElementById('approval-modal').remove();
  if(error){showToast('提交失败: '+error.message);return}
  loadApprovals();showToast('已提交');
}

async function approveAction(requestId,action){
  var {data:req}=await sb.from('approval_requests').select('*').eq('id',requestId).single();
  if(!req){showToast('审批不存在');return}
  var newStatus=action==='approve'?'approved':'rejected';
  var {error}=await sb.from('approval_requests').update({status:newStatus,updated_at:new Date().toISOString()}).eq('id',requestId);
  if(error){showToast('操作失败: '+error.message);return}
  await sb.from('approval_actions').insert({company_id:currentCompanyId,request_id:requestId,approver_id:currentUser.id,action:action,step:req.current_step||1});
  loadApprovals();showToast(action==='approve'?'已通过':'已驳回');
}

// === 4. Client Comments / Collaboration ===
var commentClientsList=[];
async function loadComments(){
  if(!currentCompanyId)return;
  var clientFilter=document.getElementById('comment-client-filter').value;
  // Load client options if empty
  if(!commentClientsList.length){
    var sel=document.getElementById('comment-client-filter');
    for(var i=0;i<allClients.length;i++){var cl=allClients[i];sel.innerHTML+='<option value="'+cl.id+'">'+h(cl.name)+'</option>';commentClientsList.push(cl)}
  }
  var q=sb.from('client_comments').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false});
  if(clientFilter)q=q.eq('client_id',clientFilter);
  var {data}=await q;
  var list=document.getElementById('comment-list');
  if(!data||!data.length){list.innerHTML='<div class="empty" style="padding:20px">暂无评论</div>';return}
  var h='';
  for(var i=0;i<data.length;i++){
    var cm=data[i];
    var cl=allClients.find(function(x){return x.id===cm.client_id});
    h+='<div class="comment-item"><div class="cmt-title">'+h(cm.content)+'</div><div class="cmt-meta">客户: '+(cl?h(cl.name):'未知')+' · '+new Date(cm.created_at).toLocaleString('zh-CN')+'<button class="btn-sm" style="font-size:10px;padding:1px 6px;color:var(--danger);margin-left:8px" onclick="deleteComment(\''+cm.id+'\')">删除</button></div></div>';
  }
  list.innerHTML=h;
}

function openCommentForm(){
  var h='<div class="modal-overlay" id="comment-modal"><div class="modal-sheet"><h3>添加客户评论</h3>';
  h+='<div class="form-group"><label>客户 *</label><select id="cm-client"><option value="">请选择</option>';
  for(var i=0;i<allClients.length;i++)h+='<option value="'+allClients[i].id+'">'+h(allClients[i].name)+'</option>';
  h+='</select></div>';
  h+='<div class="form-group"><label>评论内容 *</label><textarea id="cm-content" rows="3" placeholder="输入评论..."></textarea></div>';
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest(\'.modal-overlay\').remove()">取消</button><button class="btn-save" onclick="saveComment()">保存</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',h);
}

async function saveComment(){
  var clientId=document.getElementById('cm-client').value;
  var content=document.getElementById('cm-content').value.trim();
  if(!clientId||!content){showToast('请填写完整信息');return}
  var {error}=await sb.from('client_comments').insert({company_id:currentCompanyId,client_id:parseInt(clientId),user_id:currentUser.id,content:content});
  document.getElementById('comment-modal').remove();
  if(error){showToast('保存失败: '+error.message);return}
  loadComments();showToast('已保存');
}

async function deleteComment(id){
  await sb.from('client_comments').delete().eq('id',id);
  loadComments();showToast('已删除');
}
'''

# Insert collab JS before === Init === or similar marker
js_marker = '// ============ NEW: Birthday Reminder ============'
html = html.replace(js_marker, collab_js+'\n'+js_marker)

# Save
with open(fpath, 'w', encoding='utf-8') as f:
    f.write(html)

print('Patching complete. Verifying...')
# Verify key functions exist
for fn in ['switchCollabTab','loadSchedules','openScheduleForm','saveSchedule','deleteSchedule','loadTasks','openTaskForm','saveTask','deleteTask','loadApprovals','openApprovalForm','submitApproval','approveAction','loadComments','openCommentForm','saveComment','deleteComment']:
    if fn in html:
        print(f'  OK: {fn}')
    else:
        print(f'  MISSING: {fn}')
# Check brace balance
depth=0;inScript=False
for i,ch in enumerate(html):
    if html[i:i+7]=='<script' and 'src' not in html[i:i+30]:
        inScript=True
    if html[i:i+9]=='</script>': inScript=False
    if inScript:
        if ch=='{': depth+=1
        elif ch=='}': depth-=1
print(f'Brace balance: {depth} (0=OK)')
