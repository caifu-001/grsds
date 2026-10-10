// ==========================================================================
// grsds · 16-projects.js  —  项目管理 · 工作台导航 · 步骤审批
// 源: js/app_v2.js 第 10876-12798 行（机械切片，未改一行代码）
// ==========================================================================
// ====== Project Management ======
var allProjects=[],allStages=[],allBiddings=[],allDeliveries=[],allTemplates=[],curProjectId=null,curProjectName='',projectStateFilter='doing'; // 注：allContracts/allPayments 由 09-sales.js 声明，此处不再重复
var pStageEditId=null,pBiddingEditId=null,pDeliveryEditId=null,pPaymentEditId=null;

// ---- Workflow Data ----
var curWorkflow={}, curWorkflowState={}, curStep=0;
var WORKFLOW_STEPS=[
  {seq:1,phase:'线索',key:'gather',name:'搜集线索',icon:'🔍',panel:'lead_gathering'},
  {seq:2,phase:'商机',key:'analyze',name:'分析与验证',icon:'💡',panel:'analysis'},
  {seq:3,phase:'分析与策略',key:'competitors',name:'获取竞争对手名单',icon:'📋',panel:'competitor',tip:'从客户库搜索添加'},
  {seq:4,phase:'分析与策略',key:'compete_analysis',name:'竞争与分析',icon:'📊',panel:'competitor',tip:'填写竞争分析笔记'},
  {seq:5,phase:'分析与策略',key:'decision_join',name:'参与决策',icon:'🚦',decision:true,decisionAsk:'是否参与决策？',decisionYes:'6',decisionNo:'46'},
  {seq:6,phase:'内部赋能',key:'training',name:'学习培训',icon:'📖',panel:'training',tip:'完成培训后自动跳转步骤7'},
  {seq:7,phase:'内部赋能',key:'vendor_compare',name:'厂家比较',icon:'🔄',panel:'vendor_compare'},
  {seq:8,phase:'初步方案定制',key:'client_comm',name:'客户交流方案',icon:'💬',panel:'client_comm'},
  {seq:9,phase:'初步方案定制',key:'internal_review',name:'内部审核',icon:'🚦',decision:true,decisionAsk:'内部审核是否通过？',decisionYes:'10',decisionNo:'46'},
  {seq:10,phase:'项目运作',key:'company_intro',name:'公司介绍交流方案',icon:'🏢',panel:'company_intro'},
  {seq:11,phase:'项目运作',key:'detailed_needs',name:'获取客户详细需求',icon:'📝',panel:'needs'},
  {seq:12,phase:'项目运作',key:'brand_reg',name:'品牌报备',icon:'🏷️',panel:'brand_reg'},
  {seq:13,phase:'项目运作',key:'detailed_plan',name:'详细方案',icon:'📐',panel:'detailed_plan'},
  {seq:14,phase:'项目运作',key:'config_quote',name:'配置报价',icon:'💰',panel:'quote'},
  {seq:15,phase:'项目运作',key:'chain_analysis',name:'决策链分析',icon:'🔗',panel:'decision_chain'},
  {seq:16,phase:'项目运作',key:'chain_report',name:'决策链对应汇报',icon:'📤',panel:'decision_chain'},
  {seq:17,phase:'项目运作',key:'retrospect',name:'总结复盘',icon:'🔄',panel:'retrospect'},
  {seq:18,phase:'项目运作',key:'plan_optimize',name:'方案优化调整',icon:'🔧',panel:'optimize'},
  {seq:19,phase:'项目运作',key:'tender_plan',name:'制定招标方案',icon:'📑',panel:'tender'},
  {seq:20,phase:'项目运作',key:'borrow_shell',name:'是否借壳',icon:'❓',decision:true,decisionAsk:'是否借壳运营商？',decisionYes:'21',decisionNo:'29'},
  {seq:21,phase:'借壳运营商',key:'shell_bid_analysis',name:'标书分析',icon:'📄',branch:'借壳',panel:'bidding'},
  {seq:22,phase:'借壳运营商',key:'shell_compete',name:'竞争分析',icon:'📊',branch:'借壳',panel:'bidding'},
  {seq:23,phase:'借壳运营商',key:'shell_strategy',name:'商务策略',icon:'🤝',branch:'借壳',panel:'bidding'},
  {seq:24,phase:'借壳运营商',key:'shell_vendor',name:'配合厂家提供',icon:'🏭',branch:'借壳',panel:'bidding'},
  {seq:25,phase:'借壳运营商',key:'shell_tender',name:'运营商招标',icon:'🏗️',branch:'借壳',panel:'bidding'},
  {seq:26,phase:'借壳运营商',key:'shell_help_bid',name:'协助运营商制定标书',icon:'✍️',branch:'借壳',panel:'bidding'},
  {seq:27,phase:'借壳运营商',key:'shell_label',name:'有无标签协议',icon:'🚦',decision:true,branch:'借壳',decisionAsk:'有无标签协议？',decisionYesNote:'提供协议盖章，进入28',decisionYes:'28',decisionNo:'28'},
  {seq:28,phase:'是否提前过我司投标',key:'early_construction',name:'提前施工函',icon:'🚦',decision:true,decisionAsk:'是否有提前施工函？',decisionYes:'42',decisionNo:'29'},
  {seq:29,phase:'是否提前过我司投标',key:'supplier_reg',name:'供应商注册',icon:'📝',panel:'bidding'},
  {seq:30,phase:'是否提前过我司投标',key:'buy_bid',name:'购买标书',icon:'🛒',panel:'bidding'},
  {seq:31,phase:'是否提前过我司投标',key:'bid_deposit',name:'投标保证金',icon:'💳',panel:'bidding'},
  {seq:32,phase:'是否提前过我司投标',key:'our_bid_analysis',name:'标书分析',icon:'📄',panel:'bidding'},
  {seq:33,phase:'是否提前过我司投标',key:'our_compete',name:'竞争情况分析',icon:'📊',panel:'bidding'},
  {seq:34,phase:'是否提前过我司投标',key:'our_strategy',name:'商务策略',icon:'🤝',panel:'bidding'},
  {seq:35,phase:'是否提前过我司投标',key:'our_vendor',name:'厂家提供',icon:'🏭',panel:'bidding'},
  {seq:36,phase:'是否提前过我司投标',key:'our_competitors',name:'竞争对手情况',icon:'👥',panel:'bidding'},
  {seq:37,phase:'是否提前过我司投标',key:'answer_check',name:'应答文件制定检查',icon:'✔️',panel:'bidding'},
  {seq:38,phase:'合同签订',key:'terms_check',name:'条款与信息确认',icon:'📋',panel:'contract'},
  {seq:39,phase:'合同签订',key:'tax_check',name:'进销项税率确认',icon:'🧾',panel:'contract'},
  {seq:40,phase:'合同签订',key:'legal_review',name:'法务审核',icon:'⚖️',panel:'contract'},
  {seq:41,phase:'合同签订',key:'sign_seal',name:'签章',icon:'🖊️',panel:'contract'},
  {seq:42,phase:'交付',key:'schedule_ctrl',name:'工期把控',icon:'⏱️',panel:'delivery'},
  {seq:43,phase:'交付',key:'eng_docs',name:'工程文档',icon:'📁',panel:'delivery'},
  {seq:44,phase:'交付',key:'sign_material',name:'签收材料',icon:'📦',panel:'delivery'},
  {seq:45,phase:'开票回款',key:'invoice_collect',name:'开票回款',icon:'💵',panel:'payment'},
  {seq:46,phase:'结束',key:'end',name:'结束',icon:'⏹️',end:true}
];

// Build lookup
var WFLookup={};
(function(){var st0=WORKFLOW_STEPS;for(var i=0;i<st0.length;i++){WFLookup[st0[i].seq]=st0[i]}})()

function safeGetSteps(){
  try{return getTemplateSteps(curProject?curProject.template_id:null);}
  catch(e){return WORKFLOW_STEPS;}
}

function initWorkflow(templateId){
  var steps;
  if(templateId){steps=getTemplateSteps(templateId)}
  else{try{steps=safeGetSteps()}catch(e){steps=WORKFLOW_STEPS}}
  curWorkflow={};curWorkflowState={};curStep=1;
  for(var i=0;i<steps.length;i++){
    var seq=steps[i].seq;
    curWorkflow[seq]={done:false,note:'',data:{}};
    // Initialize workflow_state from template step's approval/assignee
    var initStatus='pending';
    if(seq===1)initStatus='active';
    var initSt={status:initStatus,assignedTo:null,approvedBy:null,approvedAt:null};
    // If step 1 has assignee, set assignedTo (resolved later when user selects)
    if(steps[i].assignee&&steps[i].assignee.enabled){
      // assignedTo is set later when project is saved (user picks assignee)
    }
    curWorkflowState[seq]=initSt;
  }
}
initWorkflow();

async function loadTemplates(){
  try{var {data}=await sb.from('workflow_templates').select('*');if(data)allTemplates=data;}
  catch(e){console.error('loadTemplates',e)}
}
function getTemplateSteps(templateId){
  var steps;
  if(templateId&&allTemplates&&allTemplates.length){
    var t=allTemplates.find(function(x){return x.id===templateId});
    if(t){
      try{if(typeof t.steps==='string')steps=JSON.parse(t.steps);else if(Array.isArray(t.steps))steps=t.steps;}catch(e){}
    }
  }
  // Fallback to WORKFLOW_STEPS if no template steps found
  if(!steps)steps=WORKFLOW_STEPS;
  // Always sync WFLookup with the steps we're returning
  WFLookup={};
  for(var i=0;i<steps.length;i++){WFLookup[steps[i].seq]=steps[i];}
  dbg('[getTemplateSteps] templateId=',templateId,'steps count=',steps.length,'WFLookup keys=',Object.keys(WFLookup));
  return steps;
}

function loadWorkflow(){
  var proj=allProjects.find(function(p){return p.id===curProjectId});
  if(!proj)return;
  try{var wf=JSON.parse(proj.workflow||'{}');curWorkflow=wf;curStep=proj.current_step||1}catch(e){initWorkflow()}
  try{curWorkflowState=JSON.parse(proj.workflow_state||'{}')}catch(e){curWorkflowState={}}
  if(!curWorkflow||Object.keys(curWorkflow).length===0)initWorkflow(proj?proj.template_id:null);
  if(!curWorkflowState||Object.keys(curWorkflowState).length===0){
    dbg('[loadWorkflow] initializing workflow_state from template');
    wfInitStateFromTemplate(proj?proj.template_id:null);
  }
  renderWorkbench();
}
function wfInitStateFromTemplate(templateId){
  var steps;
  if(templateId){steps=getTemplateSteps(templateId)}
  else{try{steps=safeGetSteps()}catch(e){steps=WORKFLOW_STEPS}}
  curWorkflowState={};
  for(var i=0;i<steps.length;i++){
    var seq=steps[i].seq;
    var initStatus='pending';
    if(seq===1)initStatus='active';
    curWorkflowState[seq]={status:initStatus,assignedTo:null,approvedBy:null,approvedAt:null};
  }
}

async function saveWorkflow(){
  if(!curProjectId)return;
  var payload={workflow:JSON.stringify(curWorkflow),current_step:curStep,workflow_state:JSON.stringify(curWorkflowState)};
  var {error}=await sb.from('projects').update(payload).eq('id',curProjectId);
  if(error){console.error('saveWorkflow:',error);showToast('保存失败: '+error.message);return}
  var proj=allProjects.find(function(p){return p.id===curProjectId});
  if(proj){proj.workflow=JSON.stringify(curWorkflow);proj.current_step=curStep;proj.workflow_state=JSON.stringify(curWorkflowState)}
}

// ==== 项目步骤审批（对接 project_step_assignees / project_step_approvals 表）====
var projectAssignees={};   // step_key -> assignee 配置行
var projectMembers=[];     // 项目成员 [{user_id,business_role,project_role}]
var projectApprovals=[];   // 审批历史
var seqToStepKey={};       // seq -> step_key（从步骤数组索引推导）

function wfBuildSeqToKey(){
  seqToStepKey={};
  try{
    var steps=safeGetSteps();
    for(var i=0;i<steps.length;i++){
      var seq=steps[i].seq!=null?steps[i].seq:(i+1);
      // project_step_assignees 用 'step_'+索引 作为 step_key
      seqToStepKey[seq]='step_'+i;
    }
  }catch(e){}
}

async function loadProjectApprovalCfg(){
  projectAssignees={};projectMembers=[];projectApprovals=[];
  wfBuildSeqToKey();
  if(!curProjectId)return;
  try{
    var ra=await sb.from('project_step_assignees').select('*').eq('project_id',curProjectId);
    var rows=ra.data||[];
    for(var i=0;i<rows.length;i++){projectAssignees[rows[i].step_key]=rows[i];}
    var rm=await sb.from('project_assignments').select('*').eq('project_id',curProjectId);
    projectMembers=rm.data||[];
    var rh=await sb.from('project_step_approvals').select('*').eq('project_id',curProjectId).order('created_at',{ascending:true});
    projectApprovals=rh.data||[];
  }catch(e){console.error('[loadProjectApprovalCfg]',e)}
  renderWorkbench();
}
function wfStepKeyForSeq(seq){
  // 1) 优先用 seq -> 索引映射
  if(seqToStepKey[seq]&&projectAssignees[seqToStepKey[seq]])return seqToStepKey[seq];
  // 2) 回退：直接猜 'step_'+(seq-1) / 'step_'+seq
  if(projectAssignees['step_'+(seq-1)])return 'step_'+(seq-1);
  if(projectAssignees['step_'+seq])return 'step_'+seq;
  // 3) 用模板 step.key 匹配
  var step=WFLookup[seq];
  if(step&&step.key&&projectAssignees[step.key])return step.key;
  // 4) 返回映射默认值（无配置行也返回 step_key，供写审批历史用）
  if(seqToStepKey[seq])return seqToStepKey[seq];
  var st2=WFLookup[seq];
  if(st2&&st2.key)return st2.key;
  return 'step_'+(seq-1);
}
function wfAssigneeForSeq(seq){
  var key=wfStepKeyForSeq(seq);
  return projectAssignees[key]||null;
}
function wfApproverList(seq){
  var asg=wfAssigneeForSeq(seq);
  if(!asg)return[];
  if(asg.assignee_type==='user'&&asg.assignee_user_id)return [String(asg.assignee_user_id).toLowerCase()];
  if(asg.assignee_type==='role'&&asg.assignee_role){
    var list=[];
    for(var i=0;i<projectMembers.length;i++){
      if(projectMembers[i].business_role===asg.assignee_role&&projectMembers[i].user_id){
        var uid=String(projectMembers[i].user_id).toLowerCase();
        if(list.indexOf(uid)<0)list.push(uid);
      }
    }
    return list;
  }
  return[];
}
function wfAllApproved(seq){
  var approvers=wfApproverList(seq);
  if(!approvers.length)return true;
  var wst=curWorkflowState[seq]||{};
  var rec=wst.approvals||{};
  for(var i=0;i<approvers.length;i++){
    if(!rec[approvers[i]]||rec[approvers[i]].action!=='approve')return false;
  }
  return true;
}
function wfPrevSeq(seq){
  var prev=seq-1;
  while(prev>=1){
    if(stepStatus(prev)!=='skipped')return prev;
    prev--;
  }
  return seq;
}
function wfApproverNames(seq){
  var ids=wfApproverList(seq);
  if(!ids.length)return'';
  var names=[];
  for(var i=0;i<ids.length;i++){
    var n=ids[i];
    for(var j=0;j<(allUsers||[]).length;j++){if(String(allUsers[j].user_id)===ids[i]){n=allUsers[j].display_name||allUsers[j].email||ids[i];break}}
    names.push(n);
  }
  return names.join('、');
}
async function wfLogApproval(seq,action,actorId,comment){
  if(!curProjectId)return;
  var asg=wfAssigneeForSeq(seq);
  var step=WFLookup[seq];
  var rec={
    project_id:curProjectId,
    step_key:wfStepKeyForSeq(seq),
    step_label:step?step.name:'',
    assignee_type:asg?asg.assignee_type:null,
    assignee_role:asg?asg.assignee_role:null,
    assignee_id:(asg&&asg.assignee_type==='user')?asg.assignee_user_id:null,
    actor_id:actorId,
    actor_email:currentUser?currentUser.email:'',
    action:action,
    comment:comment||null,
    created_at:new Date().toISOString()
  };
  try{
    var r=await sb.from('project_step_approvals').insert(rec);
    if(!r.error){projectApprovals.push(rec);}
  }catch(e){console.error('[wfLogApproval]',e)}
}

function stepDone(seq){var s=curWorkflow[seq];return s?s.done:false}
function stepStatus(seq){
  if(seq===curStep)return'active';
  if(stepDone(seq))return'done';
  if(seq<curStep)return'skipped';
  return'pending';
}

// ---- Workbench Navigation ----
function openProjectWorkbench(pid,pname){
  curProjectId=pid;curProjectName=pname;
  loadWorkflow();
  loadProjectApprovalCfg();
  document.getElementById('wb-project-name').textContent=pname;
  document.getElementById('project-list-panel').classList.add('hidden');
  var wb=document.getElementById('project-workbench');
  wb.classList.remove('hidden');wb.style.display='flex';
  document.getElementById('main-fab').classList.add('hidden');
  // update body for mobile
  document.querySelector('#projects-view').style.maxHeight='100vh';
}

function toggleWbSidebar(){
  var l=document.getElementById('wb-left');var o=document.getElementById('wb-mobile-overlay');
  if(!l||!o)return;
  var isOpen=l.classList.contains('open');
  if(isOpen){l.classList.remove('open');o.classList.remove('open')}
  else{l.classList.add('open');o.classList.add('open')}
}
function closeProjectWorkbench(){
  document.getElementById('project-workbench').classList.add('hidden');
  document.getElementById('project-workbench').style.display='none';
  document.getElementById('project-list-panel').classList.remove('hidden');
  curProjectId=null;curProjectName='';
  document.querySelector('#projects-view').style.maxHeight='';
  loadProjects();
}

function renderWorkbench(){
  renderWorkflowNav();
  updateProgress();
  autoSelectPanel();
}

function renderWorkflowNav(){
  var nav=document.getElementById('wb-workflow-nav');
  if(!nav)return;
  var phases={},phaseOrder=[];
  for(var i=0;i<safeGetSteps().length;i++){
    var s=safeGetSteps()[i];
    if(!phases[s.phase]){phases[s.phase]=[];phaseOrder.push(s.phase)}
    phases[s.phase].push(s);
  }
  var html='';
  for(var pi=0;pi<phaseOrder.length;pi++){
    var pname=phaseOrder[pi];
    var steps=phases[pname];
    var pdone=0;
    for(var j=0;j<steps.length;j++){if(stepDone(steps[j].seq))pdone++}
    html+='<div class="wb-phase"><div class="wb-phase-header" onclick="this.parentElement.classList.toggle(\'wb-phase-collapsed\')">';
    html+='<span class="wb-phase-caret">▼</span><span>'+(steps[0].icon||'📌')+' '+h(pname)+'</span>';
    html+='<span class="wb-phase-count">'+pdone+'/'+steps.length+'</span></div>';
    for(var j=0;j<steps.length;j++){
      var step=steps[j],st=curWorkflow[step.seq]||{done:false},status=stepStatus(step.seq);
      html+='<div class="wb-step '+status+'" onclick="clickWorkflowStep('+step.seq+')">';
      html+='<span class="wb-step-num">'+(st.done?'✓':step.seq)+'</span>';
      html+='<span class="wb-step-name">'+h(step.name)+'</span>';
      if(step.decision)html+='<span class="wb-step-badge wb-badge-decision">判断</span>';
      if(step.branch)html+='<span class="wb-step-badge wb-badge-branch">'+step.branch+'</span>';
      if(step.end)html+='<span class="wb-step-badge wb-badge-end">结束</span>';
      html+='</div>';
    }
    html+='</div>';
  }
  nav.innerHTML=html;
  // scroll current step into view
  setTimeout(function(){
    var active=document.querySelector('.wb-step.active');
    if(active)active.scrollIntoView({block:'center',behavior:'smooth'});
  },100);
}

function updateProgress(){
  var doneCount=0;
  for(var i=0;i<safeGetSteps().length;i++){if(stepDone(safeGetSteps()[i].seq))doneCount++}
  var pct=Math.round(doneCount/safeGetSteps().length*100);
  var bar=document.getElementById('wb-progress-bar');if(bar)bar.style.width=pct+'%';
  var txt=document.getElementById('wb-progress-text');if(txt)txt.textContent=doneCount+'/'+safeGetSteps().length;
  var label=document.getElementById('wb-step-label');
  if(label){var cs=WFLookup[curStep];label.textContent='当前步骤：'+(cs?cs.seq+'. '+cs.name:'-')}
}

function clickWorkflowStep(seq){
  var status=stepStatus(seq);
  var step=WFLookup[seq];if(!step)return;
  // Pending steps before current: can't interact
  if(status==='pending')return;
  // Skipped: can't interact
  if(status==='skipped')return;

  // Permission check: admin always has access
  var hasPerm=wfCanEditStep(seq);
  if(!hasPerm){
    showToast('⚠️ 你没有编辑当前步骤的权限，仅可查看');
  }

  // Mobile: close sidebar after selecting step
  if(window.innerWidth<=768){toggleWbSidebar()}

  // Decision node: show popup
  if(step.decision && seq===curStep && hasPerm){
    showDecisionPopup(step);
    return;
  }

  // Set as current step
  if(status==='done'){
    curStep=seq;
    renderWorkflowNav();
    updateProgress();
    showStepPanel(seq);
    saveWorkflow();
    return;
  }

  // Active step: show its panel, mark done via button
  curStep=seq;
  renderWorkflowNav();
  updateProgress();
  showStepPanel(seq);
  saveWorkflow();
}

function showDecisionPopup(step){
  // Remove existing popup
  var old=document.querySelector('.wb-decision-mask');
  if(old)old.remove();
  var oldP=document.querySelector('.wb-decision-popup');
  if(oldP)oldP.remove();

  var mask=document.createElement('div');mask.className='wb-decision-mask';
  mask.onclick=function(){mask.remove();document.querySelector('.wb-decision-popup').remove()};
  document.body.appendChild(mask);

  var pop=document.createElement('div');pop.className='wb-decision-popup';
  pop.innerHTML='<h3 style="margin:0 0 8px">🔀 '+h(step.name)+'</h3>'+
    '<p style="margin:0 0 16px;color:var(--text2)">'+h(step.decisionAsk||'请选择')+'</p>'+
    '<div style="display:flex;gap:12px;justify-content:center">'+
    '<button class="btn-save" style="flex:1" onclick="decideYes('+step.seq+')">✓ 是</button>'+
    '<button class="btn-save" style="background:#999;flex:1" onclick="decideNo('+step.seq+')">✗ 否</button></div>';
  document.body.appendChild(pop);
}

function decideYes(seq){
  closeDecisionPopup();
  // Mark step as done
  curWorkflow[seq]=curWorkflow[seq]||{done:false,note:'',data:{}};
  curWorkflow[seq].done=true;
  curWorkflow[seq].data={decision:'yes'};
  curWorkflowState[seq]=curWorkflowState[seq]||{status:'active'};
  curWorkflowState[seq].status='done';
  // Jump to yes target
  var step=WFLookup[seq];
  var nextSeq=parseInt(step.decisionYes)||(seq+1);
  // Skip branch if borrowing shell decision
  if(seq===20){ // Borrow shell: yes -> 21, skip 29-37
    for(var i=29;i<=37;i++){var s=curWorkflow[i]||{done:false};s.done=false;s.skipped=true;curWorkflow[i]=s}
  }
  curStep=nextSeq;
  // Activate next step's state
  wfActivateStep(nextSeq);
  renderWorkbench();
  saveWorkflow();
}

function decideNo(seq){
  closeDecisionPopup();
  // Mark step as done
  curWorkflow[seq]=curWorkflow[seq]||{done:false,note:'',data:{}};
  curWorkflow[seq].done=true;
  curWorkflow[seq].data={decision:'no'};
  curWorkflowState[seq]=curWorkflowState[seq]||{status:'active'};
  curWorkflowState[seq].status='done';
  // Jump to no target
  var step=WFLookup[seq];
  var nextSeq=parseInt(step.decisionNo)||(seq+1);
  // Skip branch if not borrowing shell
  if(seq===20){ // Not borrow shell: no -> 29, skip 21-27
    for(var i=21;i<=27;i++){var s=curWorkflow[i]||{done:false};s.done=false;s.skipped=true;curWorkflow[i]=s}
  }
  // Skip 29-37 if early construction
  if(seq===28&&step.decisionNo==='42'){
    for(var i=29;i<=37;i++){var s=curWorkflow[i]||{done:false};s.done=false;s.skipped=true;curWorkflow[i]=s}
  }
  curStep=nextSeq;
  // Activate next step's state
  wfActivateStep(nextSeq);
  renderWorkbench();
  saveWorkflow();
}

function closeDecisionPopup(){
  var m=document.querySelector('.wb-decision-mask');if(m)m.remove();
  var p=document.querySelector('.wb-decision-popup');if(p)p.remove();
}

function markStepDone(){
  if(!curStep)return;
  var step=WFLookup[curStep];
  // 判断节点：直接走决策，不审批
  if(step&&step.decision)return;
  var wst=curWorkflowState[curStep]||{};
  if(wst.status==='pending_approval'){showToast('⚠️ 已提交审批，请等待审批人处理');return}
  // 该节点是否配置了审批人（来自 project_step_assignees 表）
  var approvers=wfApproverList(curStep);
  if(approvers.length>0){
    if(wst.status==='done'){showToast('✓ 审批已通过');return}
    wfSubmitApproval(curStep);
    return;
  }
  // 未配置审批人：直接完成
  wfDoMarkStepDone(curStep);
}
function wfDoMarkStepDone(seq){
  curWorkflow[seq]=curWorkflow[seq]||{done:false,note:'',data:{}};
  curWorkflow[seq].done=true;
  curWorkflowState[seq]=curWorkflowState[seq]||{status:'active'};
  curWorkflowState[seq].status='done';
  // Advance to next non-skipped step
  var next=seq+1;
  while(next<=46){
    if(!stepDone(next)&&stepStatus(next)!=='skipped')break;
    next++;
  }
  if(next<=46){curStep=next;wfActivateStep(next)}
  renderWorkbench();
  saveWorkflow();
  showToast('✓ 已完成：'+(WFLookup[seq]?WFLookup[seq].name:''));
}
function wfSubmitApproval(seq){
  curWorkflowState[seq]=curWorkflowState[seq]||{status:'active'};
  curWorkflowState[seq].status='pending_approval';
  curWorkflowState[seq].submittedAt=new Date().toISOString();
  curWorkflowState[seq].submittedBy=currentUser?currentUser.id:null;
  curWorkflowState[seq].approvals=curWorkflowState[seq].approvals||{};
  saveWorkflow();
  wfLogApproval(seq,'submit',currentUser?currentUser.id:null,null);
  renderWorkbench();
  showStepPanel(seq);
  showToast('📨 已提交审批，等待审批人处理');
  dbg('[wfSubmitApproval] step',seq,'submitted for approval');
}
function wfApprove(seq){
  // 会签：记录当前审批人的通过，全部通过才流转
  var wst=curWorkflowState[seq]=curWorkflowState[seq]||{status:'pending_approval'};
  wst.approvals=wst.approvals||{};
  var myId=String(currentUser.id).toLowerCase();
  wst.approvals[myId]={action:'approve',at:new Date().toISOString()};
  wst.approvedBy=currentUser.id;
  wst.approvedAt=new Date().toISOString();
  wfLogApproval(seq,'approve',currentUser.id,null);
  if(wfAllApproved(seq)){
    wst.status='approved';
    wfDoMarkStepDone(seq);
    showToast('✓ 审批通过');
  }else{
    saveWorkflow();
    renderWorkbench();
    showStepPanel(seq);
    showToast('✓ 已通过，等待其余审批人（会签）');
  }
  dbg('[wfApprove] step',seq,'approved by',currentUser.id);
}
function wfReject(seq){
  var wst=curWorkflowState[seq]=curWorkflowState[seq]||{status:'pending_approval'};
  wst.approvals=wst.approvals||{};
  var myId=String(currentUser.id).toLowerCase();
  wst.approvals[myId]={action:'reject',at:new Date().toISOString()};
  wst.approvedBy=currentUser.id;
  wst.approvedAt=new Date().toISOString();
  wst.status='active'; // back to active
  wfLogApproval(seq,'reject',currentUser.id,null);
  // 退回上一个节点：当前节点标记未完成，回到上一节点
  curWorkflow[seq]=curWorkflow[seq]||{done:false,note:'',data:{}};
  curWorkflow[seq].done=false;
  var prev=wfPrevSeq(seq);
  curStep=prev;
  var pw=curWorkflowState[prev]=curWorkflowState[prev]||{status:'active'};
  pw.status='active';
  curWorkflow[prev]=curWorkflow[prev]||{done:false,note:'',data:{}};
  curWorkflow[prev].done=false;
  saveWorkflow();
  renderWorkbench();
  showStepPanel(prev);
  showToast('↩️ 审批驳回，已退回上一个节点，请修改后重新提交');
  dbg('[wfReject] step',seq,'rejected by',currentUser.id);
}
function wfActivateStep(seq){
  curWorkflowState[seq]=curWorkflowState[seq]||{status:'pending',assignedTo:null,approvedBy:null,approvedAt:null};
  curWorkflowState[seq].status='active';
  curWorkflowState[seq].approvals=curWorkflowState[seq].approvals||{};
  // Check if step has assignee configured
  var step=WFLookup[seq];
  if(step&&step.assignee&&step.assignee.enabled&&step.assignee.value){
    // Find a user with that role
    var assignee=wfFindUserByDept(step.assignee.value);
    if(assignee){
      curWorkflowState[seq].assignedTo=assignee.user_id;
      dbg('[wfActivateStep] assigned step',seq,'to',assignee.display_name,'(role:',step.assignee.value,')');
    }
  }
}
function wfCanEditStep(seq){
  // Admin/superAdmin always has access
  if(isSuperAdmin||currentUserRole==='admin')return true;
  var step=WFLookup[seq];
  if(!step)return true;
  var perm=step.permissions||{};
  var editableBy=perm.editableBy||['admin'];
  // Check if currentUser is assigned to this step
  var wst=curWorkflowState[seq]||{};
  var isAssignee=wst.assignedTo===currentUser.id;
  // Check if currentUser is the approver for this step
  var isApprover=wfIsApprover(seq);
  // Check against editableBy list
  if(editableBy.indexOf('admin')>=0){return true}
  if(editableBy.indexOf('assignee')>=0&&isAssignee)return true;
  if(editableBy.indexOf('approver')>=0&&isApprover)return true;
  return false;
}
function wfFindUserByDept(deptId){
  if(!allUsers||!allUsers.length||!deptId)return null;
  for(var i=0;i<allUsers.length;i++){
    var u=allUsers[i];
    if(u.department_id===deptId)return u;
  }
  return null;
}

function saveStepNote(){
  if(!curStep)return;
  curWorkflow[curStep]=curWorkflow[curStep]||{done:false,note:'',data:{}};
  // Read from the active panel's inputs
  var panel=getActivePanelName();
  var data=curWorkflow[curStep].data||{};
  if(panel==='editor'){
    curWorkflow[curStep].note=document.getElementById('wb-editor-note')?document.getElementById('wb-editor-note').value:'';
  }else if(panel==='competitor'){
    data.competitor_note=(document.getElementById('wb-competitor-note')?document.getElementById('wb-competitor-note').value:'');
  }else if(panel==='training'){
    var td={};
    td.training_org=(document.getElementById('wb-training-org')?document.getElementById('wb-training-org').value.trim():'');
    td.training_tutor=(document.getElementById('wb-training-tutor')?document.getElementById('wb-training-tutor').value.trim():'');
    td.training_tutor_phone=(document.getElementById('wb-training-tutor-phone')?document.getElementById('wb-training-tutor-phone').value.trim():'');
    td.training_product=(document.getElementById('wb-training-product')?document.getElementById('wb-training-product').value.trim():'');
    td.training_solution=(document.getElementById('wb-training-solution')?document.getElementById('wb-training-solution').value.trim():'');
    td.training_participants=(document.getElementById('wb-training-participants')?document.getElementById('wb-training-participants').value.trim():'');
    curWorkflow[6]=(curWorkflow[6]||{done:false,note:'',data:{}});
    curWorkflow[6].data=(curWorkflow[6].data||{});
    Object.assign(curWorkflow[6].data,td);
    saveWorkflow();
    showToast('培训数据已保存');
    return
  }else if(panel==='decision_chain'){
    data.chain_members=(document.getElementById('wb-chain-members')?document.getElementById('wb-chain-members').value:'');
    data.chain_strategy=(document.getElementById('wb-chain-strategy')?document.getElementById('wb-chain-strategy').value:'');
  }else if(panel==='tender'){
    data.tender_type=(document.getElementById('wb-tender-type')?document.getElementById('wb-tender-type').value:'');
    data.tender_amount=(document.getElementById('wb-tender-amount')?document.getElementById('wb-tender-amount').value:'');
    data.tender_date=(document.getElementById('wb-tender-date')?document.getElementById('wb-tender-date').value:'');
    data.tender_deadline=(document.getElementById('wb-tender-deadline')?document.getElementById('wb-tender-deadline').value:'');
    data.tender_note=(document.getElementById('wb-tender-note')?document.getElementById('wb-tender-note').value:'');
  }else if(panel==='lead_gathering'){
    saveLeadGathering();
    return;
  }else if(panel==='analysis'){
    data.budget=(document.getElementById('wb-analysis-budget')?document.getElementById('wb-analysis-budget').value:'');
    data.threat=(document.getElementById('wb-analysis-threat')?document.getElementById('wb-analysis-threat').value:'');
    data.start_date=(document.getElementById('wb-analysis-start')?document.getElementById('wb-analysis-start').value:'');
    data.end_date=(document.getElementById('wb-analysis-end')?document.getElementById('wb-analysis-end').value:'');
    data.tech_assessment=(document.getElementById('wb-analysis-tech')?document.getElementById('wb-analysis-tech').value:'');
  }else if(panel==='vendor_compare'){
    data.vendors=data.vendors||[];
    data.summary=(document.getElementById('wb-vc-summary')?document.getElementById('wb-vc-summary').value:'');
  }else if(panel==='client_comm'){
    data.comm_date=(document.getElementById('wb-cc-date')?document.getElementById('wb-cc-date').value:'');
    data.comm_topic=(document.getElementById('wb-cc-topic')?document.getElementById('wb-cc-topic').value:'');
    data.our_side=(document.getElementById('wb-cc-our-side')?document.getElementById('wb-cc-our-side').value:'');
    data.client_side=(document.getElementById('wb-cc-client-side')?document.getElementById('wb-cc-client-side').value:'');
    data.feedback=(document.getElementById('wb-cc-feedback')?document.getElementById('wb-cc-feedback').value:'');
    data.next_plan=(document.getElementById('wb-cc-next')?document.getElementById('wb-cc-next').value:'');
  }else if(panel==='company_intro'){
    data.material=(document.getElementById('wb-ci-material')?document.getElementById('wb-ci-material').value:'');
    data.record=(document.getElementById('wb-ci-record')?document.getElementById('wb-ci-record').value:'');
    data.interest=(document.getElementById('wb-ci-interest')?document.getElementById('wb-ci-interest').value:'');
  }else if(panel==='needs'){
    data.needs_category=(document.getElementById('wb-needs-category')?document.getElementById('wb-needs-category').value:'');
    data.needs_desc=(document.getElementById('wb-needs-desc')?document.getElementById('wb-needs-desc').value:'');
    data.needs_budget=(document.getElementById('wb-needs-budget')?document.getElementById('wb-needs-budget').value:'');
    data.needs_priority=(document.getElementById('wb-needs-priority')?document.getElementById('wb-needs-priority').value:'');
    data.needs_source=(document.getElementById('wb-needs-source')?document.getElementById('wb-needs-source').value:'');
  }else if(panel==='brand_reg'){
    data.brand_name=(document.getElementById('wb-br-brand')?document.getElementById('wb-br-brand').value:'');
    data.product_line=(document.getElementById('wb-br-product')?document.getElementById('wb-br-product').value:'');
    data.reg_code=(document.getElementById('wb-br-code')?document.getElementById('wb-br-code').value:'');
    data.reg_date=(document.getElementById('wb-br-date')?document.getElementById('wb-br-date').value:'');
    data.reg_status=(document.getElementById('wb-br-status')?document.getElementById('wb-br-status').value:'');
    data.reg_note=(document.getElementById('wb-br-note')?document.getElementById('wb-br-note').value:'');
  }else if(panel==='detailed_plan'){
    data.plan_overview=(document.getElementById('wb-dp-overview')?document.getElementById('wb-dp-overview').value:'');
    data.plan_architecture=(document.getElementById('wb-dp-architecture')?document.getElementById('wb-dp-architecture').value:'');
    data.plan_implementation=(document.getElementById('wb-dp-plan')?document.getElementById('wb-dp-plan').value:'');
    data.plan_attachment=(document.getElementById('wb-dp-attachment')?document.getElementById('wb-dp-attachment').value:'');
  }else if(panel==='quote'){
    data.items=data.items||[];
    data.discount=parseFloat(document.getElementById('wb-quote-discount')?document.getElementById('wb-quote-discount').value:100)||100;
    data.total=(document.getElementById('wb-quote-total')?document.getElementById('wb-quote-total').textContent.replace('¥',''):'');
  }else if(panel==='retrospect'){
    data.highlights=(document.getElementById('wb-retro-highlights')?document.getElementById('wb-retro-highlights').value:'');
    data.issues=(document.getElementById('wb-retro-issues')?document.getElementById('wb-retro-issues').value:'');
    data.improvements=(document.getElementById('wb-retro-improvements')?document.getElementById('wb-retro-improvements').value:'');
    data.rating=parseInt(document.getElementById('wb-retro-rating')?document.getElementById('wb-retro-rating').value:3)||3;
  }else if(panel==='optimize'){
    data.before=(document.getElementById('wb-opt-before')?document.getElementById('wb-opt-before').value:'');
    data.content=(document.getElementById('wb-opt-content')?document.getElementById('wb-opt-content').value:'');
    data.effect=(document.getElementById('wb-opt-effect')?document.getElementById('wb-opt-effect').value:'');
    data.approval=(document.getElementById('wb-opt-approval')?document.getElementById('wb-opt-approval').value:'');
  }
  curWorkflow[curStep].data=data;
  saveWorkflow();
  var st=document.getElementById('wb-save-status');if(st)st.textContent='已保存';
  setTimeout(function(){var st=document.getElementById('wb-save-status');if(st)st.textContent=''},2000);
}

function showStepPanel(seq){
  dbg('[showStepPanel] seq=',seq,'WFLookup=',Object.keys(WFLookup));
  var step=WFLookup[seq];
  if(!step){dbg('[showStepPanel] step not found for seq',seq);return;}
  dbg('[showStepPanel] step=',step.name,'panel=',step.panel);
  // Hide all panels
  var panels=['wb-panel-basic','wb-panel-editor','wb-panel-competitor','wb-panel-decision-chain','wb-panel-training',
              'wb-panel-tender','wb-panel-bidding','wb-panel-contract','wb-panel-delivery',
              'wb-panel-payment','wb-panel-end','wb-panel-stages','wb-content-default',
              'wb-panel-lead_gathering','wb-panel-analysis','wb-panel-vendor_compare','wb-panel-client_comm',
              'wb-panel-company_intro','wb-panel-needs','wb-panel-brand_reg','wb-panel-detailed_plan',
              'wb-panel-quote','wb-panel-retrospect','wb-panel-optimize'];
  for(var i=0;i<panels.length;i++){
    var el=document.getElementById(panels[i]);if(el)el.classList.add('hidden')
  }

  var panelName=step.panel||'editor';
  var panelEl=document.getElementById('wb-panel-'+panelName);
  dbg('[showStepPanel] panelEl for wb-panel-'+panelName+'=',!!panelEl);
  if(panelEl){
    dbg('[showStepPanel] panelEl display=',getComputedStyle(panelEl).display,'hidden class=',panelEl.classList.contains('hidden'));
    dbg('[showStepPanel] panelEl offsetHeight=',panelEl.offsetHeight,'offsetWidth=',panelEl.offsetWidth);
    dbg('[showStepPanel] panelEl innerHTML length=',panelEl.innerHTML.length);
    // Force visible styles
    panelEl.style.display='block';
    panelEl.style.visibility='visible';
    panelEl.style.opacity='1';
    panelEl.style.background='#fff';
    panelEl.style.border='2px solid red';
    panelEl.style.padding='20px';
  }
  var rightEl=document.getElementById('wb-right');
  if(rightEl){dbg('[showStepPanel] wb-right children count=',rightEl.children.length,'first child visible=',rightEl.children[0]?!rightEl.children[0].classList.contains('hidden'):'n/a');}

  // Populate data
  var data=curWorkflow[seq]?curWorkflow[seq].data||{}:{};
  var note=curWorkflow[seq]?curWorkflow[seq].note||'':'';

  // Determine which panel to show
  switch(panelName){
    case 'basic':
      // Show project info
      var proj=allProjects.find(function(p){return p.id===curProjectId});
      if(proj){
        var client=allClients.find(function(c){return c.id===proj.client_id});
        document.getElementById('wb-info-name').textContent=proj.name||'-';
        document.getElementById('wb-info-client').textContent=client?client.name:'未关联';
        document.getElementById('wb-info-budget').textContent=proj.budget?formatMoney(proj.budget):'-';
        var sm={planning:'规划中',in_progress:'进行中',completed:'已完成',suspended:'已暂停'};
        document.getElementById('wb-info-status').textContent=sm[proj.status]||proj.status||'-';
        document.getElementById('wb-info-start').textContent=proj.start_date||'-';
        document.getElementById('wb-info-end').textContent=proj.end_date||'-';
      }
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'editor':
      document.getElementById('wb-editor-title').textContent='📝 '+step.seq+'. '+step.name;
      document.getElementById('wb-editor-desc').textContent='阶段：'+step.phase+(step.branch?' / 分支：'+step.branch:'');
      if(document.getElementById('wb-editor-note'))document.getElementById('wb-editor-note').value=note;
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'competitor':
      if(document.getElementById('wb-competitor-note'))document.getElementById('wb-competitor-note').value=(curWorkflow[4]?(curWorkflow[4].data||{}).competitor_note||'':'');
      renderCompetitorCards();
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'training':
      var td6=(curWorkflow[6]?(curWorkflow[6].data||{}):{});
      if(document.getElementById('wb-training-org'))document.getElementById('wb-training-org').value=td6.training_org||'';
      if(document.getElementById('wb-training-tutor'))document.getElementById('wb-training-tutor').value=td6.training_tutor||'';
      if(document.getElementById('wb-training-tutor-phone'))document.getElementById('wb-training-tutor-phone').value=td6.training_tutor_phone||'';
      if(document.getElementById('wb-training-product'))document.getElementById('wb-training-product').value=td6.training_product||'';
      if(document.getElementById('wb-training-solution'))document.getElementById('wb-training-solution').value=td6.training_solution||'';
      if(document.getElementById('wb-training-participants'))document.getElementById('wb-training-participants').value=td6.training_participants||'';
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'decision_chain':
      if(document.getElementById('wb-chain-members'))document.getElementById('wb-chain-members').value=data.chain_members||'';
      if(document.getElementById('wb-chain-strategy'))document.getElementById('wb-chain-strategy').value=data.chain_strategy||'';
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'tender':
      if(document.getElementById('wb-tender-type'))document.getElementById('wb-tender-type').value=data.tender_type||'';
      if(document.getElementById('wb-tender-amount'))document.getElementById('wb-tender-amount').value=data.tender_amount||'';
      if(document.getElementById('wb-tender-date'))document.getElementById('wb-tender-date').value=data.tender_date||'';
      if(document.getElementById('wb-tender-deadline'))document.getElementById('wb-tender-deadline').value=data.tender_deadline||'';
      if(document.getElementById('wb-tender-note'))document.getElementById('wb-tender-note').value=data.tender_note||'';
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'bidding':
      // Reuse existing bidding load
      if(panelEl)panelEl.classList.remove('hidden');
      loadBiddingsTo('wb-bidding-list');
      break;
    case 'contract':
      if(panelEl)panelEl.classList.remove('hidden');
      loadProjectContractsTo('wb-contract-list');
      break;
    case 'delivery':
      if(panelEl)panelEl.classList.remove('hidden');
      loadDeliveriesTo('wb-delivery-list');
      break;
    case 'payment':
      if(panelEl)panelEl.classList.remove('hidden');
      loadPaymentsTo('wb-payment-list');
      break;
    case 'end':
      // Show project conclusion
      var proj2=allProjects.find(function(p){return p.id===curProjectId});
      if(proj2){
        var concl=proj2.conclusion||'';
        var concMap={approved:'✓ 认可商机，进入下一步',rejected:'✗ 不认可，流程结束'};
        document.getElementById('wb-end-conclusion').textContent=concMap[concl]||concl||'未填写';
        document.getElementById('wb-end-conclusion-notes').textContent=proj2.conclusion_notes||'';
        document.getElementById('wb-end-title').textContent=concl==='rejected'?'流程结束 - 商机不认可':'流程结束 - 商机已完成';
      }
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'lead_gathering':
      populateLeadGathering(data);
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'analysis':
      populateAnalysis(data);
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'vendor_compare':
      populateVendorCompare(data);
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'client_comm':
      populateClientComm(data);
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'company_intro':
      populateCompanyIntro(data);
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'needs':
      populateNeeds(data);
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'brand_reg':
      populateBrandReg(data);
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'detailed_plan':
      populateDetailedPlan(data);
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'quote':
      populateQuote(data);
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'retrospect':
      populateRetrospect(data);
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'optimize':
      populateOptimize(data);
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    default:
      document.getElementById('wb-panel-editor').classList.remove('hidden');
      document.getElementById('wb-editor-title').textContent='📝 '+step.seq+'. '+step.name;
      document.getElementById('wb-editor-desc').textContent='阶段：'+step.phase;
      if(document.getElementById('wb-editor-note'))document.getElementById('wb-editor-note').value=note;
  }
  // Render approval status & action buttons
  wfRenderActionButtons(seq,step);
  // Mobile: convert 2-col grids to single column
  if(window.innerWidth<=768){adaptPanelForMobile()}
}

function adaptPanelForMobile(){
  // Convert inline 2-col grids to single column in visible panel
  var right=document.getElementById('wb-right');if(!right)return;
  var grids=right.querySelectorAll('div[style*="grid-template-columns"]');
  for(var i=0;i<grids.length;i++){
    var g=grids[i];
    if(!g.classList.contains('hidden')||g.offsetParent!==null){
      g.style.gridTemplateColumns='1fr';
    }
  }
}

function autoSelectPanel(){
  if(!curStep)return;
  showStepPanel(curStep);
}

function getActivePanelName(){
  var step=WFLookup[curStep];
  return step?(step.panel||'editor'):'editor';
}


// ── New Panel Populate & Save Functions ──

// --- Step 1: Lead Gathering ---
function populateLeadGathering(data){
  data.linked_leads=data.linked_leads||[];
  renderLeadCards(data.linked_leads);
  var searchInput=document.getElementById('wb-lead-search');
  if(searchInput)searchInput.value='';
}
function renderLeadCards(leads){
  var container=document.getElementById('wb-lead-cards');
  if(!container)return;
  if(!leads||!leads.length){container.innerHTML='<div style="text-align:center;padding:16px;color:var(--text2)">暂无关联线索，请搜索并添加</div>';return}
  var html='';
  for(var i=0;i<leads.length;i++){
    var l=leads[i];
    html+='<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--card-bg);border:1px solid var(--border);border-radius:8px">';
    html+='<div><strong>'+h(l.name||'线索')+'</strong><br><span style="font-size:11px;color:var(--text3)">来源: '+h(l.source||'')+' | '+h(l.date||'')+'</span></div>';
    html+='<button class="btn-sm" style="background:#fde8e8;color:#c0392b;border:1px solid #e74c3c;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px" onclick="removeLeadCard('+i+')">✕ 移除</button>';
    html+='</div>';
  }
  container.innerHTML=html;
}
function removeLeadCard(idx){
  var data=curWorkflow[1]?curWorkflow[1].data||{}:{};
  data.linked_leads=data.linked_leads||[];
  data.linked_leads.splice(idx,1);
  renderLeadCards(data.linked_leads);
  saveWorkflow();
  dbg('[lead_gathering] removed lead at index',idx);
}
function onLeadSearchInput(){
  var q=document.getElementById('wb-lead-search').value.trim();
  var sug=document.getElementById('wb-lead-suggestions');
  if(!sug)return;
  if(!q||q.length<1){sug.classList.add('hidden');return}
  var results=[];
  if(allLeads&&allLeads.length){
    var lowerQ=q.toLowerCase();
    for(var i=0;i<allLeads.length;i++){
      var l=allLeads[i];
      if((l.company_name||'').toLowerCase().indexOf(lowerQ)>=0||(l.contact_person||'').toLowerCase().indexOf(lowerQ)>=0||(l.name||'').toLowerCase().indexOf(lowerQ)>=0){
        results.push(l);
        if(results.length>=8)break;
      }
    }
  }
  if(!results.length){sug.innerHTML='<div style="padding:8px;color:var(--text3);text-align:center">未找到匹配线索</div>';sug.classList.remove('hidden');return}
  var html='';
  for(var i=0;i<results.length;i++){
    var r=results[i];
    var rName=r.company_name||r.name||'未命名';
    var rSource=r.source||r.lead_source||'';
    html+='<div class="name-suggestion-item" onclick="addLinkedLead(\''+(r.id||'').replace(/'/g,"\\'")+'\',\''+rName.replace(/'/g,"\\'")+'\',\''+rSource.replace(/'/g,"\\'")+'\')" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);font-size:13px">';
    html+=h(rName)+' <span style="color:var(--text3);font-size:11px">'+h(r.contact_person||'')+'</span>';
    html+='</div>';
  }
  sug.innerHTML=html;
  sug.classList.remove('hidden');
}
function onLeadSearchKey(event){if(event.key==='Enter'){event.preventDefault();}}
function addLinkedLead(id,name,source){
  if(!id||!name)return;
  var data=curWorkflow[1]?curWorkflow[1].data||{}:{};
  data.linked_leads=data.linked_leads||[];
  for(var i=0;i<data.linked_leads.length;i++){if(data.linked_leads[i].id===id){showToast('该线索已关联');return}}
  data.linked_leads.push({id:id,name:name,source:source||'',date:new Date().toISOString().slice(0,10)});
  renderLeadCards(data.linked_leads);
  saveWorkflow();
  document.getElementById('wb-lead-suggestions').classList.add('hidden');
  document.getElementById('wb-lead-search').value='';
  dbg('[lead_gathering] linked lead:',id,name);
}
function saveLeadGathering(){
  if(!curStep||curStep!==1)return;
  curWorkflow[1]=curWorkflow[1]||{done:false,note:'',data:{}};
  saveWorkflow();
  showToast('线索关联已保存');
}

// --- Step 2: Analysis ---
function populateAnalysis(data){
  var g=function(id,val){var el=document.getElementById(id);if(el)el.value=val||'';};
  g('wb-analysis-budget',data.budget);
  g('wb-analysis-threat',data.threat);
  g('wb-analysis-start',data.start_date);
  g('wb-analysis-end',data.end_date);
  g('wb-analysis-tech',data.tech_assessment);
  dbg('[analysis] populated');
}
function saveAnalysis(){
  if(!curStep||curStep!==2)return;
  curWorkflow[2]=curWorkflow[2]||{done:false,note:'',data:{}};
  saveStepNote();
  showToast('分析数据已保存');
}

// --- Step 7: Vendor Compare ---
function populateVendorCompare(data){
  data.vendors=data.vendors||[];
  var g=function(id,val){var el=document.getElementById(id);if(el)el.value=val||'';};
  g('wb-vc-summary',data.summary);
  renderVendorRows(data.vendors);
  dbg('[vendor_compare] populated',data.vendors.length,'vendors');
}
function renderVendorRows(vendors){
  var container=document.getElementById('wb-vc-list');
  if(!container)return;
  if(!vendors||!vendors.length){container.innerHTML='<div style="text-align:center;padding:16px;color:var(--text2)">点击下方按钮添加工厂家</div>';return}
  var html='';
  for(var i=0;i<vendors.length;i++){
    var v=vendors[i]||{};
    html+='<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:12px;position:relative">';
    html+='<button class="btn-sm" onclick="removeVendorRow('+i+')" style="position:absolute;top:8px;right:8px;background:#fde8e8;color:#c0392b;border:none;padding:2px 8px;border-radius:6px;cursor:pointer;font-size:12px">✕</button>';
    html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
    html+='<div><label style="font-size:10px;color:var(--text3)">厂家名称</label><input value="'+h(v.name||'')+'" onchange="updateVendorField('+i+',\'name\',this.value)" style="width:100%;padding:6px 8px;border-radius:6px;border:1px solid var(--border);font-size:13px;background:var(--card-bg);color:var(--text)"></div>';
    html+='<div><label style="font-size:10px;color:var(--text3)">产品型号</label><input value="'+h(v.model||'')+'" onchange="updateVendorField('+i+',\'model\',this.value)" style="width:100%;padding:6px 8px;border-radius:6px;border:1px solid var(--border);font-size:13px;background:var(--card-bg);color:var(--text)"></div>';
    html+='<div><label style="font-size:10px;color:var(--text3)">价格</label><input value="'+h(v.price||'')+'" onchange="updateVendorField('+i+',\'price\',this.value)" style="width:100%;padding:6px 8px;border-radius:6px;border:1px solid var(--border);font-size:13px;background:var(--card-bg);color:var(--text)"></div>';
    html+='<div></div>';
    html+='<div><label style="font-size:10px;color:var(--text3)">优势</label><input value="'+h(v.pros||'')+'" onchange="updateVendorField('+i+',\'pros\',this.value)" style="width:100%;padding:6px 8px;border-radius:6px;border:1px solid var(--border);font-size:13px;background:var(--card-bg);color:var(--text)"></div>';
    html+='<div><label style="font-size:10px;color:var(--text3)">劣势</label><input value="'+h(v.cons||'')+'" onchange="updateVendorField('+i+',\'cons\',this.value)" style="width:100%;padding:6px 8px;border-radius:6px;border:1px solid var(--border);font-size:13px;background:var(--card-bg);color:var(--text)"></div>';
    html+='</div>';
    html+='</div>';
  }
  container.innerHTML=html;
}
function addVendorRow(){
  var data=curWorkflow[7]?curWorkflow[7].data||{}:{};
  data.vendors=data.vendors||[];
  data.vendors.push({name:'',model:'',price:'',pros:'',cons:''});
  renderVendorRows(data.vendors);
  saveWorkflow();
  dbg('[vendor_compare] added vendor row');
}
function removeVendorRow(idx){
  var data=curWorkflow[7]?curWorkflow[7].data||{}:{};
  data.vendors=data.vendors||[];
  data.vendors.splice(idx,1);
  renderVendorRows(data.vendors);
  saveWorkflow();
  dbg('[vendor_compare] removed vendor at',idx);
}
function updateVendorField(idx,field,value){
  var data=curWorkflow[7]?curWorkflow[7].data||{}:{};
  data.vendors=data.vendors||[];
  if(data.vendors[idx]){data.vendors[idx][field]=value;}
  saveWorkflow();
}
function saveVendorCompare(){
  if(!curStep||curStep!==7)return;
  curWorkflow[7]=curWorkflow[7]||{done:false,note:'',data:{}};
  saveStepNote();
  showToast('厂家比较已保存');
}

// --- Step 8: Client Communication ---
function populateClientComm(data){
  var g=function(id,val){var el=document.getElementById(id);if(el)el.value=val||'';};
  g('wb-cc-date',data.comm_date);
  g('wb-cc-topic',data.comm_topic);
  g('wb-cc-our-side',data.our_side);
  g('wb-cc-client-side',data.client_side);
  g('wb-cc-feedback',data.feedback);
  g('wb-cc-next',data.next_plan);
  dbg('[client_comm] populated');
}
function saveClientComm(){
  if(!curStep||curStep!==8)return;
  curWorkflow[8]=curWorkflow[8]||{done:false,note:'',data:{}};
  saveStepNote();
  showToast('客户交流已保存');
}

// --- Step 10: Company Intro ---
function populateCompanyIntro(data){
  var g=function(id,val){var el=document.getElementById(id);if(el)el.value=val||'';};
  g('wb-ci-material',data.material);
  g('wb-ci-record',data.record);
  g('wb-ci-interest',data.interest);
  dbg('[company_intro] populated');
}
function saveCompanyIntro(){
  if(!curStep||curStep!==10)return;
  curWorkflow[10]=curWorkflow[10]||{done:false,note:'',data:{}};
  saveStepNote();
  showToast('公司介绍已保存');
}

// --- Step 11: Needs Assessment ---
function populateNeeds(data){
  var g=function(id,val){var el=document.getElementById(id);if(el)el.value=val||'';};
  g('wb-needs-category',data.needs_category);
  g('wb-needs-desc',data.needs_desc);
  g('wb-needs-budget',data.needs_budget);
  g('wb-needs-priority',data.needs_priority);
  g('wb-needs-source',data.needs_source);
  dbg('[needs] populated');
}
function saveNeeds(){
  if(!curStep||curStep!==11)return;
  curWorkflow[11]=curWorkflow[11]||{done:false,note:'',data:{}};
  saveStepNote();
  showToast('需求信息已保存');
}

// --- Step 12: Brand Registration ---
function populateBrandReg(data){
  var g=function(id,val){var el=document.getElementById(id);if(el)el.value=val||'';};
  g('wb-br-brand',data.brand_name);
  g('wb-br-product',data.product_line);
  g('wb-br-code',data.reg_code);
  g('wb-br-date',data.reg_date);
  g('wb-br-status',data.reg_status);
  g('wb-br-note',data.reg_note);
  dbg('[brand_reg] populated');
}
function saveBrandReg(){
  if(!curStep||curStep!==12)return;
  curWorkflow[12]=curWorkflow[12]||{done:false,note:'',data:{}};
  saveStepNote();
  showToast('品牌报备已保存');
}

// --- Step 13: Detailed Plan ---
function populateDetailedPlan(data){
  var g=function(id,val){var el=document.getElementById(id);if(el)el.value=val||'';};
  g('wb-dp-overview',data.plan_overview);
  g('wb-dp-architecture',data.plan_architecture);
  g('wb-dp-plan',data.plan_implementation);
  g('wb-dp-attachment',data.plan_attachment);
  dbg('[detailed_plan] populated');
}
function saveDetailedPlan(){
  if(!curStep||curStep!==13)return;
  curWorkflow[13]=curWorkflow[13]||{done:false,note:'',data:{}};
  saveStepNote();
  showToast('详细方案已保存');
}

// --- Step 14: Quote ---
function populateQuote(data){
  data.items=data.items||[];
  data.discount=data.discount||100;
  renderQuoteRows(data.items);
  if(document.getElementById('wb-quote-discount'))document.getElementById('wb-quote-discount').value=data.discount;
  calcQuoteTotal();
  dbg('[quote] populated',data.items.length,'items');
}
function renderQuoteRows(items){
  var tbody=document.getElementById('wb-quote-body');
  if(!tbody)return;
  var html='';
  for(var i=0;i<items.length;i++){
    var it=items[i]||{};
    html+='<tr>';
    html+='<td style="padding:4px"><input value="'+h(it.name||'')+'" onchange="updateQuoteField('+i+',\'name\',this.value)" style="width:100%;padding:6px;border-radius:6px;border:1px solid var(--border);font-size:13px;background:var(--card-bg);color:var(--text)"></td>';
    html+='<td style="padding:4px"><input value="'+h(it.spec||'')+'" onchange="updateQuoteField('+i+',\'spec\',this.value)" style="width:100%;padding:6px;border-radius:6px;border:1px solid var(--border);font-size:13px;background:var(--card-bg);color:var(--text)"></td>';
    html+='<td style="padding:4px"><input type="number" min="1" value="'+(it.qty||1)+'" onchange="updateQuoteField('+i+',\'qty\',parseInt(this.value)||1);calcQuoteTotal()" style="width:100%;padding:6px;border-radius:6px;border:1px solid var(--border);font-size:13px;background:var(--card-bg);color:var(--text)"></td>';
    html+='<td style="padding:4px"><input type="number" min="0" step="0.01" value="'+(it.price||0)+'" onchange="updateQuoteField('+i+',\'price\',parseFloat(this.value)||0);calcQuoteTotal()" style="width:100%;padding:6px;border-radius:6px;border:1px solid var(--border);font-size:13px;background:var(--card-bg);color:var(--text)"></td>';
    var subtotal=(it.qty||1)*(it.price||0);
    html+='<td style="padding:4px;font-weight:600;text-align:right">¥'+subtotal.toFixed(2)+'</td>';
    html+='<td style="padding:4px;text-align:center"><button onclick="removeQuoteRow('+i+')" style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:16px">✕</button></td>';
    html+='</tr>';
  }
  tbody.innerHTML=html;
}
function addQuoteRow(){
  var data=curWorkflow[14]?curWorkflow[14].data||{}:{};
  data.items=data.items||[];
  data.items.push({name:'',spec:'',qty:1,price:0});
  renderQuoteRows(data.items);
  saveWorkflow();
  calcQuoteTotal();
  dbg('[quote] added row');
}
function removeQuoteRow(idx){
  var data=curWorkflow[14]?curWorkflow[14].data||{}:{};
  data.items=data.items||[];
  data.items.splice(idx,1);
  renderQuoteRows(data.items);
  saveWorkflow();
  calcQuoteTotal();
  dbg('[quote] removed row at',idx);
}
function updateQuoteField(idx,field,value){
  var data=curWorkflow[14]?curWorkflow[14].data||{}:{};
  data.items=data.items||[];
  if(data.items[idx]){data.items[idx][field]=value;}
  saveWorkflow();
}
function calcQuoteTotal(){
  var data=curWorkflow[14]?curWorkflow[14].data||{}:{};
  data.items=data.items||[];
  var subtotal=0;
  for(var i=0;i<data.items.length;i++){
    var it=data.items[i];
    subtotal+=(parseInt(it.qty)||0)*(parseFloat(it.price)||0);
  }
  var discountEl=document.getElementById('wb-quote-discount');
  var discount=parseFloat(discountEl?discountEl.value:100)||100;
  var total=subtotal*discount/100;
  document.getElementById('wb-quote-subtotal').textContent='¥'+subtotal.toFixed(2);
  document.getElementById('wb-quote-total').textContent='¥'+total.toFixed(2);
}

// --- Step 17: Retrospect ---
function populateRetrospect(data){
  var g=function(id,val){var el=document.getElementById(id);if(el)el.value=val||'';};
  g('wb-retro-highlights',data.highlights);
  g('wb-retro-issues',data.issues);
  g('wb-retro-improvements',data.improvements);
  var ratingEl=document.getElementById('wb-retro-rating');
  if(ratingEl){ratingEl.value=data.rating||3;document.getElementById('wb-retro-rating-val').textContent=data.rating||3;}
  dbg('[retrospect] populated');
}
function saveRetrospect(){
  if(!curStep||curStep!==17)return;
  curWorkflow[17]=curWorkflow[17]||{done:false,note:'',data:{}};
  saveStepNote();
  showToast('复盘已保存');
}

// --- Step 18: Optimize ---
function populateOptimize(data){
  var g=function(id,val){var el=document.getElementById(id);if(el)el.value=val||'';};
  g('wb-opt-before',data.before);
  g('wb-opt-content',data.content);
  g('wb-opt-effect',data.effect);
  g('wb-opt-approval',data.approval);
  dbg('[optimize] populated');
}
function saveOptimize(){
  if(!curStep||curStep!==18)return;
  curWorkflow[18]=curWorkflow[18]||{done:false,note:'',data:{}};
  saveStepNote();
  showToast('优化方案已保存');
}


async function resetWorkflow(){
  if(!await uiConfirm('确定重置所有流程步骤？'))return;
  initWorkflow();
  renderWorkbench();
  saveWorkflow();
}

// ── Approval / Permission action buttons rendering ──
function wfRenderActionButtons(seq,step){
  var container=document.getElementById('wb-action-buttons');
  if(!container){return}
  var wst=curWorkflowState[seq]||{};
  var status=wst.status||'active';
  var isDone=curWorkflow[seq]?curWorkflow[seq].done:false;
  var hasPerm=wfCanEditStep(seq);
  var isApprover=wfIsApprover(seq);
  var approvers=wfApproverList(seq);
  var html='';

  // Show current status badge
  var statusLabel='';
  if(isDone){statusLabel='✅ 已完成'}
  else if(status==='pending_approval'){statusLabel='⏳ 等待审批'}
  else if(status==='approved'){statusLabel='✅ 审批通过'}
  else{statusLabel='📌 进行中'}
  html+='<span style="font-size:12px;color:var(--text2);margin-right:8px">'+statusLabel+'</span>';

  // Show assignee info
  if(wst.assignedTo){
    var assigneeName=wst.assignedTo;
    for(var ui=0;ui<(allUsers||[]).length;ui++){if(allUsers[ui].user_id===wst.assignedTo){assigneeName=allUsers[ui].display_name||allUsers[ui].email||wst.assignedTo;break}}
    html+='<span style="font-size:11px;color:var(--text3);margin-right:8px">👤 '+h(assigneeName)+'</span>';
  }

  // 审批人信息（会签进度）
  if(approvers.length>0){
    var rec=wst.approvals||{};
    var doneCount=0;
    for(var ai=0;ai<approvers.length;ai++){if(rec[approvers[ai]]&&rec[approvers[ai]].action==='approve')doneCount++}
    html+='<span style="font-size:11px;color:#3b82f6;margin-right:8px">🔒 审批人：'+h(wfApproverNames(seq))+'（'+doneCount+'/'+approvers.length+' 已通过）</span>';
  }

  // Action buttons based on status
  var showApproverActions = (!isDone && status==='pending_approval' && isApprover);
  if(!isDone&&hasPerm){
    if(status==='pending_approval'){
      // Pending approval - show approver buttons if current user is approver
      if(isApprover){
        html+='<button class="btn-save" onclick="wfApprove('+seq+')">✅ 通过</button>';
        html+='<button class="btn-save" style="background:#f44336" onclick="wfReject('+seq+')">↩️ 驳回</button>';
      }else{
        html+='<span style="font-size:11px;color:var(--warning)">已提交审批，等待处理...</span>';
      }
    }else{
      // Active - show submit/save and mark-done buttons
      html+='<button class="btn-sm btn-sm-primary" onclick="saveStepNote()">💾 保存备注</button>';
      if(approvers.length>0){
        html+='<button class="btn-save" onclick="markStepDone()">📨 提交审批</button>';
      }else{
        html+='<button class="btn-save" onclick="markStepDone()">✓ 标记完成</button>';
      }
    }
  }else if(showApproverActions){
    // 审批人（非编辑权限）在待审批状态：显示审批按钮
    html+='<button class="btn-save" onclick="wfApprove('+seq+')">✅ 通过</button>';
    html+='<button class="btn-save" style="background:#f44336" onclick="wfReject('+seq+')">↩️ 驳回</button>';
  }else if(!isDone&&!hasPerm){
    html+='<span style="font-size:11px;color:var(--text3)">🔒 仅可查看</span>';
  }
  html+='<span style="font-size:11px;color:var(--text3);margin-left:8px" id="wb-save-status"></span>';
  container.innerHTML=html;
}
function wfIsApprover(seq){
  if(isSuperAdmin||currentUserRole==='admin')return true;
  var approvers=wfApproverList(seq);
  if(!approvers.length)return false;
  return approvers.indexOf(String(currentUser.id).toLowerCase())>=0;
}

// ---- Bridge: load module data into workbench sub-containers ----
function loadBiddingsTo(listId){
  var list=document.getElementById(listId);if(!list)return;
  list.innerHTML='<div style="text-align:center;padding:20px;color:var(--text2)">加载中...</div>';
  loadBiddings();
}
function renderBiddingListTo(listId){
  var list=document.getElementById(listId);if(!list)return;
  var s='';
  var sm={preparing:'准备中',planning:'规划中',in_progress:'进行中',submitted:'已提交',won:'中标',lost:'未中标'};
  var sc={won:'#10B981',lost:'#EF4444',submitted:'#3B82F6'};
  for(var i=0;i<allBiddings.length;i++){
    var b=allBiddings[i];
    s+='<div class="delivery-item" style="cursor:pointer" onclick="wfOpenModuleForm(\'bidding\',\''+b.id+'\')">';
    s+='<div><strong>'+h(b.title||'投标项')+'</strong><br><span style="font-size:11px;color:'+(sc[b.status]||'var(--text3)')+'">'+h(sm[b.status]||b.status||'-')+(b.bid_deadline?' · 截止 '+h(b.bid_deadline):'')+'</span></div>';
    s+='<span style="font-size:12px;color:var(--text2)">'+(b.bid_amount?formatMoney(b.bid_amount):'-')+'</span></div>';
  }
  list.innerHTML=s||'<div style="text-align:center;padding:20px;color:var(--text2)">暂无投标记录，点右上角 + 新建投标</div>';
}

function loadProjectContractsTo(listId){
  var list=document.getElementById(listId);if(!list)return;
  list.innerHTML='<div style="text-align:center;padding:20px;color:var(--text2)">加载中...</div>';
  loadProjectContracts();
}
function renderContractListTo(listId){
  var list=document.getElementById(listId);if(!list)return;
  var s='';
  var cm={draft:'草稿',signed:'已签订',executing:'执行中',finished:'已完成',terminated:'已终止'};
  for(var i=0;i<allContracts.length;i++){
    var c=allContracts[i];
    s+='<div class="delivery-item" style="cursor:pointer" onclick="wfOpenModuleForm(\'contract\',\''+c.id+'\')">';
    s+='<div><strong>'+h(c.title||'合同')+'</strong><br><span style="font-size:11px;color:var(--text3)">'+h(cm[c.status]||c.status||'草稿')+(c.contract_no?' · '+h(c.contract_no):'')+'</span></div>';
    s+='<span style="font-size:12px;color:var(--text2)">'+(c.amount?formatMoney(c.amount):'-')+'</span></div>';
  }
  list.innerHTML=s||'<div style="text-align:center;padding:20px;color:var(--text2)">暂无合同，点右上角 + 新建合同</div>';
}

function loadDeliveriesTo(listId){
  var list=document.getElementById(listId);if(!list)return;
  list.innerHTML='<div style="text-align:center;padding:20px;color:var(--text2)">加载中...</div>';
  loadDeliveries();
}
function renderDeliveryListTo(listId){
  var list=document.getElementById(listId);if(!list)return;
  var s='';
  var dm={pending:'待交付',in_progress:'交付中',completed:'已完成',delayed:'延期'};
  for(var i=0;i<allDeliveries.length;i++){
    var d=allDeliveries[i];
    s+='<div class="delivery-item" style="cursor:pointer" onclick="wfOpenModuleForm(\'delivery\',\''+d.id+'\')">';
    s+='<div><strong>'+h(d.title||'交付项')+'</strong><br><span style="font-size:11px;color:var(--text3)">'+h(dm[d.status]||d.status||'-')+'</span></div>';
    s+='<span style="font-size:12px;color:var(--text2)">'+(d.delivery_date?'截止 '+h(d.delivery_date):'')+'</span></div>';
  }
  list.innerHTML=s||'<div style="text-align:center;padding:20px;color:var(--text2)">暂无交付记录，点右上角 + 新建交付</div>';
}

function loadPaymentsTo(listId){
  var list=document.getElementById(listId);if(!list)return;
  list.innerHTML='<div style="text-align:center;padding:20px;color:var(--text2)">加载中...</div>';
  loadProjectPayments();
}
function renderPaymentListTo(listId){
  var list=document.getElementById(listId);if(!list)return;
  var s='';
  var pm={pending:'待收款',paid:'已收款',overdue:'逾期'};
  for(var i=0;i<allPayments.length;i++){
    var p=allPayments[i];
    s+='<div class="delivery-item" style="cursor:pointer" onclick="wfOpenModuleForm(\'payment\',\''+p.id+'\')">';
    s+='<div><strong>'+h(p.title||'收款')+'</strong><br><span style="font-size:11px;color:var(--text3)">'+h(pm[p.status]||p.status||'-')+(p.payment_date?' · '+h(p.payment_date):'')+'</span></div>';
    s+='<span style="font-size:13px;font-weight:600">'+(p.amount?formatMoney(p.amount):'-')+'</span></div>';
  }
  list.innerHTML=s||'<div style="text-align:center;padding:20px;color:var(--text2)">暂无收款记录，点右上角 + 新建收款</div>';
}

// ---- Old tab compatibility (list view) ----
function switchProjectTab(tab){
  if(tab==='list'){loadProjects();return}
}

async function loadProjects(){
  var list=document.getElementById('pm-project-list');
  if(!list){console.error('pm-project-list not found');return}
  if(!currentCompanyId){list.innerHTML='<div style="text-align:center;padding:40px;color:var(--text2)">未登录公司，请确认已完成公司注册</div>';return}
  document.getElementById('project-list-panel').classList.remove('hidden');
  document.getElementById('project-workbench').classList.add('hidden');
  document.getElementById('project-workbench').style.display='none';
  try {
    list.innerHTML='<div style="text-align:center;padding:40px;color:var(--text2)">查询中...</div>';
    var {data,error}=await sb.from('projects').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false});
    if(error){list.innerHTML='<div style="text-align:center;padding:40px;color:#e74c3c">加载失败: '+h(error.message)+'。请确认 projects 表是否已在 Supabase 中创建（执行 project_management.sql）</div>';return}
    allProjects=data||[];
    renderProjects();
  } catch(e) {
    list.innerHTML='<div style="text-align:center;padding:40px;color:#e74c3c">加载异常: '+h(e.message)+'</div>';
    console.error(e);
  }
}

function renderProjects(){
  var list=document.getElementById('pm-project-list');
  if(!allProjects.length){list.innerHTML='<div style="text-align:center;padding:40px;color:var(--text2)">无项目，可从销售管道线索中立项创建</div>';return}
  // Filter by current_state
  var filtered=allProjects;
  if(projectStateFilter){filtered=allProjects.filter(function(p){return (p.current_state||'doing')===projectStateFilter})}
  if(!filtered.length){list.innerHTML='<div style="text-align:center;padding:40px;color:var(--text2)">'+({todo:'无待办项目',doing:'无在办项目',done:'无办结项目'}[projectStateFilter]||'无项目')+'</div>';return}
  var s='';
  var statusMap={planning:'规划中',in_progress:'进行中',completed:'已完成',suspended:'已暂停'};
  var stateMap={todo:'⏳ 待办',doing:'🔄 在办',done:'✅ 办结'};
  for(var i=0;i<filtered.length;i++){
    var p=filtered[i];
    var client=allClients.find(function(c){return c.id===p.client_id});
    var cn=client?client.name:'未关联';
    var cs=p.current_state||'doing';
    if(p.bus_id)s+='<span style="font-size:11px;color:var(--text3)">⌖ '+h(p.bus_id)+'</span>';
    var wfDone=0,wfTotal=46;
    try{var wf=JSON.parse(p.workflow||'{}');for(var k in wf){if(wf[k]&&wf[k].done)wfDone++}}catch(e){}
    var wfPct=wfTotal>0?Math.round(wfDone/wfTotal*100):0;
    s+='<div class="project-card" onclick="renderProjectDetail(\''+p.id+'\')">';
    s+='<div class="project-card-header"><span class="project-card-name">'+h(p.name)+'</span><span class="project-card-status status-'+p.status+'">'+(statusMap[p.status]||p.status)+'</span><span style="font-size:11px;color:var(--text2);margin-left:4px">'+(stateMap[cs]||cs)+'</span></div>';
    s+='<div class="project-card-meta"><span>&#127970; '+h(cn)+'</span><span>&#128176; '+(p.budget?formatMoney(p.budget):'-')+'</span>';
    if(p.start_date)s+='<span>&#128197; '+p.start_date+'</span>';
    if(p.end_date)s+='<span>&rarr; '+p.end_date+'</span>';
    s+='<span style="color:var(--primary);font-weight:600">流程 '+wfPct+'%</span>';
    s+='</div>';
    s+='<div style="height:3px;background:var(--border);border-radius:1px;margin-top:6px"><div style="height:100%;width:'+wfPct+'%;background:var(--primary);border-radius:1px"></div></div>';
    s+='</div>';
  }
  list.innerHTML=s;
}

function filterProjectsByState(state){
  projectStateFilter=state;
  document.querySelectorAll('#project-list-panel .pd-status-tab').forEach(function(b){b.classList.toggle('active',b.dataset.status===state)});
  renderProjects();
}

// ---- Stage / Bidding / Contract / Delivery / Payment keepers (called from workbench) ----
async function loadStages(){
  if(!curProjectId)return;
  var list=document.getElementById('wb-stages-list')||document.getElementById('stages-list');
  if(!list)return;
  try{
    var {data,error}=await sb.from('project_stages').select('*').eq('project_id',curProjectId).order('sort',{ascending:true});
    if(error){list.innerHTML='<div style="padding:20px;color:#e74c3c">'+h(error.message)+'</div>';return}
    allStages=data||[];
    renderStages(list);
  }catch(e){console.error(e)}
}
function renderStages(list){
  var s='';
  var sm={planning:'规划中',in_progress:'进行中',completed:'已完成',suspended:'已暂停'};
  for(var i=0;i<allStages.length;i++){
    var st=allStages[i];
    s+='<div class="stage-item" style="cursor:pointer" onclick="openStageForm('+st.id+')">';
    s+='<div><strong>'+h(st.name)+'</strong><br><span style="font-size:11px;color:var(--text3)">'+(sm[st.status]||st.status)+'</span></div>';
    s+='<button class="btn-sm" style="color:var(--danger)" onclick="event.stopPropagation();deleteStage('+st.id+')">删除</button>';
    s+='</div>';
  }
  if(list)list.innerHTML=s||'<div style="text-align:center;padding:20px;color:var(--text2)">暂无阶段</div>';
}

async function loadBiddings(){
  if(!curProjectId)return;
  try{
    var {data,error}=await sb.from('project_biddings').select('*').eq('project_id',curProjectId).order('created_at',{ascending:false});
    if(error){_wfModuleError('wb-bidding-list',error.message);return}
    allBiddings=data||[];
    renderBiddingListTo('wb-bidding-list');
  }catch(e){console.error(e);_wfModuleError('wb-bidding-list',e.message)}
}

async function loadProjectContracts(){
  if(!curProjectId)return;
  try{
    var {data,error}=await sb.from('project_contracts').select('*').eq('project_id',curProjectId).order('created_at',{ascending:false});
    if(error){_wfModuleError('wb-contract-list',error.message);return}
    allContracts=data||[];
    renderContractListTo('wb-contract-list');
  }catch(e){console.error(e);_wfModuleError('wb-contract-list',e.message)}
}

async function loadDeliveries(){
  if(!curProjectId)return;
  try{
    var {data,error}=await sb.from('project_deliveries').select('*').eq('project_id',curProjectId).order('created_at',{ascending:false});
    if(error){_wfModuleError('wb-delivery-list',error.message);return}
    allDeliveries=data||[];
    renderDeliveryListTo('wb-delivery-list');
  }catch(e){console.error(e);_wfModuleError('wb-delivery-list',e.message)}
}

async function loadProjectPayments(){
  if(!curProjectId)return;
  try{
    var {data,error}=await sb.from('project_payments').select('*').eq('project_id',curProjectId).order('created_at',{ascending:false});
    if(error){_wfModuleError('wb-payment-list',error.message);return}
    allPayments=data||[];
    renderPaymentListTo('wb-payment-list');
  }catch(e){console.error(e);_wfModuleError('wb-payment-list',e.message)}
}

function _wfModuleError(listId,msg){
  var el=document.getElementById(listId);if(!el)return;
  el.innerHTML='<div style="text-align:center;padding:20px;color:#e74c3c;font-size:13px">加载失败: '+h(msg)+'</div>';
}

function openProjectFormFromLeadIdx(idx){
  var entry=_leadProjectCache[idx];
  if(!entry){showToast('线索数据丢失');return}
  openProjectFormFromLead(entry.id,entry.projectName,entry.companyName,entry.clientId);
}
async function openProjectFormFromLead(leadId,projectName,companyName,clientId){
  oppLeadId=leadId||null;
  oppEditId=null;
  var title=document.getElementById('opp-form-title');
  if(title)title.textContent='新建商机';
  var delBtn=document.getElementById('opp-btn-delete');
  if(delBtn)delBtn.classList.add('hidden');
  document.getElementById('pf-bus-id').value='';
  document.getElementById('pf-lead-id').value=leadId||'';
  document.getElementById('pf-name').value=projectName||'';
  document.getElementById('pf-customer-type').value='';
  document.getElementById('pf-industry').value='';
  document.getElementById('pf-company-name').value=companyName||'';
  document.getElementById('pf-credit-code').value='';
  document.getElementById('pf-address').value='';
  pfContactsData=[];renderPfContacts();
  document.getElementById('pf-assigned-sales').value=currentUser?(currentUser.realname||currentUser.name||''):'';
  document.getElementById('pf-co-sales').value='';
  document.getElementById('pf-budget').value='';
  document.getElementById('pjf-status').value='planning';
  document.getElementById('pf-conclusion').value='';
  if(document.getElementById('pf-conclusion-notes'))document.getElementById('pf-conclusion-notes').value='';
  var notesGrp=document.getElementById('pf-conclusion-notes-group');
  if(notesGrp)notesGrp.style.display='none';
  document.getElementById('pjf-notes').value='';
  // If clientId provided, load all clients and auto-fill
  (async function(){
    var client=null;
    // Try local cache first
    if(clientId&&allClients&&allClients.length){
      client=allClients.find(function(c){return c.id===clientId});
    }
    // Fallback: fetch from Supabase
    if(!client&&clientId){
      try{var {data}=await sb.from('clients').select('id,name,industry,address,type,credit_code,company_info').eq('id',clientId).maybeSingle();if(data)client=data}catch(e){}
    }
    if(client){
      document.getElementById('pf-company-name').value=client.name||companyName||'';
      if(client.industry)document.getElementById('pf-industry').value=client.industry;
      if(client.address)document.getElementById('pf-address').value=client.address;
      var cc=client.credit_code||'';if(!cc){try{var ci=typeof client.company_info==='string'?JSON.parse(client.company_info):(client.company_info||{});cc=ci.credit_code||'';}catch(e){}}if(cc)document.getElementById('pf-credit-code').value=cc;
      if(client.type){try{var types=JSON.parse(client.type);if(Array.isArray(types)&&types.length)document.getElementById('pf-customer-type').value=types[0];}catch(e){}}
      // Load contacts from contacts table and populate pfContactsData
      dbg('[openProjectFormFromLead] loading contacts for clientId=',clientId);
      try{
        var {data:cts,error:ctErr}=await sb.from('contacts').select('name,title,phone,email').eq('client_id',clientId);
        if(ctErr){console.error('[openProjectFormFromLead] contacts query error',JSON.stringify(ctErr));return}
        dbg('[openProjectFormFromLead] contacts loaded',{count:cts?cts.length:0,data:cts});
        if(cts&&cts.length){
          for(var ci=0;ci<cts.length;ci++){
            var ct=cts[ci];
            var ph=ct.phone||'';if(typeof ph==='string'){try{var arr=JSON.parse(ph);ph=Array.isArray(arr)?arr:[ph];}catch(e){}}
            pfContactsData.push({name:ct.name||'',title:ct.title||'',phone:ph||'',email:ct.email||''});
          }
          renderPfContacts();
        }
      }catch(e){}
    }
    // Populate template dropdown
    var templateSel=document.getElementById('pf-template-id');
    if(templateSel){
      templateSel.innerHTML='<option value="">默认（46步标准流程）</option>';
      for(var i=0;i<allTemplates.length;i++){
        var t=allTemplates[i];
        templateSel.innerHTML+='<option value="'+t.id+'">'+escHtml(t.name)+'</option>';
      }
    }
  })();
  // Lazy load allClients if needed
  if(!allClients||!allClients.length){
    (async function(){
      try{var {data}=await sb.from('clients').select('id,name,industry,address,type,credit_code').eq('company_id',currentCompanyId);if(data)allClients=data;}catch(e){}
    })();
  }
  // Populate template dropdown
  var templateSel=document.getElementById('pf-template-id');
  if(templateSel){
    templateSel.innerHTML='<option value="">默认（46步标准流程）</option>';
    for(var i=0;i<allTemplates.length;i++){
      var t=allTemplates[i];
      templateSel.innerHTML+='<option value="'+t.id+'">'+escHtml(t.name)+'</option>';
    }
  }
  document.getElementById('opp-form-modal').classList.remove('hidden');
}

function openProjectForm(id,leadId){
  oppEditId=id||null;
  var title=document.getElementById('opp-form-title');
  if(title)title.textContent=id?'编辑商机':'新建商机';
  var delBtn=document.getElementById('opp-btn-delete');
  if(delBtn)delBtn.classList.toggle('hidden',!id);
  document.getElementById('pf-bus-id').value='';
  document.getElementById('pf-lead-id').value='';
  document.getElementById('pf-name').value='';
  document.getElementById('pf-customer-type').value='';
  document.getElementById('pf-industry').value='';
  document.getElementById('pf-company-name').value='';
  document.getElementById('pf-credit-code').value='';
  document.getElementById('pf-address').value='';
  pfContactsData=[];renderPfContacts();
  document.getElementById('pf-assigned-sales').value='';
  document.getElementById('pf-co-sales').value='';
  document.getElementById('pf-budget').value='';
  document.getElementById('pjf-status').value='planning';
  document.getElementById('pf-conclusion').value='';
  document.getElementById('pf-conclusion-notes').value='';
  document.getElementById('pf-conclusion-notes-group').style.display='none';
  document.getElementById('pjf-notes').value='';
  if(leadId){document.getElementById('pf-lead-id').value=leadId;oppLeadId=leadId}else oppLeadId=null;
  if(!id){
    document.getElementById('pf-assigned-sales').value=currentUser?(currentUser.realname||currentUser.name||''):'';
  }
  if(id){
    var p=allProjects.find(function(x){return x.id==id||String(x.id)===String(id)});
    if(p){
      document.getElementById('pf-bus-id').value=p.bus_id||'';
      document.getElementById('pf-lead-id').value=p.lead_id||'';
      document.getElementById('pf-name').value=p.name||'';
      document.getElementById('pf-customer-type').value=p.customer_type||'';
      document.getElementById('pf-industry').value=p.industry||'';
      document.getElementById('pf-company-name').value=p.company_name||'';
      document.getElementById('pf-credit-code').value=p.credit_code||'';
      document.getElementById('pf-address').value=p.address||'';
      document.getElementById('pf-assigned-sales').value=p.assigned_sales||'';
      document.getElementById('pf-co-sales').value=p.co_sales||'';
      document.getElementById('pf-budget').value=p.budget||'';
      document.getElementById('pjf-status').value=p.status||'planning';
      document.getElementById('pf-conclusion').value=p.conclusion||'';
      document.getElementById('pf-conclusion-notes').value=p.conclusion_notes||'';
      if(p.conclusion)document.getElementById('pf-conclusion-notes-group').style.display='block';
      document.getElementById('pjf-notes').value=p.notes||'';
      // Restore contacts
      pfContactsData=[];
      if(p.contacts_json){try{pfContactsData=JSON.parse(p.contacts_json)}catch(e){}}else if(p.contact_phone){try{var phones=JSON.parse(p.contact_phone);var names=(p.contact_name||'').split(', ');var titles=(p.contact_title||'').split(', ');for(var ci=0;ci<Math.max(phones.length,names.length,titles.length);ci++)pfContactsData.push({name:names[ci]||'',title:titles[ci]||'',phone:phones[ci]||'',email:''})}catch(e){}}
      renderPfContacts();
    }
  }
  // Populate template dropdown
  var templateSel=document.getElementById('pf-template-id');
  if(templateSel){
    templateSel.innerHTML='<option value="">默认（46步标准流程）</option>';
    for(var i=0;i<allTemplates.length;i++){
      var t=allTemplates[i];
      templateSel.innerHTML+='<option value="'+t.id+'">'+escHtml(t.name)+'</option>';
    }
  }
  document.getElementById('opp-form-modal').classList.remove('hidden');
}

function closeOppForm(){document.getElementById('opp-form-modal').classList.add('hidden');oppEditId=null;oppLeadId=null}

function onConclusionChange(){
  var val=document.getElementById('pf-conclusion').value;
  var notesGroup=document.getElementById('pf-conclusion-notes-group');
  if(notesGroup)notesGroup.style.display=val?'block':'none';
}

function onOppCompanyInput(){
  var val=document.getElementById('pf-company-name').value.trim();
  var sug=document.getElementById('opp-company-suggestions');
  if(!sug)return;
  if(val.length<1){sug.classList.add('hidden');return}
  var matches=allClients.filter(function(c){return c.name&&c.name.toLowerCase().indexOf(val.toLowerCase())>=0}).slice(0,8);
  if(!matches.length){sug.classList.add('hidden');return}
  var s='';
  for(var i=0;i<matches.length;i++){
    s+='<div class="name-suggestion-item" onclick="document.getElementById(\'pf-company-name\').value=\''+h(matches[i].name)+'\';document.getElementById(\'opp-company-suggestions\').classList.add(\'hidden\')">'+h(matches[i].name)+'</div>';
  }
  sug.innerHTML=s;sug.classList.remove('hidden');
}
function onOppCompanyKey(e){
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){navigateSuggestions('opp-company-suggestions',e)}
  else if(e.key==='Enter'){selectSuggestion('opp-company-suggestions','pf-company-name')}
  else if(e.key==='Escape'){document.getElementById('opp-company-suggestions').classList.add('hidden')}
}

// ---- Competitor Picker (step 3) ----
function getCompList(){
  if(!curProjectId||!curWorkflow[3])return[];
  return (curWorkflow[3].data||{}).comp_list||[];
}
function setCompList(list){
  if(!curProjectId)return;
  curWorkflow[3]=curWorkflow[3]||{done:false,note:'',data:{}};
  curWorkflow[3].data=(curWorkflow[3].data||{});
  curWorkflow[3].data.comp_list=list||[];
  renderCompetitorCards();
  saveWorkflow();
}

function renderCompetitorCards(){
  var container=document.getElementById('wb-competitor-cards');
  if(!container)return;
  var list=getCompList();
  if(!list.length){container.innerHTML='<div style="color:var(--text3);font-size:13px;padding:8px 0">暂无竞争对手，请从上方搜索添加</div>';return}
  var s='';
  for(var i=0;i<list.length;i++){
    var c=list[i];var idx=i;
    s+='<div class="comp-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px;position:relative">';
    s+='<button style="position:absolute;top:8px;right:10px;background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px" onclick="removeCompetitor('+idx+')" title="移除">×</button>';
    s+='<div style="font-weight:700;font-size:15px;margin-bottom:8px;padding-right:24px">'+h(c.company_name||'未命名')+'</div>';
    s+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 12px">';
    s+='<div><span style="font-size:11px;color:var(--text3)">项目负责人</span><div style="font-size:13px">'+h(c.project_manager||'-')+'</div></div>';
    s+='<div><span style="font-size:11px;color:var(--text3)">手机</span><div style="font-size:13px">'+h(c.phone||'-')+'</div></div>';
    s+='<div><span style="font-size:11px;color:var(--text3)">座机</span><div style="font-size:13px">'+h(c.landline||'-')+'</div></div>';
    s+='<div><span style="font-size:11px;color:var(--text3)">邮箱</span><div style="font-size:13px">'+h(c.email||'-')+'</div></div>';
    s+='</div>';
    s+='<button class="btn-sm" style="margin-top:8px;background:var(--bg);border:1px solid var(--border);color:var(--text2);font-size:12px;padding:4px 10px;border-radius:6px;cursor:pointer" onclick="editCompetitor('+idx+')">✎ 编辑</button>';
    s+='</div>';
  }
  container.innerHTML=s;
}

function onCompSearchInput(){
  var val=document.getElementById('wb-competitor-search').value.trim();
  var sug=document.getElementById('wb-comp-suggestions');
  if(!sug)return;
  if(val.length<1){sug.classList.add('hidden');return}
  var matches=allClients.filter(function(c){return c.name&&c.name.toLowerCase().indexOf(val.toLowerCase())>=0}).slice(0,8);
  if(!matches.length){sug.classList.add('hidden');return}
  var s='';
  for(var i=0;i<matches.length;i++){
    s+='<div class="name-suggestion-item" onclick="selectCompClient('+JSON.stringify(matches[i].id)+','+JSON.stringify(matches[i].name)+')">'+h(matches[i].name)+'</div>';
  }
  sug.innerHTML=s;sug.classList.remove('hidden');
}
function onCompSearchKey(e){
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){navigateSuggestions('wb-comp-suggestions',e)}
  else if(e.key==='Enter'){e.preventDefault();selectSuggestion('wb-comp-suggestions','wb-competitor-search')}
  else if(e.key==='Escape'){document.getElementById('wb-comp-suggestions').classList.add('hidden')}
}
function selectCompClient(clientId,clientName){
  document.getElementById('wb-competitor-search').value=clientName;
  document.getElementById('wb-comp-suggestions').classList.add('hidden');
  _compSelectClientId=clientId;
}
var _compSelectClientId=null,_compEditIdx=-1;

function addCompetitorFromSearch(){
  var name=document.getElementById('wb-competitor-search').value.trim();
  if(!name){showToast('请输入公司名称');return}
  var client=allClients.find(function(c){return c.id===_compSelectClientId});
  if(_compEditIdx>=0){
    // Edit mode
    var list=getCompList();
    var existing=list[_compEditIdx]||{};
    existing.company_name=name;
    existing.client_id=_compSelectClientId||'';
    if(client){
      // Try to get first contact
      if(!existing.project_manager&&(client.contacts||[]).length)existing.project_manager=(client.contacts[0].name||'');
      if(!existing.phone&&(client.contacts||[]).length)existing.phone=(client.contacts[0].phone||'');
    }
    setCompList(list);
    _compEditIdx=-1;
    document.getElementById('wb-competitor-search').value='';
    _compSelectClientId=null;
    return;
  }
  // Check duplicate
  var list=getCompList();
  if(list.some(function(c){return c.company_name===name})){
    showToast('该公司已在列表中');return;
  }
  var entry={company_name:name,client_id:_compSelectClientId||'',project_manager:'',phone:'',landline:'',email:''};
  if(client){
    var contacts=client.contacts||[];
    if(contacts.length){
      entry.project_manager=contacts[0].name||'';
      entry.phone=contacts[0].phone||'';
      entry.email=contacts[0].email||'';
    }
  }
  list.push(entry);
  setCompList(list);
  document.getElementById('wb-competitor-search').value='';
  _compSelectClientId=null;
}

function removeCompetitor(idx){
  var list=getCompList();
  list.splice(idx,1);
  setCompList(list);
}

function editCompetitor(idx){
  var list=getCompList();
  var c=list[idx];
  if(!c)return;
  document.getElementById('wb-competitor-search').value=c.company_name||'';
  _compSelectClientId=c.client_id||'';
  _compEditIdx=idx;
  // Show the detail editor
  showCompetitorDetailEditor(c,idx);
}

function showCompetitorDetailEditor(c,idx){
  var old=document.getElementById('wb-comp-detail-editor');
  if(old)old.remove();
  var div=document.createElement('div');
  div.id='wb-comp-detail-editor';
  div.style.cssText='background:var(--card-bg);border:1px solid var(--primary);border-radius:10px;padding:16px;margin:12px 0';
  div.innerHTML=''+
    '<h4 style="margin:0 0 12px">✎ 编辑：'+h(c.company_name||'')+'</h4>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+
    '<div><label style="font-size:11px">项目负责人</label><input id="comp-ed-pm" value="'+h(c.project_manager||'')+'" style="width:100%" placeholder="对手公司该项目的销售"></div>'+
    '<div><label style="font-size:11px">手机</label><input id="comp-ed-phone" value="'+h(c.phone||'')+'" style="width:100%" placeholder="不能有空格"></div>'+
    '<div><label style="font-size:11px">座机</label><input id="comp-ed-landline" value="'+h(c.landline||'')+'" style="width:100%" placeholder="不能有空格"></div>'+
    '<div><label style="font-size:11px">邮箱</label><input id="comp-ed-email" value="'+h(c.email||'')+'" style="width:100%" placeholder="邮箱"></div>'+
    '</div>'+
    '<div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">'+
    '<button class="btn-cancel" onclick="cancelCompEdit()">取消</button>'+
    '<button class="btn-save" onclick="saveCompDetail('+idx+')">保存</button></div>';
  var cards=document.getElementById('wb-competitor-cards');
  if(cards)cards.insertAdjacentElement('afterend',div);
}

function saveCompDetail(idx){
  var list=getCompList();
  list[idx].project_manager=document.getElementById('comp-ed-pm').value.trim();
  list[idx].phone=document.getElementById('comp-ed-phone').value.replace(/\s/g,'');
  list[idx].landline=document.getElementById('comp-ed-landline').value.replace(/\s/g,'');
  list[idx].email=document.getElementById('comp-ed-email').value.trim();
  setCompList(list);
  cancelCompEdit();
  _compEditIdx=-1;
  document.getElementById('wb-competitor-search').value='';
}
function cancelCompEdit(){
  var el=document.getElementById('wb-comp-detail-editor');
  if(el)el.remove();
  _compEditIdx=-1;
}

// ---- Training (step 6) ----
function saveTrainingData(){
  if(!curProjectId)return;
  curWorkflow[6]=curWorkflow[6]||{done:false,note:'',data:{}};
  curWorkflow[6].data=(curWorkflow[6].data||{});
  curWorkflow[6].data.training_org=document.getElementById('wb-training-org').value.trim();
  curWorkflow[6].data.training_tutor=document.getElementById('wb-training-tutor').value.trim();
  curWorkflow[6].data.training_tutor_phone=document.getElementById('wb-training-tutor-phone').value.trim();
  curWorkflow[6].data.training_product=document.getElementById('wb-training-product').value.trim();
  curWorkflow[6].data.training_solution=document.getElementById('wb-training-solution').value.trim();
  curWorkflow[6].data.training_participants=document.getElementById('wb-training-participants').value.trim();
  saveWorkflow();
  showToast('培训数据已保存');
}
function completeTraining(){
  saveTrainingData();
  curWorkflow[6]=curWorkflow[6]||{done:false,note:'',data:{}};
  curWorkflow[6].done=true;
  curWorkflow[6].note='培训完成';
  curWorkflow[6].completed_at=new Date().toISOString();
  curWorkflowState[6]=curWorkflowState[6]||{status:'active'};
  curWorkflowState[6].status='done';
  curStep=7;
  wfActivateStep(7);
  saveWorkflow();
  renderWorkbench();
  showToast('✓ 培训完成，已跳转步骤7');
  dbg('[completeTraining] advanced to step 7');
}
function onTrainingOrgInput(){
  var val=document.getElementById('wb-training-org').value.trim();
  var sug=document.getElementById('wb-training-suggestions');
  if(!sug)return;
  if(val.length<1){sug.classList.add('hidden');return}
  var matches=allClients.filter(function(c){return c.name&&c.name.toLowerCase().indexOf(val.toLowerCase())>=0}).slice(0,8);
  if(!matches.length){sug.classList.add('hidden');return}
  var s='';
  for(var i=0;i<matches.length;i++){
    s+='<div class="name-suggestion-item" onclick="selectTrainingOrg('+JSON.stringify(matches[i].id)+','+JSON.stringify(matches[i].name)+')">'+h(matches[i].name)+'</div>';
  }
  sug.innerHTML=s;sug.classList.remove('hidden');
}
function onTrainingOrgKey(e){
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){navigateSuggestions('wb-training-suggestions',e)}
  else if(e.key==='Enter'){e.preventDefault();selectSuggestion('wb-training-suggestions','wb-training-org')}
  else if(e.key==='Escape'){document.getElementById('wb-training-suggestions').classList.add('hidden')}
}
function selectTrainingOrg(clientId,clientName){
  document.getElementById('wb-training-org').value=clientName;
  document.getElementById('wb-training-suggestions').classList.add('hidden');
  // Auto-fill tutor from client's first contact
  var client=allClients.find(function(c){return c.id===clientId});
  if(client&&(client.contacts||[]).length){
    var ct=client.contacts[0];
    if(!document.getElementById('wb-training-tutor').value)document.getElementById('wb-training-tutor').value=ct.name||'';
    if(!document.getElementById('wb-training-tutor-phone').value)document.getElementById('wb-training-tutor-phone').value=ct.phone||'';
  }
}

function saveCompetitorAnalysis(){
  if(!curProjectId)return;
  curWorkflow[4]=curWorkflow[4]||{done:false,note:'',data:{}};
  curWorkflow[4].data=(curWorkflow[4].data||{});
  curWorkflow[4].data.competitor_note=document.getElementById('wb-competitor-note').value;
  saveWorkflow();
  showToast('分析已保存');
}
function wfOpenStageForm(id){showToast('阶段管理')}
