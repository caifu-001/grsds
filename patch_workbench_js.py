import os

path = r"D:\1kaifa\grsds\index.html"
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

pm_start = 673722
pm_end = 718060

new_js = r'''// ====== Project Management ======
var allProjects=[],allStages=[],allBiddings=[],allDeliveries=[],allPayments=[],curProjectId=null,curProjectName='';
var pStageEditId=null,pBiddingEditId=null,pDeliveryEditId=null,pPaymentEditId=null;

// ---- Workflow Data ----
var curWorkflow={}, curStep=0;
var WORKFLOW_STEPS=[
  {seq:1,phase:'线索',key:'gather',name:'搜集线索',icon:'🔍'},
  {seq:2,phase:'商机',key:'analyze',name:'分析与验证',icon:'💡'},
  {seq:3,phase:'分析与策略',key:'competitors',name:'获取竞争对手名单',icon:'📋',panel:'competitor'},
  {seq:4,phase:'分析与策略',key:'compete_analysis',name:'竞争与分析',icon:'📊',panel:'competitor'},
  {seq:5,phase:'分析与策略',key:'decision_join',name:'参与决策',icon:'🚦',decision:true,decisionAsk:'是否参与决策？',decisionYes:'6',decisionNo:'46'},
  {seq:6,phase:'内部赋能',key:'training',name:'学习培训',icon:'📖'},
  {seq:7,phase:'内部赋能',key:'vendor_compare',name:'厂家比较',icon:'🔄'},
  {seq:8,phase:'初步方案定制',key:'client_comm',name:'客户交流方案',icon:'💬'},
  {seq:9,phase:'初步方案定制',key:'internal_review',name:'内部审核',icon:'🚦',decision:true,decisionAsk:'内部审核是否通过？',decisionYes:'10',decisionNo:'46'},
  {seq:10,phase:'项目运作',key:'company_intro',name:'公司介绍交流方案',icon:'🏢',panel:'basic'},
  {seq:11,phase:'项目运作',key:'detailed_needs',name:'获取客户详细需求',icon:'📝',panel:'basic'},
  {seq:12,phase:'项目运作',key:'brand_reg',name:'品牌报备',icon:'🏷️'},
  {seq:13,phase:'项目运作',key:'detailed_plan',name:'详细方案',icon:'📐'},
  {seq:14,phase:'项目运作',key:'config_quote',name:'配置报价',icon:'💰'},
  {seq:15,phase:'项目运作',key:'chain_analysis',name:'决策链分析',icon:'🔗',panel:'decision_chain'},
  {seq:16,phase:'项目运作',key:'chain_report',name:'决策链对应汇报',icon:'📤',panel:'decision_chain'},
  {seq:17,phase:'项目运作',key:'retrospect',name:'总结复盘',icon:'🔄'},
  {seq:18,phase:'项目运作',key:'plan_optimize',name:'方案优化调整',icon:'🔧'},
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
for(var i=0;i<WORKFLOW_STEPS.length;i++){WFLookup[WORKFLOW_STEPS[i].seq]=WORKFLOW_STEPS[i]}

function initWorkflow(){
  curWorkflow={};curStep=1;
  for(var i=0;i<WORKFLOW_STEPS.length;i++){
    curWorkflow[WORKFLOW_STEPS[i].seq]={done:false,note:'',data:{}};
  }
}
initWorkflow();

function loadWorkflow(){
  var proj=allProjects.find(function(p){return p.id===curProjectId});
  if(!proj)return;
  try{var wf=JSON.parse(proj.workflow||'{}');curWorkflow=wf;curStep=proj.current_step||1}catch(e){initWorkflow()}
  if(!curWorkflow||Object.keys(curWorkflow).length===0)initWorkflow();
  renderWorkbench();
}

async function saveWorkflow(){
  if(!curProjectId)return;
  var payload={workflow:JSON.stringify(curWorkflow),current_step:curStep};
  var {error}=await sb.from('projects').update(payload).eq('id',curProjectId);
  if(error){console.error('saveWorkflow:',error);showToast('保存失败: '+error.message);return}
  var proj=allProjects.find(function(p){return p.id===curProjectId});
  if(proj){proj.workflow=JSON.stringify(curWorkflow);proj.current_step=curStep}
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
  document.getElementById('wb-project-name').textContent=pname;
  document.getElementById('project-list-panel').classList.add('hidden');
  var wb=document.getElementById('project-workbench');
  wb.classList.remove('hidden');wb.style.display='flex';
  document.getElementById('main-fab').classList.add('hidden');
  // update body for mobile
  document.querySelector('#projects-view').style.maxHeight='100vh';
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
  for(var i=0;i<WORKFLOW_STEPS.length;i++){
    var s=WORKFLOW_STEPS[i];
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
  for(var i=0;i<WORKFLOW_STEPS.length;i++){if(stepDone(WORKFLOW_STEPS[i].seq))doneCount++}
  var pct=Math.round(doneCount/WORKFLOW_STEPS.length*100);
  var bar=document.getElementById('wb-progress-bar');if(bar)bar.style.width=pct+'%';
  var txt=document.getElementById('wb-progress-text');if(txt)txt.textContent=doneCount+'/'+WORKFLOW_STEPS.length;
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

  // Decision node: show popup
  if(step.decision && seq===curStep){
    showDecisionPopup(step);
    return;
  }

  // Set as current step
  if(status==='done'){
    // Clicking a done step just shows its panel
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
  // Jump to yes target
  var step=WFLookup[seq];
  var nextSeq=parseInt(step.decisionYes)||(seq+1);
  // Skip branch if borrowing shell decision
  if(seq===20){ // Borrow shell: yes -> 21, skip 29-37
    for(var i=29;i<=37;i++){var s=curWorkflow[i]||{done:false};s.done=false;s.skipped=true;curWorkflow[i]=s}
  }
  curStep=nextSeq;
  renderWorkbench();
  saveWorkflow();
}

function decideNo(seq){
  closeDecisionPopup();
  // Mark step as done
  curWorkflow[seq]=curWorkflow[seq]||{done:false,note:'',data:{}};
  curWorkflow[seq].done=true;
  curWorkflow[seq].data={decision:'no'};
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
  renderWorkbench();
  saveWorkflow();
}

function closeDecisionPopup(){
  var m=document.querySelector('.wb-decision-mask');if(m)m.remove();
  var p=document.querySelector('.wb-decision-popup');if(p)p.remove();
}

function markStepDone(){
  if(!curStep)return;
  curWorkflow[curStep]=curWorkflow[curStep]||{done:false,note:'',data:{}};
  curWorkflow[curStep].done=true;
  // Advance to next non-skipped step
  var next=curStep+1;
  while(next<=46){
    if(!stepDone(next)&&stepStatus(next)!=='skipped')break;
    next++;
  }
  if(next<=46)curStep=next;
  renderWorkbench();
  saveWorkflow();
  showToast('✓ 已完成：'+(WFLookup[curStep-1]?WFLookup[curStep-1].name:''));
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
    data.competitors=(document.getElementById('wb-competitor-list')?document.getElementById('wb-competitor-list').value:'');
    data.competitor_note=(document.getElementById('wb-competitor-note')?document.getElementById('wb-competitor-note').value:'');
  }else if(panel==='decision_chain'){
    data.chain_members=(document.getElementById('wb-chain-members')?document.getElementById('wb-chain-members').value:'');
    data.chain_strategy=(document.getElementById('wb-chain-strategy')?document.getElementById('wb-chain-strategy').value:'');
  }else if(panel==='tender'){
    data.tender_type=(document.getElementById('wb-tender-type')?document.getElementById('wb-tender-type').value:'');
    data.tender_amount=(document.getElementById('wb-tender-amount')?document.getElementById('wb-tender-amount').value:'');
    data.tender_date=(document.getElementById('wb-tender-date')?document.getElementById('wb-tender-date').value:'');
    data.tender_deadline=(document.getElementById('wb-tender-deadline')?document.getElementById('wb-tender-deadline').value:'');
    data.tender_note=(document.getElementById('wb-tender-note')?document.getElementById('wb-tender-note').value:'');
  }
  curWorkflow[curStep].data=data;
  saveWorkflow();
  var st=document.getElementById('wb-save-status');if(st)st.textContent='已保存';
  setTimeout(function(){var st=document.getElementById('wb-save-status');if(st)st.textContent=''},2000);
}

function showStepPanel(seq){
  var step=WFLookup[seq];if(!step)return;
  // Hide all panels
  var panels=['wb-panel-basic','wb-panel-editor','wb-panel-competitor','wb-panel-decision-chain',
              'wb-panel-tender','wb-panel-bidding','wb-panel-contract','wb-panel-delivery',
              'wb-panel-payment','wb-panel-stages','wb-content-default'];
  for(var i=0;i<panels.length;i++){
    var el=document.getElementById(panels[i]);if(el)el.classList.add('hidden')
  }

  var panelName=step.panel||'editor';
  var panelEl=document.getElementById('wb-panel-'+panelName);

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
      if(document.getElementById('wb-competitor-list'))document.getElementById('wb-competitor-list').value=data.competitors||'';
      if(document.getElementById('wb-competitor-note'))document.getElementById('wb-competitor-note').value=data.competitor_note||'';
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
    default:
      document.getElementById('wb-panel-editor').classList.remove('hidden');
      document.getElementById('wb-editor-title').textContent='📝 '+step.seq+'. '+step.name;
      document.getElementById('wb-editor-desc').textContent='阶段：'+step.phase;
      if(document.getElementById('wb-editor-note'))document.getElementById('wb-editor-note').value=note;
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

function resetWorkflow(){
  if(!confirm('确定重置所有流程步骤？'))return;
  initWorkflow();
  renderWorkbench();
  saveWorkflow();
}

// ---- Bridge: load module data into workbench sub-containers ----
function loadBiddingsTo(listId){
  var list=document.getElementById(listId);if(!list)return;
  if(!allBiddings.length){list.innerHTML='<div style="text-align:center;padding:20px;color:var(--text2)">暂无投标记录，点右上角 + 新建</div>';loadBiddings();return}
  renderBiddingListTo(listId);
}
function renderBiddingListTo(listId){
  var list=document.getElementById(listId);if(!list)return;
  var s='';
  var sm={planning:'规划中',in_progress:'进行中',submitted:'已提交',won:'中标',lost:'未中标'};
  for(var i=0;i<allBiddings.length;i++){
    var b=allBiddings[i];
    s+='<div class="delivery-item" style="cursor:pointer" onclick="openBiddingForm(\''+b.id+'\')">';
    s+='<div><strong>'+h(b.title||'投标项')+'</strong><br><span style="font-size:11px;color:var(--text3)">'+(sm[b.status]||b.status)+'</span></div>';
    s+='<span style="font-size:12px;color:var(--text2)">'+(b.amount?formatMoney(b.amount):'-')+'</span></div>';
  }
  list.innerHTML=s||'<div style="text-align:center;padding:20px;color:var(--text2)">暂无投标记录</div>';
}

function loadProjectContractsTo(listId){
  var list=document.getElementById(listId);if(!list)return;
  if(!allBiddings.length){list.innerHTML='<div style="text-align:center;padding:20px;color:var(--text2)">暂无合同，点右上角 + 新建</div>';loadProjectContracts();return}
  renderContractListTo(listId);
}
function renderContractListTo(listId){
  var list=document.getElementById(listId);if(!list)return;
  var s='';
  for(var i=0;i<allBiddings.length;i++){
    var c=allBiddings[i];
    s+='<div class="delivery-item" style="cursor:pointer" onclick="openProjectContractForm(\''+c.id+'\')">';
    s+='<div><strong>'+h(c.contract_title||c.title||'合同')+'</strong><br><span style="font-size:11px;color:var(--text3)">'+(c.contract_status||'草稿')+'</span></div>';
    s+='<span style="font-size:12px;color:var(--text2)">'+(c.contract_amount?formatMoney(c.contract_amount):'-')+'</span></div>';
  }
  list.innerHTML=s||'<div style="text-align:center;padding:20px;color:var(--text2)">暂无合同</div>';
}

function loadDeliveriesTo(listId){
  var list=document.getElementById(listId);if(!list)return;
  if(!allDeliveries.length){list.innerHTML='<div style="text-align:center;padding:20px;color:var(--text2)">暂无交付记录，点右上角 + 新建</div>';loadDeliveries();return}
  renderDeliveryListTo(listId);
}
function renderDeliveryListTo(listId){
  var list=document.getElementById(listId);if(!list)return;
  var s='';
  var dm={pending:'待交付',in_progress:'交付中',completed:'已完成',delayed:'延期'};
  for(var i=0;i<allDeliveries.length;i++){
    var d=allDeliveries[i];
    s+='<div class="delivery-item" style="cursor:pointer" onclick="openDeliveryForm(\''+d.id+'\')">';
    s+='<div><strong>'+h(d.title||d.name||'交付项')+'</strong><br><span style="font-size:11px;color:var(--text3)">'+(dm[d.status]||d.status)+'</span></div>';
    s+='<span style="font-size:12px;color:var(--text2)">'+(d.deadline?'截止: '+d.deadline:'')+'</span></div>';
  }
  list.innerHTML=s||'<div style="text-align:center;padding:20px;color:var(--text2)">暂无交付记录</div>';
}

function loadPaymentsTo(listId){
  var list=document.getElementById(listId);if(!list)return;
  if(!allPayments.length){list.innerHTML='<div style="text-align:center;padding:20px;color:var(--text2)">暂无收款记录，点右上角 + 新建</div>';loadPayments();return}
  renderPaymentListTo(listId);
}
function renderPaymentListTo(listId){
  var list=document.getElementById(listId);if(!list)return;
  var s='';
  var pm={pending:'待收款',paid:'已收款',overdue:'逾期'};
  for(var i=0;i<allPayments.length;i++){
    var p=allPayments[i];
    s+='<div class="delivery-item" style="cursor:pointer" onclick="openPaymentForm(\''+p.id+'\')">';
    s+='<div><strong>'+h(p.title||'收款')+'</strong><br><span style="font-size:11px;color:var(--text3)">'+(pm[p.status]||p.status)+'</span></div>';
    s+='<span style="font-size:13px;font-weight:600">'+(p.amount?formatMoney(p.amount):'-')+'</span></div>';
  }
  list.innerHTML=s||'<div style="text-align:center;padding:20px;color:var(--text2)">暂无收款记录</div>';
}

// ---- Old tab compatibility (list view) ----
function switchProjectTab(tab){
  if(tab==='list'){loadProjects();return}
}

async function loadProjects(){
  var diagBanner=document.querySelector('#project-list-panel > div[style]');
  if(diagBanner&&diagBanner.textContent.indexOf('DIAG')>=0)diagBanner.remove();
  var list=document.getElementById('pm-project-list');
  if(!list){console.error('pm-project-list not found');return}
  if(!currentCompanyId){list.innerHTML='<div style="text-align:center;padding:40px;color:var(--text2)">未登录公司，请确认已完成公司注册</div>';return}
  document.getElementById('project-list-panel').classList.remove('hidden');
  document.getElementById('project-workbench').classList.add('hidden');
  document.getElementById('project-workbench').style.display='none';
  try {
    list.innerHTML='<div style="text-align:center;padding:40px;color:var(--text2)">查询中...</div>';
    var {data,error}=await sb.from('projects').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false});
    if(error){list.innerHTML='<div style="text-align:center;padding:40px;color:#e74c3c">加载失败: '+error.message+'。请确认 projects 表是否已在 Supabase 中创建（执行 project_management.sql）</div>';return}
    allProjects=data||[];
    renderProjects();
  } catch(e) {
    list.innerHTML='<div style="text-align:center;padding:40px;color:#e74c3c">加载异常: '+e.message+'</div>';
    console.error(e);
  }
}

function renderProjects(){
  var list=document.getElementById('pm-project-list');
  if(!allProjects.length){list.innerHTML='<div style="text-align:center;padding:40px;color:var(--text2)">无项目，可从销售管道线索中立项创建</div>';return}
  var s='';
  var statusMap={planning:'规划中',in_progress:'进行中',completed:'已完成',suspended:'已暂停'};
  for(var i=0;i<allProjects.length;i++){
    var p=allProjects[i];
    var client=allClients.find(function(c){return c.id===p.client_id});
    var cn=client?client.name:'未关联';
    // Count workflow progress for preview
    var wfDone=0,wfTotal=46;
    try{var wf=JSON.parse(p.workflow||'{}');for(var k in wf){if(wf[k]&&wf[k].done)wfDone++}}catch(e){}
    var wfPct=wfTotal>0?Math.round(wfDone/wfTotal*100):0;
    s+='<div class="project-card" onclick="openProjectWorkbench(\''+p.id+'\',\''+h(p.name)+'\')">';
    s+='<div class="project-card-header"><span class="project-card-name">'+h(p.name)+'</span><span class="project-card-status status-'+p.status+'">'+(statusMap[p.status]||p.status)+'</span></div>';
    s+='<div class="project-card-meta"><span>&#127970; '+h(cn)+'</span><span>&#128176; '+(p.budget?formatMoney(p.budget):'-')+'</span>';
    if(p.start_date)s+='<span>&#128197; '+p.start_date+'</span>';
    if(p.end_date)s+='<span>&rarr; '+p.end_date+'</span>';
    s+='<span style="color:var(--primary);font-weight:600">流程 '+wfPct+'%</span>';
    s+='</div>';
    // Mini progress bar
    s+='<div style="height:3px;background:var(--border);border-radius:1px;margin-top:6px"><div style="height:100%;width:'+wfPct+'%;background:var(--primary);border-radius:1px"></div></div>';
    s+='</div>';
  }
  list.innerHTML=s;
}

// ---- Stage / Bidding / Contract / Delivery / Payment keepers (called from workbench) ----
async function loadStages(){
  if(!curProjectId)return;
  var list=document.getElementById('wb-stages-list')||document.getElementById('stages-list');
  if(!list)return;
  try{
    var {data,error}=await sb.from('project_stages').select('*').eq('project_id',curProjectId).order('sort',{ascending:true});
    if(error){list.innerHTML='<div style="padding:20px;color:#e74c3c">'+error.message+'</div>';return}
    allStages=data||[];
    renderStages(list);
  }catch(e){console.error(e)}
}
function renderStages(list){
  var s='';
  var sm={planning:'规划中',in_progress:'进行中',completed:'已完成',suspended:'已暂停'};
  for(var i=0;i<allStages.length;i++){
    var st=allStages[i];
    s+='<div class="stage-item" style="cursor:pointer" onclick="openStageForm(\''+st.id+'\')">';
    s+='<div><strong>'+h(st.name)+'</strong><br><span style="font-size:11px;color:var(--text3)">'+(sm[st.status]||st.status)+'</span></div>';
    s+='<button class="btn-sm" style="color:var(--danger)" onclick="event.stopPropagation();deleteStage(\''+st.id+'\')">删除</button>';
    s+='</div>';
  }
  if(list)list.innerHTML=s||'<div style="text-align:center;padding:20px;color:var(--text2)">暂无阶段</div>';
}

async function loadBiddings(){
  if(!curProjectId)return;
  var list=document.getElementById('bidding-list');
  if(!list)return;
  try{
    var {data,error}=await sb.from('project_biddings').select('*').eq('project_id',curProjectId).order('created_at',{ascending:false});
    if(error){list.innerHTML='<div style="padding:20px;color:#e74c3c">'+error.message+'</div>';return}
    allBiddings=data||[];
    renderBiddingListTo('wb-bidding-list');
    if(list)renderBiddingListTo('bidding-list');
  }catch(e){console.error(e)}
}

async function loadProjectContracts(){
  if(!curProjectId)return;
  var list=document.getElementById('project-contract-list');
  if(!list)return;
  try{
    var {data,error}=await sb.from('project_biddings').select('*').eq('project_id',curProjectId).not('contract_title','is',null).order('created_at',{ascending:false});
    if(error){list.innerHTML='<div style="padding:20px;color:#e74c3c">'+error.message+'</div>';return}
    // Store contracts in allBiddings for now (shared table)
    allBiddings=data||[];
    renderContractListTo('wb-contract-list');
    if(list)renderContractListTo('project-contract-list');
  }catch(e){console.error(e)}
}

async function loadDeliveries(){
  if(!curProjectId)return;
  var list=document.getElementById('delivery-list');
  if(!list)return;
  try{
    var {data,error}=await sb.from('project_deliveries').select('*').eq('project_id',curProjectId).order('created_at',{ascending:false});
    if(error){list.innerHTML='<div style="padding:20px;color:#e74c3c">'+error.message+'</div>';return}
    allDeliveries=data||[];
    renderDeliveryListTo('wb-delivery-list');
    if(list)renderDeliveryListTo('delivery-list');
  }catch(e){console.error(e)}
}

async function loadPayments(){
  if(!curProjectId)return;
  var list=document.getElementById('payment-list');
  if(!list)return;
  try{
    var {data,error}=await sb.from('project_payments').select('*').eq('project_id',curProjectId).order('created_at',{ascending:false});
    if(error){list.innerHTML='<div style="padding:20px;color:#e74c3c">'+error.message+'</div>';return}
    allPayments=data||[];
    renderPaymentListTo('wb-payment-list');
    if(list)renderPaymentListTo('payment-list');
  }catch(e){console.error(e)}
}

function openProjectForm(id){showToast('项目表单功能已存在，保持不变')}
function openStageForm(id){showToast('阶段管理')}
function openBiddingForm(id){if(curProjectId)showToast('招投标表单')}
function openProjectContractForm(id){if(curProjectId)showToast('合同表单')}
function openDeliveryForm(id){if(curProjectId)showToast('交付表单')}
function openPaymentForm(id){if(curProjectId)showToast('收款表单')}
function deleteStage(id){if(confirm('确定删除？')){sb.from('project_stages').delete().eq('id',id).then(function(r){if(!r.error){loadStages();showToast('已删除')}else showToast(r.error.message)})}}
async function saveProject(){}
async function saveStage(){}
async function saveBidding(){}
async function saveDelivery(){}
async function savePayment(){}
async function saveProjectContract(){}
async function deleteBidding(id){if(confirm('确定删除？')){var {error}=await sb.from('project_biddings').delete().eq('id',id);if(error){showToast(error.message);return}loadBiddings();showToast('已删除')}}
async function deleteDelivery(id){if(confirm('确定删除？')){var {error}=await sb.from('project_deliveries').delete().eq('id',id);if(error){showToast(error.message);return}loadDeliveries();showToast('已删除')}}
async function deletePayment(id){if(confirm('确定删除？')){var {error}=await sb.from('project_payments').delete().eq('id',id);if(error){showToast(error.message);return}loadPayments();showToast('已删除')}}
'''

html = html[:pm_start] + new_js + html[pm_end:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)

print("JS replacement done. File size:", os.path.getsize(path))
