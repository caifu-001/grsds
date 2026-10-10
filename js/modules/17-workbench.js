// ==========================================================================
// grsds · 17-workbench.js  —  工作台模块表单：招投标/合同/交付/收款
// 源: js/app_v2.js 第 12799-14960 行（机械切片，未改一行代码）
// ==========================================================================
// ===== 工作台模块表单：招投标 / 合同 / 交付 / 收款 =====
var _wfModKind=null,_wfModEditId=null;
var WF_MODULE_DEFS={
  bidding:{table:'project_biddings',label:'投标',fields:[
    {k:'title',label:'投标项名称',type:'text',required:true,ph:'如：XX项目一期投标'},
    {k:'bid_amount',label:'投标金额',type:'number',ph:'0.00'},
    {k:'bid_deadline',label:'投标截止日',type:'date'},
    {k:'status',label:'状态',type:'select',def:'preparing',opts:[['preparing','准备中'],['planning','规划中'],['in_progress','进行中'],['submitted','已提交'],['won','中标'],['lost','未中标']]},
    {k:'seal_requested',label:'需要盖章',type:'checkbox'},
    {k:'notes',label:'备注',type:'textarea'}
  ]},
  contract:{table:'project_contracts',label:'合同',fields:[
    {k:'title',label:'合同名称',type:'text',required:true,ph:'如：XX项目采购合同'},
    {k:'contract_no',label:'合同编号',type:'text'},
    {k:'amount',label:'合同金额',type:'number',ph:'0.00'},
    {k:'our_party',label:'我方主体',type:'text'},
    {k:'their_party',label:'对方主体',type:'text'},
    {k:'sign_date',label:'签订日期',type:'date'},
    {k:'start_date',label:'开始日期',type:'date'},
    {k:'end_date',label:'结束日期',type:'date'},
    {k:'status',label:'状态',type:'select',def:'draft',opts:[['draft','草稿'],['signed','已签订'],['executing','执行中'],['finished','已完成'],['terminated','已终止']]},
    {k:'notes',label:'备注',type:'textarea'}
  ]},
  delivery:{table:'project_deliveries',label:'交付',fields:[
    {k:'title',label:'交付项名称',type:'text',required:true},
    {k:'description',label:'交付内容',type:'textarea'},
    {k:'delivery_date',label:'交付日期',type:'date'},
    {k:'status',label:'状态',type:'select',def:'pending',opts:[['pending','待交付'],['in_progress','交付中'],['completed','已完成'],['delayed','延期']]},
    {k:'acceptance_criteria',label:'验收标准',type:'textarea'},
    {k:'notes',label:'备注',type:'textarea'}
  ]},
  payment:{table:'project_payments',label:'收款',fields:[
    {k:'title',label:'收款名称',type:'text',required:true,ph:'如：预付款 / 尾款'},
    {k:'amount',label:'收款金额',type:'number',ph:'0.00'},
    {k:'payment_date',label:'收款日期',type:'date'},
    {k:'status',label:'状态',type:'select',def:'pending',opts:[['pending','待收款'],['paid','已收款'],['overdue','逾期']]},
    {k:'payment_method',label:'收款方式',type:'text'},
    {k:'invoice_no',label:'发票号',type:'text'},
    {k:'notes',label:'备注',type:'textarea'}
  ]}
};
function openBiddingForm(id){wfOpenModuleForm('bidding',id)}
function openProjectContractForm(id){wfOpenModuleForm('contract',id)}
function openDeliveryForm(id){wfOpenModuleForm('delivery',id)}
function wfOpenPaymentForm(id){wfOpenModuleForm('payment',id)}

function wfOpenModuleForm(kind,id){
  if(!curProjectId){showToast('请先打开一个项目');return}
  var def=WF_MODULE_DEFS[kind];if(!def){showToast('未知模块');return}
  var rec=null;
  if(id){
    var arr=kind==='bidding'?allBiddings:kind==='contract'?allContracts:kind==='delivery'?allDeliveries:allPayments;
    rec=(arr||[]).find(function(x){return String(x.id)===String(id)});
    if(!rec){showToast('记录未加载，请重试');return}
  }
  _wfModKind=kind;_wfModEditId=id||null;
  var inp='display:block;width:100%;padding:9px 11px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--bg);color:var(--text)';
  var body='';
  for(var i=0;i<def.fields.length;i++){
    var f=def.fields[i];
    var v=rec?(rec[f.k]==null?'':rec[f.k]):(f.def!=null?f.def:'');
    body+='<div style="margin-bottom:10px"><label style="display:block;font-size:12px;font-weight:600;color:var(--text2);margin-bottom:4px">'+h(f.label)+(f.required?' <span style="color:#ef4444">*</span>':'')+'</label>';
    if(f.type==='textarea'){
      body+='<textarea id="wfmm-'+f.k+'" rows="3" placeholder="'+h(f.ph||'')+'" style="'+inp+';resize:vertical">'+h(v)+'</textarea>';
    }else if(f.type==='select'){
      body+='<select id="wfmm-'+f.k+'" style="'+inp+'">';
      for(var j=0;j<f.opts.length;j++)body+='<option value="'+h(f.opts[j][0])+'"'+(String(v)===String(f.opts[j][0])?' selected':'')+'>'+h(f.opts[j][1])+'</option>';
      body+='</select>';
    }else if(f.type==='checkbox'){
      body+='<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="wfmm-'+f.k+'"'+(v===true||v==='true'?' checked':'')+'> 是</label>';
    }else{
      var it=f.type==='number'?'number':f.type==='date'?'date':'text';
      body+='<input id="wfmm-'+f.k+'" type="'+it+'"'+(f.type==='number'?' step="0.01"':'')+' placeholder="'+h(f.ph||'')+'" value="'+h(v)+'" style="'+inp+'">';
    }
    body+='</div>';
  }
  var old=document.getElementById('wf-module-modal');if(old)old.remove();
  var wrap=document.createElement('div');
  wrap.id='wf-module-modal';wrap.className='modal-overlay';
  wrap.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:3000;display:flex;align-items:center;justify-content:center;padding:16px';
  wrap.innerHTML='<div style="width:100%;max-width:520px;max-height:88vh;overflow-y:auto;background:var(--card);border-radius:14px;box-shadow:var(--shadow-xl)">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--border)"><span style="font-size:15px;font-weight:600">'+(id?'编辑':'新建')+h(def.label)+'</span><button onclick="wfCloseModuleForm()" style="background:none;border:none;font-size:20px;line-height:1;cursor:pointer;color:var(--text2)">&times;</button></div>'
    +'<div style="padding:16px 18px">'+body
    +'<div id="wfmm-err" style="display:none;color:#ef4444;font-size:12px;margin-bottom:8px"></div>'
    +'<div style="display:flex;gap:8px;margin-top:6px">'
    +(id?'<button onclick="wfDeleteModuleRecord()" style="padding:11px 14px;border-radius:9px;border:1px solid var(--danger);background:var(--bg);color:var(--danger);font-size:14px;cursor:pointer">删除</button>':'')
    +'<button onclick="wfCloseModuleForm()" style="flex:1;padding:11px;border-radius:9px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:14px;cursor:pointer">取消</button>'
    +'<button onclick="wfSaveModuleForm()" style="flex:2;padding:11px;border-radius:9px;border:none;background:var(--primary);color:#fff;font-size:14px;font-weight:600;cursor:pointer">保存</button>'
    +'</div></div></div>';
  wrap.addEventListener('click',function(e){if(e.target===wrap)wfCloseModuleForm()});
  document.body.appendChild(wrap);
}
function wfCloseModuleForm(){var m=document.getElementById('wf-module-modal');if(m)m.remove()}
function wfReloadModule(kind){
  if(kind==='bidding')return loadBiddings();
  if(kind==='contract')return loadProjectContracts();
  if(kind==='delivery')return loadDeliveries();
  return loadProjectPayments();
}
async function wfSaveModuleForm(){
  var def=WF_MODULE_DEFS[_wfModKind];if(!def)return;
  var errEl=document.getElementById('wfmm-err');
  function fail(m){if(errEl){errEl.textContent=m;errEl.style.display='block'}showToast(m)}
  var payload={};
  for(var i=0;i<def.fields.length;i++){
    var f=def.fields[i];
    var el=document.getElementById('wfmm-'+f.k);if(!el)continue;
    var v=f.type==='checkbox'?!!el.checked:(el.value||'').trim();
    if(f.required&&(v===''||v===null)){if(errEl){errEl.textContent='请填写「'+f.label+'」';errEl.style.display='block'}el.focus();return}
    if(f.type==='number')v=v===''?0:parseFloat(v);
    else if(v==='')v=null;
    payload[f.k]=v;
  }
  if(errEl)errEl.style.display='none';
  if(_wfModEditId){
    var r=await sb.from(def.table).update(payload).eq('id',_wfModEditId);
    if(r.error){fail('保存失败: '+r.error.message);return}
  }else{
    payload.project_id=curProjectId;
    if(_wfModKind==='contract')payload.company_id=currentCompanyId;
    var r2=await sb.from(def.table).insert(payload);
    if(r2.error){fail('保存失败: '+r2.error.message);return}
  }
  var wasEdit=!!_wfModEditId;
  wfCloseModuleForm();
  showToast(wasEdit?'已更新':'已创建');
  await wfReloadModule(_wfModKind);
}
async function wfDeleteModuleRecord(){
  var def=WF_MODULE_DEFS[_wfModKind];if(!def||!_wfModEditId)return;
  if(!await uiConfirm('确定删除这条'+def.label+'记录？'))return;
  var r=await sb.from(def.table).delete().eq('id',_wfModEditId);
  if(r.error){showToast('删除失败: '+r.error.message);return}
  wfCloseModuleForm();showToast('已删除');
  await wfReloadModule(_wfModKind);
}
async function wfDeleteStage(id){if(await uiConfirm('确定删除？')){sb.from('project_stages').delete().eq('id',id).then(function(r){if(!r.error){loadStages();showToast('已删除')}else showToast(r.error.message)})}}
async function saveProject(){
  var name=document.getElementById('pf-name').value.trim();
  if(!name){showToast('请输入商机名称');return}
  var conList=[];
  for(var ci=0;ci<pfContactsData.length;ci++){
    var ct=pfContactsData[ci];
    if(ct.name||ct.phone)conList.push({name:ct.name||'',title:ct.title||'',phone:ct.phone||'',email:ct.email||''});
  }
  var proj={
    name:name,
    lead_id:document.getElementById('pf-lead-id').value.trim()||null,
    customer_type:document.getElementById('pf-customer-type').value,
    industry:document.getElementById('pf-industry').value,
    company_name:document.getElementById('pf-company-name').value.trim(),
    credit_code:document.getElementById('pf-credit-code').value.trim(),
    contact_name:conList.length>0?conList.map(function(x){return x.name}).join(', '):'',
    contact_title:conList.length>0?conList.map(function(x){return x.title}).join(', '):'',
    contact_phone:conList.length>0?JSON.stringify(conList.map(function(x){return x.phone})):'[]',
    contacts_json:conList.length>0?JSON.stringify(conList):null,
    address:document.getElementById('pf-address').value.trim(),
    assigned_sales:document.getElementById('pf-assigned-sales').value.trim(),
    co_sales:document.getElementById('pf-co-sales').value.trim(),
    budget:parseFloat(document.getElementById('pf-budget').value)||null,
    status:document.getElementById('pjf-status').value,
    conclusion:document.getElementById('pf-conclusion').value,
    status:document.getElementById('pf-conclusion').value==='rejected'?'suspended':document.getElementById('pjf-status').value,
    notes:document.getElementById('pjf-notes').value.trim(),
    updated_at:new Date().toISOString()
  };
  if(!oppEditId){
    proj.company_id=currentCompanyId;
    proj.created_by=currentUser.id;
    // Auto-generate bus_id: BUS+YYYYMMDD+3-digit seq
    var today=new Date();
    var yyyy=today.getFullYear(),mm=String(today.getMonth()+1).padStart(2,'0'),dd=String(today.getDate()).padStart(2,'0');
    var datePrefix='BUS'+yyyy+mm+dd;
    try{var {data:cnt}=await sb.from('projects').select('bus_id',{count:'exact',head:true}).like('bus_id',datePrefix+'%');var seq=(cnt||0)+1;proj.bus_id=datePrefix+String(seq).padStart(3,'0');}catch(e){proj.bus_id=datePrefix+'001';}
    proj.workflow='{}';proj.current_step=1;proj.template_id=document.getElementById('pf-template-id')?(parseInt(document.getElementById('pf-template-id').value)||null):null;
    // Initialize workflow_state from template
    if(proj.template_id){
      var tmplSteps=getTemplateSteps(proj.template_id);
      var wfStateInit={};
      for(var wsi=0;wsi<tmplSteps.length;wsi++){
        var wfSeq=tmplSteps[wsi].seq;
        wfStateInit[wfSeq]={status:wfSeq===1?'active':'pending',assignedTo:null,approvedBy:null,approvedAt:null};
      }
      proj.workflow_state=JSON.stringify(wfStateInit);
    }
    var {error}=await sb.from('projects').insert(proj);
    if(error){showToast('创建失败: '+error.message);return}
  }else{
    var {error}=await sb.from('projects').update(proj).eq('id',oppEditId);
    if(error){showToast('更新失败: '+error.message);return}
  }
  var _leadId = oppLeadId;
  closeOppForm();
  await loadProjects();
  // If created from lead, mark lead as converted
  if(_leadId&&!oppEditId){
    try{await sb.from('lead_pool').update({opportunity_id:proj.bus_id,status:'converted'}).eq('id',_leadId);dbg('[saveProject] lead',_leadId,'converted')}catch(e){console.error('[saveProject] lead convert error',e)}
  }
  await loadLeads();
  showToast(oppEditId?'已更新':'已创建商机');
}

var pfContactsData=[];

function addPfContact(){pfContactsData.push({name:'',title:'',phone:'',email:''});renderPfContacts();}
function rmPfContact(idx){pfContactsData.splice(idx,1);renderPfContacts();}
function upPfContact(idx,field,val){pfContactsData[idx][field]=val;}
function renderPfContacts(){
  var el=document.getElementById('pf-contacts-container');
  if(!el)return;
  if(!pfContactsData.length){el.innerHTML='<div style="font-size:12px;color:var(--text3);padding:4px 0">暂无联系人</div>';return}
  var h='';
  for(var ci=0;ci<pfContactsData.length;ci++){
    var ct=pfContactsData[ci];
    h+='<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap">';
    h+='<input value="'+escHtml(ct.name||'')+'" oninput="upPfContact('+ci+',\'name\',this.value)" placeholder="姓名" style="flex:1;min-width:80px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px">';
    h+='<select onchange="upPfContact('+ci+',\'title\',this.value)" style="min-width:80px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px"><option value="">职位</option><option value="采购"'+(ct.title==='采购'?' selected':'')+'>采购</option><option value="总经理"'+(ct.title==='总经理'?' selected':'')+'>总经理</option><option value="技术负责人"'+(ct.title==='技术负责人'?' selected':'')+'>技术负责人</option><option value="行政"'+(ct.title==='行政'?' selected':'')+'>行政</option><option value="IT"'+(ct.title==='IT'?' selected':'')+'>IT</option><option value="财务"'+(ct.title==='财务'?' selected':'')+'>财务</option><option value="其他"'+(ct.title==='其他'?' selected':'')+'>其他</option></select>';
    h+='<input value="'+escHtml(ct.phone||'')+'" oninput="upPfContact('+ci+',\'phone\',this.value)" placeholder="电话" style="flex:1;min-width:100px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px">';
    h+='<button type="button" onclick="rmPfContact('+ci+')" style="padding:4px 8px;background:var(--danger);color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer">✕</button>';
    h+='</div>';
  }
  el.innerHTML=h;
}

var _leadProjectCache=[];
var oppEditId=null,oppLeadId=null;

async function deleteOpp(){
  if(!oppEditId||!await uiConfirm('确定删除该商机?'))return;
  var {error}=await sb.from('projects').delete().eq('id',oppEditId);
  if(error){showToast(error.message);return}
  closeOppForm();
  await loadProjects();
  showToast('已删除');
}
// saveStage removed (duplicate empty stub overrides real impl at L9273)
// saveBidding / saveDelivery / saveProjectContract 的旧空壳已移除 —— 统一走 wfSaveModuleForm()
async function deleteBidding(id){if(await uiConfirm('确定删除？')){var {error}=await sb.from('project_biddings').delete().eq('id',id);if(error){showToast(error.message);return}loadBiddings();showToast('已删除')}}
async function deleteDelivery(id){if(await uiConfirm('确定删除？')){var {error}=await sb.from('project_deliveries').delete().eq('id',id);if(error){showToast(error.message);return}loadDeliveries();showToast('已删除')}}
async function deletePayment(id){if(await uiConfirm('确定删除？')){var {error}=await sb.from('project_payments').delete().eq('id',id);if(error){showToast(error.message);return}loadProjectPayments();showToast('已删除')}}

// ===== My Office =====
var _moCurrentTab='overview';
function switchMyOfficeTab(tab){
  // Legacy stub - tabs merged into collab-view
  switchCollabTab(tab==='overview'?'mo-overview':tab==='docs'?'mo-docs':tab);
}async function renderMyOfficeOverview(){
  var el=document.getElementById('mo-overview-content');
  if(!currentCompanyId){el.innerHTML='<div class="empty">请先选择公司</div>';return}
  var myName=currentUser&&currentUser.display_name?currentUser.display_name:(currentUser&&currentUser.email?currentUser.email:'同事');
  var today=new Date();
  var dateStr=today.getFullYear()+'年'+(today.getMonth()+1)+'月'+today.getDate()+'日';
  var weekDays=['日','一','二','三','四','五','六'];
  var weekDay=weekDays[today.getDay()];
  var hour=today.getHours();
  var greet=hour<9?'早上好':hour<12?'上午好':hour<14?'中午好':hour<18?'下午好':'晚上好';
  
  var h='';
  h+='<div class="mo-greeting">'+greet+'，'+escHtml(myName)+' 👋</div>';
  h+='<div class="mo-date">📅 '+dateStr+' 星期'+weekDay+'</div>';
  
  // Quick actions
  h+='<div class="mo-quick-actions">';
  h+='<div class="mo-quick-btn" onclick="switchMyOfficeTab(\'todo\');openMoTaskForm()"><span class="icon">✅</span>新建任务</div>';
  h+='<div class="mo-quick-btn" onclick="switchMyOfficeTab(\'approvals\');openMoApprovalForm()"><span class="icon">📋</span>发起审批</div>';
  h+='<div class="mo-quick-btn" onclick="switchMyOfficeTab(\'docs\');openMoDocForm()"><span class="icon">📄</span>写文档</div>';
  h+='<div class="mo-quick-btn" onclick="switchTab(\'collab\');setTimeout(function(){switchCollabTab(\'schedule\')},200)"><span class="icon">📅</span>查看日程</div>';
  h+='</div>';
  
  // Stats row
  h+='<div class="mo-overview-grid" style="margin-bottom:12px">';
  h+='<div class="mo-stat-card" onclick="switchMyOfficeTab(\'todo\')"><div class="num" id="mo-stat-todo">-</div><div class="label">待办任务</div></div>';
  h+='<div class="mo-stat-card" onclick="switchMyOfficeTab(\'approvals\')"><div class="num" id="mo-stat-pending-approvals">-</div><div class="label">待处理审批</div></div>';
  h+='<div class="mo-stat-card" onclick="switchMyOfficeTab(\'messages\')"><div class="num" id="mo-stat-unread">-</div><div class="label">未读消息</div></div>';
  h+='<div class="mo-stat-card" onclick="switchMyOfficeTab(\'todo\')"><div class="num" id="mo-stat-overdue">-</div><div class="label">已逾期</div></div>';
  h+='</div>';
  
  // Today's todos summary + schedules
  h+='<div class="mo-overview-grid" style="margin-bottom:12px">';
  h+='<div class="mo-section"><div class="mo-section-title">📝 今日待办 (前5条)</div><div id="mo-overview-todos">加载中...</div></div>';
  h+='<div class="mo-section"><div class="mo-section-title">📅 日程安排</div><div id="mo-overview-schedules">加载中...</div></div>';
  h+='</div>';
  
  // Announcements
  h+='<div class="mo-section"><div class="mo-section-title">📢 公司公告</div><div id="mo-overview-announcements">加载中...</div></div>';
  
  el.innerHTML=h;
  
  // Load data
  if(typeof loadTasks!=='undefined'){
    var {data:tasks}=await sb.from('tasks').select('*').eq('company_id',currentCompanyId).in('status',['todo','in_progress']).order('due_date',{ascending:true,nullsFirst:false});
    var {data:approvals}=await sb.from('approval_requests').select('*').eq('company_id',currentCompanyId).eq('status','pending').order('created_at',{ascending:false});
    var pendingCount=0;
    if(approvals)for(var a=0;a<approvals.length;a++){if(approvals[a].requestor_id!==currentUser.id)pendingCount++;}
    // Get unread messages count from dept_messages
    var unreadCount=0;
    try{var {count:uc}=await sb.from('dept_messages').select('*',{count:'exact',head:true}).eq('company_id',currentCompanyId).order('created_at',{ascending:false}).limit(1);/* we count recent messages as "unread" if they exist */if(uc>0)unreadCount=1;}catch(e){}
    
    document.getElementById('mo-stat-todo').textContent=tasks?tasks.length:0;
    document.getElementById('mo-stat-pending-approvals').textContent=pendingCount;
    document.getElementById('mo-stat-unread').textContent=unreadCount;
    
    var overdueCount=0;
    var todayStr=today.toISOString().slice(0,10);
    if(tasks){for(var t=0;t<tasks.length;t++){if(tasks[t].due_date&&tasks[t].due_date<todayStr)overdueCount++;}}
    document.getElementById('mo-stat-overdue').textContent=overdueCount;
    
    // Render top 5 tasks
    var todoHtml='';
    if(tasks&&tasks.length){
      var top5=tasks.slice(0,5);
      for(var i=0;i<top5.length;i++){
        var tk=top5[i];
        var prio=tk.priority||'normal';
        var overdue=tk.due_date&&tk.due_date<todayStr;
        todoHtml+='<div class="mo-task-item priority-'+prio+'">';
        todoHtml+='<div class="mo-task-title">'+escHtml(tk.title)+'</div>';
        todoHtml+='<div class="mo-task-meta">';
        if(tk.due_date)todoHtml+='<span style="color:'+(overdue?'var(--danger)':'var(--text2)')+'">📅 '+tk.due_date+(overdue?' ⚠️':'')+'</span>';
        todoHtml+='<span>'+({todo:'待办',in_progress:'进行中'}[tk.status]||tk.status)+'</span>';
        todoHtml+='</div></div>';
      }
    }else{todoHtml='<div style="color:var(--text3);font-size:13px;padding:8px 0">暂无待办 ✅</div>'}
    document.getElementById('mo-overview-todos').innerHTML=todoHtml;
  }
  
  // Load schedules for today + tomorrow
  try{
    var todayISO=today.toISOString().slice(0,10);
    var tomorrow=new Date(today);tomorrow.setDate(today.getDate()+1);
    var tomorrowISO=tomorrow.toISOString().slice(0,10);
    var {data:schedules}=await sb.from('schedules').select('*').eq('company_id',currentCompanyId).gte('start_time',todayISO).lte('start_time',tomorrowISO+'T23:59:59Z').order('start_time');
    var schHtml='';
    if(schedules&&schedules.length){
      for(var s=0;s<schedules.length;s++){
        var sc=schedules[s];
        var st=new Date(sc.start_time);
        var timeStr=sc.all_day?'全天':st.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
        schHtml+='<div class="mo-timeline-item">';
        schHtml+='<div class="mo-tl-dot"></div>';
        schHtml+='<div class="mo-tl-time">'+timeStr+'</div>';
        schHtml+='<div class="mo-tl-content">'+escHtml(sc.title)+(sc.location?' 📍'+escHtml(sc.location):'')+'</div>';
        schHtml+='</div>';
      }
    }else{schHtml='<div style="color:var(--text3);font-size:13px;padding:8px 0">暂无日程</div>'}
    document.getElementById('mo-overview-schedules').innerHTML=schHtml;
  }catch(e){document.getElementById('mo-overview-schedules').innerHTML='<div style="color:var(--text3);font-size:13px">加载失败</div>'}
  
  // Load announcements
  try{
    var {data:anns}=await sb.from('announcements').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false}).limit(3);
    var annHtml='';
    if(anns&&anns.length){
      for(var an=0;an<anns.length;an++){
        var ann=anns[an];
        annHtml+='<div class="mo-announcement'+(ann.priority==='urgent'?' urgent':'')+'">';
        annHtml+='<div class="mo-ann-title">'+escHtml(ann.title)+'</div>';
        annHtml+='<div class="mo-ann-meta">'+new Date(ann.created_at).toLocaleDateString('zh-CN')+' · '+(ann.priority==='urgent'?'🔥 紧急':ann.priority==='normal'?'普通':'低')+'</div>';
        annHtml+='<div class="mo-ann-body">'+(ann.content.length>80?escHtml(ann.content.slice(0,80))+'...':escHtml(ann.content))+'</div>';
        annHtml+='</div>';
      }
    }else{annHtml='<div style="color:var(--text3);font-size:13px;padding:8px 0">暂无公告</div>'}
    document.getElementById('mo-overview-announcements').innerHTML=annHtml;
  }catch(e){document.getElementById('mo-overview-announcements').innerHTML='<div style="color:var(--text3);font-size:13px">暂未开放</div>'}
}

/* ===== Todo Panel ===== */
var _moTaskFilter='all';
async function renderMyOfficeTodo(filter){
  // My todos now handled by collab task panel
  switchCollabTab("task");
}function openMoTaskForm(id){
  var t=id?allTasks.find(function(x){return x.id===id}):null;
  var h='<div class="modal-overlay" id="mo-task-modal"><div class="modal-sheet"><h3>'+(t?'编辑任务':'新建任务')+'</h3>';
  h+='<div class="form-group"><label>标题 *</label><input id="mo-ta-title" value="'+(t?escAttr(t.title):'')+'"></div>';
  h+='<div class="form-group"><label>描述</label><textarea id="mo-ta-desc" rows="2">'+(t?escHtml(t.description||''):'')+'</textarea></div>';
  h+='<div class="form-row"><div class="form-group"><label>优先级</label><select id="mo-ta-priority"><option value="urgent"'+(t&&t.priority==='urgent'?' selected':'')+'>紧急</option><option value="high"'+(t&&t.priority==='high'?' selected':'')+'>高</option><option value="normal"'+(t&&t.priority==='normal'?' selected':'')+'>普通</option><option value="low"'+(t&&t.priority==='low'?' selected':'')+'>低</option></select></div><div class="form-group"><label>截止日期</label><input type="date" id="mo-ta-due" value="'+(t&&t.due_date?t.due_date:'')+'"></div></div>';
  h+='<div class="form-row"><div class="form-group"><label>状态</label><select id="mo-ta-status"><option value="todo"'+(t&&t.status==='todo'?' selected':'')+'>待办</option><option value="in_progress"'+(t&&t.status==='in_progress'?' selected':'')+'>进行中</option><option value="done"'+(t&&t.status==='done'?' selected':'')+'>已完成</option></select></div></div>';
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest(\'.modal-overlay\').remove()">取消</button><button class="btn-save" onclick="saveMoTask(\''+(t?t.id:'')+'\')">保存</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',h);
}

async function saveMoTask(id){
  var title=document.getElementById('mo-ta-title').value.trim();
  if(!title){showToast('请输入标题');return}
  var desc=document.getElementById('mo-ta-desc').value.trim();
  var priority=document.getElementById('mo-ta-priority').value;
  var due=document.getElementById('mo-ta-due').value||null;
  var status=document.getElementById('mo-ta-status').value;
  var obj={title:title,description:desc||null,priority:priority,due_date:due,status:status,assigned_to:currentUser.id,assigned_by:currentUser.id,company_id:currentCompanyId};
  if(status==='done')obj.completed_at=new Date().toISOString();
  var err;
  if(id){var r=await sb.from('tasks').update(obj).eq('id',id);err=r.error}
  else{var r2=await sb.from('tasks').insert(obj);err=r2.error}
  var modalEl=document.getElementById('mo-task-modal');if(modalEl)modalEl.remove();
  if(err){showToast('保存失败: '+err.message);return}
  renderMyOfficeTodo(_moTaskFilter||'all');showToast('已保存');
  if(_moCurrentTab==='overview')renderMyOfficeOverview();
}

async function toggleMoTaskDone(taskId,cb){
  var newStatus=cb.checked?'done':'todo';
  var obj={status:newStatus};
  if(newStatus==='done')obj.completed_at=new Date().toISOString();
  else obj.completed_at=null;
  var {error}=await sb.from('tasks').update(obj).eq('id',taskId);
  if(error){showToast('操作失败: '+error.message);cb.checked=!cb.checked;return}
  showToast(cb.checked?'已完成':'已恢复待办');
  if(_moCurrentTab==='overview')renderMyOfficeOverview();
  else renderMyOfficeTodo(_moTaskFilter||'all');
}

async function deleteMoTask(id){
  if(!await uiConfirm('确定删除该任务?'))return;
  await sb.from('tasks').delete().eq('id',id);
  renderMyOfficeTodo(_moTaskFilter||'all');showToast('已删除');
  if(_moCurrentTab==='overview')renderMyOfficeOverview();
}

/* ===== Approvals Panel ===== */
async function renderMyOfficeApprovals(){
  // My approvals now handled by collab approval panel
  dbg("renderMyOfficeApprovals: redirecting to collab approval tab");
  switchCollabTab("approval");
}function openMoApprovalForm(){
  var types=['报价审批','合同审批','折扣审批','出差申请','报销申请','客户转移','投标材料审批','公章使用申请','项目立项审批','交付验收审批','自定义'];
  var h='<div class="modal-overlay" id="mo-approval-modal"><div class="modal-sheet"><h3>发起审批</h3>';
  h+='<div class="form-group"><label>审批类型</label><select id="mo-ap-type">';
  for(var i=0;i<types.length;i++)h+='<option value="'+types[i]+'">'+types[i]+'</option>';
  h+='</select></div>';
  h+='<div class="form-group"><label>标题 *</label><input id="mo-ap-title" placeholder="审批标题"></div>';
  h+='<div class="form-group"><label>内容说明</label><textarea id="mo-ap-content" rows="3" placeholder="请输入审批内容和理由..."></textarea></div>';
  h+='<div class="form-group"><label>审批人</label><select id="mo-ap-approver"><option value="">任意审批人</option>'+(()=>{var o='';for(var k=0;k<allUsers.length;k++){var uu=allUsers[k];if(uu.user_id!==currentUser.id)o+='<option value="'+uu.user_id+'">'+(uu.display_name||uu.email||uu.user_id)+'</option>'}return o})()+'</select></div>';
  h+='<div class="form-group"><label>紧急程度</label><select id="mo-ap-urgency"><option value="normal">普通</option><option value="urgent">紧急</option></select></div>';
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest(\'.modal-overlay\').remove()">取消</button><button class="btn-save" onclick="saveMoApproval()">提交</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',h);
}

async function saveMoApproval(){
  var type=document.getElementById('mo-ap-type').value;
  var title=document.getElementById('mo-ap-title').value.trim();
  var content=document.getElementById('mo-ap-content').value.trim();
  if(!title){showToast('请输入标题');return}
  var approver=document.getElementById('mo-ap-approver').value||null;
  var priority=document.getElementById('mo-ap-urgency').value;
  var {error}=await sb.from('approval_requests').insert({company_id:currentCompanyId,requestor_id:currentUser.id,title:title,type:type,content:{detail:content||'',priority:priority},status:'pending',total_steps:1});
  var modalEl=document.getElementById('mo-approval-modal');if(modalEl)modalEl.remove();
  if(error){showToast('提交失败: '+error.message);return}
  renderMyOfficeApprovals();showToast('已提交');
}

async function moApproveRequest(id,action){
  var remark=await uiPrompt(action==='approved'?'通过备注 (可选):':'驳回原因:');
  var newStatus=action==='approved'?'approved':'rejected';
  var {error}=await sb.from('approval_requests').update({status:newStatus,updated_at:new Date().toISOString()}).eq('id',id);
  if(error){showToast('操作失败: '+error.message);return}
  try{await sb.from('approval_actions').insert({company_id:currentCompanyId,request_id:id,approver_id:currentUser.id,action:action,step:1,remark:remark||null})}catch(e){}
  renderMyOfficeApprovals();showToast(action==='approved'?'已通过':'已驳回');
  if(_moCurrentTab==='overview')renderMyOfficeOverview();
}

/* ===== Messages Panel ===== */
async function loadMoMessages(){
  // Messages now handled by collab msg panel
  switchCollabTab("msg");
}async function sendMoMessage(){
  var input=document.getElementById('mo-msg-input');
  var content=input.value.trim();
  if(!content){showToast('请输入消息');return}
  if(!currentCompanyId){showToast('请先选择公司');return}
  var deptFilter=document.getElementById('mo-msg-dept-filter').value;
  var {error}=await sb.from('dept_messages').insert({company_id:currentCompanyId,sender_id:currentUser.id,content:content,dept_id:deptFilter||null,created_at:new Date().toISOString()});
  if(error){showToast('发送失败: '+error.message);return}
  input.value='';
  loadMoMessages();
}

async function loadMoAnnouncements(){
  var el=document.getElementById('mo-announcements-list');
  if(!currentCompanyId){el.innerHTML='<div class="empty">请先选择公司</div>';return}
  var {data}=await sb.from('announcements').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false}).limit(10);
  if(!data||!data.length){el.innerHTML='<div style="color:var(--text3);font-size:13px;padding:8px 0">暂无公告</div>';return}
  var h='';
  for(var i=0;i<data.length;i++){
    var ann=data[i];
    h+='<div class="mo-announcement'+(ann.priority==='urgent'?' urgent':'')+'">';
    h+='<div class="mo-ann-title">'+escHtml(ann.title)+'</div>';
    h+='<div class="mo-ann-meta">'+new Date(ann.created_at).toLocaleDateString('zh-CN')+' · '+(ann.priority==='urgent'?'🔥 紧急':ann.priority==='normal'?'普通':'低')+'</div>';
    h+='<div class="mo-ann-body">'+escHtml(ann.content)+'</div>';
    h+='</div>';
  }
  el.innerHTML=h;
}

/* ===== Docs Panel ===== */
var _moDocFilter='all';
async function renderMyOfficeDocs(filter){
  _moDocFilter=filter;
  var el=document.getElementById('mo-docs-list');
  if(!currentCompanyId){el.innerHTML='<div class="empty">请先选择公司</div>';return}
  var fb=document.querySelectorAll('#mo-doc-filters button');
  for(var i=0;i<fb.length;i++){fb[i].classList.remove('active');if(fb[i].getAttribute('data-cat')===filter)fb[i].classList.add('active')}
  var q=sb.from('my_documents').select('*').eq('user_id',currentUser.id).order('is_pinned',{ascending:false}).order('updated_at',{ascending:false});
  if(filter!=='all')q=q.eq('category',filter);
  var {data}=await q;
  if(!data||!data.length){el.innerHTML='<div class="empty" style="padding:20px">暂无文档</div>';return}
  var h='';
  for(var i=0;i<data.length;i++){
    var d=data[i];
    var tagsHtml='';
    if(d.tags&&d.tags.length){for(var t=0;t<d.tags.length;t++)tagsHtml+='<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:var(--primary-light);color:var(--primary);margin-right:4px">'+escHtml(d.tags[t])+'</span>'}
    h+='<div class="mo-doc-card'+(d.is_pinned?' pinned':'')+'">';
    h+='<div class="title">'+(d.is_pinned?'📌 ':'')+escHtml(d.title)+'</div>';
    if(d.content)h+='<div style="font-size:12px;color:var(--text2);margin:6px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(d.content.length>100?escHtml(d.content.slice(0,100))+'...':escHtml(d.content))+'</div>';
    h+='<div class="meta">';
    h+='<span>📁 '+escHtml(d.category||'general')+'</span>';
    h+='<span>🕐 '+new Date(d.updated_at).toLocaleDateString('zh-CN')+'</span>';
    if(tagsHtml)h+=tagsHtml;
    h+='</div>';
    h+='<div class="actions">';
    if(d.file_url)h+='<a href="'+escAttr(d.file_url)+'" target="_blank" class="btn-sm" style="font-size:11px;padding:2px 8px;text-decoration:none;display:inline-block">📎 '+(escHtml(d.file_name||d.file_url.split('/').pop()||'文件'))+'</a>';
    h+='<button class="btn-sm" style="font-size:11px;padding:2px 8px" onclick="openMoDocForm(\''+d.id+'\')">编辑</button>';
    h+='<button class="btn-sm" style="font-size:11px;padding:2px 8px;color:var(--danger)" onclick="deleteMoDoc(\''+d.id+'\')">删除</button>';
    h+='</div></div>';
  }
  el.innerHTML=h;
}

function openMoDocForm(id){
  var d=id?allMyDocs.find(function(x){return x.id===id}):null;
  var h='<div class="modal-overlay" id="mo-doc-modal"><div class="modal-sheet"><h3>'+(d?'编辑文档':'新建文档')+'</h3>';
  h+='<div class="form-group"><label>标题 *</label><input id="mo-doc-title" value="'+(d?escAttr(d.title):'')+'"></div>';
  h+='<div class="form-group"><label>内容</label><textarea id="mo-doc-content" rows="5" placeholder="文档内容...">'+(d?escHtml(d.content||''):'')+'</textarea></div>';
  h+='<div class="form-row"><div class="form-group"><label>分类</label><select id="mo-doc-category"><option value="general"'+(d&&d.category==='general'?' selected':'')+'>通用</option><option value="work"'+(d&&d.category==='work'?' selected':'')+'>工作</option><option value="template"'+(d&&d.category==='template'?' selected':'')+'>模板</option><option value="personal"'+(d&&d.category==='personal'?' selected':'')+'>个人</option></select></div><div class="form-group"><label>附件</label><input type="file" id="mo-doc-file" style="padding:6px;display:block;width:100%;font-size:13px;border:1px solid var(--border);border-radius:6px">'+(d&&d.file_url?'<div style="font-size:11px;color:var(--text2);margin-top:4px">当前: '+escHtml(d.file_url.split('/').pop()||d.file_name||d.file_url)+'</div>':'')+'</div></div>';
  h+='<div class="form-group"><label>标签 (逗号分隔)</label><input id="mo-doc-tags" value="'+(d&&d.tags?d.tags.join(','):'')+'" placeholder="如: 合同, 模板"></div>';
  h+='<div class="form-group"><label><input type="checkbox" id="mo-doc-pinned" '+(d&&d.is_pinned?'checked':'')+'> 置顶</label></div>';
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest(\'.modal-overlay\').remove()">取消</button><button class="btn-save" onclick="saveMoDoc(\''+(d?d.id:'')+'\')">保存</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',h);
}

async function saveMoDoc(id){
  var title=document.getElementById('mo-doc-title').value.trim();
  if(!title){showToast('请输入标题');return}
  var content=document.getElementById('mo-doc-content').value.trim();
  var category=document.getElementById('mo-doc-category').value;
  var tagsRaw=document.getElementById('mo-doc-tags').value.trim();
  var tags=tagsRaw?tagsRaw.split(',').map(function(s){return s.trim()}).filter(Boolean):[];
  var isPinned=document.getElementById('mo-doc-pinned').checked;
  // File upload
  var fileInput=document.getElementById('mo-doc-file');
  var fileUrl=null;var fileName=null;
  if(fileInput&&fileInput.files&&fileInput.files[0]){
    var f=fileInput.files[0];
    var bucket='mo-documents';
    var filePath=currentUser.id+'/'+Date.now()+'_'+f.name.replace(/[^a-zA-Z0-9._-]/g,'_');
    try{
      var upRes=await sb.storage.from(bucket).upload(filePath,f,{cacheControl:'3600',upsert:false});
      if(upRes.error){showToast('文件上传失败: '+upRes.error.message);return}
      var urlRes=sb.storage.from(bucket).getPublicUrl(filePath);
      fileUrl=urlRes.data.publicUrl;
      fileName=f.name;
    }catch(e){showToast('文件上传异常: '+e.message);return}
  }
  var obj={title:title,content:content||null,category:category,file_url:fileUrl,tags:tags.length?tags:null,is_pinned:isPinned,updated_at:new Date().toISOString()};
  if(fileName)obj.file_name=fileName;
  var err;
  if(id){var r=await sb.from('my_documents').update(obj).eq('id',id);err=r.error}
  else{obj.user_id=currentUser.id;obj.company_id=currentCompanyId;var r2=await sb.from('my_documents').insert(obj);err=r2.error}
  var modalEl=document.getElementById('mo-doc-modal');if(modalEl)modalEl.remove();
  if(err){showToast('保存失败: '+err.message);return}
  renderMyOfficeDocs(_moDocFilter||'all');showToast('已保存');
}

async function deleteMoDoc(id){
  if(!await uiConfirm('确定删除该文档?'))return;
  var _delErr=(await sb.from('my_documents').delete().eq('id',id)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
  renderMyOfficeDocs(_moDocFilter||'all');showToast('已删除');
}

var allMyDocs=[];

// ═══════════════════════════════════════════
//  Analytics Module — 经营分析
// ═══════════════════════════════════════════
var _anCurrentTab='overview';

function switchAnalyticsTab(tab){
  dbg('[Analytics] switching to',tab);
  _anCurrentTab=tab;
  var btns=document.querySelectorAll('.analytics-tabs button');
  for(var i=0;i<btns.length;i++)btns[i].classList.remove('active');
  var panels=document.querySelectorAll('.an-panel');
  for(var j=0;j<panels.length;j++)panels[j].classList.add('hidden');
  var panel=document.getElementById('an-'+tab);
  if(panel)panel.classList.remove('hidden');
  for(var k=0;k<btns.length;k++){
    if(btns[k].getAttribute('onclick')&&btns[k].getAttribute('onclick').indexOf("'"+tab+"'")>=0){
      btns[k].classList.add('active');
    }
  }
  _destroyAllCharts();
  switch(tab){
    case 'overview':renderAnalyticsOverview();checkBirthdayReminders();loadDashReminders();break;
    case 'sales-funnel':renderAnSalesFunnel();break;
    case 'collection':renderCollectionAnalysis();break;
    case 'profit':renderProfitAnalysis();break;
    case 'client-health':renderClientHealth();break;
  }
}

function _getThisMonth(){
  var d=new Date();
  return{year:d.getFullYear(),month:d.getMonth()+1,
    start:new Date(d.getFullYear(),d.getMonth(),1).toISOString(),
    end:new Date(d.getFullYear(),d.getMonth()+1,0,23,59,59).toISOString()};
}

function _getMonthsAgo(n){
  var d=new Date();
  for(var i=0;i<n;i++){d.setMonth(d.getMonth()-1)}
  return{year:d.getFullYear(),month:d.getMonth()+1,
    start:new Date(d.getFullYear(),d.getMonth(),1).toISOString(),
    end:new Date(d.getFullYear(),d.getMonth()+1,0,23,59,59).toISOString()};
}

function _getLast12Months(){
  var months=[],d=new Date();
  for(var i=11;i>=0;i--){
    var m=new Date(d.getFullYear(),d.getMonth()-i,1);
    months.push({label:(m.getMonth()+1)+'月',year:m.getFullYear(),month:m.getMonth()+1,
      start:new Date(m.getFullYear(),m.getMonth(),1).toISOString(),
      end:new Date(m.getFullYear(),m.getMonth()+1,0,23,59,59).toISOString()});
  }
  return months;
}

function _getOrderAmount(o){return o._amount||parseFloat(o.amount)||0}
function _getPaymentAmount(p){return p._amount||parseFloat(p.amount)||0}

function renderKpiCards(containerId,metrics){
  var el=document.getElementById(containerId);if(!el)return;
  var s='';
  for(var i=0;i<metrics.length;i++){
    var m=metrics[i],ch='';
    if(m.change!==undefined){ch='<div class="kpi-change '+(m.change>=0?'up':'down')+'">'+(m.change>=0?'↑':'↓')+Math.abs(m.change)+'%</div>'}
    s+='<div class="an-kpi-card"><div class="kpi-label">'+m.icon+' '+m.label+'</div><div class="kpi-val">'+m.value+'</div>'+ch+'</div>';
  }
  el.innerHTML=s;
}

async function renderAnalyticsOverview(){
  dbg('[Analytics] rendering overview');
  await loadOrders();await loadPayments();
  var tm=_getThisMonth();
  var monthOrders=allOrders.filter(function(o){return o.created_at&&o.created_at>=tm.start&&o.created_at<=tm.end&&o.stage!=='已取消'});
  var monthTotal=0;for(var i=0;i<monthOrders.length;i++)monthTotal+=_getOrderAmount(monthOrders[i]);
  var monthPay=allPayments.filter(function(p){return p.payment_date&&p.payment_date>=tm.start&&p.payment_date<=tm.end});
  var monthCol=0;for(var j=0;j<monthPay.length;j++)monthCol+=_getPaymentAmount(monthPay[j]);
  var allTotal=0;for(var k=0;k<allOrders.length;k++)if(allOrders[k].stage!=='已取消')allTotal+=_getOrderAmount(allOrders[k]);
  var allCol=0;for(var l=0;l<allPayments.length;l++)allCol+=_getPaymentAmount(allPayments[l]);
  var rate=allTotal>0?Math.round(allCol/allTotal*100):0;
  var clientSet={};for(var m=0;m<allOrders.length;m++)if(allOrders[m].client_id)clientSet[allOrders[m].client_id]=1;
  var active=Object.keys(clientSet).length;
  var lm=_getMonthsAgo(1);
  var lmOrders=allOrders.filter(function(o){return o.created_at&&o.created_at>=lm.start&&o.created_at<=lm.end&&o.stage!=='已取消'});
  var lmTotal=0;for(var n=0;n<lmOrders.length;n++)lmTotal+=_getOrderAmount(lmOrders[n]);
  var ch=lmTotal>0?Math.round((monthTotal-lmTotal)/lmTotal*100):0;
  renderKpiCards('an-ov-kpi',[
    {icon:'📦',label:'本月订单额',value:'¥'+formatMoney(monthTotal),change:ch},
    {icon:'💵',label:'本月回款额',value:'¥'+formatMoney(monthCol)},
    {icon:'📈',label:'回款率',value:rate+'%'},
    {icon:'👥',label:'活跃客户数',value:active}
  ]);
  drawRevenueTrend('an-ov-revenue-trend');
  drawCollectionChart('an-ov-collect-bar');
  drawClientPie('an-ov-rev-pie');
  renderTopClients(10);
  renderOverduePayments(5);
}

function drawRevenueTrend(canvasId){
  _destroyChart(canvasId);var ctx=document.getElementById(canvasId);if(!ctx)return;
  var months=_getLast12Months(),revData=[];
  for(var ri=0;ri<months.length;ri++){
    var m=months[ri],sum=0;
    for(var oi=0;oi<allOrders.length;oi++){
      var o=allOrders[oi];if(o.created_at&&o.created_at>=m.start&&o.created_at<=m.end&&o.stage!=='已取消')sum+=_getOrderAmount(o);
    }
    revData.push(sum);
  }
  _chartInstances[canvasId]=new Chart(ctx,{type:'line',
    data:{labels:months.map(function(m){return m.label}),datasets:[{label:'收入',data:revData,borderColor:'#4F6EF7',backgroundColor:'rgba(79,110,247,0.08)',fill:true,tension:0.35,pointRadius:4,pointBackgroundColor:'#4F6EF7'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:function(v){return v>=10000?'¥'+(v/10000).toFixed(1)+'万':'¥'+v}}}}}});
}

function drawCollectionChart(canvasId){
  _destroyChart(canvasId);var ctx=document.getElementById(canvasId);if(!ctx)return;
  var months=_getLast12Months(),colArr=[],recArr=[];
  for(var ri=0;ri<months.length;ri++){
    var m=months[ri],col=0,rec=0;
    for(var oi=0;oi<allOrders.length;oi++){var o=allOrders[oi];if(o.created_at&&o.created_at>=m.start&&o.created_at<=m.end&&o.stage!=='已取消')rec+=_getOrderAmount(o)}
    for(var pi=0;pi<allPayments.length;pi++){var p=allPayments[pi];if(p.payment_date&&p.payment_date>=m.start&&p.payment_date<=m.end)col+=_getPaymentAmount(p)}
    colArr.push(col);recArr.push(rec);
  }
  _chartInstances[canvasId]=new Chart(ctx,{type:'bar',
    data:{labels:months.map(function(m){return m.label}),datasets:[{label:'已回款',data:colArr,backgroundColor:'#10B981'},{label:'应收',data:recArr,backgroundColor:'#94A3B8'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{ticks:{callback:function(v){return v>=10000?'¥'+(v/10000).toFixed(1)+'万':'¥'+v}}}}}});
}

function drawClientPie(canvasId){
  _destroyChart(canvasId);var ctx=document.getElementById(canvasId);if(!ctx)return;
  var typeMap={};
  for(var i=0;i<allOrders.length;i++){
    var o=allOrders[i];if(o.stage==='已取消')continue;
    var t=o.project_name||o.stage||'其他';if(!typeMap[t])typeMap[t]=0;typeMap[t]+=_getOrderAmount(o)
  }
  var labels=[],vals=[];for(var k in typeMap){labels.push(k);vals.push(typeMap[k])}
  if(!labels.length){labels=['暂无数据'];vals=[1]}
  _chartInstances[canvasId]=new Chart(ctx,{type:'pie',
    data:{labels:labels,datasets:[{data:vals,backgroundColor:['#4F6EF7','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16','#6366F1','#F97316','#14B8A6','#78716C']}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{font:{size:11}}}}}});
}

function renderTopClients(limit){
  var tbody=document.getElementById('an-ov-top-clients');if(!tbody)return;
  var cm={};
  for(var i=0;i<allOrders.length;i++){
    var o=allOrders[i];if(o.stage==='已取消')continue;var cid=o.client_id||'u';
    if(!cm[cid])cm[cid]={total:0,count:0,latest:''};
    cm[cid].total+=_getOrderAmount(o);cm[cid].count++;
    if(o.created_at&&(!cm[cid].latest||o.created_at>cm[cid].latest))cm[cid].latest=o.created_at
  }
  var arr=[];for(var k2 in cm)arr.push({cid:k2,data:cm[k2]});
  arr.sort(function(a,b){return b.data.total-a.data.total});arr=arr.slice(0,limit);
  if(!arr.length){tbody.innerHTML='<tr><td colspan="4" class="tc">暂无数据</td></tr>';return}
  var h2='';
  for(var j=0;j<arr.length;j++){
    var a=arr[j],nm='客户#'+a.cid;var cl=allClients.find(function(x){return x.id===a.cid});if(cl)nm=cl.name;
    var dt='-';if(a.data.latest)dt=a.data.latest.substring(0,10);
    h2+='<tr><td>'+h(nm)+'</td><td style="font-weight:600">¥'+formatMoney(a.data.total)+'</td><td>'+a.data.count+'</td><td>'+dt+'</td></tr>';
  }
  tbody.innerHTML=h2;
}

function renderOverduePayments(limit){
  var tbody=document.getElementById('an-ov-overdue');if(!tbody)return;
  var now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  var pm={};
  for(var i=0;i<allPayments.length;i++){var p=allPayments[i];if(!pm[p.order_id])pm[p.order_id]=0;pm[p.order_id]+=_getPaymentAmount(p)}
  var ovd=[];
  for(var j=0;j<allOrders.length;j++){
    var o=allOrders[j];if(!o.expected_date||o.stage==='已取消'||o.stage==='已完成')continue;
    var ed=new Date(o.expected_date);if(isNaN(ed.getTime()))continue;
    var dO=Math.floor((today-ed)/86400000);if(dO<=0)continue;
    var ttl=_getOrderAmount(o),paid=pm[o.id]||0,owed=ttl-paid;if(owed<=0)continue;
    ovd.push({order:o,total:ttl,paid:paid,owed:owed,daysOver:dO})
  }
  ovd.sort(function(a,b){return b.daysOver-a.daysOver});ovd=ovd.slice(0,limit);
  if(!ovd.length){tbody.innerHTML='<tr><td colspan="7" class="tc">🎉 暂无逾期款项</td></tr>';return}
  var h3='';
  for(var k=0;k<ovd.length;k++){
    var it=ovd[k],o=it.order,cn='-';var cl=allClients.find(function(x){return x.id===o.client_id});if(cl)cn=cl.name;
    var badge='',rc='';
    if(it.daysOver>60){badge='🔴 严重';rc=' class="an-danger-row"'}
    else if(it.daysOver>30){badge='🟡 关注';rc=' class="an-alert-row"'}
    else{badge='ℹ️ 提醒'}
    h3+='<tr'+rc+'><td>'+h(cn)+'</td><td>'+h(o.order_number||'-')+'</td><td>¥'+formatMoney(it.total)+'</td><td>¥'+formatMoney(it.paid)+'</td><td>'+(o.expected_date||'').substring(0,10)+'</td><td>'+it.daysOver+'天</td><td>'+badge+'</td></tr>';
  }
  tbody.innerHTML=h3;
}

function calcFunnelData(){
  var period=document.getElementById('an-funnel-period')?document.getElementById('an-funnel-period').value:'this_month';
  var now=new Date(),start,end;
  if(period==='this_month'){start=new Date(now.getFullYear(),now.getMonth(),1);end=new Date(now.getFullYear(),now.getMonth()+1,0,23,59,59)}
  else if(period==='this_quarter'){var q=Math.floor(now.getMonth()/3);start=new Date(now.getFullYear(),q*3,1);end=new Date(now.getFullYear(),q*3+3,0,23,59,59)}
  else{start=new Date(now.getFullYear(),0,1);end=new Date(now.getFullYear(),11,31,23,59,59)}
  var si=start.toISOString(),ei=end.toISOString();
  var prevStart,prevEnd;
  if(period==='this_month'){prevStart=new Date(now.getFullYear(),now.getMonth()-1,1);prevEnd=new Date(now.getFullYear(),now.getMonth(),0,23,59,59)}
  else if(period==='this_quarter'){var pq=Math.floor(now.getMonth()/3)-1;prevStart=new Date(now.getFullYear(),pq*3,1);prevEnd=new Date(now.getFullYear(),pq*3+3,0,23,59,59)}
  else{prevStart=new Date(now.getFullYear()-1,0,1);prevEnd=new Date(now.getFullYear()-1,11,31,23,59,59)}
  var psi=prevStart.toISOString(),pei=prevEnd.toISOString();
  var stages=['线索','商机','报价','谈判中','已签约','执行中','已完成'];
  var sm={};
  for(var i=0;i<stages.length;i++){
    var sn=stages[i];
    var curr=allOrders.filter(function(o){if(o.stage==='已取消')return false;if(sn==='线索')return o.stage==='线索'&&o.created_at>=si&&o.created_at<=ei;if(sn==='商机')return o.stage==='商机'&&o.created_at>=si&&o.created_at<=ei;return o.stage===sn});
    var prev=allOrders.filter(function(o){if(o.stage==='已取消')return false;if(sn==='线索')return o.stage==='线索'&&o.created_at>=psi&&o.created_at<=pei;if(sn==='商机')return o.stage==='商机'&&o.created_at>=psi&&o.created_at<=pei;return o.stage===sn});
    var ca=0;for(var j=0;j<curr.length;j++)ca+=_getOrderAmount(curr[j]);
    var pa=0;for(var k=0;k<prev.length;k++)pa+=_getOrderAmount(prev[k]);
    sm[sn]={count:curr.length,amount:ca,prevCount:prev.length,prevAmount:pa}
  }
  return{stages:stages,stageMap:sm,period:period};
}

function renderAnSalesFunnel(){
  dbg('[Analytics] rendering sales funnel');
  var fd=calcFunnelData();
  var fv=document.getElementById('an-funnel-visual');
  var colors=['#4F6EF7','#6366F1','#818CF8','#A78BFA','#10B981','#34D399','#6EE7B7'];
  var maxCnt=1;for(var i=0;i<fd.stages.length;i++){var c=fd.stageMap[fd.stages[i]];if(c.count>maxCnt)maxCnt=c.count}
  if(fv){
    var h4='';
    for(var j=0;j<fd.stages.length;j++){
      var sn=fd.stages[j],s=fd.stageMap[sn];var pct=maxCnt>0?Math.max(15,Math.round(s.count/maxCnt*100)):15;
      h4+='<div class="an-funnel-step" style="width:'+pct+'%;background:'+colors[j]+'">'+sn+' ('+s.count+'个)<div class="an-funnel-detail"><span>¥'+formatMoney(s.amount)+'</span></div></div>';
    }
    fv.innerHTML=h4;
  }
  drawFunnelChart('an-funnel-conv-chart',fd);
  var tbody=document.getElementById('an-funnel-detail');
  if(tbody){
    var h5='',pc=fd.stageMap[fd.stages[0]].count||1;
    for(var k=0;k<fd.stages.length;k++){var sn2=fd.stages[k],s2=fd.stageMap[sn2];var cv=pc>0?Math.round(s2.count/pc*100):0;h5+='<tr><td>'+h(sn2)+'</td><td>'+s2.count+'</td><td style="font-weight:600">¥'+formatMoney(s2.amount)+'</td><td>'+cv+'%</td><td>-</td></tr>';pc=s2.count||1}
    tbody.innerHTML=h5;
  }
  var ce=document.getElementById('an-funnel-compare');
  if(ce){var ts=fd.stageMap['线索']||fd.stageMap[fd.stages[0]];ce.textContent='(vs 上期: '+ts.prevCount+'线索)'}
}

function drawFunnelChart(canvasId,fd){
  _destroyChart(canvasId);var ctx=document.getElementById(canvasId);if(!ctx)return;
  if(!fd)fd=calcFunnelData();
  var labels=[],vals=[];
  for(var i=0;i<fd.stages.length;i++){
    var sm=fd.stageMap[fd.stages[i]];
    if(i>0){var prev=fd.stageMap[fd.stages[i-1]];labels.push(fd.stages[i]);vals.push(prev.count>0?Math.round(sm.count/prev.count*100):0)}
    else{labels.push(fd.stages[i]+'→');vals.push(100)}
  }
  _chartInstances[canvasId]=new Chart(ctx,{type:'bar',data:{labels:labels,datasets:[{label:'转化率%',data:vals,backgroundColor:'#4F6EF7',borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{max:100,ticks:{callback:function(v){return v+'%'}}}}}});
}

async function renderCollectionAnalysis(){
  dbg('[Analytics] rendering collection');
  await loadPayments();await loadOrders();
  var now=new Date(),tm=_getThisMonth();
  var mp=allPayments.filter(function(p){return p.payment_date&&p.payment_date>=tm.start&&p.payment_date<=tm.end});
  var mc=0;for(var i=0;i<mp.length;i++)mc+=_getPaymentAmount(mp[i]);
  var allT=0;for(var j=0;j<allOrders.length;j++)if(allOrders[j].stage!=='已取消')allT+=_getOrderAmount(allOrders[j]);
  var allC=0;for(var k=0;k<allPayments.length;k++)allC+=_getPaymentAmount(allPayments[k]);
  var ar=allT-allC,rate=allT>0?Math.round(allC/allT*100):0;
  var today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),payMap={};
  for(var l=0;l<allPayments.length;l++){var pp=allPayments[l];if(!payMap[pp.order_id])payMap[pp.order_id]=0;payMap[pp.order_id]+=_getPaymentAmount(pp)}
  var odAmt=0;
  for(var m=0;m<allOrders.length;m++){
    var oo=allOrders[m];if(!oo.expected_date||oo.stage==='已取消'||oo.stage==='已完成')continue;
    var ed=new Date(oo.expected_date);if(isNaN(ed.getTime()))continue;
    var dO=Math.floor((today-ed)/86400000);if(dO<=0)continue;
    var ttl=_getOrderAmount(oo),paid=payMap[oo.id]||0;if(ttl-paid>0)odAmt+=ttl-paid
  }
  renderKpiCards('an-col-kpi',[
    {icon:'💵',label:'本月回款额',value:'¥'+formatMoney(mc)},
    {icon:'📋',label:'应收账款',value:'¥'+formatMoney(ar)},
    {icon:'📈',label:'回款率',value:rate+'%'},
    {icon:'⚠️',label:'逾期金额',value:'¥'+formatMoney(odAmt)}
  ]);
  drawAgingPie('an-col-aging-pie');
  drawCollectionClientBar('an-col-client-bar');
  drawCollectionMonthlyTrend('an-col-monthly-trend');
  renderOverdueDetail('an-col-overdue');
}

function getAgingBuckets(){
  var now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  var buckets={d030:0,d3160:0,d6190:0,d90p:0},pm={};
  for(var i=0;i<allPayments.length;i++){var p=allPayments[i];if(!pm[p.order_id])pm[p.order_id]=0;pm[p.order_id]+=_getPaymentAmount(p)}
  for(var j=0;j<allOrders.length;j++){
    var o=allOrders[j];if(o.stage==='已取消'||o.stage==='已完成')continue;
    var ttl=_getOrderAmount(o),paid=pm[o.id]||0,bal=ttl-paid;if(bal<=0)continue;
    var ed=o.expected_date?new Date(o.expected_date):null;if(!ed||isNaN(ed.getTime())){buckets.d90p+=bal;continue}
    var dO=Math.floor((today-ed)/86400000);
    if(dO<=30)buckets.d030+=bal;else if(dO<=60)buckets.d3160+=bal;else if(dO<=90)buckets.d6190+=bal;else buckets.d90p+=bal
  }
  return buckets;
}

function drawAgingPie(canvasId){
  _destroyChart(canvasId);var ctx=document.getElementById(canvasId);if(!ctx)return;
  var b=getAgingBuckets();
  _chartInstances[canvasId]=new Chart(ctx,{type:'pie',
    data:{labels:['0-30天','31-60天','61-90天','90天+'],datasets:[{data:[b.d030,b.d3160,b.d6190,b.d90p],backgroundColor:['#10B981','#F59E0B','#EF4444','#B91C1C']}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:11}}}}}});
}

function drawCollectionClientBar(canvasId){
  _destroyChart(canvasId);var ctx=document.getElementById(canvasId);if(!ctx)return;
  var cm={};
  for(var i=0;i<allPayments.length;i++){var p=allPayments[i],cid=p.client_id||'u';if(!cm[cid])cm[cid]=0;cm[cid]+=_getPaymentAmount(p)}
  var arr=[];for(var k in cm)arr.push({cid:k,amount:cm[k]});
  arr.sort(function(a,b){return b.amount-a.amount});arr=arr.slice(0,10);
  var labels=[],vals=[];
  for(var j=0;j<arr.length;j++){var cl=allClients.find(function(x){return x.id===arr[j].cid});labels.push(cl?cl.name.substring(0,6):arr[j].cid);vals.push(arr[j].amount)}
  if(!labels.length){labels=['暂无'];vals=[0]}
  _chartInstances[canvasId]=new Chart(ctx,{type:'bar',
    data:{labels:labels,datasets:[{label:'回款额',data:vals,backgroundColor:'#10B981',borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{ticks:{callback:function(v){return v>=10000?'¥'+(v/10000).toFixed(1)+'万':'¥'+v}}}}}});
}

function drawCollectionMonthlyTrend(canvasId){
  _destroyChart(canvasId);var ctx=document.getElementById(canvasId);if(!ctx)return;
  var months=_getLast12Months(),colArr=[],arArr=[];
  for(var ri=0;ri<months.length;ri++){
    var m=months[ri],col=0,rec=0;
    for(var pi=0;pi<allPayments.length;pi++){var p=allPayments[pi];if(p.payment_date&&p.payment_date>=m.start&&p.payment_date<=m.end)col+=_getPaymentAmount(p)}
    for(var oi=0;oi<allOrders.length;oi++){var o=allOrders[oi];if(o.created_at&&o.created_at>=m.start&&o.created_at<=m.end&&o.stage!=='已取消')rec+=_getOrderAmount(o)}
    colArr.push(col);arArr.push(rec);
  }
  _chartInstances[canvasId]=new Chart(ctx,{type:'line',
    data:{labels:months.map(function(m){return m.label}),datasets:[
      {label:'回款额',data:colArr,borderColor:'#10B981',backgroundColor:'rgba(16,185,129,0.1)',fill:true,tension:0.35},
      {label:'应收额',data:arArr,borderColor:'#F59E0B',backgroundColor:'rgba(245,158,11,0.08)',fill:true,tension:0.35}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{ticks:{callback:function(v){return v>=10000?'¥'+(v/10000).toFixed(1)+'万':'¥'+v}}}}}});
}

function renderOverdueDetail(tbodyId){
  var tbody=document.getElementById(tbodyId);if(!tbody)return;
  var now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),pm={};
  for(var i=0;i<allPayments.length;i++){var p=allPayments[i];if(!pm[p.order_id])pm[p.order_id]=0;pm[p.order_id]+=_getPaymentAmount(p)}
  var ovd=[];
  for(var j=0;j<allOrders.length;j++){
    var o=allOrders[j];if(!o.expected_date||o.stage==='已取消'||o.stage==='已完成')continue;
    var ed=new Date(o.expected_date);if(isNaN(ed.getTime()))continue;
    var dO=Math.floor((today-ed)/86400000);if(dO<=0)continue;
    var ttl=_getOrderAmount(o),paid=pm[o.id]||0;if(ttl-paid<=0)continue;
    ovd.push({order:o,total:ttl,paid:paid,owed:ttl-paid,daysOver:dO})
  }
  ovd.sort(function(a,b){return b.daysOver-a.daysOver});
  if(!ovd.length){tbody.innerHTML='<tr><td colspan="7" class="tc">🎉 暂无逾期款项</td></tr>';return}
  var h2='';
  for(var k=0;k<ovd.length;k++){
    var it=ovd[k],o=it.order,cn='-';var cl=allClients.find(function(x){return x.id===o.client_id});if(cl)cn=cl.name;
    var badge='',rc='';
    if(it.daysOver>60){badge='<span style="color:#c62828;font-weight:700">🔴 严重</span>';rc=' class="an-danger-row"'}
    else if(it.daysOver>30){badge='<span style="color:#f57f17;font-weight:700">🟡 关注</span>';rc=' class="an-alert-row"'}
    else{badge='<span style="color:var(--text2)">ℹ️ 提醒</span>'}
    h2+='<tr'+rc+'><td>'+h(cn)+'</td><td>'+h(o.order_number||'-')+'</td><td>¥'+formatMoney(it.total)+'</td><td>¥'+formatMoney(it.paid)+'</td><td>'+(o.expected_date||'').substring(0,10)+'</td><td>'+it.daysOver+'天</td><td>'+badge+'</td></tr>';
  }
  tbody.innerHTML=h2;
}

function renderProfitAnalysis(){
  dbg('[Analytics] rendering profit');
  var allRev=0;for(var i=0;i<allOrders.length;i++)if(allOrders[i].stage!=='已取消')allRev+=_getOrderAmount(allOrders[i]);
  var estCost=allRev*0.65,estProfit=allRev-estCost,estMargin=allRev>0?Math.round(estProfit/allRev*100):0;
  renderKpiCards('an-prof-kpi',[
    {icon:'💰',label:'总收入',value:'¥'+formatMoney(allRev)},
    {icon:'📉',label:'估算成本',value:'¥'+formatMoney(estCost)},
    {icon:'📊',label:'估算利润',value:'¥'+formatMoney(estProfit)},
    {icon:'📈',label:'毛利率',value:estMargin+'%'}
  ]);
  drawProfitTrend('an-prof-trend');
  drawMarginTrend('an-prof-margin');
  drawProfitTypePie('an-prof-type-pie');
  renderProfitProjRank();
  drawCostPie('an-prof-cost-pie');
}

function drawProfitTrend(canvasId){
  _destroyChart(canvasId);var ctx=document.getElementById(canvasId);if(!ctx)return;
  var months=_getLast12Months(),revArr=[],costArr=[],profArr=[];
  for(var ri=0;ri<months.length;ri++){
    var m=months[ri],rev=0;
    for(var oi=0;oi<allOrders.length;oi++){var o=allOrders[oi];if(o.created_at&&o.created_at>=m.start&&o.created_at<=m.end&&o.stage!=='已取消')rev+=_getOrderAmount(o)}
    var cost=rev*0.65;revArr.push(rev);costArr.push(Math.round(cost));profArr.push(Math.round(rev-cost));
  }
  _chartInstances[canvasId]=new Chart(ctx,{type:'line',
    data:{labels:months.map(function(m){return m.label}),datasets:[
      {label:'收入',data:revArr,borderColor:'#4F6EF7',tension:0.35,fill:false},
      {label:'成本(估)',data:costArr,borderColor:'#EF4444',tension:0.35,fill:false},
      {label:'利润(估)',data:profArr,borderColor:'#10B981',tension:0.35,fill:true,backgroundColor:'rgba(16,185,129,0.1)'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{ticks:{callback:function(v){return v>=10000?'¥'+(v/10000).toFixed(1)+'万':'¥'+v}}}}}});
}

function drawMarginTrend(canvasId){
  _destroyChart(canvasId);var ctx=document.getElementById(canvasId);if(!ctx)return;
  var months=_getLast12Months(),margArr=[];
  for(var ri=0;ri<months.length;ri++){
    var m=months[ri],rev=0;
    for(var oi=0;oi<allOrders.length;oi++){var o=allOrders[oi];if(o.created_at&&o.created_at>=m.start&&o.created_at<=m.end&&o.stage!=='已取消')rev+=_getOrderAmount(o)}
    var cost=rev*0.65;margArr.push(rev>0?Math.round((rev-cost)/rev*100):0);
  }
  _chartInstances[canvasId]=new Chart(ctx,{type:'line',
    data:{labels:months.map(function(m){return m.label}),datasets:[{label:'毛利率%',data:margArr,borderColor:'#8B5CF6',backgroundColor:'rgba(139,92,246,0.08)',fill:true,tension:0.35,pointRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{max:100,ticks:{callback:function(v){return v+'%'}}}}}});
}

function drawProfitTypePie(canvasId){
  _destroyChart(canvasId);var ctx=document.getElementById(canvasId);if(!ctx)return;
  var tm={};
  for(var i=0;i<allOrders.length;i++){
    var o=allOrders[i];if(o.stage==='已取消')continue;var t=o.project_name||o.stage||'其他';
    if(!tm[t])tm[t]=0;tm[t]+=_getOrderAmount(o)*0.35
  }
  var labels=[],vals=[];for(var k in tm){labels.push(k);vals.push(Math.round(tm[k]))}
  if(!labels.length){labels=['暂无'];vals=[1]}
  _chartInstances[canvasId]=new Chart(ctx,{type:'pie',
    data:{labels:labels,datasets:[{data:vals,backgroundColor:['#10B981','#4F6EF7','#F59E0B','#8B5CF6','#EF4444','#EC4899','#06B6D4','#84CC16']}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{font:{size:11}}}}}});
}

function renderProfitProjRank(){
  var tbody=document.getElementById('an-prof-proj-rank');if(!tbody)return;
  var pm={};
  for(var i=0;i<allOrders.length;i++){var o=allOrders[i];if(o.stage==='已取消')continue;var pn=o.project_name||'未分类';if(!pm[pn])pm[pn]=0;pm[pn]+=_getOrderAmount(o)}
  var arr=[];for(var k in pm)arr.push({name:k,rev:pm[k]});
  arr.sort(function(a,b){return b.rev-a.rev});
  if(!arr.length){tbody.innerHTML='<tr><td colspan="5" class="tc">暂无数据</td></tr>';return}
  var h2='';
  for(var j=0;j<arr.length;j++){
    var a=arr[j],cost=Math.round(a.rev*0.65),profit=a.rev-cost,margin=a.rev>0?Math.round(profit/a.rev*100):0;
    var mc=margin>=30?'color:#10B981':margin>=10?'color:#F59E0B':'color:#EF4444';
    h2+='<tr><td>'+h(a.name)+'</td><td>¥'+formatMoney(a.rev)+'</td><td>¥'+formatMoney(cost)+'</td><td style="font-weight:600;'+mc+'">¥'+formatMoney(profit)+'</td><td style="font-weight:600;'+mc+'">'+margin+'%</td></tr>';
  }
  tbody.innerHTML=h2;
}

function drawCostPie(canvasId){
  _destroyChart(canvasId);var ctx=document.getElementById(canvasId);if(!ctx)return;
  var allRev=0;for(var i=0;i<allOrders.length;i++)if(allOrders[i].stage!=='已取消')allRev+=_getOrderAmount(allOrders[i]);
  var totalCost=allRev*0.65;
  var items=[{label:'人力成本',pct:40,val:Math.round(totalCost*0.4)},{label:'采购成本',pct:30,val:Math.round(totalCost*0.3)},{label:'运营费用',pct:15,val:Math.round(totalCost*0.15)},{label:'管理费用',pct:10,val:Math.round(totalCost*0.1)},{label:'其他',pct:5,val:Math.round(totalCost*0.05)}];
  _chartInstances[canvasId]=new Chart(ctx,{type:'pie',
    data:{labels:items.map(function(x){return x.label}),datasets:[{data:items.map(function(x){return x.val}),backgroundColor:['#EF4444','#F59E0B','#8B5CF6','#06B6D4','#94A3B8']}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:function(ctxi){return ctxi.label+': ¥'+formatMoney(ctxi.parsed)+' ('+items[ctxi.dataIndex].pct+'%)'}}}}}});
}

function getClientScores(){
  var now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  var cm={};
  for(var i=0;i<allOrders.length;i++){
    var o=allOrders[i];if(o.stage==='已取消')continue;var cid=o.client_id||'u';
    if(!cm[cid])cm[cid]={total:0,count:0,latest:'',first:o.created_at||''};
    cm[cid].total+=_getOrderAmount(o);cm[cid].count++;
    if(!cm[cid].latest||o.created_at>cm[cid].latest)cm[cid].latest=o.created_at;
    if(o.created_at&&(!cm[cid].first||o.created_at<cm[cid].first))cm[cid].first=o.created_at
  }
  var allTotal=0;for(var k in cm)allTotal+=cm[k].total;
  var allCount=0;for(var k2 in cm)allCount+=cm[k2].count;
  var avgRev=allCount>0?Math.round(allTotal/allCount):0;
  var results=[];
  for(var cid in cm){
    var c=cm[cid],recency=0;if(c.latest){var ld=new Date(c.latest);recency=Math.floor((today-ld)/86400000)}
    var score=0;
    if(c.count>=10)score+=3;else if(c.count>=5)score+=2;else if(c.count>=2)score+=1;
    if(c.total>=avgRev*3)score+=3;else if(c.total>=avgRev)score+=2;else if(c.total>0)score+=1;
    if(recency<=30)score+=3;else if(recency<=90)score+=2;else if(recency<=180)score+=1;
    var tier='',tl='';
    if(score>=8){tier='healthy';tl='🟢 健康'}
    else if(score>=5){tier='attention';tl='🟡 关注'}
    else if(score>=2){tier='risk';tl='🔴 风险'}
    else{tier='lost';tl='⚫ 流失'}
    results.push({cid:cid,total:c.total,count:c.count,recency:recency,score:score,tier:tier,tierLabel:tl,latest:c.latest,first:c.first})
  }
  results.sort(function(a,b){return b.score-a.score});
  return results;
}

function renderClientHealth(){
  dbg('[Analytics] rendering client health');
  var scores=getClientScores();
  var h=0,a=0,r=0,l=0;
  for(var i=0;i<scores.length;i++){var s=scores[i];if(s.tier==='healthy')h++;else if(s.tier==='attention')a++;else if(s.tier==='risk')r++;else l++}
  renderKpiCards('an-ch-kpi',[
    {icon:'🟢',label:'健康客户',value:h},
    {icon:'🟡',label:'关注客户',value:a},
    {icon:'🔴',label:'风险客户',value:r},
    {icon:'⚫',label:'流失客户',value:l}
  ]);
  drawClientTierPie('an-ch-tier-pie',scores);
  drawClientActiveBar('an-ch-active-bar',scores);
  drawNewClientTrend('an-ch-new-trend');
  drawValueScatter('an-ch-value-scatter',scores);
  drawRepurchaseChart('an-ch-repurchase',scores);
  renderChurnList('an-ch-churn-list',scores);
}

function drawClientTierPie(canvasId,scores){
  _destroyChart(canvasId);var ctx=document.getElementById(canvasId);if(!ctx)return;
  var counts=[0,0,0,0];
  for(var i=0;i<scores.length;i++){var s=scores[i];if(s.tier==='healthy')counts[0]++;else if(s.tier==='attention')counts[1]++;else if(s.tier==='risk')counts[2]++;else counts[3]++}
  _chartInstances[canvasId]=new Chart(ctx,{type:'pie',
    data:{labels:['健康','关注','风险','流失'],datasets:[{data:counts,backgroundColor:['#10B981','#F59E0B','#EF4444','#94A3B8']}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}});
}

function drawClientActiveBar(canvasId,scores){
  _destroyChart(canvasId);var ctx=document.getElementById(canvasId);if(!ctx)return;
  var b={d030:0,d3160:0,d6190:0,d91:0};
  for(var i=0;i<scores.length;i++){var r=scores[i].recency;if(r<=30)b.d030++;else if(r<=60)b.d3160++;else if(r<=90)b.d6190++;else b.d91++}
  _chartInstances[canvasId]=new Chart(ctx,{type:'bar',
    data:{labels:['活跃(≤30天)','较活跃(31-60)','沉默(61-90)','流失(>90天)'],datasets:[{data:[b.d030,b.d3160,b.d6190,b.d91],backgroundColor:['#10B981','#4F6EF7','#F59E0B','#EF4444'],borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});
}

function drawNewClientTrend(canvasId){
  _destroyChart(canvasId);var ctx=document.getElementById(canvasId);if(!ctx)return;
  var months=_getLast12Months(),newArr=[];
  for(var ri=0;ri<months.length;ri++){
    var m=months[ri],cnt=0;
    for(var ci=0;ci<allClients.length;ci++){var c=allClients[ci];if(c.created_at&&c.created_at>=m.start&&c.created_at<=m.end)cnt++}
    newArr.push(cnt);
  }
  _chartInstances[canvasId]=new Chart(ctx,{type:'line',
    data:{labels:months.map(function(m){return m.label}),datasets:[{label:'新增客户',data:newArr,borderColor:'#10B981',backgroundColor:'rgba(16,185,129,0.08)',fill:true,tension:0.35,pointRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});
}

function drawValueScatter(canvasId,scores){
  _destroyChart(canvasId);var ctx=document.getElementById(canvasId);if(!ctx)return;
  var pts=[];
  for(var i=0;i<scores.length;i++){var s=scores[i];if(s.count===0&&s.total===0)continue;pts.push({x:s.count,y:s.total/10000,tier:s.tier})}
  var tc={healthy:'#10B981',attention:'#F59E0B',risk:'#EF4444',lost:'#94A3B8'},ds=[];
  for(var t in tc){
    var fp=pts.filter(function(p){return p.tier===t});
    ds.push({label:t==='healthy'?'健康':t==='attention'?'关注':t==='risk'?'风险':'流失',data:fp,backgroundColor:tc[t],pointRadius:6});
  }
  _chartInstances[canvasId]=new Chart(ctx,{type:'scatter',data:{datasets:ds},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{position:'bottom'}},
      scales:{x:{title:{display:true,text:'订单数(频次)'}},y:{title:{display:true,text:'订单额(万)'}}}}});
}

function drawRepurchaseChart(canvasId,scores){
  _destroyChart(canvasId);var ctx=document.getElementById(canvasId);if(!ctx)return;
  var once=0,rep=0;
  for(var i=0;i<scores.length;i++){if(scores[i].count>=2)rep++;else once++}
  _chartInstances[canvasId]=new Chart(ctx,{type:'pie',
    data:{labels:['复购客户(≥2单)','单次客户'],datasets:[{data:[rep,once],backgroundColor:['#10B981','#94A3B8']}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}});
}

function renderChurnList(tbodyId,scores){
  var tbody=document.getElementById(tbodyId);if(!tbody)return;
  var now=new Date(),threeMAgo=new Date(now.getFullYear(),now.getMonth()-3,now.getDate()).toISOString();
  var items=[];
  for(var ci=0;ci<allClients.length;ci++){
    var cl=allClients[ci],sc=scores.find(function(s){return s.cid===cl.id});
    if(!sc||sc.count===0)continue;
    if(!sc.latest||sc.latest<threeMAgo)items.push({client:cl,score:sc})
  }
  if(!items.length){tbody.innerHTML='<tr><td colspan="6" class="tc">🎉 无流失风险客户</td></tr>';return}
  var h2='';
  for(var j=0;j<items.length;j++){
    var it=items[j],cl=it.client,s=it.score,daysAgo=s.latest?Math.floor((now-new Date(s.latest))/86400000):999;
    var bc=s.tier==='risk'?'an-badge-risk':s.tier==='attention'?'an-badge-attention':'an-badge-lost';
    h2+='<tr><td>'+h(cl.name)+'</td><td>'+(h(cl.client_type||'-'))+'</td><td>'+(s.latest?s.latest.substring(0,10):'-')+'</td><td>'+daysAgo+'天</td><td>'+s.count+'单</td><td><span class="an-badge '+bc+'">'+s.tierLabel+'</span></td></tr>';
  }
  tbody.innerHTML=h2;
}


/* ═══════════════ 外勤管理 ═══════════════ */
let fwCheckinState=null;  // null | 'in' | 'out'
let fwVisitEditId=null;
let fwVisitClientId=null;

function switchFWTab(tab){
  var tabs=['overview','checkin','visits','track','stats'];
  for(var i=0;i<tabs.length;i++){
    var el=document.getElementById('fw-'+tabs[i]);
    var btn=document.getElementById('fwt-'+tabs[i]);
    if(el)el.classList.toggle('hidden',tabs[i]!==tab);
    if(btn)btn.classList.toggle('active',tabs[i]===tab);
  }
  if(tab==='overview')loadFWOverview();
  else if(tab==='checkin')loadFWCheckin();
  else if(tab==='visits')loadFWVisits();
  else if(tab==='track')loadFWTrack();
  else if(tab==='stats')loadFWStats();
}

async function loadFWOverview(){
  if(typeof currentUser==="undefined"){if(dbg)dbg.innerHTML+="<br>⛔ currentUser undefined";return}
  if(!currentUser||!currentUser.id){if(dbg)dbg.innerHTML+="<br>⛔ currentUser.id missing: "+JSON.stringify(currentUser);return}
  if(typeof sb==="undefined"){if(dbg)dbg.innerHTML+="<br>⛔ sb undefined";return}
  if(typeof currentCompanyId==="undefined"){if(dbg)dbg.innerHTML+="<br>⛔ currentCompanyId undefined";return}
  if(dbg)dbg.innerHTML+="<br>✔ user="+currentUser.id.substring(0,8)+" company="+currentCompanyId;

  var kpi=document.getElementById('fw-ov-kpi');
  if(!kpi)return;
  var today=new Date().toISOString().substring(0,10);
  // Load today's checkins
  try{
  if(dbg)dbg.innerHTML+="<br>▶ Querying field_checkins...";

    var {data:checks}=await sb.from('field_checkins').select('*').eq('user_id',currentUser.id).eq('company_id',currentCompanyId).gte('created_at',today).order('created_at',{ascending:true});
  if(dbg)dbg.innerHTML+="<br>✔ checks: "+(checks?(checks.length+" rows"):"null");
    var {data:visits}=await sb.from('field_visits').select('*').eq('user_id',currentUser.id).eq('company_id',currentCompanyId).eq('visit_date',today);
  if(dbg)dbg.innerHTML+="<br>✔ visits: "+(visits?(visits.length+" rows"):"null");
    var visitsToday=visits?visits.length:0;
    var hasIn=false,hasOut=false;
    if(checks){for(var i=0;i<checks.length;i++){if(checks[i].type==='in')hasIn=true;if(checks[i].type==='out')hasOut=true}}
    // Week stats
    var weekAgo=new Date();weekAgo.setDate(weekAgo.getDate()-7);
    var waStr=weekAgo.toISOString().substring(0,10);
    var {data:weekVisits}=await sb.from('field_visits').select('id').eq('user_id',currentUser.id).eq('company_id',currentCompanyId).gte('visit_date',waStr);
  if(dbg)dbg.innerHTML+="<br>✔ weekVisits: "+(weekVisits?(weekVisits.length+" rows"):"null");
    // Team today
    var {data:teamChecks}=await sb.from('field_checkins').select('user_id,type').eq('company_id',currentCompanyId).gte('created_at',today).order('created_at',{ascending:true});
  if(dbg)dbg.innerHTML+="<br>✔ teamChecks: "+(teamChecks?(teamChecks.length+" rows"):"null");
    var teamMap={};if(teamChecks){for(var i=0;i<teamChecks.length;i++){var tc=teamChecks[i];if(!teamMap[tc.user_id])teamMap[tc.user_id]={in:false,out:false};teamMap[tc.user_id][tc.type]=true}}
    var teamIn=0,teamOut=0;for(var k in teamMap){if(teamMap[k].in)teamIn++;if(teamMap[k].out)teamOut++}
    if(dbg)dbg.innerHTML+="<br>▶ Rendering KPI cards...";kpi.innerHTML='<div class="fw-kpi-card"><div class="kpi-label">📍 今日签到</div><div class="kpi-val">'+(hasIn?'✅':hasOut?'☀️':'—')+'</div></div>'
      +'<div class="fw-kpi-card"><div class="kpi-label">🏢 今日拜访</div><div class="kpi-val">'+visitsToday+'</div></div>'
      +'<div class="fw-kpi-card"><div class="kpi-label">📅 本周拜访</div><div class="kpi-val">'+(weekVisits?weekVisits.length:0)+'</div></div>'
      +'<div class="fw-kpi-card"><div class="kpi-label">🧑‍🤝‍🧑 团队已签到</div><div class="kpi-val">'+teamIn+'/'+(allUsers?allUsers.length:'?')+'</div></div>';
    // Today checks
    var ckHtml='';if(checks&&checks.length){for(var i=0;i<checks.length;i++){var ck=checks[i];ckHtml+='<div class="fw-timeline-item '+ck.type+'"><div class="fw-timeline-time">'+(ck.created_at?new Date(ck.created_at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):'')+'</div><div class="fw-timeline-addr">'+(ck.address||h(ck.note||'签到'))+'</div>'+(ck.note?'<div class="fw-timeline-note">'+h(ck.note)+'</div>':'')+'</div>'}}else{ckHtml='<div style="color:var(--text3);font-size:13px">暂无签到记录</div>'}
    document.getElementById('fw-ov-today-checks').innerHTML=ckHtml;
    // Today visits
    var vtHtml='';if(visits&&visits.length){for(var i=0;i<visits.length;i++){var v=visits[i];vtHtml+='<div class="fw-timeline-item in"><div class="fw-timeline-time">'+(v.start_time||'')+'</div><div class="fw-timeline-addr">'+h(v.client_name||'未命名')+'</div>'+(v.purpose?'<div class="fw-timeline-note">'+h(v.purpose)+'</div>':'')+'</div>'}}else{vtHtml='<div style="color:var(--text3);font-size:13px">暂无拜访记录</div>'}
    document.getElementById('fw-ov-today-visits').innerHTML=vtHtml;
    // Team
    var teamHtml='<div style="font-size:13px;color:var(--text2)">已签到 '+teamIn+' 人 | 已签退 '+teamOut+' 人</div>';
    document.getElementById('fw-ov-team').innerHTML=teamHtml;
    // Weekly
    var weekHtml='<div style="font-size:13px;color:var(--text2)">本周累计拜访 '+(weekVisits?weekVisits.length:0)+' 次</div>';
    document.getElementById('fw-ov-weekly').innerHTML=weekHtml;
    fwCheckinState=hasOut?'out':hasIn?'in':null;
  
  if(dbg)dbg.innerHTML+="<br>✅ loadFWOverview done";
}catch(e){
  if(dbg)dbg.innerHTML+="<br>🔥 ERROR: "+h(e.message||e)+"<br>"+(e.stack||"").substring(0,200);console.error('loadFWOverview error:',e);if(kpi)kpi.innerHTML='<div style="color:var(--danger);font-size:13px">加载失败</div>'}
}

async function loadFWCheckin(){
  var today=new Date().toISOString().substring(0,10);
  var status=document.getElementById('fw-checkin-status');
  var btnIn=document.getElementById('fw-btn-in');
  var btnOut=document.getElementById('fw-btn-out');
  try{
    var {data:checks}=await sb.from('field_checkins').select('*').eq('user_id',currentUser.id).eq('company_id',currentCompanyId).gte('created_at',today).order('created_at',{ascending:true});
    var hasIn=false,hasOut=false;
    if(checks){for(var i=0;i<checks.length;i++){if(checks[i].type==='in')hasIn=true;if(checks[i].type==='out')hasOut=true}}
    fwCheckinState=hasOut?'out':hasIn?'in':null;
    if(status){
      if(hasIn&&hasOut)status.innerHTML='<div style="color:#10B981;font-size:14px">✅ 今日已完成签到和签退</div>';
      else if(hasIn)status.innerHTML='<div style="color:#F59E0B;font-size:14px">☀️ 已签到，别忘签退哦</div>';
      else status.innerHTML='<div style="color:var(--text3);font-size:14px">🌅 早上好！请签到开始新一天</div>';
    }
    if(btnIn){btnIn.disabled=hasIn;btnIn.textContent=hasIn?'✅ 已签到':'📍 上班签到'}
    if(btnOut){btnOut.disabled=!hasIn||hasOut;btnOut.textContent=hasOut?'✅ 已签退':'🏠 下班签退'}
    // Today list
    var list=document.getElementById('fw-today-list');
    var html='';if(checks&&checks.length){for(var i=0;i<checks.length;i++){var ck=checks[i];html+='<div class="fw-timeline-item '+ck.type+'"><div class="fw-timeline-time">'+(ck.created_at?new Date(ck.created_at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):'')+'</div><div class="fw-timeline-addr">'+(ck.address||'GPS位置未获取')+'</div>'+(ck.note?'<div class="fw-timeline-note">'+h(ck.note)+'</div>':'')+'</div>'}}else{html='<div style="color:var(--text3);font-size:13px">暂无记录</div>'}
    if(list)list.innerHTML=html;
  }catch(e){console.error('loadFWCheckin error:',e)}
}

function fwResetBtn(type){var btnIn=document.getElementById('fw-btn-in');var btnOut=document.getElementById('fw-btn-out');if(type==='in'){btnIn.disabled=false;btnIn.textContent='📍 上班签到'}else{btnOut.disabled=false;btnOut.textContent='🏠 下班签退'}}
async function doCheckIn(type){
  dbg('[doCheckIn] type=',type,'navigator.geolocation=',!!(navigator&&navigator.geolocation));
  var note=document.getElementById('fw-checkin-note').value.trim();
  var addr='';var label=type==='in'?'上班签到':'下班签退';
  var btnEl=type==='in'?document.getElementById('fw-btn-in'):document.getElementById('fw-btn-out');
  if(!btnEl){console.error('[doCheckIn] btnEl not found for type=',type);showToast('错误：找不到按钮');return;}
  btnEl.disabled=true;btnEl.textContent='获取定位中...';
  var settled=false;
  function resetBtn(){if(settled)return;settled=true;btnEl.disabled=false;btnEl.textContent=type==='in'?'\u{1F4CD} 上班签到':'\u{1F3E0} 下班签退'}
  var t=setTimeout(function(){if(!settled){dbg('[doCheckIn] timeout, saving without location');resetBtn();showToast('\u26A0\uFE0F 定位超时(8秒)，无定位签到...');doSaveCheckIn(null,null,type,note,addr);}},8000);
  if(!navigator||!navigator.geolocation){dbg('[doCheckIn] geolocation not supported');clearTimeout(t);resetBtn();showToast('\u26A0\uFE0F 浏览器不支持定位');doSaveCheckIn(null,null,type,note,addr);return;}
  navigator.geolocation.getCurrentPosition(function(p){dbg('[doCheckIn] position success',p.coords);if(settled)return;var lat=p.coords.latitude,lng=p.coords.longitude;if(isNaN(lat)||isNaN(lng)){dbg('[doCheckIn] invalid coords');clearTimeout(t);resetBtn();showToast('\u26A0\uFE0F 坐标无效，无定位签到...');doSaveCheckIn(null,null,type,note,addr);return;}clearTimeout(t);resetBtn();showLocationConfirm(lat,lng,type==='in'?'\u{1F4CD} 上班签到 - 确认位置':'\u{1F3E0} 下班签退 - 确认位置',function(clat,clng){doSaveCheckIn(clat,clng,type,note,addr);});},function(err){dbg('[doCheckIn] position error',err.code,err.message);if(settled)return;clearTimeout(t);resetBtn();showToast(err.code===1?'\u26A0\uFE0F 定位被拒绝，无定位签到...':'\u26A0\uFE0F GPS不可用，无定位签到...');doSaveCheckIn(null,null,type,note,addr);},{timeout:7000,enableHighAccuracy:true,maximumAge:60000});
}

async function doSaveCheckIn(lat,lng,type,note,addr){
  var label=type==='in'?'上班签到':'下班签退';
  var btnEl=type==='in'?document.getElementById('fw-btn-in'):document.getElementById('fw-btn-out');
  btnEl.disabled=true;btnEl.textContent='保存中...';
  try{
    var b={user_id:currentUser.id,type:type,latitude:lat,longitude:lng,address:addr,note:note||null,company_id:currentCompanyId};
    var r=await sb.from('field_checkins').insert(b).select();
    btnEl.disabled=false;btnEl.textContent=type==='in'?'\u{1F4CD} 上班签到':'\u{1F3E0} 下班签退';
    if(r.error){console.error('[doSaveCheckIn] supabase error:',JSON.stringify(r.error));showToast(label+'失败: '+(r.error.message||r.error.details||JSON.stringify(r.error)));return}
    showToast(type==='in'?'\u2705 签到成功！':(lat!=null?'\u{1F3E0} 签退成功！':'\u{1F3E0} 签退成功！（无定位）'));
    document.getElementById('fw-checkin-note').value='';
    loadFWCheckin();loadFWOverview();
  }catch(e){btnEl.disabled=false;btnEl.textContent=type==='in'?'\u{1F4CD} 上班签到':'\u{1F3E0} 下班签退';console.error('[doSaveCheckIn] exception:',e);showToast(label+'异常: '+(e.message||e))}
}

function openFWVisitForm(id){
  fwVisitEditId=id||null;fwVisitClientId=null;
  document.getElementById('fw-vm-title').textContent=id?'编辑拜访记录':'新增拜访记录';
  var today=new Date().toISOString().substring(0,10);
  document.getElementById('fw-vm-date').value=today;
  document.getElementById('fw-vm-client').value='';
  document.getElementById('fw-vm-purpose').value='';
  document.getElementById('fw-vm-notes').value='';
  document.getElementById('fw-vm-result').value='';
  document.getElementById('fw-vm-client-list').classList.add('hidden');
  document.getElementById('fw-vm-client-list').innerHTML='';
  document.getElementById('fw-visit-modal').classList.remove('hidden');
  if(id){
    // Load existing data
    sb.from('field_visits').select('*').eq('id',id).single().then(function(r){
      if(r.data){
        document.getElementById('fw-vm-client').value=r.data.client_name||'';
        document.getElementById('fw-vm-purpose').value=r.data.purpose||'';
        document.getElementById('fw-vm-date').value=r.data.visit_date||'';
        document.getElementById('fw-vm-notes').value=r.data.notes||'';
        document.getElementById('fw-vm-result').value=r.data.result||'';
        fwVisitClientId=r.data.client_id||null;
      }
    });
  }
}
// Helper for autocomplete
function h2(s){return s?s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):''}
var fwClientSuggIdx=-1,fwClientSuggList=[];
function onFWClientInput(){
  var inp=document.getElementById('fw-vm-client');if(!inp)return;
  var q=(inp.value||'').trim().toLowerCase();
  var list=document.getElementById('fw-vm-client-list');if(!list)return;
  if(!q||!allClients.length){list.classList.add('hidden');list.innerHTML='';return}
  var matches=allClients.filter(function(c){return (c.name||'').toLowerCase().indexOf(q)>=0}).slice(0,8);
  if(!matches.length){list.classList.add('hidden');list.innerHTML='';return}
  fwClientSuggList=matches;fwClientSuggIdx=0;
  var h='';
  for(var i=0;i<matches.length;i++){
    h+='<div class="name-suggestion-item'+(i===0?' active':'')+'" onmousedown="selectFWClient(\''+matches[i].id+'\')">'+escHtml(matches[i].name)+'</div>';
  }
  list.innerHTML=h;list.classList.remove('hidden');
}
function onFWClientKey(e){
  var list=document.getElementById('fw-vm-client-list');if(!list||list.classList.contains('hidden'))return;
  var items=list.querySelectorAll('.name-suggestion-item');if(!items.length)return;
  if(e.key==='ArrowDown'){e.preventDefault();fwClientSuggIdx=Math.min((fwClientSuggIdx||-1)+1,items.length-1)}
  else if(e.key==='ArrowUp'){e.preventDefault();fwClientSuggIdx=Math.max((fwClientSuggIdx||0)-1,0)}
  else if(e.key==='Enter'&&fwClientSuggIdx>=0){e.preventDefault();items[fwClientSuggIdx]&&items[fwClientSuggIdx].click();return}
  else{fwClientSuggIdx=-1}
  for(var i=0;i<items.length;i++)items[i].classList.toggle('active',i===fwClientSuggIdx);
}
function selectFWClient(id,name){
  fwVisitClientId=id;
  var list=document.getElementById('fw-vm-client-list');if(list){list.classList.add('hidden');list.innerHTML=''}
  fwClientSuggIdx=-1;fwClientSuggList=[];
  var cl=allClients.find(function(x){return x.id===id});
  document.getElementById('fw-vm-client').value=cl?cl.name:(name||'');
}

var fwLocationConfirmCallback=null; // 用户在地图上确认位置后的回调
var fwPendingLat=null,fwPendingLng=null; // 待确认的 GPS 坐标

async function saveFVisit(){
  var clientName=document.getElementById('fw-vm-client').value.trim();
  if(!clientName){showToast('请输入客户名称');return}
  // Build data object (will fill lat/lng after confirm)
  var data={
    user_id:currentUser.id,
    client_id:fwVisitClientId||null,
    client_name:clientName,
    purpose:document.getElementById('fw-vm-purpose').value,
    notes:document.getElementById('fw-vm-notes').value.trim(),
    result:document.getElementById('fw-vm-result').value,
    visit_date:document.getElementById('fw-vm-date').value,
    company_id:currentCompanyId
  };
  // Step 1: Try GPS
  var gotLocation=false;
  if(navigator.geolocation){
    try{
      var isMobile=/Mobi|Android|iPhone/i.test(navigator.userAgent)||('ontouchstart' in window);
      dbg('[GPS] saveFVisit requesting, mobile='+isMobile);
      var pos=await new Promise(function(res,rej){
        navigator.geolocation.getCurrentPosition(res,rej,{timeout:10000,enableHighAccuracy:isMobile,maximumAge:60000});
      });
      var lat=pos.coords.latitude,lng=pos.coords.longitude;
      dbg('[GPS] saveFVisit got coords:',lat,lng,'accuracy:',pos.coords.accuracy);
      gotLocation=true;
      // Step 2: Show confirm modal
      showLocationConfirm(lat,lng,'🏢 拜访记录 - 确认位置',async function(confirmedLat,confirmedLng){
        data.latitude=confirmedLat;data.longitude=confirmedLng;
        await doSaveFVisit(data);
      });
    }catch(g){
      console.warn('[GPS] saveFVisit failed:',g.message||g);
      if(g.code===1)showToast('⚠️ 定位被拒绝，请在浏览器设置中允许定位权限');
      else if(g.code===2)showToast('⚠️ 定位不可用，请稍后重试');
      else if(g.code===3)showToast('⚠️ 定位超时（10秒）');
    }
  }
  if(!gotLocation){
    data.latitude=null;data.longitude=null;
    await doSaveFVisit(data);
  }
}
async function doSaveFVisit(data){
  try{
    var r;
    if(fwVisitEditId){r=await sb.from('field_visits').update(data).eq('id',fwVisitEditId)}
    else{r=await sb.from('field_visits').insert(data)}
    if(r.error){showToast('保存失败: '+r.error.message);return}
    showToast('✅ '+(fwVisitEditId?'更新':'新增')+'拜访记录成功');
    closeVisitForm();loadFWVisits();loadFWOverview();
  }catch(e){showToast('保存失败: '+(e.message||e));console.error(e)}
}

// Visit form modal
function closeVisitForm(){
  var m=document.getElementById('fw-visit-modal');
  if(m){m.classList.add('hidden');m.style.display='';}
  fwVisitEditId=null;
  document.getElementById('fw-vm-client').value='';
  document.getElementById('fw-vm-purpose').value='';
  document.getElementById('fw-vm-date').value='';
  document.getElementById('fw-vm-notes').value='';
  document.getElementById('fw-vm-result').value='';
  document.getElementById('fw-vm-title').textContent='新增拜访记录';
}

// Location confirmation modal
function closeLocationConfirm(){
  document.getElementById('fw-location-confirm').classList.add('hidden');
  document.getElementById('fw-location-confirm').style.display='';
  fwPendingLat=null;fwPendingLng=null;fwLocationConfirmCallback=null;
  if(window._fwPendingType)fwResetBtn(window._fwPendingType);
  window._fwPendingType=null;
  if(window._fwLcMap){window._fwLcMap.clearOverlays();window._fwLcMap=null}
}
function confirmLocation(){
  if(!fwLocationConfirmCallback) return;
  var cb=fwLocationConfirmCallback;
  var lat=fwPendingLat,lng=fwPendingLng;
  window._fwPendingType=null;
  closeLocationConfirm();
  cb(lat,lng);
}
// 百度地图按需加载（避免首屏同步加载 ~200KB 阻塞脚本；仅外勤地图用得到）
var _baiduMapPromise=null;
function ensureBaiduMap(){
  if(window.BMap&&window.BMap.Map)return Promise.resolve(window.BMap);
  if(_baiduMapPromise)return _baiduMapPromise;
  _baiduMapPromise=new Promise(function(resolve,reject){
    var done=false;
    function ok(){if(done)return;done=true;resolve(window.BMap)}
    window.__onBMapReady=function(){ok()};
    var s=document.createElement('script');
    s.async=true;
    s.src='https://api.map.baidu.com/api?v=3.0&ak=We6WBochlQEAiMK0DuQGyaN9Qz7yB4SU&callback=__onBMapReady';
    s.onerror=function(){if(done)return;done=true;_baiduMapPromise=null;reject(new Error('百度地图脚本加载失败'))};
    document.head.appendChild(s);
    // 兜底：部分网络环境下 callback 不触发，但脚本已就绪
    setTimeout(function(){if(window.BMap&&window.BMap.Map)ok();else if(!done){done=true;_baiduMapPromise=null;reject(new Error('百度地图加载超时'))}},10000);
  });
  return _baiduMapPromise;
}
function showLocationConfirm(lat,lng,titleText,callback){
  fwPendingLat=lat;fwPendingLng=lng;
  fwLocationConfirmCallback=callback;
  var modal=document.getElementById('fw-location-confirm');
  document.getElementById('fw-lc-title').textContent=titleText||'📍 确认定位';
  document.getElementById('fw-lc-info').innerHTML='<b>纬度:</b> '+lat.toFixed(6)+'&nbsp;&nbsp;<b>经度:</b> '+lng.toFixed(6);
  modal.classList.remove('hidden');
  modal.style.display='flex';modal.style.position='fixed';modal.style.top='0';modal.style.left='0';modal.style.width='100vw';modal.style.height='100vh';modal.style.background='rgba(0,0,0,.5)';modal.style.zIndex='9999';modal.style.alignItems='center';modal.style.justifyContent='center';
  var mcont=document.getElementById('fw-lc-map');
  mcont.innerHTML='<div id="fw-lc-bmap" style="width:100%;height:100%"></div>';
  ensureBaiduMap().then(function(){
    if(!window.BMap||!window.BMap.Map){mcont.innerHTML='<div style="text-align:center;padding:60px 0;color:var(--text3)">地图加载失败</div>';return}
    if(window._fwLcMap){window._fwLcMap.clearOverlays();window._fwLcMap=null}
    var map=new BMap.Map('fw-lc-bmap',{enableMapClick:false});
    map.addControl(new BMap.NavigationControl({anchor:BMAP_ANCHOR_TOP_LEFT,type:BMAP_NAVIGATION_CONTROL_SMALL}));
    map.enableScrollWheelZoom();
    window._fwLcMap=map;
    if(!window._gps2bd)window._gps2bd=new BMap.Convertor();
    window._gps2bd.translate([new BMap.Point(lng,lat)],1,5,function(r){
      var pt=r.points[0];
      map.centerAndZoom(pt,16);
      map.addOverlay(new BMap.Marker(pt));
      map.addOverlay(new BMap.Circle(pt,50,{strokeColor:'#3B82F6',strokeWeight:2,strokeOpacity:0.8,fillColor:'#3B82F6',fillOpacity:0.15}));
    });
  },function(){
    mcont.innerHTML='<div style="text-align:center;padding:60px 0;color:var(--text3)">地图加载失败，请检查网络</div>';
  });
}
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
    if(error){list.innerHTML='<div style="color:var(--danger);font-size:13px">加载失败: '+h(error.message)+'</div>';return}
    if(!visits||!visits.length){list.innerHTML='<div style="color:var(--text3);font-size:13px;text-align:center;padding:20px">暂无拜访记录</div>';return}
    var html='';
    for(var i=0;i<visits.length;i++){
      var v=visits[i];
      html+='<div class="fw-visit-card" style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px">';
      html+='<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">';
      html+='<div style="font-weight:600;font-size:14px">'+escHtml(v.client_name||'未命名客户')+'</div>';
      html+='<div style="display:flex;gap:6px">';
      html+='<button onclick="openSalesVisitForm('+v.id+')" style="padding:3px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);font-size:12px;cursor:pointer">编辑</button>';
      html+='<button onclick="deleteVisit('+v.id+')" style="padding:3px 10px;border:1px solid #ef4444;border-radius:6px;background:#fef2f2;color:#ef4444;font-size:12px;cursor:pointer">删除</button>';
      html+='</div></div>';
      html+='<div style="font-size:12px;color:var(--text2);margin-bottom:4px">📅 '+escHtml(v.visit_date||'')+(v.start_time?' '+escHtml(v.start_time):'')+'</div>';
      if(v.purpose)html+='<div style="font-size:13px;margin-bottom:2px"><b>目的:</b> '+escHtml(v.purpose)+'</div>';
      if(v.result)html+='<div style="font-size:13px;margin-bottom:2px"><b>结果:</b> '+escHtml(v.result)+'</div>';
      if(v.notes)html+='<div style="font-size:13px;margin-bottom:2px"><b>备注:</b> '+escHtml(v.notes)+'</div>';
      if(v.latitude&&v.longitude)html+='<div style="font-size:11px;color:var(--text3);margin-top:4px">📍 '+v.latitude.toFixed(6)+', '+v.longitude.toFixed(6)+'</div>';
      html+='</div>';
    }
    list.innerHTML=html;
  }catch(e){list.innerHTML='<div style="color:var(--danger);font-size:13px">加载失败: '+h(e.message||e)+'</div>';console.error('loadFWVisits:',e)}
}

function openFVisit(id){
  fwVisitEditId=id||null;
  fwVisitClientId=null;
  var modal=document.getElementById('fw-visit-modal');
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

function closeFVisit(){
  fwVisitEditId=null;fwVisitClientId=null;
  var modal=document.getElementById('fw-visit-modal');
  if(modal)modal.classList.add('hidden');
}

async function deleteVisit(id){
  if(!await uiConfirm('确定删除该拜访记录？'))return;
  try{
    var r=await sb.from('field_visits').delete().eq('id',id);
    if(r.error){showToast('删除失败: '+r.error.message);return}
    showToast('已删除');
    loadFWVisits();loadFWOverview();
  }catch(e){showToast('删除失败: '+(e.message||e))}
}


async function loadFWTrack(){
  // Clean up previous map instance
  if(window._fwMap){window._fwMap.clearOverlays();window._fwMap=null;}
  var today=new Date().toISOString().substring(0,10);
  var kpi=document.getElementById('fw-tr-kpi');
  var list=document.getElementById('fw-track-list');
  try{
    var {data:checks}=await sb.from('field_checkins').select('*').eq('user_id',currentUser.id).eq('company_id',currentCompanyId).gte('created_at',today).order('created_at',{ascending:true});
    var {data:visits}=await sb.from('field_visits').select('*').eq('user_id',currentUser.id).eq('company_id',currentCompanyId).eq('visit_date',today);
    var points=0;if(checks){for(var i=0;i<checks.length;i++){if(checks[i].latitude)points++}}
    if(visits){for(var i=0;i<visits.length;i++){if(visits[i].latitude)points++}}
    if(kpi)kpi.innerHTML='<div class="fw-kpi-card"><div class="kpi-label">📍 轨迹点数</div><div class="kpi-val">'+points+'</div></div>'
      +'<div class="fw-kpi-card"><div class="kpi-label">📅 签到次数</div><div class="kpi-val">'+(checks?checks.length:0)+'</div></div>'
      +'<div class="fw-kpi-card"><div class="kpi-label">🏢 拜访次数</div><div class="kpi-val">'+(visits?visits.length:0)+'</div></div>'
      +'<div class="fw-kpi-card"><div class="kpi-label">📏 覆盖客户</div><div class="kpi-val">'+(visits?new Set(visits.map(function(x){return x.client_id||x.client_name})).size:0)+'</div></div>';
    var mcont=document.getElementById('fw-map-container');
  if(points===0){
    mcont.innerHTML='<div style="text-align:center;padding:40px"><div style="font-size:48px;margin-bottom:12px">🗺️</div><div style="font-size:14px;color:var(--text2)">暂无GPS定位数据<br><span style="font-size:12px;color:var(--text3)">请使用支持GPS的设备签到以生成轨迹</span></div></div>';
    if(window._fwMap){window._fwMap.clearOverlays();window._fwMap=null}
  } else {
    // Render real map with check-in points
    mcont.innerHTML='<div id="fw-baidu-map" style="width:100%;height:100%"></div>';
    ensureBaiduMap().then(function(){
      if(!window.BMap||!window.BMap.Map){mcont.innerHTML='<div style="text-align:center;padding:40px"><div style="font-size:48px">🗺️</div><div>百度地图加载中...<br><span style="font-size:12px;color:var(--text3)">如持续显示，请检查百度地图AK是否正确</span></div></div>';return}
      if(window._fwMap){window._fwMap.clearOverlays();window._fwMap=null;}
      var map=new BMap.Map('fw-baidu-map',{enableMapClick:false});
      map.addControl(new BMap.NavigationControl({anchor:BMAP_ANCHOR_TOP_LEFT,type:BMAP_NAVIGATION_CONTROL_SMALL}));
      map.centerAndZoom(new BMap.Point(116.404,39.915),12);
      map.enableScrollWheelZoom();
      window._fwMap=map;
      // GPS→BD-09 coordinate converter
      function toBaidu(lat,lng){
        if(!window._gps2bd) window._gps2bd=new BMap.Convertor();
        return new Promise(function(res){
          window._gps2bd.translate([new BMap.Point(lng,lat)],1,5,function(data){res(data.points[0])})
        });
      }
      // Collect all points
      var allPts=[];
      if(checks){for(var i=0;i<checks.length;i++){var ck=checks[i];if(!ck.latitude)continue;
        allPts.push({lat:ck.latitude,lng:ck.longitude,label:(ck.type==='in'?'📍 签到':'🏠 签退'),note:ck.note,time:new Date(ck.created_at).toLocaleTimeString('zh-CN'),icon:'📍'});
      }}
      if(visits){for(var i=0;i<visits.length;i++){var vt=visits[i];if(!vt.latitude)continue;
        allPts.push({lat:vt.latitude,lng:vt.longitude,label:'🏢 '+h(vt.client_name||'未知'),note:vt.purpose,time:vt.visit_date,icon:'🏢'});
      }}
      if(!allPts.length) return;
      // Convert and add markers
      Promise.all(allPts.map(function(pt){
        return toBaidu(pt.lat,pt.lng).then(function(baiduPt){
          var mk=new BMap.Marker(baiduPt);
          var info=new BMap.InfoWindow(escHtml(pt.label)+(pt.note?': '+escHtml(pt.note):'')+'<br><small>'+escHtml(pt.time)+'</small>',{width:200});
          mk.addEventListener('click',function(){map.openInfoWindow(info,baiduPt)});
          map.addOverlay(mk);
          return baiduPt;
        });
      })).then(function(results){
        if(results.length>0){
          var view=map.getViewport(results);
          map.setViewport(results);
        }
      });
    },function(){
      mcont.innerHTML='<div style="text-align:center;padding:40px"><div style="font-size:48px">🗺️</div><div>地图加载失败，请检查网络</div></div>';
    });
  }
    // Track timeline
    var tlHtml='<h4 style="margin:0 0 10px;font-size:14px;font-weight:600">📋 今日时间线</h4>';
    var events=[];if(checks){for(var i=0;i<checks.length;i++){events.push({time:checks[i].created_at,text:(checks[i].type==='in'?'📍 签到':'🏠 签退')+(checks[i].note?': '+checks[i].note:''),type:checks[i].type})}}
    if(visits){for(var i=0;i<visits.length;i++){events.push({time:visits[i].visit_date+'T'+(visits[i].start_time||'00:00'),text:'🏢 拜访 '+visits[i].client_name+(visits[i].purpose?' - '+visits[i].purpose:''),type:'visit'})}}
    events.sort(function(a,b){return a.time<b.time?-1:1});
    if(events.length){tlHtml+='<div class="fw-timeline">';for(var i=0;i<events.length;i++){var e=events[i],ts=e.time?new Date(e.time):null;tlHtml+='<div class="fw-timeline-item '+(e.type||'in')+'"><div class="fw-timeline-time">'+(ts?ts.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):'')+'</div><div class="fw-timeline-addr">'+h(e.text)+'</div></div>'}tlHtml+='</div>'}
    else{tlHtml+='<div style="color:var(--text3);font-size:13px">暂无今日活动</div>'}
    if(list)list.innerHTML=tlHtml;
  }catch(e){console.error(e);if(kpi)kpi.innerHTML='<div style="color:var(--danger)">加载失败</div>'}
}

async function loadFWStats(){
  var period=document.getElementById('fw-stats-period').value;
  var selUser=document.getElementById('fw-stats-user').value;
  var content=document.getElementById('fw-stats-content');
  if(!content)return;
  content.innerHTML='<div style="color:var(--text3);font-size:13px">加载中...</div>';
  // Calculate date range
  var dt=new Date();var start='';
  if(period==='week'){dt.setDate(dt.getDate()-7);start=dt.toISOString().substring(0,10)}
  else if(period==='month'){start=new Date().toISOString().substring(0,7)+'-01'}
  else{dt.setMonth(dt.getMonth()-3);start=dt.toISOString().substring(0,10)}
  try{
    var query=sb.from('field_visits').select('*').eq('company_id',currentCompanyId).gte('visit_date',start);
    if(selUser!=='all')query=query.eq('user_id',selUser);
    var {data}=await query;
    if(!data||!data.length){content.innerHTML='<div style="text-align:center;color:var(--text3);padding:40px 0">暂无数据</div>';return}
    // Aggregate by user
    var userMap={};
    for(var i=0;i<data.length;i++){var v=data[i];if(!userMap[v.user_id])userMap[v.user_id]={name:'',count:0,done:0};userMap[v.user_id].count++;if(v.result==='done')userMap[v.user_id].done++}
    // Resolve names
    if(allUsers){for(var i=0;i<allUsers.length;i++){var u=allUsers[i];if(userMap[u.user_id]&&!userMap[u.user_id].name)userMap[u.user_id].name=u.display_name||u.email||u.user_id}}
    var html='';
    var keys=Object.keys(userMap);keys.sort(function(a,b){return userMap[b].count-userMap[a].count});
    for(var i=0;i<keys.length;i++){
      var um=userMap[keys[i]];
      var name=um.name||keys[i].substring(0,8);
      html+='<div class="fw-stat-card" style="margin-bottom:8px"><div class="stat-name">'+h(name)+'</div>'
        +'<div class="stat-bar"><div class="stat-fill" style="width:'+Math.round(um.done/um.count*100)+'%"></div></div>'
        +'<div class="stat-nums">总拜访 '+um.count+' 次 | 达成 '+um.done+' 次 | 达成率 '+Math.round(um.done/um.count*100)+'%</div></div>';
    }
    // Also show purpose breakdown
    var purpMap={};
    for(var i=0;i<data.length;i++){var p=data[i].purpose||'未分类';purpMap[p]=(purpMap[p]||0)+1}
    html+='<h4 style="margin:16px 0 8px;font-size:14px">🎯 拜访目的分布</h4>';
    var pkeys=Object.keys(purpMap);pkeys.sort(function(a,b){return purpMap[b]-purpMap[a]});
    for(var i=0;i<pkeys.length;i++){html+='<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px"><span>'+h(pkeys[i])+'</span><span style="color:var(--primary);font-weight:600">'+purpMap[pkeys[i]]+'</span></div>'}
    html+='<div style="margin-top:8px;font-size:13px;color:var(--text3)">总计 '+data.length+' 条拜访记录</div>';
    content.innerHTML=html;
    // Populate user dropdown
    var sel=document.getElementById('fw-stats-user');
    var opts='<option value="all">全部员工</option>';
    if(allUsers){for(var i=0;i<allUsers.length;i++){opts+='<option value="'+allUsers[i].user_id+'">'+h(allUsers[i].display_name||allUsers[i].email||allUsers[i].user_id.substring(0,8))+'</option>'}}
    sel.innerHTML=opts;
    sel.value=selUser;
  }catch(e){console.error(e);content.innerHTML='<div style="color:var(--danger)">加载失败</div>'}
}

// ============= 项目详情页 (独立视图) =============
var curDetailId=null;
var curDetailState='todo';
var curDetailBlocks=[];
var curDetailAssignments=[];
var curDetailProject=null;

async function renderProjectDetail(pid){
  try{
  curDetailId=pid;
  curDetailState='todo';

  var v=document.getElementById('project-detail-view');
  v.classList.remove('hidden');
  v.style.display='flex';

  var main=document.getElementById('main-screen');
  if(main)main.style.display='none';

  var r=await sb.from('projects').select('*').eq('id',pid).single();
  if(r.error||!r.data){showToast('项目不存在','error');closeProjectDetail();return}
  curDetailProject=r.data;
  document.getElementById('pd-pid-badge').textContent='#'+pid;
  document.getElementById('pd-title').textContent=r.data.name||'未命名项目';
  document.getElementById('pd-owner-info').textContent='负责人: '+(r.data.owner_email||'未指派');

  var ra=await sb.from('project_assignments').select('*').eq('project_id',pid);
  curDetailAssignments=ra.data||[];

  var perm='none';
  if(typeof isSuperAdmin!=='undefined'&&isSuperAdmin)perm='admin';
  else if(typeof currentUserRole!=='undefined'&&currentUserRole==='admin')perm='admin';
  else if(curDetailProject.owner_id===currentUser.id)perm='owner';
  else{
    var my=curDetailAssignments.find(function(a){return a.user_id===currentUser.id});
    if(my)perm=my.project_role;
  }
  var permMap={admin:'全部(管理员)',owner:'全部(项目所有者)',edit:'编辑权限',view:'只读',approve:'审批权限',none:'无权限'};
  document.getElementById('pd-perm-info').textContent='权限: '+(permMap[perm]||perm);

  if(typeof loadTemplates==='function')await loadTemplates();
  var tpl=null;
  if(curDetailProject.template_id&&typeof allTemplates!=='undefined'){
    tpl=allTemplates.find(function(t){return t.id==curDetailProject.template_id});
  }
  if(!tpl&&typeof allTemplates!=='undefined'&&allTemplates.length>0)tpl=allTemplates[0];

  curDetailBlocks=[];
  if(tpl&&tpl.steps){
    var steps=Array.isArray(tpl.steps)?tpl.steps:[];
    steps.forEach(function(st,i){
      curDetailBlocks.push({
        key:st.key||('step_'+i),
        label:st.label||st.name||('步骤 '+(i+1)),
        data:curDetailProject['step_'+i]||{},
        visible_to:st.block_visible_to||[],
        editable_to:st.block_editable_to||[],
        department:st.department||'',
        panel:st.panel||null,
        seq:i  // 使用索引而不是 st.seq，确保和 project_step_assignees 的 step_key 匹配
      });
    });
  }
  if(curDetailBlocks.length===0){
    curDetailBlocks=[{key:'basic',label:'基本信息',data:curDetailProject,visible_to:[],editable_to:[]}];
  }

  var rs=await sb.from('project_block_state').select('*').eq('project_id',pid);
  var blockStates=rs.data||[];
  curDetailBlocks.forEach(function(b){
    var st=blockStates.find(function(x){return x.block_key===b.key});
    b.state=st?st.status:'pending';
  });

  if(curDetailProject.current_state){
    var stateMap={todo:'待办',doing:'在办',done:'办结',archived:'归档'};
    document.getElementById('pd-owner-info').textContent='负责人: '+(curDetailProject.owner_email||'-')+' | 状态: '+(stateMap[curDetailProject.current_state]||curDetailProject.current_state);
  }

  switchDetailTab('todo');
  }catch(e){
    console.error('renderProjectDetail error:',e);
    showToast('加载项目详情失败: '+(e.message||e));
    closeProjectDetail();
  }
}

function closeProjectDetail(){
  var v=document.getElementById('project-detail-view');
  v.classList.add('hidden');
  v.style.display='none';
  var main=document.getElementById('main-screen');
  if(main)main.style.display='';
  curDetailId=null;
}

function switchDetailTab(status){
  curDetailState=status;
  document.querySelectorAll('.pd-status-tab').forEach(function(el){
    el.classList.toggle('active',el.dataset.status===status);
  });
  renderDetailBlocks();
}

function renderDetailBlocks(){
  // Async wrapper
  renderDetailBlocksAsync().catch(function(e){console.error('renderDetailBlocks error:',e);});
}
async function renderDetailBlocksAsync(){
  var c=document.getElementById('pd-blocks-container');
  var perm=getCurrentPerm();

  // 加载字段配置和数据
  var allFields=[];
  var allValues=[];
  try{
    var r1=await sb.from('project_step_fields').select('*').eq('project_id',curDetailId).order('step_key,sort_order');
    allFields=r1.data||[];
    var r2=await sb.from('project_step_field_values').select('*').eq('project_id',curDetailId);
    allValues=r2.data||[];
  }catch(e){console.warn('load step fields failed:',e);}

  var visible=curDetailBlocks.filter(function(b){
    if(curDetailState==='todo')return b.state==='pending'||b.state==='in_progress';
    if(curDetailState==='doing')return b.state==='in_progress';
    if(curDetailState==='done')return b.state==='done'||b.state==='skipped';
    return true;
  });

  if(visible.length===0){
    c.innerHTML='<div class="pd-no-access">该状态下没有可见的区块</div>';
    return;
  }

  var html='';
  visible.forEach(function(b){
    if(!canViewBlock(b,perm))return;
    var canEdit=canEditBlock(b,perm);
    var collapsed=b.state==='done'?'collapsed':'';
    var statusLabel={pending:'待办',in_progress:'进行中',done:'已完成',skipped:'已跳过'}[b.state]||b.state;

    html+='<div class="pd-block '+collapsed+'" data-key="'+b.key+'" data-seq="'+b.seq+'" draggable="true" ondragstart="pdBlockDragStart(event)" ondragover="pdBlockDragOver(event)" ondrop="pdBlockDrop(event)" ondragend="pdBlockDragEnd(event)">';
    html+='<div class="pd-block-header" onclick="if(event.target.closest(\'.pd-block-edit-btn\'))return;this.parentElement.classList.toggle(\'collapsed\')" style="cursor:grab">';
    html+='<div class="pd-block-title"><span class="pd-drag-handle" style="margin-right:6px;color:var(--text3)">⠿</span><span class="pd-seq-badge">#'+b.seq+'</span>'+escHtml(b.label);
    if(b.department)html+=' <span class="pd-dept-tag">'+escHtml(b.department)+'</span>';
    html+='</div>';
    html+='<div style="display:flex;align-items:center;gap:8px">';
    // 管理员的编辑入口
    if(isAdmin()){
      html+='<button class="pd-block-edit-btn" onclick="event.stopPropagation();pdEditStep(\''+b.key+'\')" style="font-size:11px;padding:2px 8px;border:1px solid var(--border);border-radius:4px;background:var(--bg);color:var(--text2);cursor:pointer" title="编辑步骤属性">⚙</button>';
    }
    html+='<span class="pd-block-status '+b.state+'">'+statusLabel+'</span>';
    html+='<span class="pd-block-toggle">▼</span>';
    html+='</div></div>';

    html+='<div class="pd-block-body">';
    // Check if data has actual fields to render
    var dataKeys=b.data&&typeof b.data==='object'&&!Array.isArray(b.data)?Object.keys(b.data).filter(function(k){return !k.startsWith('_')}):[];
    if(dataKeys.length>0){
      dataKeys.forEach(function(k){
        var v=b.data[k];
        html+='<div class="pd-block-row">';
        html+='<div class="pd-block-label">'+escHtml(k)+'</div>';
        if(canEdit){
          html+='<input class="pd-block-input" data-block="'+b.key+'" data-field="'+escHtml(k)+'" value="'+escHtml(String(v==null?'':v))+'">';
        }else{
          html+='<div class="pd-block-value">'+escHtml(String(v==null?'-':v))+'</div>';
        }
        html+='</div>';
      });
    }else if(b.panel){
      // 从数据库获取该步骤的字段配置和数据
      var stepKey='step_'+b.seq;
      var stepFields=allFields.filter(function(f){return f.step_key===stepKey;});
      var stepValues=allValues.filter(function(v){return v.step_key===stepKey;});
      html+=renderPanelContent(b.panel,b.seq,canEdit,stepFields,stepValues);
    }else{
      html+='<div class="pd-block-value" style="color:var(--text3);padding:20px;text-align:center">暂无数据</div>';
    }

    if(b.visible_to&&b.visible_to.length>0){
      html+='<div class="pd-block-views">可见: ';
      b.visible_to.forEach(function(d){html+='<span class="pd-dept-tag">'+escHtml(d)+'</span>'});
      html+='</div>';
    }
    html+='</div></div>';
  });

  if(!html){
    c.innerHTML='<div class="pd-no-access">当前权限下无可查看的区块</div>';
    return;
  }
  c.innerHTML=html;
}

function renderPanelContent(panel,seq,canEdit,stepFields,stepValues){
  var html='';
  var fields=stepFields||[];
  var values=stepValues||[];
  var valueMap={};
  values.forEach(function(v){valueMap[v.field_key]=v.field_value;});
  
  if(fields.length===0){
    html+='<div style="padding:20px;text-align:center;color:var(--text3);font-size:13px">暂无配置字段，管理员可在"配置成员→字段配置"中添加</div>';
    return html;
  }

  // 按 sort_order 排序
  fields.sort(function(a,b){return (a.sort_order||99)-(b.sort_order||99);});

  // 检查是否有串行字段
  var hasSerial=fields.some(function(f){return f.collaboration_mode==='serial';});

  if(hasSerial){
    // 串行模式：计算每个字段的可用状态
    // 规则：第一个串行字段始终可填；后续字段需前一个字段有值才解锁
    var prevSerialCompleted=true;
    fields.forEach(function(f,i){
      if(f.collaboration_mode==='serial'){
        f._unlocked=prevSerialCompleted&&canEdit;
        f._prevFk=f.depends_on||null;
        var fv=valueMap[f.field_key]||'';
        prevSerialCompleted=!!fv;
      }else{
        f._unlocked=canEdit;
      }
    });
  }

  html+='<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:16px">';
  html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
  fields.forEach(function(f){
    var val=valueMap[f.field_key]||f.default_value||'';
    var fieldCanEdit=hasSerial?(f._unlocked!==false):canEdit;
    var lockedStyle=fieldCanEdit?'':'opacity:0.5;pointer-events:none';
    var lockIcon='';
    if(!fieldCanEdit&&f.collaboration_mode==='serial'){
      lockIcon=' 🔒<span style="font-size:10px;color:var(--text3)">需完成上一步</span>';
    }
    var modeTag=f.collaboration_mode==='serial'?'<span style="font-size:10px;background:#f59e0b20;color:#f59e0b;padding:2px 6px;border-radius:3px;margin-left:6px">串行</span>':'';
    html+='<div style="grid-column:'+(f.field_type==='textarea'?'1 / -1':'auto')+'" class="field-row" data-field="'+escHtml(f.field_key)+'" data-mode="'+(f.collaboration_mode||'parallel')+'">';
    html+='<label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px">'+escHtml(f.field_label)+(f.is_required?'<span style="color:#ef4444">*</span>':'')+modeTag+lockIcon+'</label>';
    if(f.field_type==='textarea'){
      html+='<textarea data-panel="'+panel+'" data-step="'+seq+'" data-field="'+escHtml(f.field_key)+'" data-field-id="'+f.id+'" '+(fieldCanEdit?'':'disabled')+' rows="3" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text);resize:vertical" placeholder="'+escHtml(f.placeholder||'')+'">'+escHtml(val)+'</textarea>';
    }else if(f.field_type==='select'||f.field_type==='radio'){
      var opts=[];
      try{opts=typeof f.field_options==='string'?JSON.parse(f.field_options):(f.field_options||[]);}catch(e){}
      if(f.field_type==='select'){
        html+='<select data-panel="'+panel+'" data-step="'+seq+'" data-field="'+escHtml(f.field_key)+'" data-field-id="'+f.id+'" '+(fieldCanEdit?'':'disabled')+' style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)"><option value="">-</option>';
        opts.forEach(function(opt){html+='<option value="'+escHtml(String(opt))+'"'+(String(val)===String(opt)?' selected':'')+'>'+escHtml(String(opt))+'</option>';});
        html+='</select>';
      }else{
        html+='<div style="display:flex;gap:12px;flex-wrap:wrap;padding-top:4px">';
        opts.forEach(function(opt){html+='<label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer"><input type="radio" name="rf-'+f.field_key+'" value="'+escHtml(String(opt))+'" data-panel="'+panel+'" data-step="'+seq+'" data-field="'+escHtml(f.field_key)+'" '+(fieldCanEdit?'':'disabled')+''+(String(val)===String(opt)?' checked':'')+'> '+escHtml(String(opt))+'</label>';});
        html+='</div>';
      }
    }else if(f.field_type==='multiselect'){
      var mopts=[];
      try{mopts=typeof f.field_options==='string'?JSON.parse(f.field_options):(f.field_options||[]);}catch(e){}
      html+='<div style="display:flex;gap:12px;flex-wrap:wrap;padding-top:4px">';
      mopts.forEach(function(opt){html+='<label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer"><input type="checkbox" value="'+escHtml(String(opt))+'" data-panel="'+panel+'" data-step="'+seq+'" data-field="'+escHtml(f.field_key)+'" '+(fieldCanEdit?'':'disabled')+''+(String(val).includes(String(opt))?' checked':'')+'> '+escHtml(String(opt))+'</label>';});
      html+='</div>';
    }else if(f.field_type==='checkbox'){
      html+='<div style="padding-top:4px"><label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" data-panel="'+panel+'" data-step="'+seq+'" data-field="'+escHtml(f.field_key)+'" value="1" '+(fieldCanEdit?'':'disabled')+''+(val==='1'?' checked':'')+'> '+escHtml(f.field_label)+'</label></div>';
    }else if(f.field_type==='number'){
      html+='<input type="number" data-panel="'+panel+'" data-step="'+seq+'" data-field="'+escHtml(f.field_key)+'" data-field-id="'+f.id+'" '+(fieldCanEdit?'':'disabled')+' style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)" value="'+escHtml(val)+'" placeholder="'+escHtml(f.placeholder||'')+'">';
    }else if(f.field_type==='date'){
      html+='<input type="date" data-panel="'+panel+'" data-step="'+seq+'" data-field="'+escHtml(f.field_key)+'" data-field-id="'+f.id+'" '+(fieldCanEdit?'':'disabled')+' style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)" value="'+escHtml(val)+'">';
    }else{
      html+='<input type="text" data-panel="'+panel+'" data-step="'+seq+'" data-field="'+escHtml(f.field_key)+'" data-field-id="'+f.id+'" '+(fieldCanEdit?'':'disabled')+' style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)" value="'+escHtml(val)+'" placeholder="'+escHtml(f.placeholder||'')+'">';
    }
    html+='</div>';
  });
  html+='</div>';
  // 串行模式提示
  if(hasSerial){
    html+='<div style="margin-top:12px;padding:8px 12px;background:#f59e0b10;border:1px solid #f59e0b30;border-radius:8px;font-size:12px;color:var(--text2);display:flex;align-items:center;gap:6px"><span>🔗</span> 串行模式：按顺序填写，前一个字段保存后解锁下一个</div>';
  }
  if(canEdit){
    html+='<div style="text-align:center;margin-top:12px">';
    html+='<button onclick="savePanelData(\''+panel+'\','+seq+')" style="background:var(--primary);color:white;border:none;padding:8px 20px;border-radius:8px;cursor:pointer;font-size:14px">💾 保存</button>';
    html+='</div>';
  }
  html+='</div>';
  return html;
}

async function savePanelData(panel,seq){
  var inputs=document.querySelectorAll('[data-panel="'+panel+'"][data-step="'+seq+'"]');
  var values=[];
  inputs.forEach(function(el){
    if(el.disabled)return; // 跳过被锁定的串行字段
    var val=el.type==='checkbox'?(el.checked?el.value:''):el.value;
    if(val!==undefined){
      values.push({
        project_id:curDetailId,
        step_key:'step_'+seq,
        field_key:el.dataset.field,
        field_value:val,
        updated_by:currentUser?.id
      });
    }
  });
  try{
    var {error}=await sb.from('project_step_field_values').upsert(values,{onConflict:'project_id,step_key,field_key'});
    if(error)throw error;
    showToast('✅ 数据已保存');
    // 重新渲染以解锁串行下一步
    renderDetailBlocks();
  }catch(e){showToast('❌ 保存失败: '+e.message);}
}

// ===== 项目详情步骤拖拽重排 =====
var pdDragSrcIdx=-1;
function pdBlockDragStart(e){
  var block=e.target.closest('.pd-block');
  if(!block)return;
  pdDragSrcIdx=Array.from(block.parentElement.children).indexOf(block);
  block.classList.add('drag-src');
  e.dataTransfer.effectAllowed='move';
  e.dataTransfer.setData('text/plain','');
}
function pdBlockDragOver(e){
  e.preventDefault();
  e.dataTransfer.dropEffect='move';
  var block=e.target.closest('.pd-block');
  if(!block)return;
  var all=document.querySelectorAll('#pd-blocks-container .pd-block.drag-over');
  for(var i=0;i<all.length;i++)all[i].classList.remove('drag-over');
  block.classList.add('drag-over');
}
function pdBlockDragEnd(e){
  var all=document.querySelectorAll('#pd-blocks-container .pd-block');
  for(var i=0;i<all.length;i++){all[i].classList.remove('drag-src','drag-over');}
  pdDragSrcIdx=-1;
}
async function pdBlockDrop(e){
  e.preventDefault();
  var dropBlock=e.target.closest('.pd-block');
  if(!dropBlock||pdDragSrcIdx<0)return;
  var container=document.getElementById('pd-blocks-container');
  var blocks=Array.from(container.querySelectorAll('.pd-block'));
  var dropIdx=blocks.indexOf(dropBlock);
  if(dropIdx<0||dropIdx===pdDragSrcIdx)return;
  // 移动 DOM
  var srcBlock=blocks[pdDragSrcIdx];
  if(dropIdx>pdDragSrcIdx){
    container.insertBefore(srcBlock,dropBlock.nextElementSibling);
  }else{
    container.insertBefore(srcBlock,dropBlock);
  }
  pdDragSrcIdx=-1;
  // 更新 curDetailBlocks 顺序
  var newOrder=[];
  var allBlocks=container.querySelectorAll('.pd-block');
  for(var i=0;i<allBlocks.length;i++){
    var key=allBlocks[i].dataset.key;
    var b=curDetailBlocks.find(function(x){return x.key===key});
    if(b)newOrder.push(b);
  }
  curDetailBlocks=newOrder;
  // 写回数据库：更新 project_step_assignees 的 sort_order
  try{
    var upserts=[];
    for(var i=0;i<curDetailBlocks.length;i++){
      upserts.push({project_id:curDetailId,step_key:curDetailBlocks[i].key,sort_order:i});
    }
    var {error}=await sb.from('project_step_assignees').upsert(upserts,{onConflict:'project_id,step_key'});
    if(error)throw error;
    showToast('✅ 步骤顺序已更新');
  }catch(e){showToast('❌ 保存顺序失败: '+e.message);}
}
function pdEditStep(blockKey){
  if(!isAdmin())return;
  var b=curDetailBlocks.find(function(x){return x.key===blockKey});
  if(!b)return;
  // 查找模板步骤定义
  var tplStep=null;
  try{
    if(curDetailProject.template_id&&allTemplates){
      var t=allTemplates.find(function(x){return x.id===curDetailProject.template_id});
      if(t){
        var steps=typeof t.steps==='string'?JSON.parse(t.steps):(t.steps||[]);
        tplStep=steps.find(function(s){return(s.key||'step_')===blockKey});
      }
    }
  }catch(e){}
  // 加载已有覆盖值
  var overrides={};
  sb.from('project_step_assignees').select('*').eq('project_id',curDetailId).eq('step_key',blockKey).maybeSingle().then(function(r){
    if(r.data){ overrides = { label: r.data.step_label || b.label || '' }; }
    showPdEditModal(b,blockKey,overrides,tplStep);
  }).catch(function(){
    showPdEditModal(b,blockKey,{},tplStep);
  });
}
function showPdEditModal(b,blockKey,overrides,tplStep){
  var old=document.querySelector('.pd-edit-overlay');
  if(old)old.remove();
  // 合并当前值
  var label=overrides.label||b.label||'';
  var seq=overrides.seq!=null?overrides.seq:b.seq;
  var phase=overrides.phase||tplStep?.phase||'';
  var panel=overrides.panel||b.panel||tplStep?.panel||'';
  var decision=overrides.decision||b.decision||tplStep?.decision||false;
  var decisionAsk=overrides.decisionAsk||b.decisionAsk||tplStep?.decisionAsk||'';
  var decisionYes=overrides.decisionYes||b.decisionYes||tplStep?.decisionYes||'';
  var decisionNo=overrides.decisionNo||b.decisionNo||tplStep?.decisionNo||'';
  var nextStep=overrides.next_step||'';
  // 构建所有步骤选项供下拉
  var stepOptions='<option value="">默认(顺序下一个)</option>';
  curDetailBlocks.forEach(function(s){
    if(s.key!==blockKey){
      stepOptions+='<option value="'+escHtml(s.key)+'"'+(String(nextStep)===String(s.key)?' selected':'')+'>#'+s.seq+' '+escHtml(s.label)+'</option>';
    }
  });
  var panelOptions='<option value="">无</option>'+
    ['competitor','training','communication','bidding','contract','delivery','payment','editor'].map(function(v){
      return '<option value="'+v+'"'+(panel===v?' selected':'')+'>'+v+'</option>';
    }).join('');
  var overlay=document.createElement('div');overlay.className='pd-edit-overlay';
  overlay.innerHTML='<div class="pd-edit-sheet">'+
    '<h3 style="margin:0 0 12px;font-size:16px">⚙ 编辑步骤属性</h3>'+
    '<label>步骤序号</label><input id="pd-edit-seq" type="number" value="'+seq+'" min="0">'+
    '<label>步骤名称</label><input id="pd-edit-label" value="'+escHtml(label)+'" placeholder="步骤名称">'+
    '<label>所属阶段</label><input id="pd-edit-phase" value="'+escHtml(phase)+'" placeholder="如：线索、商机">'+
    '<label>面板类型</label><select id="pd-edit-panel">'+panelOptions+'</select>'+
    '<label>下一步骤</label><select id="pd-edit-next">'+stepOptions+'</select>'+
    '<div style="margin-top:12px;padding:10px;background:#fff3e0;border-radius:8px">'+
    '<label style="display:flex;align-items:center;gap:6px;margin-top:0"><input type="checkbox" id="pd-edit-decision" '+(decision?'checked':'')+' onchange="var d=this.checked;document.getElementById(\'pd-edit-da\').style.display=d?\'block\':\'none\';document.getElementById(\'pd-edit-dy\').style.display=d?\'block\':\'none\';document.getElementById(\'pd-edit-dn\').style.display=d?\'block\':\'none\'"> 这是判断节点</label>'+
    '<div id="pd-edit-da" style="display:'+(decision?'block':'none')+'"><label>判断问题</label><input id="pd-edit-decision-ask" value="'+escHtml(decisionAsk)+'" placeholder="如：是否通过？"></div>'+
    '<div id="pd-edit-dy" style="display:'+(decision?'block':'none')+'"><label>✓ 是 → 跳转步骤</label><select id="pd-edit-decision-yes">'+stepOptions.replace(/默认/g,'不跳转')+'</select></div>'+
    '<div id="pd-edit-dn" style="display:'+(decision?'block':'none')+'"><label>✗ 否 → 跳转步骤</label><select id="pd-edit-decision-no">'+stepOptions.replace(/默认/g,'不跳转')+'</select></div>'+
    '</div>'+
    '<div class="pd-edit-btns">'+
    '<button onclick="this.closest(\'.pd-edit-overlay\').remove()" style="background:var(--bg2);color:var(--text)">取消</button>'+
    '<button onclick="pdSaveStepEdit(\''+blockKey+'\')" style="background:var(--primary);color:#fff">💾 保存</button>'+
    '</div></div>';
  overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.remove();});
  document.body.appendChild(overlay);
}
async function pdSaveStepEdit(blockKey){
  var b=curDetailBlocks.find(function(x){return x.key===blockKey});
  if(!b)return;
  var seq=parseInt(document.getElementById('pd-edit-seq').value)||0;
  var label=document.getElementById('pd-edit-label').value.trim();
  var phase=document.getElementById('pd-edit-phase').value.trim();
  var panel=document.getElementById('pd-edit-panel').value;
  var nextStep=document.getElementById('pd-edit-next').value;
  var decision=document.getElementById('pd-edit-decision').checked;
  var decisionAsk='',decisionYes='',decisionNo='';
  if(decision){
    decisionAsk=document.getElementById('pd-edit-decision-ask').value.trim();
    decisionYes=document.getElementById('pd-edit-decision-yes').value;
    decisionNo=document.getElementById('pd-edit-decision-no').value;
  }
  var config={
    seq:seq,label:label,phase:phase,panel:panel||null,
    next_step:nextStep||null,
    decision:decision,decisionAsk:decisionAsk||null,decisionYes:decisionYes||null,decisionNo:decisionNo||null
  };
  // 删除 null 值
  Object.keys(config).forEach(function(k){if(config[k]===null||config[k]===undefined)delete config[k];});
  try{
    var {error}=await sb.from('project_step_assignees').upsert({
      project_id:curDetailId,step_key:blockKey,step_label:label,step_config:config,
      updated_at:new Date().toISOString()
    },{onConflict:'project_id,step_key'});
    if(error)throw error;
    // 立即更新 curDetailBlocks
    b.seq=seq;b.label=label;b.phase=phase;b.panel=panel||null;
    b.decision=decision;b.decisionAsk=decisionAsk;b.decisionYes=decisionYes;b.decisionNo=decisionNo;
    b.next_step=nextStep||null;
    document.querySelector('.pd-edit-overlay').remove();
    showToast('✅ 步骤属性已更新');
    renderDetailBlocks();
  }catch(e){showToast('❌ 保存失败: '+e.message);}
}
