// ==========================================================================
// grsds · 13-crm360.js  —  Client360 · 线索公海 · 协作 · 日程/任务/审批
// 源: js/app_v2.js 第 8747-9873 行（机械切片，未改一行代码）
// ==========================================================================
// ============ NEW: Client 360 Functions ============
function closeClient360(){
  document.getElementById('client360-modal').classList.add('hidden');
  c360ClientId=null;
}

async function openClient360(clientId){
  c360ClientId=clientId;
  var c=allClients.find(function(x){return x.id===clientId});
  if(!c){showToast('客户不存在');return}
  // Load client data
  var badgeHtml='';
  if(c.grade)badgeHtml+='<span class="grade-badge '+h(c.grade)+'">'+h(c.grade)+'级</span>';
  var stageMap={prospect:'潜在客户',qualified:'合格线索',deal:'成交客户',atrisk:'流失预警',churned:'流失客户',repurchase:'复购客户'};
  var stage=c.lifecycle_stage||'prospect';
  badgeHtml+=' <span class="lifecycle-badge '+h(stage)+'">'+(stageMap[stage]||stage)+'</span>';
  document.getElementById('c360-name').textContent=c.name||'';
  document.getElementById('c360-badges').innerHTML=badgeHtml;
  // Load orders
  var {data:orders}=await sb.from('orders').select('*').eq('client_id',clientId).eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
  c360Orders=orders||[];
  for(var oi=0;oi<c360Orders.length;oi++){
    c360Orders[oi]._amount=c360Orders[oi].amount||0;
    var dec=await decryptAmount(c360Orders[oi].amount_enc||'');
    if(dec)c360Orders[oi]._amount=parseFloat(dec)||0;
  }
  switchClient360Tab('overview');
  document.getElementById('client360-modal').classList.remove('hidden');
}

function switchClient360Tab(tab){
  c360ActiveTab=tab;
  var tabs=document.querySelectorAll('.client-360-tab');
  for(var i=0;i<tabs.length;i++)tabs[i].classList.toggle('active',tabs[i].getAttribute('data-tab')===tab);
  var c=allClients.find(function(x){return x.id===c360ClientId});
  if(!c)return;
  if(tab==='overview')renderClient360Overview(c,c360Orders);
  else if(tab==='contacts')renderClient360Contacts(c);
  else if(tab==='orders')renderClient360Orders(c);
  else if(tab==='engagements')renderClient360Engagements(c.id);
  else if(tab==='lifecycle')renderClient360Lifecycle(c.id);
}

async function renderClient360Overview(c,orders){
  var stageMap={prospect:'潜在客户',qualified:'合格线索',deal:'成交客户',atrisk:'流失预警',churned:'流失客户',repurchase:'复购客户'};
  var totalRev=0,paidCount=0;
  for(var i=0;i<orders.length;i++){totalRev+=parseFloat(orders[i].amount||0)||parseFloat(orders[i]._amount||0);if(orders[i].stage==='已完成')paidCount++}
  var lastEng='无';
  (async function(){
    var {data}=await sb.from('engagement_logs').select('created_at').eq('client_id',c.id).eq('company_id',currentCompanyId).order('created_at',{ascending:false}).limit(1);
    if(data&&data.length)lastEng=new Date(data[0].created_at).toLocaleDateString('zh-CN');
    var el=document.getElementById('c360-last-engage');if(el)el.textContent=lastEng;
  })();
  var html='<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn-sm btn-sm-primary" onclick="closeClient360();openForm(\''+c.id+'\')">✏️ 编辑客户</button></div>';
  // ── 项目信息
  var projs=[];
  try{projs=JSON.parse(c.projects||'[]');if(!Array.isArray(projs))projs=[]}catch(e){projs=[]}
  if(projs.length>0){
    html+='<div class="c360-card"><div class="c360-card-title">📦 项目信息</div>';
    for(var pj=0;pj<projs.length;pj++){
      var pr=projs[pj];
      html+='<div style="margin-bottom:10px;padding:10px;background:var(--primary-light);border-radius:8px">';
      html+='<div style="font-weight:600;font-size:14px;margin-bottom:6px">'+h(pr.project_name||'项目#'+(pj+1))+'</div>';
      var pfields=[['招标日期',pr.bidding_date||'-'],['中标人',pr.bidder_name||'-'],['中标人电话',pr.bidder_phone||'-'],['中标公司',pr.bidder_company||'-'],['中标金额',pr.bid_amount?formatMoney(pr.bid_amount):'-']];
      for(var pf=0;pf<pfields.length;pf++)html+='<div class="c360-info-row" style="font-size:12px"><span class="c360-info-label">'+pfields[pf][0]+'</span><span class="c360-info-value">'+h(pfields[pf][1])+'</span></div>';
      html+='</div>';
    }
    html+='</div>';
  }
  // ── 基本信息
  html+='<div class="c360-card"><div class="c360-card-title">📋 基本信息</div>';
  var rows=[
    ['行业',c.industry||'-'],['规模',c.scale||'-'],['来源',c.source||'-'],
    ['信用等级',c.credit_rating||'-'],['客户等级',c.grade?c.grade+'级':'-'],
    ['生命周期',stageMap[c.lifecycle_stage||'prospect']||'-'],
    ['地址',c.address||'-'],['备注',c.notes||'-']
  ];
  for(var j=0;j<rows.length;j++)html+='<div class="c360-info-row"><span class="c360-info-label">'+rows[j][0]+'</span><span class="c360-info-value">'+h(rows[j][1])+'</span></div>';
  html+='</div>';
  html+='<div class="c360-card"><div class="c360-card-title">📊 统计</div><div class="c360-stats">';
  html+='<div class="c360-stat-item"><div class="c360-stat-num">'+orders.length+'</div><div class="c360-stat-label">订单数</div></div>';
  html+='<div class="c360-stat-item"><div class="c360-stat-num">'+formatMoney(totalRev)+'</div><div class="c360-stat-label">成交额</div></div>';
  html+='<div class="c360-stat-item"><div class="c360-stat-num" id="c360-last-engage">'+lastEng+'</div><div class="c360-stat-label">最近跟进</div></div>';
  html+='</div></div>';
  // Tags
  var tags=[];
  try{tags=JSON.parse(c.tags||'[]');if(!Array.isArray(tags))tags=[]}catch(e){tags=[]}
  if(tags.length>0){
    html+='<div class="c360-card"><div class="c360-card-title">🏷 标签</div>';
    for(var k=0;k<tags.length;k++)html+='<span class="tag-chip">'+h(tags[k])+'</span> ';
    html+='</div>';
  }
  document.getElementById('c360-body').innerHTML=html;
}

function renderClient360Contacts(c){
  var contacts=allContacts.filter(function(co){return co.client_id===c.id});
  var html='';
  if(contacts.length===0)html='<div class="empty" style="padding:40px">暂无联系人</div>';
  else{
    for(var i=0;i<contacts.length;i++){
      var co=contacts[i];
      var dm=co.is_decision_maker?' ⭐':'',bd='';
      if(co.birthday){var bdDate=new Date(co.birthday);if(!isNaN(bdDate.getTime()))bd='<span style="font-size:11px;color:var(--warning)">🎂 '+bdDate.toLocaleDateString('zh-CN')+'</span>'}
      var rel=co.relationship_to?'<span style="font-size:11px;color:var(--text3)">关系: '+h(co.relationship_to)+'</span>':'';
      var phs=[],lls=[],ems=[];
      try{phs=JSON.parse(co.phone||'[]');if(!Array.isArray(phs))phs=[co.phone||'']}catch(e){phs=['']}
      try{lls=JSON.parse(co.landline||'[]');if(!Array.isArray(lls))lls=[]}catch(e){lls=[]}
      try{ems=JSON.parse(co.email||'[]');if(!Array.isArray(ems))ems=[]}catch(e){ems=[]}
      html+='<div class="c360-contact-item"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div class="c360-contact-name">'+h(co.name||'未命名')+dm+'</div><button onclick="event.stopPropagation();transferFrom360(\''+co.id+'\')" style="font-size:11px;color:var(--primary);border:1px solid var(--primary);border-radius:12px;background:transparent;padding:2px 10px;cursor:pointer;flex-shrink:0">转移</button></div>';
      html+='<div class="c360-contact-info">';
      if(co.dept)html+='<span>🏢 '+h(co.dept)+'</span>';
      if(co.position)html+='<span>💼 '+h(co.position)+'</span>';
      if(phs.length&&phs[0])html+='<span>📞 '+h(phs.join(' / '))+'</span>';
      if(lls.length&&lls[0])html+='<span>🖥 '+h(lls.join(' / '))+'</span>';
      if(ems.length&&ems[0])html+='<span>📧 '+h(ems.join(' / '))+'</span>';
      var ed=co.entered_date?'<span style="font-size:11px;color:var(--text3)">📝 录入时间: '+h(String(co.entered_date).slice(0,10))+'</span>':'';
      html+='</div><div class="c360-contact-badges">'+bd+rel+ed+'</div></div>';
    }
  }
  document.getElementById('c360-body').innerHTML=html;
}

function renderClient360Orders(c){
  var orders=c360Orders||[];
  var html='';
  if(orders.length===0)html='<div class="empty" style="padding:40px">暂无订单</div>';
  else{
    for(var i=0;i<orders.length;i++){
      var o=orders[i],stage=o.stage||'谈判中';
      var stageColor={谈判中:'#F59E0B',已签约:'#3B82F6',执行中:'#8B5CF6',已完成:'#10B981',已取消:'#EF4444'};
      html+='<div class="c360-card" style="cursor:pointer" onclick="openOrderForm(\''+o.id+'\')"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-weight:600">'+h(o.order_number||'')+'</span><span style="font-size:10px;padding:2px 8px;border-radius:8px;background:'+(stageColor[stage]||'#94A3B8')+';color:#fff">'+h(stage)+'</span></div>';
      if(o.project_name)html+='<div style="font-size:13px;margin-top:4px">📋 '+h(o.project_name)+'</div>';
      html+='<div style="font-size:12px;color:var(--text3);margin-top:4px">'+formatMoney(parseFloat(o.amount||0))+(o.start_date?' · '+o.start_date:'')+'</div></div>';
    }
  }
  document.getElementById('c360-body').innerHTML=html;
}

async function renderClient360Engagements(clientId){
  var {data:logs}=await sb.from('engagement_logs').select('*').eq('client_id',clientId).eq('company_id',currentCompanyId).order('created_at',{ascending:false});
  var html='<div style="margin-bottom:12px"><button class="btn-sm btn-sm-primary" onclick="toggleEngagementForm()" id="btn-new-engage">+ 新增跟进</button></div>';
  html+='<div class="engagement-form hidden" id="engagement-form"><h4>新增跟进记录</h4>';
  html+='<select id="eg-type"><option value="电话">电话</option><option value="拜访">拜访</option><option value="邮件">邮件</option><option value="会议">会议</option><option value="微信">微信</option><option value="其他">其他</option></select>';
  html+='<textarea id="eg-content" placeholder="跟进内容..."></textarea>';
  html+='<input id="eg-outcome" placeholder="结果（可选）">';
  html+='<input id="eg-next-step" placeholder="下一步计划（可选）">';
  html+='<input type="date" id="eg-next-date">';
  html+='<div style="display:flex;gap:6px;margin-top:8px"><button class="btn-sm btn-sm-primary" onclick="saveEngagement(\''+clientId+'\')">保存</button><button class="btn-sm" style="background:var(--bg);border:1px solid var(--border)" onclick="toggleEngagementForm()">取消</button></div></div>';
  html+='<div class="engagement-timeline" id="engagement-list">';
  if(logs&&logs.length>0){
    for(var i=0;i<logs.length;i++){
      var l=logs[i];
      html+='<div class="engagement-item"><div class="eg-date">'+new Date(l.created_at).toLocaleDateString('zh-CN')+'</div><div class="eg-body"><span class="eg-type">'+h(l.type)+'</span>'+h(l.content||'')+(l.outcome?'<div class="eg-outcome">✅ '+h(l.outcome)+'</div>':'')+(l.next_step?'<div class="eg-next">📌 下一步: '+h(l.next_step)+(l.next_date?' ('+l.next_date+')':'')+'</div>':'')+'<button class="eg-delete" onclick="deleteEngagement(\''+l.id+'\')">删除</button></div></div>';
    }
  }else{html+='<div class="empty" style="padding:20px">暂无跟进记录</div>'}
  html+='</div>';
  document.getElementById('c360-body').innerHTML=html;
}

function toggleEngagementForm(){
  document.getElementById('engagement-form').classList.toggle('hidden');
}

async function saveEngagement(clientId){
  var type=document.getElementById('eg-type').value;
  var content=document.getElementById('eg-content').value.trim();
  if(!content){showToast('请输入跟进内容');return}
  var outcome=document.getElementById('eg-outcome').value.trim();
  var nextStep=document.getElementById('eg-next-step').value.trim();
  var nextDate=document.getElementById('eg-next-date').value||null;
  var {error}=await sb.from('engagement_logs').insert({company_id:currentCompanyId,client_id:clientId,type:type,content:content,outcome:outcome||null,next_step:nextStep||null,next_date:nextDate,created_by:currentUser.id});
  if(error){showToast('保存失败: '+error.message);return}
  autoCheckLifecycle(clientId);
  renderClient360Engagements(clientId);
  showToast('已保存');
}

async function deleteEngagement(id){
  var _delErr=(await sb.from('engagement_logs').delete().eq('id',id)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
  renderClient360Engagements(c360ClientId);
  showToast('已删除');
}

async function renderClient360Lifecycle(clientId){
  var c=allClients.find(function(x){return x.id===clientId});
  var current=c?c.lifecycle_stage:'prospect';
  var stageMap={prospect:'潜在客户',qualified:'合格线索',deal:'成交客户',atrisk:'流失预警',churned:'流失客户',repurchase:'复购客户'};
  var allStages=['prospect','qualified','deal','atrisk','churned','repurchase'];
  var {data:logs}=await sb.from('lifecycle_logs').select('*').eq('client_id',clientId).eq('company_id',currentCompanyId).order('created_at',{ascending:false});
  var html='<div class="c360-card"><div class="c360-card-title">🔄 变更阶段</div>';
  html+='<select id="lc-new-stage" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;font-size:14px;margin-bottom:8px">';
  for(var i=0;i<allStages.length;i++)html+='<option value="'+allStages[i]+'"'+(allStages[i]===current?' selected':'')+'>'+stageMap[allStages[i]]+'</option>';
  html+='</select>';
  html+='<input id="lc-reason" placeholder="变更原因（可选）" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;font-size:13px;margin-bottom:8px">';
  html+='<button class="btn-sm btn-sm-primary" style="width:100%" onclick="changeLifecycle(\''+clientId+'\')">确认变更</button></div>';
  html+='<div class="lifecycle-timeline">';
  if(logs&&logs.length>0){
    for(var j=0;j<logs.length;j++){
      var l=logs[j];
      html+='<div class="lifecycle-event"><div class="le-date">'+new Date(l.created_at).toLocaleDateString('zh-CN')+'</div><div class="le-content"><span class="le-change">'+(stageMap[l.from_stage]||l.from_stage)+' → '+(stageMap[l.to_stage]||l.to_stage)+'</span>'+(l.reason?'<div style="font-size:12px;color:var(--text2);margin-top:2px">'+h(l.reason)+'</div>':'')+'</div></div>';
    }
  }else{html+='<div class="empty" style="padding:20px">暂无阶段变更记录</div>'}
  html+='</div>';
  document.getElementById('c360-body').innerHTML=html;
}

async function changeLifecycle(clientId,newStage){
  if(!newStage)newStage=document.getElementById('lc-new-stage').value;
  var reason=document.getElementById('lc-reason').value.trim();
  var c=allClients.find(function(x){return x.id===clientId});
  var fromStage=c?c.lifecycle_stage||'prospect':'prospect';
  if(fromStage===newStage){showToast('阶段未变化');return}
  var w=await safeWriteById('clients','update',{lifecycle_stage:newStage,updated_at:new Date().toISOString()},clientId);
  if(w.hit===0){showToast('变更失败: '+(((w.error||{}).message)||'未命中任何行（可能无权修改该客户）'));return}
  await sb.from('lifecycle_logs').insert({company_id:currentCompanyId,client_id:clientId,from_stage:fromStage,to_stage:newStage,reason:reason||null,created_by:currentUser.id});
  // Update local data
  if(c){c.lifecycle_stage=newStage}
  renderClient360Lifecycle(clientId);
  showToast('已变更');
  loadClients();
}

async function autoCheckLifecycle(clientId){
  var c=allClients.find(function(x){return x.id===clientId});
  if(!c)return;
  // Check orders
  var {data:orders}=await sb.from('orders').select('*').eq('client_id',clientId).eq('company_id',currentCompanyId);
  var hasOrder=orders&&orders.length>0;
  // Check last engagement
  var {data:lastEng}=await sb.from('engagement_logs').select('created_at').eq('client_id',clientId).eq('company_id',currentCompanyId).order('created_at',{ascending:false}).limit(1);
  var newStage=c.lifecycle_stage||'prospect';
  var now=new Date();
  if(hasOrder&&newStage==='prospect'){newStage='deal';}
  else if(!hasOrder&&newStage==='deal'){newStage='prospect';}
  if(lastEng&&lastEng.length>0){
    var lastDate=new Date(lastEng[0].created_at);
    var daysSince=(now-lastDate)/(86400000);
    if(daysSince>90&&newStage!=='churned'&&newStage!=='repurchase'){newStage='churned';}
    else if(daysSince>30&&daysSince<=90&&newStage!=='atrisk'&&newStage!=='churned'&&newStage!=='repurchase'){newStage='atrisk';}
    if(daysSince<=30&&newStage==='churned'){newStage='repurchase';}
  }
  if(newStage!==(c.lifecycle_stage||'prospect')){
    var from=c.lifecycle_stage||'prospect';
    await safeWriteById('clients','update',{lifecycle_stage:newStage,updated_at:new Date().toISOString()},clientId);
    await sb.from('lifecycle_logs').insert({company_id:currentCompanyId,client_id:clientId,from_stage:from,to_stage:newStage,reason:'自动检测',created_by:currentUser.id});
    c.lifecycle_stage=newStage;
  }
}

// ============ NEW: Lead Pool Functions ============
async function loadLeads(){
  try{
  // Sales pipeline: only leads assigned to current user
  var {data,error}=await sb.from('lead_pool').select('*').eq('company_id',currentCompanyId).eq('assigned_to',currentUser.id).in('status',['assigned','contacted']).order('updated_at',{ascending:false});
  if(error){console.error('loadLeads:',error);}
  allLeads=data||[];
  }catch(e){console.error('loadLeads exception:',e);allLeads=[]}
  renderLeads();
}

var poolLeads=[];
async function loadPoolLeads(){
  try{
  // Lead pool: unassigned leads only, exclude converted
  var {data,error}=await sb.from('lead_pool').select('*').eq('company_id',currentCompanyId).is('assigned_to',null).neq('status','converted').neq('status','junk').order('updated_at',{ascending:false});
  if(error){console.error('loadPoolLeads:',error);}
  poolLeads=data||[];
  }catch(e){console.error('loadPoolLeads exception:',e);poolLeads=[]}
  renderPoolLeads();
}

function renderLeads(){
  // Sales pipeline leads (assigned to current user)
  var list=allLeads||[];
  var q=(document.getElementById('lead-search')||{}).value||'';
  q=q.trim().toLowerCase();
  var stage=(document.getElementById('lead-stage-filter')||{}).value||'all';
  if(q)list=list.filter(function(l){return(l.name||'').toLowerCase().indexOf(q)>=0||(l.contact_name||'').toLowerCase().indexOf(q)>=0||(l.contact_phone||'').indexOf(q)>=0});
  if(stage!=='all')list=list.filter(function(l){return l.stage===stage||l.status===stage});
  var grid=document.getElementById('sales-lead-grid'),empty=document.getElementById('sales-lead-empty');
  if(!list.length){grid.innerHTML='';if(empty)empty.classList.remove('hidden');return}
  if(empty)empty.classList.add('hidden');
  var statusMap={new:'新线索',assigned:'已分配',contacted:'已联系',converted:'已转化',recycled:'已回收',junk:'无效'};
  var html='';
  for(var i=0;i<list.length;i++){
    var l=list[i];
    var assignee='';
    if(l.assigned_to&&allUsers){var u=allUsers.find(function(x){return x.user_id===l.assigned_to});assignee=u?(u.display_name||u.email||''):''}
    html+='<div class="lead-card">';
    html+='<div class="lead-name">'+h(l.name)+'</div>';
    if(l.project_name)html+='<div class="lead-project" style="font-size:12px;color:var(--primary);margin-bottom:4px">📋 '+h(l.project_name)+'</div>';
    html+='<div class="lead-contact">';
    if(l.contact_name)html+='<span>👤 '+h(l.contact_name)+'</span>';
    if(l.contact_phone)html+='<span>📞 '+h(l.contact_phone)+'</span>';
    if(l.contact_email)html+='<span>📧 '+h(l.contact_email)+'</span>';
    html+='</div>';
    html+='<div class="lead-meta">';
    html+='<span class="lead-status-badge '+h(l.stage||l.status)+'">'+(l.stage||statusMap[l.status]||l.status)+'</span>';
    if(l.source)html+='<span>来源: '+h(l.source)+'</span>';
    if(assignee)html+='<span>分配: '+h(assignee)+'</span>';
    if(l.last_follow_up)html+='<span>跟进: '+l.last_follow_up+'</span>';
    html+='</div>';
    html+='<div class="lead-actions">';
    html+='<button class="btn-lead-primary" onclick="event.stopPropagation();openLeadForm(\''+l.id+'\')">编辑</button>';
    var li=_leadProjectCache.length;
    _leadProjectCache.push({id:l.id,projectName:l.project_name||l.name||'',companyName:l.name||'',clientId:l.client_id||''});
    html+='<button class="btn-lead-success" onclick="event.stopPropagation();openProjectFormFromLeadIdx('+li+')">转项目</button>';
    html+='<button class="btn-lead-danger" onclick="event.stopPropagation();deleteLead(\''+l.id+'\')">删除</button>';
    html+='</div></div>';
  }
  grid.innerHTML=html;
}

function renderPoolLeads(){
  // Lead pool (unassigned leads)
  var list=poolLeads||[];
  var q=(document.getElementById('lead-pool-search')||{}).value||'';
  q=q.trim().toLowerCase();
  var filter=(document.getElementById('lead-pool-filter')||{}).value||'all';
  if(q)list=list.filter(function(l){return(l.name||'').toLowerCase().indexOf(q)>=0||(l.contact_name||'').toLowerCase().indexOf(q)>=0||(l.contact_phone||'').indexOf(q)>=0});
  if(filter!=='all')list=list.filter(function(l){return l.status===filter});
  // Stats
  var total=poolLeads.length,converted=0;
  for(var i=0;i<poolLeads.length;i++){if(poolLeads[i].status==='converted')converted++}
  var statsBar=document.getElementById('leads-stats-bar');
  if(statsBar)statsBar.innerHTML='<div class="stat-card"><div class="stat-num">'+total+'</div><div class="stat-label">公海线索</div></div><div class="stat-card"><div class="stat-num">'+list.length+'</div><div class="stat-label">'+(filter!=='all'||q?'筛选结果':'当前显示')+'</div></div>';
  var grid=document.getElementById('lead-grid'),empty=document.getElementById('lead-empty');
  if(!list.length){grid.innerHTML='';if(empty)empty.classList.remove('hidden');return}
  if(empty)empty.classList.add('hidden');
  var statusMap={new:'新线索',assigned:'已分配',contacted:'已联系',converted:'已转化',recycled:'已回收',junk:'无效'};
  var html='';
  for(var i=0;i<list.length;i++){
    var l=list[i];
    html+='<div class="lead-card">';
    html+='<div class="lead-name">'+h(l.name)+'</div>';
    html+='<div class="lead-contact">';
    if(l.contact_name)html+='<span>👤 '+h(l.contact_name)+'</span>';
    if(l.contact_phone)html+='<span>📞 '+h(l.contact_phone)+'</span>';
    if(l.contact_email)html+='<span>📧 '+h(l.contact_email)+'</span>';
    html+='</div>';
    html+='<div class="lead-meta">';
    html+='<span class="lead-status-badge '+h(l.status)+'">'+(statusMap[l.status]||l.status)+'</span>';
    if(l.source)html+='<span>来源: '+h(l.source)+'</span>';
    if(l.industry)html+='<span>行业: '+h(l.industry)+'</span>';
    html+='</div>';
    html+='<div class="lead-actions">';
    html+='<button class="btn-lead-primary" onclick="event.stopPropagation();openLeadForm(\''+l.id+'\')">编辑</button>';
    html+='<button class="btn-lead-primary" onclick="event.stopPropagation();assignLead(\''+l.id+'\')">分配</button>';
    var li=_leadProjectCache.length;
    _leadProjectCache.push({id:l.id,projectName:l.project_name||l.name||'',companyName:l.name||'',clientId:l.client_id||''});
    html+='<button class="btn-lead-success" onclick="event.stopPropagation();openProjectFormFromLeadIdx('+li+')">转项目</button>';
    html+='<button class="btn-lead-danger" onclick="event.stopPropagation();deleteLead(\''+l.id+'\')">删除</button>';
    html+='</div></div>';
  }
  grid.innerHTML=html;
}

// === Lead Company Name Autocomplete ===
var leadCompSuggIdx=-1,leadCompSuggList=[];
function onLeadCompanyInput(){
  var inp=document.getElementById('lf-name');
  var val=(inp.value||'').trim().toLowerCase();
  var dd=document.getElementById('lead-name-suggestions');
  if(!val||val.length<1){dd.classList.add('hidden');leadCompSuggList=[];leadCompSuggIdx=-1;return}
  // 客户库懒加载
  if(!allClients||!allClients.length){
    sb.from('clients').select('*').eq('company_id',currentCompanyId).order('name').then(function(r){if(r.data){allClients=r.data;onLeadCompanyInput()}});
    return;
  }
  var matches=[];
  for(var i=0;i<allClients.length;i++){
    var c=allClients[i];var cn=(c.name||'').toLowerCase();
    if(cn.indexOf(val)>=0)matches.push(c);
  }
  matches.sort(function(a,b){return (a.name||'').length-(b.name||'').length});
  matches=matches.slice(0,12);
  if(!matches.length){dd.classList.add('hidden');leadCompSuggList=[];leadCompSuggIdx=-1;return}
  leadCompSuggList=matches;leadCompSuggIdx=-1;
  var clientIdxMap={};
  for(var j=0;j<matches.length;j++)clientIdxMap[matches[j].id]=j;
  dd.innerHTML=matches.map(function(c,i){return '<div class="name-suggestion'+(i===leadCompSuggIdx?' active':'')+'" data-idx="'+i+'" onmousedown="selectLeadCompany('+i+')"><div class="ns-name">'+escHtml(c.name)+'</div><div class="ns-detail">'+escHtml(c.industry||'')+(c.address?' · '+escHtml(c.address).substring(0,15):'')+'</div></div>'}).join('');
  dd.classList.remove('hidden');
}
function onLeadCompanyKey(e){
  var dd=document.getElementById('lead-name-suggestions');
  if(dd.classList.contains('hidden'))return;
  if(e.key==='ArrowDown'){e.preventDefault();leadCompSuggIdx=Math.min(leadCompSuggIdx+1,leadCompSuggList.length-1);updateLeadCompActive()}
  else if(e.key==='ArrowUp'){e.preventDefault();leadCompSuggIdx=Math.max(leadCompSuggIdx-1,0);updateLeadCompActive()}
  else if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();if(leadCompSuggIdx>=0)selectLeadCompany(leadCompSuggIdx)}
  else if(e.key==='Escape'){dd.classList.add('hidden');leadCompSuggIdx=-1}
}
function updateLeadCompActive(){
  var items=document.querySelectorAll('#lead-name-suggestions .name-suggestion');
  for(var i=0;i<items.length;i++)items[i].classList.toggle('active',i===leadCompSuggIdx);
  if(leadCompSuggIdx>=0&&items[leadCompSuggIdx])items[leadCompSuggIdx].scrollIntoView({block:'nearest'});
}
function fmtMulti(v){if(!v)return'';if(typeof v==='string'){try{v=JSON.parse(v)}catch(e){return v}}if(Array.isArray(v))return v.filter(function(x){return x}).join('\n');return String(v);}
function onLeadTypeChange(){
  var type=document.getElementById('lf-customer-type').value;
  var crEl=document.getElementById('lf-credit-code');
  var addrEl=document.getElementById('lf-address');
  var clientId=document.getElementById('lf-client-id').value;
  if(type==='B2B'){
    crEl.readOnly=false;crEl.style.background='';crEl.style.color='';
    if(addrEl){addrEl.readOnly=false;addrEl.style.background='';addrEl.style.color='';}
    if(clientId){
      var client=(allClients||[]).find(function(c){return c.id===clientId});
      if(client&&client.credit_code)crEl.value=client.credit_code;
      if(client&&client.address&&addrEl)addrEl.value=client.address;
    }
  }else{
    crEl.value='';crEl.readOnly=true;crEl.style.background='var(--bg2)';crEl.style.color='var(--text3)';
    if(addrEl){addrEl.value='';addrEl.readOnly=true;addrEl.style.background='var(--bg2)';addrEl.style.color='var(--text3)';}
  }
}
function selectLeadCompany(idx){
  var client=leadCompSuggList[idx];if(!client)return;
  document.getElementById('lf-name').value=client.name||'';
  document.getElementById('lead-name-suggestions').classList.add('hidden');
  leadCompSuggList=[];leadCompSuggIdx=-1;
  // 锁定 client_id
  document.getElementById('lf-client-id').value=client.id||'';
  // 自动填充客户信息
  if(client.industry)document.getElementById('lf-industry').value=client.industry;
  if(client.scale)document.getElementById('lf-scale').value=client.scale;
  var cc=client.credit_code||'';if(!cc){try{var ci=typeof client.company_info==='string'?JSON.parse(client.company_info):(client.company_info||{});cc=ci.credit_code||'';}catch(e){}}if(cc)document.getElementById('lf-credit-code').value=cc;
  if(client.address)document.getElementById('lf-address')?document.getElementById('lf-address').value=client.address:null;
  // 客户类型
  if(client.type){try{var types=JSON.parse(client.type);if(Array.isArray(types)&&types.length){var t=types[0]||'';document.getElementById('lf-customer-type').value=t.indexOf('B2B')===0?'B2B':t.indexOf('B2C')===0?'B2C':''}}catch(e){}if(!document.getElementById('lf-customer-type').value&&client.credit_code)document.getElementById('lf-customer-type').value='B2B';}
  onLeadTypeChange();
  // 自动填充联系人（从 allContacts 表按 client_id 查找）
  var contacts=(allContacts||[]).filter(function(ct){return ct.client_id===client.id});
  function firstVal(v){if(typeof v==='string'){try{v=JSON.parse(v)}catch(e){}}if(Array.isArray(v))v=v[0]||'';return String(v||'');}
  if(contacts.length>0){
    document.getElementById('lf-contact-name').value=contacts[0].name||'';
    document.getElementById('lf-contact-phone').value=fmtMulti(contacts[0].phone);
    document.getElementById('lf-contact-email').value=fmtMulti(contacts[0].email);
  } else {
    document.getElementById('lf-contact-name').value='';
    document.getElementById('lf-contact-phone').value='';
    document.getElementById('lf-contact-email').value='';
  }
  // 归属销售默认填充当前用户
  if(!document.getElementById('lf-assigned-sales').value){
    document.getElementById('lf-assigned-sales').value=currentUser?(currentUser.realname||currentUser.name||''):'';
  }
}

// === Lead Contact picker — from selected client's contacts only ===
var leadContactSuggIdx=-1,leadContactSuggList=[];
function onLeadContactPicker(){
  var clientId=document.getElementById('lf-client-id').value;
  if(!clientId){showToast('请先选择客户');return}
  if(!allClients||!allClients.length){showToast('客户数据未加载');return}
  var client=allClients.find(function(c){return c.id===clientId});
  if(!client){showToast('未找到关联客户');return}
  var contacts=(allContacts||[]).filter(function(ct){return ct.client_id===clientId});
  if(contacts.length<=1){showToast('该客户只有一个联系人');return}
  leadContactSuggList=contacts;
  function pickPhone(ct){var p=ct.phone;if(typeof p==='string'){try{p=JSON.parse(p)}catch(e){}}if(Array.isArray(p))p=p[0]||'';return String(p||'');}
  function pickEmail(ct){var e=ct.email;if(typeof e==='string'){try{e=JSON.parse(e)}catch(e){}}if(Array.isArray(e))e=e[0]||'';return String(e||'');}
  var html='';
  for(var i=0;i<contacts.length;i++){
    var ct=contacts[i];
    var ph=pickPhone(ct),em=pickEmail(ct);
    html+='<div class="name-suggestion" style="cursor:pointer;padding:8px 12px;border-bottom:1px solid var(--border)" onmousedown="selectLeadContact('+i+')"><div class="ns-name">'+escHtml(ct.name||'')+'</div><div class="ns-detail">📞 '+escHtml(ph)+(em?' · 📧 '+escHtml(em):'')+(ct.position?' · '+escHtml(ct.position):'')+'</div></div>';
  }
  var dd=document.getElementById('lead-contact-suggestions');
  if(dd){dd.innerHTML=html;dd.classList.remove('hidden');}
}
function onLeadContactKey(e){
  var dd=document.getElementById('lead-contact-suggestions');
  if(!dd||dd.classList.contains('hidden'))return;
  if(e.key==='Escape'){dd.classList.add('hidden');leadContactSuggIdx=-1}
}

function selectLeadContact(idx){
  var m=leadContactSuggList[idx];if(!m)return;
  function pv(v){if(typeof v==='string'){try{v=JSON.parse(v)}catch(e){}}if(Array.isArray(v))v=v[0]||'';return String(v||'');}
  document.getElementById('lf-contact-name').value=m.name||'';
  document.getElementById('lf-contact-phone').value=fmtMulti(m.phone);
  document.getElementById('lf-contact-email').value=fmtMulti(m.email);
  var dd=document.getElementById('lead-contact-suggestions');
  if(dd)dd.classList.add('hidden');
  leadContactSuggList=[];leadContactSuggIdx=-1;
}


function openLeadForm(id){
  leadEditId=id||null;
  document.getElementById('lead-form-title').textContent=id?'编辑线索':'新建线索';
  document.getElementById('lead-btn-delete').classList.toggle('hidden',!id);
  if(!id){
    document.getElementById('lf-creator').value=currentUser?(currentUser.realname||currentUser.name||currentUser.email||''):'';
    document.getElementById('lf-created-at').value=new Date().toLocaleString('zh-CN');
  }
  document.getElementById('lf-name').value='';
  document.getElementById('lf-contact-name').value='';
  document.getElementById('lf-contact-phone').value='';
  document.getElementById('lf-contact-email').value='';
  document.getElementById('lf-source').value='';
  document.getElementById('lf-industry').value='';
  document.getElementById('lf-scale').value='';
  document.getElementById('lf-max-recycle').value='3';
  document.getElementById('lf-recycle-days').value='30';
  document.getElementById('lf-status').value='new';
  document.getElementById('lf-notes').value='';
  document.getElementById('lf-project-name').value='';
  document.getElementById('lf-client-id').value='';
  document.getElementById('lf-lead-id').value='';
  document.getElementById('lf-opportunity-id').value='';
  document.getElementById('lf-customer-type').value='';
  document.getElementById('lf-credit-code').value='';
  document.getElementById('lf-assigned-sales').value='';
  document.getElementById('lf-department').value='';
  document.getElementById('lf-creator').value='';
  document.getElementById('lf-created-at').value='';
  if(id){
    var l=(allLeads||[]).concat(poolLeads||[]).find(function(x){return x.id==id||String(x.id)===String(id)});
    if(l){
      document.getElementById('lf-name').value=l.name||'';
      document.getElementById('lf-contact-name').value=l.contact_name||'';
      document.getElementById('lf-contact-phone').value=fmtMulti(l.contact_phone)||'';
      document.getElementById('lf-contact-email').value=l.contact_email||'';
      document.getElementById('lf-source').value=l.source||'';
      document.getElementById('lf-industry').value=l.industry||'';
      document.getElementById('lf-scale').value=l.scale||'';
      document.getElementById('lf-max-recycle').value=l.max_recycle_count||3;
      document.getElementById('lf-recycle-days').value=l.recycle_days||30;
      document.getElementById('lf-status').value=l.status||'new';
      document.getElementById('lf-notes').value=l.notes||'';
      document.getElementById('lf-project-name').value=l.project_name||'';
      document.getElementById('lf-client-id').value=l.client_id||'';
      document.getElementById('lf-lead-id').value=l.lead_id||'';
      document.getElementById('lf-opportunity-id').value=l.opportunity_id||'';
      document.getElementById('lf-customer-type').value=l.customer_type||'';
      document.getElementById('lf-credit-code').value=l.credit_code||'';
      document.getElementById('lf-assigned-sales').value=l.assigned_sales||'';
      document.getElementById('lf-department').value=l.department||'';
      document.getElementById('lf-creator').value=l.creator||'';
      document.getElementById('lf-created-at').value=l.created_at?new Date(l.created_at).toLocaleString('zh-CN'):'';
      // 同步关联客户的最新信用代码、地址、行业、联系人
      syncLeadFromClient(l.client_id);
    }
  }
  document.getElementById('lead-form-modal').classList.remove('hidden');
}
function syncLeadFromClient(clientId){
  if(!clientId||!allClients||!allClients.length)return;
  var c=allClients.find(function(x){return x.id===clientId||String(x.id)===String(clientId)});
  if(!c)return;
  // 同步信用代码：优先从 company_info JSONB，兼容 credit_code 独立列
  var cc='';
  try{var ci=typeof c.company_info==='string'?JSON.parse(c.company_info):(c.company_info||{});cc=c.credit_code||ci.credit_code||'';}catch(e){cc=c.credit_code||'';}
  if(cc){document.getElementById('lf-credit-code').value=cc;}
  if(c.address){document.getElementById('lf-address')?document.getElementById('lf-address').value=c.address:null;}
  if(c.industry){document.getElementById('lf-industry').value=c.industry;}
  // 同步联系人
  try{var cts=allContacts.filter(function(ct){return ct.client_id===clientId||String(ct.client_id)===String(clientId)});
    if(cts.length>0){document.getElementById('lf-contact-name').value=cts[0].name||'';var ph=fmtMulti(cts[0].phone);if(ph)document.getElementById('lf-contact-phone').value=ph;if(cts[0].email)document.getElementById('lf-contact-email').value=cts[0].email;}}
  catch(e){}
}

function closeLeadForm(){document.getElementById('lead-form-modal').classList.add('hidden');leadEditId=null}

async function saveLead(){
  var name=document.getElementById('lf-name').value.trim();
  if(!name){showToast('请输入线索名称');return}
  var lead={
    name:name,
    contact_name:document.getElementById('lf-contact-name').value.trim(),
    contact_phone:(function(){var v=document.getElementById('lf-contact-phone').value.trim();if(!v)return'';var lines=v.split('\n').filter(function(x){return x.trim()});return lines.length>1?JSON.stringify(lines):lines[0]||'';})(),
    contact_email:document.getElementById('lf-contact-email').value.trim(),
    source:document.getElementById('lf-source').value,
    industry:document.getElementById('lf-industry').value,
    scale:document.getElementById('lf-scale').value,
    max_recycle_count:parseInt(document.getElementById('lf-max-recycle').value)||3,
    recycle_days:parseInt(document.getElementById('lf-recycle-days').value)||30,
    status:document.getElementById('lf-status').value,
    project_name:document.getElementById('lf-project-name').value.trim(),
    client_id:document.getElementById('lf-client-id').value||null,
    customer_type:document.getElementById('lf-customer-type').value,
    credit_code:document.getElementById('lf-credit-code').value.trim(),
    assigned_sales:document.getElementById('lf-assigned-sales').value.trim(),
    department:document.getElementById('lf-department').value,
    creator:document.getElementById('lf-creator').value.trim(),
    notes:document.getElementById('lf-notes').value.trim(),
    updated_at:new Date().toISOString()
  };
  if(!lead.client_id&&lead.name){
    try{var {data:cm}=await sb.from('clients').select('id').eq('company_id',currentCompanyId).ilike('name',lead.name).limit(1);if(cm&&cm.length)lead.client_id=cm[0].id}catch(e){}
  }
  if(!leadEditId){
    lead.company_id=currentCompanyId;
    lead.created_by=currentUser.id;
    // Auto-generate lead_id: LEAD+YYYYMMDD+3-digit seq
    var today=new Date();
    var yyyy=today.getFullYear(),mm=String(today.getMonth()+1).padStart(2,'0'),dd=String(today.getDate()).padStart(2,'0');
    var datePrefix='LEAD'+yyyy+mm+dd;
    try{var {data:cnt}=await sb.from('lead_pool').select('lead_id',{count:'exact',head:true}).like('lead_id',datePrefix+'%');var seq=(cnt||0)+1;lead.lead_id=datePrefix+String(seq).padStart(3,'0');}catch(e){lead.lead_id=datePrefix+'001';}
    if(leadFormSource==='sales'){lead.assigned_to=currentUser.id;lead.status='assigned';lead.assigned_at=new Date().toISOString();}
    var {error}=await sb.from('lead_pool').insert(lead);
    if(error){console.error('[saveLead] error:',error.message,'details:',error.details,'hint:',error.hint,'code:',error.code);showToast('创建失败: '+error.message);return}
  }else{
    var {error}=await sb.from('lead_pool').update(lead).eq('id',leadEditId);
    if(error){showToast('更新失败: '+error.message);return}
  }
  closeLeadForm();
  await loadPoolLeads();
  if(currentUser&&currentUser.id)await loadLeads();
  showToast(leadEditId?'已更新':'已创建');
}

async function deleteLead(id){
  if(!id)return;
  if(leadEditId===id)closeLeadForm();
  var _delErr=(await sb.from('lead_pool').delete().eq('id',id)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
  await loadPoolLeads();
  if(currentUser&&currentUser.id)await loadLeads();
  showToast('已删除');
}

function assignLead(id){
  leadAssignId=id;
  var sel=document.getElementById('la-user-select');
  sel.innerHTML='<option value="">选择用户</option>';
  for(var i=0;i<allUsers.length;i++)sel.innerHTML+='<option value="'+allUsers[i].user_id+'">'+escHtml(allUsers[i].display_name||allUsers[i].email||allUsers[i].user_id)+'</option>';
  document.getElementById('lead-assign-modal').classList.remove('hidden');
}

async function doAssignLead(){
  var userId=document.getElementById('la-user-select').value;
  if(!userId){showToast('请选择用户');return}
  var {error}=await sb.from('lead_pool').update({assigned_to:userId,assigned_at:new Date().toISOString(),status:'assigned',updated_at:new Date().toISOString()}).eq('id',leadAssignId);
  document.getElementById('lead-assign-modal').classList.add('hidden');
  if(error){showToast('分配失败: '+error.message);return}
  await loadPoolLeads();await loadLeads();showToast('已分配');
}

async function convertLeadToClient(id){
  // Fetch lead from Supabase directly
  var {data:leads,error:le}=await sb.from('lead_pool').select('*').eq('id',id).single();
  if(le||!leads){showToast('线索未找到: '+(le?le.message:'数据为空'));return}
  var l=leads;
  // Dedup: check if a client with the same name already exists in this company
  var clientId=null;
  var {data:existing}=await sb.from('clients').select('id,name').eq('company_id',currentCompanyId).ilike('name',l.name).limit(1);
  if(existing&&existing.length>0){
    clientId=existing[0].id;
    // Update existing client fields (merge: line info enriches client)
    var patch={};
    if(l.industry&&!existing[0].industry)patch.industry=l.industry;
    if(l.scale)patch.scale=l.scale;
    if(l.source)patch.source=l.source;
    if(Object.keys(patch).length>0){await safeWriteById('clients','update',patch,clientId)}
  }else{
    var client={name:l.name,type:'[]',address:'',notes:l.notes||'',industry:l.industry||'',scale:l.scale||'',source:l.source||'',lifecycle_stage:'prospect',user_id:currentUser.id,company_id:currentCompanyId};
    var {data:cd,error}=await sb.from('clients').insert(client).select('id');
    if(error){showToast('转化失败: '+error.message);return}
    clientId=cd[0].id;
  }
  // Always add contact (dedup by phone within this client)
  if(l.contact_name||l.contact_phone||l.contact_email){
    var phoneArr=l.contact_phone?[l.contact_phone]:[''];
    // Check if same phone already exists for this client
    var {data:ec}=await sb.from('contacts').select('id,phone').eq('client_id',clientId);
    var dupPhone=false;
    if(ec)for(var ci=0;ci<ec.length;ci++){try{var eph=JSON.parse(ec[ci].phone||'[]');if(!Array.isArray(eph))eph=[String(eph||'')];if(eph.indexOf(l.contact_phone)>=0&&l.contact_phone){dupPhone=true;break}}catch(ex){}}
    if(!dupPhone){
      await sb.from('contacts').insert({client_id:clientId,name:l.contact_name||'',phone:JSON.stringify(phoneArr),email:JSON.stringify(l.contact_email?[l.contact_email]:['']),company_id:currentCompanyId,user_id:currentUser.id});
    }
  }
  // Update lead
  await sb.from('lead_pool').update({status:'converted',converted_client_id:clientId,converted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id);
  loadClients();await loadPoolLeads();await loadLeads();
  showToast(existing&&existing.length>0?'线索已关联到已有客户「'+existing[0].name+'」':'已转化为客户');
}

function openLeadImport(){
  document.getElementById('li-csv').value='';
  document.getElementById('lead-import-modal').classList.remove('hidden');
}

async function importLeads(){
  var raw=document.getElementById('li-csv').value.trim();
  if(!raw){showToast('请粘贴CSV内容');return}
  var lines=raw.split('\n').filter(function(l){return l.trim()});
  var start=0;
  // Skip header if first line looks like header
  if(lines[0]&&(lines[0].indexOf('名称')>=0||lines[0].indexOf('name')>=0))start=1;
  var imported=0;
  for(var i=start;i<lines.length;i++){
    var cols=lines[i].split(',');
    if(!cols[0]||!cols[0].trim())continue;
    var lead={name:cols[0].trim(),contact_name:(cols[1]||'').trim(),contact_phone:(cols[2]||'').trim(),contact_email:(cols[3]||'').trim(),source:(cols[4]||'').trim(),industry:(cols[5]||'').trim(),scale:(cols[6]||'').trim(),notes:(cols[7]||'').trim(),status:'new',company_id:currentCompanyId,created_by:currentUser.id};
    var {error}=await sb.from('lead_pool').insert(lead);
    if(!error)imported++;
  }
  document.getElementById('lead-import-modal').classList.add('hidden');
  if(imported>0){await loadPoolLeads();showToast('已导入 '+imported+' 条线索')}
  else showToast('导入失败');
}

async function recycleStale(){
  var now=new Date();
  var {data:assignedLeads}=await sb.from('lead_pool').select('*').eq('company_id',currentCompanyId).in('status',['assigned','contacted']);
  var recycled=0;
  for(var i=0;i<(assignedLeads||[]).length;i++){
    var l=assignedLeads[i];
    var days=l.recycle_days||30;
    var assignedDate=l.assigned_at?new Date(l.assigned_at):null;
    if(!assignedDate)continue;
    var elapsed=(now-assignedDate)/(86400000);
    if(elapsed>=days){
      var rc=(l.recycle_count||0)+1;
      var maxRc=l.max_recycle_count||3;
      if(rc>=maxRc){
        await sb.from('lead_pool').update({status:'lost',updated_at:new Date().toISOString()}).eq('id',l.id);
      }else{
        await sb.from('lead_pool').update({status:'new',assigned_to:null,assigned_at:null,recycled_at:now.toISOString(),recycle_count:rc,updated_at:now.toISOString()}).eq('id',l.id);
      }
      recycled++;
    }
  }
  if(recycled>0){await loadPoolLeads();await loadLeads();showToast('已回收 '+recycled+' 条线索')}
  else showToast('没有需要回收的线索');
}



// === Collab: Follow-up Records ===
async function loadFollowups(){
  if(!currentCompanyId)return;
  var clientFilter=document.getElementById('fu-client-filter').value;
  var typeFilter=document.getElementById('fu-type-filter').value;
  // Populate client filter
  var sel=document.getElementById('fu-client-filter');
  if(sel.options.length<=1){
    for(var i=0;i<allClients.length;i++){var cl=allClients[i];sel.innerHTML+='<option value="'+cl.id+'">'+escHtml(cl.name)+'</option>'}
  }
  var q=sb.from('engagement_logs').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false});
  if(clientFilter)q=q.eq('client_id',clientFilter);
  if(typeFilter)q=q.eq('type',typeFilter);
  var {data}=await q;
  var list=document.getElementById('followup-list');
  if(!data||!data.length){list.innerHTML='<div class="empty" style="padding:20px">暂无跟进记录</div>';return}
  var h='';
  for(var i=0;i<data.length;i++){
    var f=data[i];var cl2=allClients.find(function(x){return x.id===f.client_id});
    h+='<div class="schedule-item" style="border-left-color:#8B5CF6"><div class="sch-title"><span style="background:#EDE9FE;color:#7C3AED;padding:1px 6px;border-radius:4px;font-size:11px">'+escHtml(f.type||'其他')+'</span> '+(cl2?escHtml(cl2.name):'未知客户')+'</div><div style="font-size:13px;margin:4px 0">'+escHtml(f.content||'')+'</div>'+(f.outcome?'<div style="font-size:12px;color:#10B981">'+escHtml(f.outcome)+'</div>':'')+(f.next_step?'<div class="sch-meta">下一步: '+escHtml(f.next_step)+(f.next_date?' ('+f.next_date+')':'')+'</div>':'')+'<div class="sch-meta">'+new Date(f.created_at).toLocaleString('zh-CN')+'<button class="btn-sm" style="font-size:10px;padding:1px 6px;color:var(--danger);margin-left:8px" onclick="deleteEngagement(\''+f.id+'\')\">删除</button></div></div>';
  }
  list.innerHTML=h;
}

function openFollowupForm(){
  var h='<div class="modal-overlay" id="followup-modal"><div class="modal-sheet"><h3>新增跟进记录</h3>';
  h+='<div class="form-group"><label>客户 *</label><select id="fu-client"><option value="">请选择</option>';
  for(var i=0;i<allClients.length;i++)h+='<option value="'+allClients[i].id+'">'+escHtml(allClients[i].name)+'</option>';
  h+='</select></div>';
  h+='<div class="form-group"><label>跟进类型</label><select id="fu-type"><option value="电话">电话</option><option value="拜访">拜访</option><option value="微信">微信</option><option value="邮件">邮件</option><option value="会议">会议</option><option value="其他">其他</option></select></div>';
  h+='<div class="form-group"><label>跟进内容 *</label><textarea id="fu-content" rows="3" placeholder="请输入跟进内容..."></textarea></div>';
  h+='<div class="form-group"><label>结果</label><input id="fu-outcome" placeholder="跟进结果（可选）"></div>';
  h+='<div class="form-row"><div class="form-group"><label>下一步计划</label><input id="fu-next-step" placeholder="下一步"></div><div class="form-group"><label>下次跟进日期</label><input type="date" id="fu-next-date"></div></div>';
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest(&quot;.modal-overlay&quot;).remove()">取消</button><button class="btn-save" onclick="saveFollowup()">保存</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',h);
}

async function saveFollowup(){
  var clientId=document.getElementById('fu-client').value;
  var type=document.getElementById('fu-type').value;
  var content=document.getElementById('fu-content').value.trim();
  if(!clientId||!content){showToast('请填写客户和内容');return}
  var outcome=document.getElementById('fu-outcome').value.trim();
  var nextStep=document.getElementById('fu-next-step').value.trim();
  var nextDate=document.getElementById('fu-next-date').value||null;
  var {error}=await sb.from('engagement_logs').insert({company_id:currentCompanyId,client_id:clientId,type:type,content:content,outcome:outcome||null,next_step:nextStep||null,next_date:nextDate,created_by:currentUser.id});
  document.getElementById('followup-modal').remove();
  if(error){showToast('保存失败: '+error.message);return}
  loadFollowups();showToast('已保存');
}

// === Collab: Department Messages ===
async function loadMessages(){
  if(!currentCompanyId)return;
  var deptFilter=document.getElementById('msg-dept-filter').value;
  var sel=document.getElementById('msg-dept-filter');
  if(sel.options.length<=1){
    for(var i=0;i<allDepartments.length;i++){var d=allDepartments[i];sel.innerHTML+='<option value="'+d.id+'">'+escHtml(d.name)+'</option>'}
  }
  var q=sb.from('dept_messages').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false});
  if(deptFilter)q=q.eq('dept_id',deptFilter);
  var {data}=await q;
  var list=document.getElementById('msg-list');
  if(!data||!data.length){list.innerHTML='<div class="empty" style="padding:20px">暂无消息</div>';return}
  var h='';
  for(var i=0;i<data.length;i++){
    var m=data[i];
    var user=allUsers.find(function(u){return u.user_id===m.user_id});
    var dept=allDepartments.find(function(d){return d.id===m.dept_id});
    var userName=user?(user.display_name||user.email||''):'未知';
    h+='<div class="schedule-item" style="border-left-color:#10B981"><div class="sch-title">'+escHtml(userName)+(dept?' <span style="font-size:11px;color:var(--text3)">@'+escHtml(dept.name)+'</span>':'')+'</div><div style="font-size:14px;margin:4px 0">'+escHtml(m.content)+'</div>'+(m.attachments&&m.attachments.length?'<div style="font-size:11px;color:var(--primary)">附件: '+m.attachments.length+'个</div>':'')+'<div class="sch-meta">'+new Date(m.created_at).toLocaleString('zh-CN')+'</div></div>';
  }
  list.innerHTML=h;
}

function openMsgForm(){
  var h='<div class="modal-overlay" id="msg-modal"><div class="modal-sheet"><h3>发送部门消息</h3>';
  h+='<div class="form-group"><label>目标部门</label><select id="msg-dept"><option value="">全公司</option>';
  for(var i=0;i<allDepartments.length;i++)h+='<option value="'+allDepartments[i].id+'">'+escHtml(allDepartments[i].name)+'</option>';
  h+='</select></div>';
  h+='<div class="form-group"><label>消息内容 *</label><textarea id="msg-content" rows="3" placeholder="输入消息..."></textarea></div>';
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest(&quot;.modal-overlay&quot;).remove()">取消</button><button class="btn-save" onclick="sendMsg()">发送</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',h);
}

async function sendMsg(){
  var deptId=document.getElementById('msg-dept').value||null;
  var content=document.getElementById('msg-content').value.trim();
  if(!content){showToast('请输入消息内容');return}
  var {error}=await sb.from('dept_messages').insert({company_id:currentCompanyId,dept_id:deptId?parseInt(deptId):null,user_id:currentUser.id,content:content});
  document.getElementById('msg-modal').remove();
  if(error){showToast('发送失败: '+error.message);return}
  loadMessages();showToast('已发送');
}

// ============== COLLAB OFFICE MODULE ==============
var collabActiveTab='schedule';

function switchCollabTab(tab){  // Hide all non-mo collab panels when showing mo panels
  if(tab.startsWith("mo-")){
    var regularPanels=document.querySelectorAll("#collab-view .collab-panel");
    for(var rp=0;rp<regularPanels.length;rp++)regularPanels[rp].classList.add("hidden");
  } else {
    // Hide mo panels when showing regular panels
    var moPs=document.querySelectorAll("#collab-view .mo-panel");
    for(var mp2=0;mp2<moPs.length;mp2++)moPs[mp2].classList.add("hidden");
  }

  // [INTEGRATED] Handle my-office panels (overview + docs only)
  var moPanels=document.querySelectorAll("#collab-view .mo-panel");
  for(var mp=0;mp<moPanels.length;mp++)moPanels[mp].classList.toggle("hidden",moPanels[mp].id!==tab);
  // Init on demand
  if(tab==="mo-overview"&&typeof renderMyOfficeOverview==="function")renderMyOfficeOverview();
  else if(tab==="mo-docs"&&typeof renderMyOfficeDocs==="function")renderMyOfficeDocs("all");


  collabActiveTab=tab;
  var tabs=document.querySelectorAll('.collab-subtab');

  for(var i=0;i<tabs.length;i++)tabs[i].classList.toggle('active',tabs[i].getAttribute('data-ctab')===tab);
  var panels={schedule:'collab-schedule-panel',task:'collab-task-panel',approval:'collab-approval-panel',comment:'collab-comment-panel',followup:'collab-followup-panel',msg:'collab-msg-panel'};
  for(var k in panels){
    var el=document.getElementById(panels[k]);

    if(el)el.classList.toggle('hidden',tab!==k)
  }

  if(tab==='schedule')loadSchedules();
  else if(tab==='task')loadTasks();
  else if(tab==='approval')loadApprovals();
  else if(tab==='comment')loadComments();
  else if(tab==='followup')loadFollowups();
  else if(tab==='msg')loadMessages();
}

// === 1. Schedules ===
async function loadSchedules(){
  if(!currentCompanyId){dbg('[loadSchedules] NO currentCompanyId, returning');return;}
  var today=new Date().toISOString().slice(0,10);
  var {data}=await sb.from('schedules').select('*').eq('company_id',currentCompanyId).gte('start_time',today).order('start_time');
  var list=document.getElementById('schedule-list');
  if(!data||!data.length){list.innerHTML='<div class="empty" style="padding:20px">今日暂无日程</div>';return}
  var h='';
  for(var i=0;i<data.length;i++){
    var s=data[i];
    var time=s.all_day?'全天':new Date(s.start_time).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
    h+='<div class="schedule-item" style="border-left-color:'+(s.color||'#4F6EF7')+'"><div class="sch-title">'+escHtml(s.title)+' <span style="font-size:11px;color:var(--text3)">'+time+'</span></div>'+(s.description?'<div style="font-size:13px;color:var(--text2)">'+escHtml(s.description)+'</div>':'')+(s.location?'<div class="sch-meta">📍 '+escHtml(s.location)+'</div>':'')+'<div style="margin-top:6px;display:flex;gap:6px"><button class="btn-sm" style="font-size:11px;padding:2px 8px" onclick="editSchedule(\''+s.id+'\')\">编辑</button><button class="btn-sm" style="font-size:11px;padding:2px 8px;color:var(--danger)" onclick="deleteSchedule(\''+s.id+'\')\">删除</button></div></div>';
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
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest(&quot;.modal-overlay&quot;).remove()">取消</button><button class="btn-save" onclick="saveSchedule(\''+(s?s.id:'')+'\')">保存</button></div></div></div>';
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
  var _delErr=(await sb.from('schedules').delete().eq('id',id)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
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
    h+='<div class="task-item task-priority-'+prio+'"><div class="task-title">'+escHtml(t.title)+' <span class="status-badge status-'+(t.status==='in_progress'?'progress':t.status)+'">'+statusLabel+'</span></div>'+(t.description?'<div style="font-size:13px;color:var(--text2)">'+escHtml(t.description)+'</div>':'')+(t.due_date?'<div class="task-meta">📅 截止: '+t.due_date+'</div>':'')+'<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><button class="btn-sm" style="font-size:11px;padding:2px 8px" onclick="editTask(\''+t.id+'\')\">编辑</button><button class="btn-sm" style="font-size:11px;padding:2px 8px;color:var(--danger)" onclick="deleteTask(\''+t.id+'\')\">删除</button></div></div>';
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
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest(&quot;.modal-overlay&quot;).remove()">取消</button><button class="btn-save" onclick="saveTask(\''+(t?t.id:'')+'\')">保存</button></div></div></div>';
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
  var _delErr=(await sb.from('tasks').delete().eq('id',id)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
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
    h+='<div class="approval-item approval-'+(a.status==='pending'?'pending':a.status==='approved'?'approved':a.status==='rejected'?'rejected':'')+'"><div class="appr-title">'+escHtml(a.title)+' <span class="status-badge status-'+(a.status==='pending'?'progress':a.status==='approved'?'done':a.status==='rejected'?'cancelled':'cancelled')+'">'+statusMap[a.status]+'</span></div><div class="appr-meta">'+escHtml(a.type)+' · 步骤 '+a.current_step+'/'+a.total_steps+' · '+new Date(a.created_at).toLocaleDateString('zh-CN')+'</div>'+(a.status==='pending'?'<div style="margin-top:6px"><button class="btn-sm" style="font-size:11px;padding:2px 8px;background:#10B981;color:#fff;border:none;border-radius:4px;margin-right:4px" onclick="approveAction('+a.id+',\'approve\')">通过</button><button class="btn-sm" style="font-size:11px;padding:2px 8px;background:#EF4444;color:#fff;border:none;border-radius:4px" onclick="approveAction('+a.id+',\'reject\')">驳回</button></div>':'')+'</div>';
  }
  list.innerHTML=h;
}

function openApprovalForm(){
  var types=['报价审批','合同审批','折扣审批','出差申请','报销申请','客户转移','投标材料审批','公章使用申请','项目立项审批','交付验收审批','自定义'];
  var h='<div class="modal-overlay" id="approval-modal"><div class="modal-sheet"><h3>发起审批</h3>';
  h+='<div class="form-group"><label>审批类型</label><select id="ap-type">';
  for(var i=0;i<types.length;i++)h+='<option value="'+types[i]+'">'+types[i]+'</option>';
  h+='</select></div>';
  h+='<div class="form-group"><label>标题 *</label><input id="ap-title" placeholder="审批标题"></div>';
  h+='<div class="form-group"><label>内容说明</label><textarea id="ap-content" rows="3" placeholder="请输入审批内容和理由..."></textarea></div>';
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest(&apos;.modal-overlay&apos;).remove()">取消</button><button class="btn-save" onclick="submitApproval()">提交</button></div></div></div>';
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
    for(var i=0;i<allClients.length;i++){var cl=allClients[i];sel.innerHTML+='<option value="'+cl.id+'">'+escHtml(cl.name)+'</option>';commentClientsList.push(cl)}
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
    h+='<div class="comment-item"><div class="cmt-title">'+escHtml(cm.content)+'</div><div class="cmt-meta">客户: '+(cl?escHtml(cl.name):'未知')+' · '+new Date(cm.created_at).toLocaleString('zh-CN')+'<button class="btn-sm" style="font-size:10px;padding:1px 6px;color:var(--danger);margin-left:8px" onclick="deleteComment(\''+cm.id+'\')\">删除</button></div></div>';
  }
  list.innerHTML=h;
}

function openCommentForm(){
  var h='<div class="modal-overlay" id="comment-modal"><div class="modal-sheet"><h3>添加客户评论</h3>';
  h+='<div class="form-group"><label>客户 *</label><select id="cm-client"><option value="">请选择</option>';
  for(var i=0;i<allClients.length;i++)h+='<option value="'+allClients[i].id+'">'+escHtml(allClients[i].name)+'</option>';
  h+='</select></div>';
  h+='<div class="form-group"><label>评论内容 *</label><textarea id="cm-content" rows="3" placeholder="输入评论..."></textarea></div>';
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest(&quot;.modal-overlay&quot;).remove()">取消</button><button class="btn-save" onclick="saveComment()">保存</button></div></div></div>';
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
  var _delErr=(await sb.from('client_comments').delete().eq('id',id)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
  loadComments();showToast('已删除');
}

// ============ NEW: Birthday Reminder ============
function checkBirthdayReminders(){
  if(!allContacts||!allContacts.length)return;
  var now=new Date(),today=now.toISOString().slice(5,10); // MM-DD
  var birthdays=[];
  for(var i=0;i<allContacts.length;i++){
    var co=allContacts[i];
    if(!co.birthday)continue;
    var bd=co.birthday.slice(5,10);
    var bDate=new Date(now.getFullYear()+(bd<today?1:0),parseInt(bd.slice(0,2))-1,parseInt(bd.slice(3,5)));
    var diff=Math.ceil((bDate-now)/86400000);
    if(diff>=0&&diff<=7){
      var client=allClients.find(function(c){return c.id===co.client_id});
      birthdays.push({contact:co,client:client?client.name:'',date:bDate,diff:diff});
    }
  }
  if(birthdays.length>0)showBirthdayReminder(birthdays);
}

function showBirthdayReminder(contacts){
  var el=document.getElementById('birthday-reminders');
  if(!el)return;
  var section=document.getElementById('birthday-section');
  if(section)section.style.display='block';
  var html='';
  for(var i=0;i<contacts.length;i++){
    var b=contacts[i];
    html+='<div class="birthday-card"><div class="bd-icon">🎂</div><div class="bd-info"><div class="bd-name">'+h(b.contact.name||'未命名')+'</div><div class="bd-date">'+b.date.toLocaleDateString('zh-CN')+' ('+(b.diff===0?'今天':b.diff+'天后')+')</div>'+(b.client?'<div class="bd-client">'+h(b.client)+'</div>':'')+'</div></div>';
  }
  el.innerHTML=html;
  el.style.display='block';
}

/* ===== 合同到期提醒（经营总览页） ===== */
function loadDashReminders(){
  var remEl=document.getElementById('dash-reminders');
  if(!remEl)return;
  if(!currentCompanyId){remEl.innerHTML='<div class="empty-state">🎉 暂无待处理提醒</div>';return}
  var today=new Date().toISOString().slice(0,10);
  sb.from('contracts').select('id,title,total_amount,end_date').eq('company_id',currentCompanyId).not('archive_status','eq','archived').order('end_date',{ascending:true}).limit(5).then(function(r){
    if(r&&r.error){remEl.innerHTML='<div class="empty-state">加载提醒失败</div>';return}
    var rows=((r&&r.data)||[]).filter(function(c){return c&&c.end_date});
    if(!rows.length){remEl.innerHTML='<div class="empty-state">🎉 暂无待处理提醒</div>';return}
    var html='<div class="reminder-list">';
    for(var i=0;i<rows.length;i++){
      var c=rows[i];var isOver=c.end_date<today;
      var d=new Date(c.end_date);
      html+='<div class="reminder-item'+(isOver?' reminder-overdue':'')+'"><span class="reminder-icon">'+(isOver?'🔴':'🟡')+'</span><div class="reminder-info"><span class="reminder-title">'+h(c.title||('合同#'+c.id))+'</span><span class="reminder-detail">'+(c.total_amount?' · ¥'+Number(c.total_amount).toLocaleString('zh-CN'):'')+'</span></div><span class="reminder-date">'+(isNaN(d.getTime())?h(c.end_date):d.toLocaleDateString('zh-CN'))+'</span></div>';
    }
    html+='</div>';
    remEl.innerHTML=html;
  }).catch(function(){remEl.innerHTML='<div class="empty-state">加载提醒失败</div>'});
}

