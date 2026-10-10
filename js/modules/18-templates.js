// ==========================================================================
// grsds · 18-templates.js  —  项目另存为模板 / 增量同步
// 源: js/app_v2.js 第 14961-15343 行（机械切片，未改一行代码）
// ==========================================================================
// ===== 项目另存为模板 / 增量同步到模板 =====
async function saveProjectAsTemplate(){
  if(!curDetailId||!curDetailProject)return;
  if(!isAdmin()){showToast('⚠️ 仅管理员可操作');return;}
  var name=await uiPrompt('新模板名称:',curDetailProject.name||'未命名项目');
  if(!name||!name.trim())return;
  name=name.trim();
  try{
    // 1. 收集步骤定义（从模板或当前步骤）
    var steps=[];
    if(curDetailProject.template_id&&allTemplates){
      var t=allTemplates.find(function(x){return x.id==curDetailProject.template_id});
      if(t){try{steps=typeof t.steps==='string'?JSON.parse(t.steps):t.steps}catch(e){steps=[]}}
    }
    if(!steps||!steps.length){
      // 从 curDetailBlocks 生成步骤
      curDetailBlocks.forEach(function(b,i){
        steps.push({key:b.key||('step_'+i),label:b.label||('步骤'+(i+1)),panel:b.panel||'editor'});
      });
    }
    // 2. 收集字段配置
    var {data:fields}=await sb.from('project_step_fields').select('*').eq('project_id',curDetailId).order('step_key,sort_order');
    // 合并字段配置到步骤中
    if(fields)fields.forEach(function(f){
      var si=steps.findIndex(function(s){return (s.key||('step_'+steps.indexOf(s)))===f.step_key;});
      if(si===-1)si=parseInt(String(f.step_key).replace('step_',''))||0;
      if(si>=0&&si<steps.length){
        if(!steps[si].fields)steps[si].fields=[];
        steps[si].fields.push({key:f.field_key,label:f.field_label,type:f.field_type,options:f.field_options,required:f.is_required,placeholder:f.placeholder,sort:f.sort_order});
      }
    });
    // 3. 收集审批人配置
    var {data:assignees}=await sb.from('project_step_assignees').select('*').eq('project_id',curDetailId).order('step_key');
    if(assignees)assignees.forEach(function(a){
      var si=parseInt(String(a.step_key).replace('step_',''));
      if(si>=0&&si<steps.length){
        steps[si].default_assignee_type=a.assignee_type||'role';
        steps[si].default_assignee_role=a.assignee_role||'';
        steps[si].default_reviewer_type=a.reviewer_type||'role';
        steps[si].default_reviewer_role=a.reviewer_role||'';
      }
    });
    // 4. 创建新模板
    var body={name:name,description:curDetailProject.name||'',steps:steps,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
    var {error}=await callAdmin('insert','workflow_templates',{payload:body});
    if(error)throw error;
    showToast('✅ 模板"'+name+'"已创建');
    await loadTemplates();
  }catch(e){showToast('❌ 保存模板失败: '+e.message);}
}

async function syncProjectToTemplate(){
  if(!curDetailId||!curDetailProject)return;
  if(!isAdmin()){showToast('⚠️ 仅管理员可操作');return;}
  var tid=curDetailProject.template_id;
  if(!tid){showToast('⚠️ 该项目未关联模板');return;}
  if(!await uiConfirm('确定将当前项目的步骤配置（字段+审批人）同步到原模板？\n这将覆盖模板的字段和审批人配置。'))return;
  try{
    // 1. 读取原模板
    var t=allTemplates.find(function(x){return x.id==tid});
    if(!t){showToast('❌ 原模板不存在');return;}
    var steps=[];
    try{steps=typeof t.steps==='string'?JSON.parse(t.steps):t.steps}catch(e){steps=[]}
    // 2. 收集字段配置
    var {data:fields}=await sb.from('project_step_fields').select('*').eq('project_id',curDetailId).order('step_key,sort_order');
    if(fields)fields.forEach(function(f){
      var si=steps.findIndex(function(s){return (s.key||('step_'+steps.indexOf(s)))===f.step_key;});
      if(si===-1)si=parseInt(String(f.step_key).replace('step_',''))||0;
      if(si>=0&&si<steps.length){
        if(!steps[si].fields)steps[si].fields=[];
        var existing=steps[si].fields.findIndex(function(ef){return ef.key===f.field_key});
        var fd={key:f.field_key,label:f.field_label,type:f.field_type,options:f.field_options,required:f.is_required,placeholder:f.placeholder,sort:f.sort_order};
        if(existing>=0)steps[si].fields[existing]=fd;
        else steps[si].fields.push(fd);
      }
    });
    // 3. 收集审批人配置
    var {data:assignees}=await sb.from('project_step_assignees').select('*').eq('project_id',curDetailId).order('step_key');
    if(assignees)assignees.forEach(function(a){
      var si=parseInt(String(a.step_key).replace('step_',''));
      if(si>=0&&si<steps.length){
        steps[si].default_assignee_type=a.assignee_type||'role';
        steps[si].default_assignee_role=a.assignee_role||'';
        steps[si].default_reviewer_type=a.reviewer_type||'role';
        steps[si].default_reviewer_role=a.reviewer_role||'';
      }
    });
    // 4. 更新模板
    var body={steps:steps,updated_at:new Date().toISOString()};
    var {error}=await callAdmin('update','workflow_templates',{payload:body,filters:[{col:'id',op:'eq',val:tid}],query:'*'});
    if(error)throw error;
    showToast('✅ 已同步到模板"'+(t.name||'')+'"');
    await loadTemplates();
  }catch(e){showToast('❌ 同步失败: '+e.message);}
}

async function saveProjectFieldAndSteps(projectId){} // placeholder

function getCurrentPerm(){
  if(!curDetailProject)return 'none';
  if(typeof isSuperAdmin!=='undefined'&&isSuperAdmin)return 'admin';
  if(typeof currentUserRole!=='undefined'&&currentUserRole==='admin')return 'admin';
  if(curDetailProject.owner_id===currentUser.id)return 'owner';
  var my=curDetailAssignments.find(function(a){return a.user_id===currentUser.id});
  return my?my.project_role:'none';
}

function canViewBlock(b,perm){
  if(perm==='admin'||perm==='owner')return true;
  if(perm==='none')return false;
  if(!b.visible_to||b.visible_to.length===0)return perm!=='none';
  var myDept=currentUser&&currentUser.department;
  return b.visible_to.some(function(d){
    return d==='all'||d===myDept||d===perm;
  });
}

function canEditBlock(b,perm){
  if(perm==='admin'||perm==='owner')return true;
  if(perm==='edit'||perm==='approve'){
    if(!b.editable_to||b.editable_to.length===0)return true;
    var myDept=currentUser&&currentUser.department;
    return b.editable_to.some(function(d){return d==='all'||d===myDept||d===perm});
  }
  return false;
}

async function saveProjectDetail(){
  if(!curDetailId)return;
  var inputs=document.querySelectorAll('.pd-block-input');
  var updates={};
  inputs.forEach(function(inp){
    var b=inp.dataset.block;
    var f=inp.dataset.field;
    if(!updates[b])updates[b]={};
    updates[b][f]=inp.value;
  });
  var merged={};
  curDetailBlocks.forEach(function(b){
    if(updates[b.key]){
      var idx=curDetailBlocks.indexOf(b);
      merged['step_'+idx]=Object.assign({},b.data||{},updates[b.key]);
    }
  });
  var r=await sb.from('projects').update(merged).eq('id',curDetailId);
  if(r.error){showToast('保存失败: '+r.error.message,'error');return}
  showToast('已保存','success');
  renderProjectDetail(curDetailId);
}

async function pdAction(action){
  if(!curDetailId)return;
  if(action==='return'){
    if(!await uiConfirm('确认退回？'))return;
    await sb.from('projects').update({current_state:'todo'}).eq('id',curDetailId);
    showToast('已退回待办','info');
    closeProjectDetail();
    loadProjects();
    return;
  }else if(action==='complete'){
    if(!await uiConfirm('确认办理完毕？此操作将项目状态置为办结'))return;
    await sb.from('projects').update({current_state:'done'}).eq('id',curDetailId);
    showToast('已办结','success');
  }else if(action==='read'){
    var myEmail=currentUser?currentUser.email:'';
    var r=await sb.from('project_block_state').select('*').eq('project_id',curDetailId);
    var alreadyRead=(r.data||[]).some(function(x){return x.notes&&x.notes.indexOf(myEmail)>=0});
    if(!alreadyRead){
      await sb.from('project_block_state').insert({project_id:curDetailId,block_key:'_read_'+Date.now(),status:'done',notes:'已阅 by '+myEmail,completed_at:new Date().toISOString()});
    }
    showToast(alreadyRead?'已记录阅件':'已标记为已阅','success');
  }
  renderProjectDetail(curDetailId);
}

// ===== 项目成员角色分配 + 步骤审批人配置 UI =====
var BUSINESS_ROLES=[
  {value:'sales',label:'销售',color:'#3b82f6'},
  {value:'pre_sales',label:'售前',color:'#8b5cf6'},
  {value:'after_sales',label:'售后',color:'#10b981'},
  {value:'procurement',label:'采购',color:'#f59e0b'},
  {value:'finance',label:'财务',color:'#ef4444'},
  {value:'legal',label:'法务',color:'#6366f1'},
  {value:'admin',label:'管理员',color:'#6b7280'}
];

function openProjectAssignmentModal(projectId){
  var m=document.getElementById('project-assignment-modal');
  if(!m){
    m=document.createElement('div');
    m.id='project-assignment-modal';
    m.className='modal-overlay hidden';
    m.style.zIndex='950';
    m.innerHTML='<div class="modal-sheet" style="max-width:760px;max-height:92vh;display:flex;flex-direction:column"><div class="modal-header"><h3>👥 项目成员与审批配置</h3><button class="modal-close" onclick="closeProjectAssignmentModal()" style="position:static">&times;</button></div><div id="pa-tabs" style="display:flex;border-bottom:1px solid var(--border);margin-bottom:12px"><button class="pa-tab active" onclick="switchPATab(\'members\')" data-tab="members">成员分配</button><button class="pa-tab" onclick="switchPATab(\'steps\')" data-tab="steps">步骤审批人</button><button class="pa-tab" onclick="switchPATab(\'fields\')" data-tab="fields">字段配置</button></div><div id="pa-content" style="flex:1;overflow-y:auto"><div id="pa-members-panel"></div><div id="pa-steps-panel" style="display:none"></div><div id="pa-fields-panel" style="display:none"></div></div></div><style>.pa-tab{padding:12px 20px;border:none;background:none;cursor:pointer;font-size:14px;color:var(--text);border-bottom:2px solid transparent}.pa-tab.active{border-bottom-color:var(--primary);color:var(--primary);font-weight:600}.pa-role-tag{display:inline-flex;align-items:center;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:500;margin-left:8px}.pa-user-row{display:flex;align-items:center;padding:12px;border-bottom:1px solid var(--border)}.pa-user-row:hover{background:var(--bg2)}.pa-step-row{padding:16px;border:1px solid var(--border);border-radius:12px;margin-bottom:12px;background:var(--bg)}.pa-step-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.pa-assignee-select{width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--bg);color:var(--text)}.pa-field-row{padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;background:var(--bg);display:flex;align-items:center;gap:12px}.pa-field-row input,.pa-field-row select{flex:1;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:13px;background:var(--bg);color:var(--text)}</style>';
    document.body.appendChild(m);
  }
  m.dataset.projectId=projectId;
  m.classList.remove('hidden');
  loadPAMembers(projectId);
  loadPASteps(projectId);
}
function closeProjectAssignmentModal(){var m=document.getElementById('project-assignment-modal');if(m)m.classList.add('hidden');}
function switchPATab(tab){document.querySelectorAll('.pa-tab').forEach(function(t){t.classList.remove('active')});document.querySelector('.pa-tab[data-tab="'+tab+'"]').classList.add('active');document.getElementById('pa-members-panel').style.display=tab==='members'?'block':'none';document.getElementById('pa-steps-panel').style.display=tab==='steps'?'block':'none';document.getElementById('pa-fields-panel').style.display=tab==='fields'?'block':'none';if(tab==='fields')loadPAFields(document.getElementById('project-assignment-modal').dataset.projectId);}

async function loadPAMembers(projectId){
  var container=document.getElementById('pa-members-panel');
  container.innerHTML='<div style="text-align:center;padding:40px">加载中...</div>';
  try{
    var {data:assignments}=await sb.from('project_assignments').select('*').eq('project_id',projectId);
    var {data:users}=await sb.from('profiles').select('user_id,display_name,email,department_id').eq('company_id',currentCompanyId);
    var {data:depts}=await sb.from('departments').select('id,name').eq('company_id',currentCompanyId);
    var deptMap={};if(depts)depts.forEach(function(d){deptMap[d.id]=d.name});
    var userMap={};if(users)users.forEach(function(u){userMap[u.user_id]=u});
    var html='<div style="margin-bottom:16px"><h4 style="margin:0 0 12px 0">已分配成员</h4>';
    if(assignments&&assignments.length){
      html+='<div style="border:1px solid var(--border);border-radius:12px;overflow:hidden">';
      assignments.forEach(function(a){
        var u=userMap[a.user_id]||{};
        var role=BUSINESS_ROLES.find(function(r){return r.value===a.business_role})||{label:'未分配',color:'#9ca3af'};
        html+='<div class="pa-user-row"><div style="flex:1"><div style="font-weight:600">'+escHtml(u.display_name||u.email||'未知用户')+'</div><div style="font-size:12px;color:var(--text2)">'+escHtml(u.email||'')+'</div>'+(a.department?'<div style="font-size:12px;color:var(--text2)">'+escHtml(a.department)+'</div>':'')+'</div><span class="pa-role-tag" style="background:'+role.color+'20;color:'+role.color+'">'+role.label+'</span><select onchange="updateMemberRole(\''+projectId+'\',\''+a.user_id+'\',this.value)" style="margin-left:12px;padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;background:var(--bg);color:var(--text)"><option value="">选择角色</option>'+BUSINESS_ROLES.map(function(r){return'<option value="'+r.value+'"'+(a.business_role===r.value?' selected':'')+'>'+r.label+'</option>'}).join('')+'</select><button onclick="removeMember(\''+projectId+'\',\''+a.user_id+'\')" style="margin-left:12px;padding:6px 10px;border:none;border-radius:6px;background:#ef444420;color:#ef4444;cursor:pointer;font-size:13px">移除</button></div>';
      });
      html+='</div>';
    }else{html+='<div style="text-align:center;padding:40px;color:var(--text2)">暂无成员</div>';}
    html+='</div>';
    html+='<div style="border:1px solid var(--border);border-radius:12px;padding:16px;background:var(--bg)"><h4 style="margin:0 0 12px 0">添加成员</h4><div style="display:flex;gap:12px;flex-wrap:wrap"><select id="pa-new-member" style="flex:1;min-width:200px;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--bg);color:var(--text)"><option value="">选择用户</option>'+(users?users.filter(function(u){return!(assignments&&assignments.some(function(a){return a.user_id===u.user_id}))}).map(function(u){return'<option value="'+u.user_id+'" data-dept="'+escHtml(deptMap[u.department_id]||'')+'">'+escHtml(u.display_name||u.email)+' ('+escHtml(u.email)+')</option>'}).join(''):'')+'</select><select id="pa-new-role" style="padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--bg);color:var(--text)"><option value="">选择业务角色</option>'+BUSINESS_ROLES.map(function(r){return'<option value="'+r.value+'">'+r.label+'</option>'}).join('')+'</select><button onclick="addMember(\''+projectId+'\')" style="padding:10px 20px;border:none;border-radius:8px;background:var(--primary);color:#fff;font-size:14px;font-weight:600;cursor:pointer">添加</button></div></div>';
    container.innerHTML=html;
  }catch(e){container.innerHTML='<div style="text-align:center;padding:40px;color:#ef4444">加载失败: '+escHtml(e.message)+'</div>';}
}

async function loadPASteps(projectId){
  var container=document.getElementById('pa-steps-panel');
  container.innerHTML='<div style="text-align:center;padding:40px">加载中...</div>';
  try{
    var {data:steps, error:stepsError}=await sb.from('project_step_assignees').select('*').eq('project_id',projectId).order('step_key');
    var {data:depts}=await sb.from('departments').select('id,name').eq('company_id',currentCompanyId).order('name');
    var {data:profiles}=await sb.from('profiles').select('user_id,display_name,email,department_id,company_id').eq('company_id',currentCompanyId);
    if(!steps||!steps.length){container.innerHTML='<div style="text-align:center;padding:40px;color:var(--text2)">暂无步骤配置 (projectId: '+projectId+', steps: '+(steps?steps.length:'null')+')</div>';return;}
    // 构建部门-人员选项（key统一为字符串，避免类型不匹配）
    var deptUserMap={};
    if(depts)depts.forEach(function(d){deptUserMap[String(d.id)]={name:d.name,users:[]};});
    // 添加"未分配部门"分组
    deptUserMap['__none__']={name:'未分配部门',users:[]};
    var unmatchedProfiles=[];
    if(profiles)profiles.forEach(function(p){
      if(p.department_id&&deptUserMap[String(p.department_id)]){
        deptUserMap[String(p.department_id)].users.push(p);
      }else{
        deptUserMap['__none__'].users.push(p);
      }
    });
    // 生成按部门分组的人员选项HTML
    var userOptsByDept='';
    Object.keys(deptUserMap).forEach(function(deptId){
      var d=deptUserMap[deptId];
      if(d.users.length>0){
        userOptsByDept+='<optgroup label="'+escHtml(d.name)+'">';
        d.users.forEach(function(u){userOptsByDept+='<option value="'+u.user_id+'">'+escHtml(u.display_name||u.email)+'</option>';});
        userOptsByDept+='</optgroup>';
      }
    });
    var memberOpts='<option value="">选择人员</option>'+userOptsByDept;
    var roleOpts='<option value="">选择角色</option>'+BUSINESS_ROLES.map(function(r){return'<option value="'+r.value+'">'+r.label+'</option>'}).join('');
    var html='<div style="margin-bottom:16px"><h4 style="margin:0 0 8px 0">步骤审批人 + 查阅人配置</h4><p style="margin:0;font-size:13px;color:var(--text2)">每个步骤独立配置<span style="color:#3b82f6">审批人</span>（可编辑）和<span style="color:#10b981">查阅人</span>（只读查看）</p></div>';
    steps.forEach(function(s,i){
      var ar=BUSINESS_ROLES.find(function(r){return r.value===s.assignee_role})||{label:'未设',color:'#9ca3af'};
      var rr=BUSINESS_ROLES.find(function(r){return r.value===s.reviewer_role})||{label:'未设',color:'#9ca3af'};
      var checkedR=s.assignee_type||'role';var checkedRV=s.reviewer_type||'role';
      html+='<div class="pa-step-row">';
      // 步骤标题
      html+='<div class="pa-step-header"><div><span style="font-weight:600">'+(i+1)+'. '+escHtml(s.step_label)+'</span></div><div style="display:flex;gap:6px"><span class="pa-role-tag" style="background:'+ar.color+'20;color:'+ar.color+'">审批:'+ar.label+'</span><span class="pa-role-tag" style="background:'+rr.color+'20;color:'+rr.color+'">查阅:'+rr.label+'</span></div></div>';
      // 审批人区域
      html+='<div style="margin-bottom:12px;padding:10px;border-left:3px solid #3b82f6;border-radius:4px;background:var(--bg2)">';
      html+='<div style="font-size:13px;font-weight:600;color:#3b82f6;margin-bottom:8px">📝 审批人（可编辑提交）</div>';
      html+='<div style="display:flex;gap:12px;align-items:center;margin-bottom:8px"><label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:13px"><input type="radio" name="at-'+s.step_key+'" value="role"'+(checkedR==='role'?' checked':'')+' onchange="updateStepAssigneeType(\''+projectId+'\',\''+s.step_key+'\',\'role\')"> 按角色</label><label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:13px"><input type="radio" name="at-'+s.step_key+'" value="user"'+(checkedR==='user'?' checked':'')+' onchange="updateStepAssigneeType(\''+projectId+'\',\''+s.step_key+'\',\'user\')"> 指定人</label></div>';
      html+='<div id="ar-role-'+s.step_key+'"'+(checkedR==='user'?' style="display:none"':'')+'><select onchange="updateStepRole(\''+projectId+'\',\''+s.step_key+'\',this.value)" class="pa-assignee-select">'+roleOpts.replace(/value="'+s.assignee_role+'"/,'value="'+s.assignee_role+'" selected')+'</select></div>';
      html+='<div id="ar-user-'+s.step_key+'"'+(checkedR==='role'?' style="display:none"':'')+'><select onchange="updateStepUser(\''+projectId+'\',\''+s.step_key+'\',this.value)" class="pa-assignee-select">'+memberOpts.replace(/value="'+s.assignee_user_id+'"/,'value="'+s.assignee_user_id+'" selected')+'</select></div>';
      html+='</div>';
      // 查阅人区域
      html+='<div style="padding:10px;border-left:3px solid #10b981;border-radius:4px;background:var(--bg2)">';
      html+='<div style="font-size:13px;font-weight:600;color:#10b981;margin-bottom:8px">👁 查阅人（只读查看，不可编辑）</div>';
      html+='<div style="display:flex;gap:12px;align-items:center;margin-bottom:8px"><label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:13px"><input type="radio" name="rt-'+s.step_key+'" value="role"'+(checkedRV==='role'?' checked':'')+' onchange="updateStepReviewerType(\''+projectId+'\',\''+s.step_key+'\',\'role\')"> 按角色</label><label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:13px"><input type="radio" name="rt-'+s.step_key+'" value="user"'+(checkedRV==='user'?' checked':'')+' onchange="updateStepReviewerType(\''+projectId+'\',\''+s.step_key+'\',\'user\')"> 指定人</label></div>';
      html+='<div id="rr-role-'+s.step_key+'"'+(checkedRV==='user'?' style="display:none"':'')+'><select onchange="updateStepReviewerRole(\''+projectId+'\',\''+s.step_key+'\',this.value)" class="pa-assignee-select">'+roleOpts.replace(/value="'+s.reviewer_role+'"/,'value="'+s.reviewer_role+'" selected')+'</select></div>';
      html+='<div id="rr-user-'+s.step_key+'"'+(checkedRV==='role'?' style="display:none"':'')+'><select onchange="updateStepReviewerUser(\''+projectId+'\',\''+s.step_key+'\',this.value)" class="pa-assignee-select">'+memberOpts.replace(/value="'+s.reviewer_user_id+'"/,'value="'+s.reviewer_user_id+'" selected')+'</select></div>';
      html+='</div>';
      html+='</div>';
    });
    container.innerHTML=html;
  }catch(e){container.innerHTML='<div style="text-align:center;padding:40px;color:#ef4444">加载失败: '+escHtml(e.message)+'</div>';}
}

async function updateMemberRole(projectId,userId,role){
  try{var {error}=await sb.from('project_assignments').update({business_role:role||null}).eq('project_id',projectId).eq('user_id',userId);if(error)throw error;showToast('✅ 角色已更新');loadPAMembers(projectId);loadPASteps(projectId);}catch(e){showToast('❌ 更新失败: '+e.message);}
}
async function removeMember(projectId,userId){
  if(!await uiConfirm('确定移除该成员？'))return;
  try{var {error}=await sb.from('project_assignments').delete().eq('project_id',projectId).eq('user_id',userId);if(error)throw error;showToast('✅ 成员已移除');loadPAMembers(projectId);loadPASteps(projectId);}catch(e){showToast('❌ 移除失败: '+e.message);}
}
async function addMember(projectId){
  var userSelect=document.getElementById('pa-new-member');var roleSelect=document.getElementById('pa-new-role');var userId=userSelect.value;var role=roleSelect.value;if(!userId){showToast('请选择用户');return;}
  try{var {error}=await sb.from('project_assignments').insert({project_id:projectId,user_id:userId,business_role:role||null,project_role:'edit'});if(error)throw error;showToast('✅ 成员已添加');userSelect.value='';roleSelect.value='';loadPAMembers(projectId);loadPASteps(projectId);}catch(e){showToast('❌ 添加失败: '+e.message);}
}
async function updateStepAssigneeType(projectId,stepKey,type){
  document.getElementById('ar-role-'+stepKey).style.display=type==='role'?'block':'none';
  document.getElementById('ar-user-'+stepKey).style.display=type==='user'?'block':'none';
  try{var {error}=await sb.from('project_step_assignees').update({assignee_type:type,updated_at:new Date().toISOString()}).eq('project_id',projectId).eq('step_key',stepKey);if(error)throw error;}catch(e){showToast('❌ 更新失败: '+e.message);}
}
async function updateStepRole(projectId,stepKey,role){
  try{var {error}=await sb.from('project_step_assignees').update({assignee_role:role,assignee_user_id:null,updated_at:new Date().toISOString()}).eq('project_id',projectId).eq('step_key',stepKey);if(error)throw error;showToast('✅ 审批角色已更新');}catch(e){showToast('❌ 更新失败: '+e.message);}
}
async function updateStepUser(projectId,stepKey,userId){
  try{var {data:profile}=await sb.from('profiles').select('email,display_name').eq('user_id',userId).single();var {error}=await sb.from('project_step_assignees').update({assignee_user_id:userId,assignee_user_email:profile?.email||'',updated_at:new Date().toISOString()}).eq('project_id',projectId).eq('step_key',stepKey);if(error)throw error;showToast('✅ 审批人已更新');}catch(e){showToast('❌ 更新失败: '+e.message);}
}
async function updateStepReviewerType(projectId,stepKey,type){
  document.getElementById('rr-role-'+stepKey).style.display=type==='role'?'block':'none';
  document.getElementById('rr-user-'+stepKey).style.display=type==='user'?'block':'none';
  try{var {error}=await sb.from('project_step_assignees').update({reviewer_type:type,updated_at:new Date().toISOString()}).eq('project_id',projectId).eq('step_key',stepKey);if(error)throw error;}catch(e){showToast('❌ 更新失败: '+e.message);}
}
async function updateStepReviewerRole(projectId,stepKey,role){
  try{var {error}=await sb.from('project_step_assignees').update({reviewer_role:role,reviewer_user_id:null,updated_at:new Date().toISOString()}).eq('project_id',projectId).eq('step_key',stepKey);if(error)throw error;showToast('✅ 查阅角色已更新');}catch(e){showToast('❌ 更新失败: '+e.message);}
}
async function updateStepReviewerUser(projectId,stepKey,userId){
  try{var {data:profile}=await sb.from('profiles').select('email,display_name').eq('user_id',userId).single();var {error}=await sb.from('project_step_assignees').update({reviewer_user_id:userId,reviewer_user_email:profile?.email||'',updated_at:new Date().toISOString()}).eq('project_id',projectId).eq('step_key',stepKey);if(error)throw error;showToast('✅ 查阅人已更新');}catch(e){showToast('❌ 更新失败: '+e.message);}
}

// ========== 字段配置功能 ==========
var FIELD_TYPES=[{value:'text',label:'文本'},{value:'textarea',label:'多行文本'},{value:'number',label:'数字'},{value:'date',label:'日期'},{value:'select',label:'下拉选择'},{value:'multiselect',label:'多选'},{value:'checkbox',label:'复选框'},{value:'radio',label:'单选'}];
async function loadPAFields(projectId){
  var container=document.getElementById('pa-fields-panel');
  container.innerHTML='<div style="text-align:center;padding:40px">加载中...</div>';
  try{
    var {data:steps}=await sb.from('project_step_assignees').select('step_key,step_label').eq('project_id',projectId).order('step_key');
    var {data:fields}=await sb.from('project_step_fields').select('*').eq('project_id',projectId).order('step_key,sort_order');
    if(!steps||!steps.length){container.innerHTML='<div style="text-align:center;padding:40px;color:var(--text2)">暂无步骤，请先创建项目</div>';return;}
    var html='<div style="margin-bottom:16px"><h4 style="margin:0 0 8px 0">步骤字段配置</h4><p style="margin:0;font-size:13px;color:var(--text2)">为每个步骤自定义表单字段</p></div>';
    steps.forEach(function(s){
      var stepFields=fields?fields.filter(function(f){return f.step_key===s.step_key}):[];
      html+='<div class="pa-step-row"><div class="pa-step-header"><div><span style="font-weight:600">'+escHtml(s.step_label)+'</span></div><button onclick="addField(\''+projectId+'\',\''+s.step_key+'\')" style="padding:6px 12px;background:var(--primary);color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer">+ 添加字段</button></div>';
      if(stepFields.length){
        stepFields.forEach(function(f){
          var serialChecked=f.collaboration_mode==='serial'?' checked':'';
          html+='<div class="pa-field-row"><input type="text" value="'+escHtml(f.field_label)+'" onchange="updateFieldLabel('+f.id+',this.value)" placeholder="字段名称"><select onchange="updateFieldType('+f.id+',this.value)">'+FIELD_TYPES.map(function(t){return'<option value="'+t.value+'"'+(f.field_type===t.value?' selected':'')+'>'+t.label+'</option>'}).join('')+'</select><label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer"><input type="checkbox"'+(f.is_required?' checked':'')+' onchange="updateFieldRequired('+f.id+',this.checked)"> 必填</label><select onchange="updateFieldCollabMode('+f.id+',this.value)" style="padding:4px 8px;border:1px solid var(--border);border-radius:4px;font-size:12px;background:var(--bg);color:var(--text)"><option value="parallel"'+(''+(f.collaboration_mode||'parallel')==='parallel'?' selected':'')+'>并行</option><option value="serial"'+(''+(f.collaboration_mode||'parallel')==='serial'?' selected':'')+'>串行</option></select><button onclick="deleteStepField('+f.id+')" style="padding:4px 8px;background:#ef4444;color:#fff;border:none;border-radius:4px;font-size:12px;cursor:pointer">删除</button></div>';
        });
      }else{
        html+='<div style="padding:20px;text-align:center;color:var(--text2);font-size:13px">暂无字段，点击上方按钮添加</div>';
      }
      html+='</div>';
    });
    container.innerHTML=html;
  }catch(e){container.innerHTML='<div style="text-align:center;padding:40px;color:#ef4444">加载失败: '+escHtml(e.message)+'</div>';}
}
async function addField(projectId,stepKey){
  if(!isAdmin()){showToast('⚠️ 仅管理员可编辑字段配置');return;}
  try{var {error}=await sb.from('project_step_fields').insert({project_id:projectId,step_key:stepKey,field_key:'field_'+Date.now(),field_label:'新字段',field_type:'text',sort_order:99,collaboration_mode:'parallel'});if(error)throw error;showToast('✅ 字段已添加');loadPAFields(projectId);}catch(e){showToast('❌ 添加失败: '+e.message);}
}
async function updateFieldLabel(fieldId,label){
  if(!isAdmin())return;
  try{var {error}=await sb.from('project_step_fields').update({field_label:label}).eq('id',fieldId);if(error)throw error;}catch(e){}
}
async function updateFieldType(fieldId,type){
  if(!isAdmin())return;
  try{var {error}=await sb.from('project_step_fields').update({field_type:type}).eq('id',fieldId);if(error)throw error;}catch(e){}
}
async function updateFieldRequired(fieldId,required){
  if(!isAdmin())return;
  try{var {error}=await sb.from('project_step_fields').update({is_required:required}).eq('id',fieldId);if(error)throw error;}catch(e){}
}
async function updateFieldCollabMode(fieldId,mode){
  if(!isAdmin())return;
  try{var {error}=await sb.from('project_step_fields').update({collaboration_mode:mode}).eq('id',fieldId);if(error)throw error;showToast('✅ 已切换为'+(mode==='serial'?'串行':'并行')+'模式');}catch(e){showToast('❌ 更新失败: '+e.message);}
}
async function deleteStepField(fieldId){
  if(!isAdmin()){showToast('⚠️ 仅管理员可删除字段');return;}
  if(!await uiConfirm('确定删除此字段？'))return;
  try{var {error}=await sb.from('project_step_fields').delete().eq('id',fieldId);if(error)throw error;showToast('✅ 字段已删除');var projectId=document.getElementById('project-assignment-modal').dataset.projectId;loadPAFields(projectId);}catch(e){showToast('❌ 删除失败: '+e.message);}
}
function isAdmin(){
  if(typeof isSuperAdmin!=='undefined'&&isSuperAdmin)return true;
  if(typeof currentCompanyRole!=='undefined'&&currentCompanyRole==='admin')return true;
  if(typeof currentUserRole!=='undefined'&&currentUserRole==='admin')return true;
  return false;
}


