// ============================================================
// 项目成员角色分配 + 步骤审批人配置 UI
// 将此代码添加到 index.html 中
// ============================================================

// 业务角色选项
var BUSINESS_ROLES=[
  {value:'sales',label:'销售',color:'#3b82f6'},
  {value:'pre_sales',label:'售前',color:'#8b5cf6'},
  {value:'after_sales',label:'售后',color:'#10b981'},
  {value:'procurement',label:'采购',color:'#f59e0b'},
  {value:'finance',label:'财务',color:'#ef4444'},
  {value:'legal',label:'法务',color:'#6366f1'},
  {value:'admin',label:'管理员',color:'#6b7280'}
];

// 打开项目成员分配弹窗
function openProjectAssignmentModal(projectId){
  var m=document.getElementById('project-assignment-modal');
  if(!m){
    m=document.createElement('div');
    m.id='project-assignment-modal';
    m.className='modal hidden';
    m.innerHTML=`
      <div class="modal-card" style="max-width:720px;max-height:90vh;overflow-y:auto">
        <div class="modal-hdr">
          <span>👥 项目成员与审批配置</span>
          <button class="modal-x" onclick="closeProjectAssignmentModal()">✕</button>
        </div>
        <div id="pa-tabs" style="display:flex;border-bottom:1px solid var(--border);margin:0 16px">
          <button class="pa-tab active" onclick="switchPATab('members')" data-tab="members">成员分配</button>
          <button class="pa-tab" onclick="switchPATab('steps')" data-tab="steps">步骤审批人</button>
        </div>
        <div id="pa-content" style="padding:16px">
          <div id="pa-members-panel"></div>
          <div id="pa-steps-panel" class="hidden"></div>
        </div>
      </div>
      <style>
        .pa-tab{padding:12px 20px;border:none;background:none;cursor:pointer;font-size:14px;color:var(--text);border-bottom:2px solid transparent}
        .pa-tab.active{border-bottom-color:var(--primary);color:var(--primary);font-weight:600}
        .pa-role-tag{display:inline-flex;align-items:center;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:500;margin-left:8px}
        .pa-user-row{display:flex;align-items:center;padding:12px;border-bottom:1px solid var(--border)}
        .pa-user-row:hover{background:var(--bg2)}
        .pa-step-row{padding:16px;border:1px solid var(--border);border-radius:12px;margin-bottom:12px;background:var(--bg)}
        .pa-step-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
        .pa-assignee-select{width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--bg);color:var(--text)}
      </style>
    `;
    document.body.appendChild(m);
  }
  m.dataset.projectId=projectId;
  m.classList.remove('hidden');
  loadPAMembers(projectId);
  loadPASteps(projectId);
}

function closeProjectAssignmentModal(){
  var m=document.getElementById('project-assignment-modal');
  if(m)m.classList.add('hidden');
}

function switchPATab(tab){
  document.querySelectorAll('.pa-tab').forEach(function(t){t.classList.remove('active')});
  document.querySelector('.pa-tab[data-tab="'+tab+'"]').classList.add('active');
  document.getElementById('pa-members-panel').classList.toggle('hidden',tab!=='members');
  document.getElementById('pa-steps-panel').classList.toggle('hidden',tab!=='steps');
}

// 加载项目成员
async function loadPAMembers(projectId){
  var container=document.getElementById('pa-members-panel');
  container.innerHTML='<div style="text-align:center;padding:40px">加载中...</div>';
  
  try{
    // 获取项目成员
    var {data:assignments}=await sb.from('project_assignments')
      .select('*,profiles:user_id(display_name,email)')
      .eq('project_id',projectId);
    
    // 获取公司所有用户
    var {data:users}=await sb.from('profiles')
      .select('user_id,display_name,email,department_id')
      .eq('company_id',currentCompanyId);
    
    // 获取部门
    var {data:depts}=await sb.from('departments')
      .select('id,name')
      .eq('company_id',currentCompanyId);
    
    var deptMap={};
    if(depts)depts.forEach(function(d){deptMap[d.id]=d.name});
    
    var html='<div style="margin-bottom:16px">';
    html+='<h4 style="margin:0 0 12px 0">已分配成员</h4>';
    
    if(assignments&&assignments.length){
      html+='<div style="border:1px solid var(--border);border-radius:12px;overflow:hidden">';
      assignments.forEach(function(a){
        var role=BUSINESS_ROLES.find(function(r){return r.value===a.business_role})||{label:'未分配',color:'#9ca3af'};
        html+='<div class="pa-user-row">';
        html+='<div style="flex:1">';
        html+='<div style="font-weight:600">'+escHtml(a.profiles.display_name||a.profiles.email)+'</div>';
        html+='<div style="font-size:12px;color:var(--text2)">'+escHtml(a.profiles.email)+'</div>';
        if(a.department)html+='<div style="font-size:12px;color:var(--text2)">'+escHtml(a.department)+'</div>';
        html+='</div>';
        html+='<span class="pa-role-tag" style="background:'+role.color+'20;color:'+role.color+'">'+role.label+'</span>';
        html+='<select onchange="updateMemberRole(\''+projectId+'\',\''+a.user_id+'\',this.value)" style="margin-left:12px;padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;background:var(--bg);color:var(--text)">';
        html+='<option value="">选择角色</option>';
        BUSINESS_ROLES.forEach(function(r){
          html+='<option value="'+r.value+'"'+(a.business_role===r.value?' selected':'')+'>'+r.label+'</option>';
        });
        html+='</select>';
        html+='<button onclick="removeMember(\''+projectId+'\',\''+a.user_id+'\')" style="margin-left:12px;padding:6px 10px;border:none;border-radius:6px;background:#ef444420;color:#ef4444;cursor:pointer;font-size:13px">移除</button>';
        html+='</div>';
      });
      html+='</div>';
    }else{
      html+='<div style="text-align:center;padding:40px;color:var(--text2)">暂无成员</div>';
    }
    html+='</div>';
    
    // 添加新成员
    html+='<div style="border:1px solid var(--border);border-radius:12px;padding:16px;background:var(--bg)">';
    html+='<h4 style="margin:0 0 12px 0">添加成员</h4>';
    html+='<div style="display:flex;gap:12px;flex-wrap:wrap">';
    html+='<select id="pa-new-member" style="flex:1;min-width:200px;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--bg);color:var(--text)">';
    html+='<option value="">选择用户</option>';
    if(users)users.forEach(function(u){
      var isAssigned=assignments&&assignments.some(function(a){return a.user_id===u.user_id});
      if(!isAssigned){
        html+='<option value="'+u.user_id+'" data-dept="'+escHtml(deptMap[u.department_id]||'')+'">'+escHtml(u.display_name||u.email)+' ('+escHtml(u.email)+')</option>';
      }
    });
    html+='</select>';
    html+='<select id="pa-new-role" style="padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--bg);color:var(--text)">';
    html+='<option value="">选择业务角色</option>';
    BUSINESS_ROLES.forEach(function(r){
      html+='<option value="'+r.value+'">'+r.label+'</option>';
    });
    html+='</select>';
    html+='<button onclick="addMember(\''+projectId+'\')" style="padding:10px 20px;border:none;border-radius:8px;background:var(--primary);color:#fff;font-size:14px;font-weight:600;cursor:pointer">添加</button>';
    html+='</div>';
    html+='</div>';
    
    container.innerHTML=html;
  }catch(e){
    container.innerHTML='<div style="text-align:center;padding:40px;color:#ef4444">加载失败: '+escHtml(e.message)+'</div>';
  }
}

// 加载步骤审批人配置
async function loadPASteps(projectId){
  var container=document.getElementById('pa-steps-panel');
  container.innerHTML='<div style="text-align:center;padding:40px">加载中...</div>';
  
  try{
    // 获取项目步骤配置
    var {data:steps}=await sb.from('project_step_assignees')
      .select('*')
      .eq('project_id',projectId)
      .order('step_key');
    
    // 获取项目成员（用于指定具体人员）
    var {data:members}=await sb.from('project_assignments')
      .select('user_id,business_role,profiles:user_id(display_name,email)')
      .eq('project_id',projectId);
    
    if(!steps||!steps.length){
      container.innerHTML='<div style="text-align:center;padding:40px;color:var(--text2)">暂无步骤配置</div>';
      return;
    }
    
    var html='<div style="margin-bottom:16px"><h4 style="margin:0 0 8px 0">步骤审批人配置</h4><p style="margin:0;font-size:13px;color:var(--text2)">为每个步骤指定审批方式：按角色分配或指定具体人员</p></div>';
    
    steps.forEach(function(s,i){
      var role=BUSINESS_ROLES.find(function(r){return r.value===s.assignee_role})||{label:'未设置',color:'#9ca3af'};
      html+='<div class="pa-step-row">';
      html+='<div class="pa-step-header">';
      html+='<div><span style="font-weight:600">'+(i+1)+'. '+escHtml(s.step_label)+'</span></div>';
      html+='<span class="pa-role-tag" style="background:'+role.color+'20;color:'+role.color+'">'+role.label+'</span>';
      html+='</div>';
      
      html+='<div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">';
      html+='<label style="display:flex;align-items:center;gap:6px;cursor:pointer">';
      html+='<input type="radio" name="assign-type-'+s.step_key+'" value="role"'+(s.assignee_type==='role'?' checked':'')+' onchange="updateStepAssigneeType(\''+projectId+'\',\''+s.step_key+'\',\'role\')">';
      html+='<span>按角色分配</span>';
      html+='</label>';
      html+='<label style="display:flex;align-items:center;gap:6px;cursor:pointer">';
      html+='<input type="radio" name="assign-type-'+s.step_key+'" value="user"'+(s.assignee_type==='user'?' checked':'')+' onchange="updateStepAssigneeType(\''+projectId+'\',\''+s.step_key+'\',\'user\')">';
      html+='<span>指定人员</span>';
      html+='</label>';
      html+='</div>';
      
      // 角色选择
      html+='<div id="role-select-'+s.step_key+'"'+(s.assignee_type==='user'?' style="display:none"':'')+'>';
      html+='<select onchange="updateStepRole(\''+projectId+'\',\''+s.step_key+'\',this.value)" class="pa-assignee-select">';
      html+='<option value="">选择审批角色</option>';
      BUSINESS_ROLES.forEach(function(r){
        html+='<option value="'+r.value+'"'+(s.assignee_role===r.value?' selected':'')+'>'+r.label+'</option>';
      });
      html+='</select>';
      html+='</div>';
      
      // 人员选择
      html+='<div id="user-select-'+s.step_key+'"'+(s.assignee_type==='role'?' style="display:none"':'')+'>';
      html+='<select onchange="updateStepUser(\''+projectId+'\',\''+s.step_key+'\',this.value)" class="pa-assignee-select">';
      html+='<option value="">选择审批人</option>';
      if(members)members.forEach(function(m){
        var roleLabel=BUSINESS_ROLES.find(function(r){return r.value===m.business_role})?.label||'';
        html+='<option value="'+m.user_id+'"'+(s.assignee_user_id===m.user_id?' selected':'')+'>'+escHtml(m.profiles.display_name||m.profiles.email)+' ('+roleLabel+')</option>';
      });
      html+='</select>';
      html+='</div>';
      
      html+='</div>';
    });
    
    container.innerHTML=html;
  }catch(e){
    container.innerHTML='<div style="text-align:center;padding:40px;color:#ef4444">加载失败: '+escHtml(e.message)+'</div>';
  }
}

// 更新成员角色
async function updateMemberRole(projectId,userId,role){
  try{
    var {error}=await sb.from('project_assignments')
      .update({business_role:role||null})
      .eq('project_id',projectId)
      .eq('user_id',userId);
    if(error)throw error;
    showToast('✅ 角色已更新');
    loadPAMembers(projectId);
    loadPASteps(projectId);
  }catch(e){
    showToast('❌ 更新失败: '+e.message);
  }
}

// 移除成员
async function removeMember(projectId,userId){
  if(!confirm('确定移除该成员？'))return;
  try{
    var {error}=await sb.from('project_assignments')
      .delete()
      .eq('project_id',projectId)
      .eq('user_id',userId);
    if(error)throw error;
    showToast('✅ 成员已移除');
    loadPAMembers(projectId);
    loadPASteps(projectId);
  }catch(e){
    showToast('❌ 移除失败: '+e.message);
  }
}

// 添加成员
async function addMember(projectId){
  var userSelect=document.getElementById('pa-new-member');
  var roleSelect=document.getElementById('pa-new-role');
  var userId=userSelect.value;
  var role=roleSelect.value;
  
  if(!userId){showToast('请选择用户');return;}
  
  try{
    var {error}=await sb.from('project_assignments').insert({
      project_id:projectId,
      user_id:userId,
      business_role:role||null,
      project_role:'edit'
    });
    if(error)throw error;
    showToast('✅ 成员已添加');
    userSelect.value='';
    roleSelect.value='';
    loadPAMembers(projectId);
    loadPASteps(projectId);
  }catch(e){
    showToast('❌ 添加失败: '+e.message);
  }
}

// 更新步骤分配类型
async function updateStepAssigneeType(projectId,stepKey,type){
  document.getElementById('role-select-'+stepKey).style.display=type==='role'?'block':'none';
  document.getElementById('user-select-'+stepKey).style.display=type==='user'?'block':'none';
  
  try{
    var {error}=await sb.from('project_step_assignees')
      .update({assignee_type:type,updated_at:new Date().toISOString()})
      .eq('project_id',projectId)
      .eq('step_key',stepKey);
    if(error)throw error;
  }catch(e){
    showToast('❌ 更新失败: '+e.message);
  }
}

// 更新步骤角色
async function updateStepRole(projectId,stepKey,role){
  try{
    var {error}=await sb.from('project_step_assignees')
      .update({assignee_role:role,assignee_user_id:null,updated_at:new Date().toISOString()})
      .eq('project_id',projectId)
      .eq('step_key',stepKey);
    if(error)throw error;
    showToast('✅ 审批角色已更新');
  }catch(e){
    showToast('❌ 更新失败: '+e.message);
  }
}

// 更新步骤指定人员
async function updateStepUser(projectId,stepKey,userId){
  try{
    var {data:profile}=await sb.from('profiles')
      .select('email,display_name')
      .eq('user_id',userId)
      .single();
    
    var {error}=await sb.from('project_step_assignees')
      .update({
        assignee_user_id:userId,
        assignee_user_email:profile?.email||'',
        updated_at:new Date().toISOString()
      })
      .eq('project_id',projectId)
      .eq('step_key',stepKey);
    if(error)throw error;
    showToast('✅ 审批人已更新');
  }catch(e){
    showToast('❌ 更新失败: '+e.message);
  }
}

// 检查当前用户是否可以编辑某步骤
async function canEditStep(projectId,stepKey){
  try{
    var {data,error}=await sb.rpc('can_approve_step',{pid:projectId,step_key:stepKey});
    if(error)throw error;
    return data;
  }catch(e){
    console.error('canEditStep error:',e);
    return false;
  }
}

// 获取步骤审批人信息
async function getStepAssigneeInfo(projectId,stepKey){
  try{
    var {data,error}=await sb.from('project_step_assignees')
      .select('*')
      .eq('project_id',projectId)
      .eq('step_key',stepKey)
      .single();
    if(error)throw error;
    return data;
  }catch(e){
    return null;
  }
}

// 在 renderDetailBlocks 中显示审批人信息
function renderStepAssigneeInfo(block,projectId){
  var stepKey=block.key;
  var html='<div style="margin-top:12px;padding:12px;background:var(--bg2);border-radius:8px;font-size:13px">';
  html+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
  html+='<span>👤 审批人:</span>';
  
  getStepAssigneeInfo(projectId,stepKey).then(function(info){
    if(!info){
      html+='<span style="color:var(--text2)">未配置</span>';
    }else if(info.assignee_type==='user'&&info.assignee_user_email){
      html+='<span>'+escHtml(info.assignee_user_email)+'</span>';
    }else if(info.assignee_role){
      var role=BUSINESS_ROLES.find(function(r){return r.value===info.assignee_role});
      html+='<span class="pa-role-tag" style="background:'+(role?.color||'#9ca3af')+'20;color:'+(role?.color||'#9ca3af')+'">'+(role?.label||info.assignee_role)+'</span>';
    }
    html+='</div>';
    html+='</div>';
  });
  
  return html;
}

// 导出函数供全局使用
window.openProjectAssignmentModal=openProjectAssignmentModal;
window.closeProjectAssignmentModal=closeProjectAssignmentModal;
window.switchPATab=switchPATab;
window.updateMemberRole=updateMemberRole;
window.removeMember=removeMember;
window.addMember=addMember;
window.updateStepAssigneeType=updateStepAssigneeType;
window.updateStepRole=updateStepRole;
window.updateStepUser=updateStepUser;
window.canEditStep=canEditStep;
window.getStepAssigneeInfo=getStepAssigneeInfo;
