
// === Supplier Name Autocomplete ===
var supNameSuggIdx=-1,supNameSuggList=[];

function onSupNameInput(){
  var inp=document.getElementById('sup-name');
  var val=(inp.value||'').trim().toLowerCase();
  var dd=document.getElementById('sup-name-suggestions');
  if(!val||val.length<1){dd.classList.add('hidden');supNameSuggList=[];supNameSuggIdx=-1;return}
  var matches=[],seen={};
  // 1. Existing suppliers
  for(var i=0;i<allSuppliers.length;i++){
    var s=allSuppliers[i];
    var sn=(s.name||'').toLowerCase();
    if(supplierEditId&&s.id===supplierEditId)continue;
    if(sn&&sn.indexOf(val)>=0&&!seen[sn]){seen[sn]=1;matches.push({name:s.name,source:'已存供应商',exists:true,id:s.id})}
  }
  // 2. Existing clients
  for(var j=0;j<allClients.length;j++){
    var cl=allClients[j];
    var cn=(cl.name||'').toLowerCase();
    if(cn&&cn.indexOf(val)>=0&&!seen[cn]){seen[cn]=1;matches.push({name:cl.name,source:'已存客户',exists:true,isClient:true,clientId:cl.id})}
  }
  // 3. Company directory
  for(var k=0;k<allCompanies.length;k++){
    var co=allCompanies[k];
    var con=(co.name||'').toLowerCase();
    if(con&&con.indexOf(val)>=0&&!seen[con]){
      seen[con]=1;
      var detail=(co.legal_person||'')+(co.reg_capital?' · 注册资本'+co.reg_capital:'');
      matches.push({name:co.name,source:'企业名录',detail:detail,comp:co});
    }
  }
  matches.sort(function(a,b){
    var ae=a.name.toLowerCase()===val,be=b.name.toLowerCase()===val;
    if(ae&&!be)return -1;if(!ae&&be)return 1;
    if(a.exists&&!b.exists)return -1;if(!a.exists&&b.exists)return 1;
    return (a.name||'').length-(b.name||'').length;
  });
  matches=matches.slice(0,20);
  if(!matches.length){dd.classList.add('hidden');supNameSuggList=[];supNameSuggIdx=-1;return}
  supNameSuggList=matches;supNameSuggIdx=-1;
  var h='',lastSource='';
  for(var m=0;m<matches.length;m++){
    var mt=matches[m];
    if(mt.source!==lastSource){
      var icon=mt.source==='已存供应商'?'📦':mt.source==='已存客户'?'📋':'📂';
      h+='<div class="ns-group-label">'+icon+' '+mt.source+'</div>';
      lastSource=mt.source;
    }
    h+='<div class="name-suggestion" data-idx="'+m+'" onmousedown="selectSupNameSuggestion('+m+')"><div><div class="ns-name">'+escHtml(mt.name)+'</div>'+(mt.detail?'<div class="ns-detail">'+escHtml(mt.detail)+'</div>':'')+'</div>'+(mt.exists?'<span class="ns-exists">⚠ 已存在</span>':'<span class="ns-source">点击填充</span>')+'</div>';
  }
  dd.innerHTML=h;dd.classList.remove('hidden');
}

function onSupNameKeydown(e){
  var dd=document.getElementById('sup-name-suggestions');
  if(dd.classList.contains('hidden'))return;
  if(e.key==='ArrowDown'){e.preventDefault();supNameSuggIdx=Math.min(supNameSuggIdx+1,supNameSuggList.length-1);updateSupNameActive()}
  else if(e.key==='ArrowUp'){e.preventDefault();supNameSuggIdx=Math.max(supNameSuggIdx-1,0);updateSupNameActive()}
  else if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();if(supNameSuggIdx>=0&&supNameSuggIdx<supNameSuggList.length)selectSupNameSuggestion(supNameSuggIdx)}
  else if(e.key==='Escape'){dd.classList.add('hidden');supNameSuggIdx=-1}
}

function updateSupNameActive(){
  var items=document.querySelectorAll('#sup-name-suggestions .name-suggestion');
  for(var i=0;i<items.length;i++)items[i].classList.toggle('active',i===supNameSuggIdx);
  if(supNameSuggIdx>=0)items[supNameSuggIdx].scrollIntoView({block:'nearest'});
}

function selectSupNameSuggestion(idx){
  var m=supNameSuggList[idx];if(!m)return;
  document.getElementById('sup-name').value=m.name;
  document.getElementById('sup-name-suggestions').classList.add('hidden');
  supNameSuggList=[];supNameSuggIdx=-1;
  if(m.comp&&m.comp.legal_person){
    var cEl=document.getElementById('sup-contact-name');
    if(!cEl.value.trim())cEl.value=m.comp.legal_person;
  }
  if(m.isClient){selectSupLinkClient(m.clientId,m.name);showToast('已自动关联客户"'+m.name+'"')}
  else if(m.exists){showToast('供应商"'+m.name+'"已存在')}
}

// Click-outside to close suggestions
document.addEventListener('click',function(e){
  var ddSup=document.getElementById('sup-name-suggestions');
  if(ddSup&&!ddSup.classList.contains('hidden')&&!e.target.closest('#supplier-modal'))ddSup.classList.add('hidden');
  // Also handle client name suggestions
  var ns=document.getElementById('name-suggestions');
  if(ns&&!ns.classList.contains('hidden')&&!e.target.closest('#form-modal'))ns.classList.add('hidden');
});

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

function renderClient360Overview(c,orders){
  var stageMap={prospect:'潜在客户',qualified:'合格线索',deal:'成交客户',atrisk:'流失预警',churned:'流失客户',repurchase:'复购客户'};
  var totalRev=0,paidCount=0;
  for(var i=0;i<orders.length;i++){totalRev+=parseFloat(orders[i].amount||0)||parseFloat(orders[i]._amount||0);if(orders[i].stage==='已完成')paidCount++}
  var lastEng='无';
  (async function(){
    var {data}=await sb.from('engagement_logs').select('created_at').eq('client_id',c.id).eq('company_id',currentCompanyId).order('created_at',{ascending:false}).limit(1);
    if(data&&data.length)lastEng=new Date(data[0].created_at).toLocaleDateString('zh-CN');
    document.getElementById('c360-last-engage').textContent=lastEng;
  })();
  var html='<div class="c360-card"><div class="c360-card-title">📋 基本信息</div>';
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
      html+='<div class="c360-contact-item"><div class="c360-contact-name">'+h(co.name||'未命名')+dm+'</div>';
      html+='<div class="c360-contact-info">';
      if(co.dept)html+='<span>🏢 '+h(co.dept)+'</span>';
      if(co.position)html+='<span>💼 '+h(co.position)+'</span>';
      if(phs.length&&phs[0])html+='<span>📞 '+h(phs.join(' / '))+'</span>';
      if(lls.length&&lls[0])html+='<span>🖥 '+h(lls.join(' / '))+'</span>';
      if(ems.length&&ems[0])html+='<span>📧 '+h(ems.join(' / '))+'</span>';
      html+='</div><div class="c360-contact-badges">'+bd+rel+'</div></div>';
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
  await sb.from('engagement_logs').delete().eq('id',id);
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
  var {error}=await sb.from('clients').update({lifecycle_stage:newStage,updated_at:new Date().toISOString()}).eq('id',clientId);
  if(error){showToast('变更失败: '+error.message);return}
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
    await sb.from('clients').update({lifecycle_stage:newStage,updated_at:new Date().toISOString()}).eq('id',clientId);
    await sb.from('lifecycle_logs').insert({company_id:currentCompanyId,client_id:clientId,from_stage:from,to_stage:newStage,reason:'自动检测',created_by:currentUser.id});
    c.lifecycle_stage=newStage;
  }
}

// ============ NEW: Lead Pool Functions ============
async function loadLeads(){
  var {data,error}=await sb.from('lead_pool').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
  if(error){console.error('loadLeads:',error);return}
  allLeads=data||[];
  renderLeads();
}

function renderLeads(){
  var list=allLeads||[];
  var q=(document.getElementById('lead-pool-search')||{}).value||'';
  q=q.trim().toLowerCase();
  var filter=(document.getElementById('lead-pool-filter')||{}).value||'all';
  if(q)list=list.filter(function(l){return(l.name||'').toLowerCase().indexOf(q)>=0||(l.contact_name||'').toLowerCase().indexOf(q)>=0||(l.contact_phone||'').indexOf(q)>=0});
  if(filter!=='all')list=list.filter(function(l){return l.status===filter});
  // Stats
  var total=allLeads.length,assigned=0,converted=0;
  for(var i=0;i<allLeads.length;i++){if(allLeads[i].status==='assigned'||allLeads[i].status==='contacted')assigned++;if(allLeads[i].status==='converted')converted++}
  var statsBar=document.getElementById('leads-stats-bar');
  var convRate=total>0?Math.round(converted/total*100):0;
  if(statsBar)statsBar.innerHTML='<div class="stat-card"><div class="stat-num">'+list.length+'</div><div class="stat-label">'+(filter!=='all'||q?'筛选结果':'全部线索')+'</div></div><div class="stat-card"><div class="stat-num">'+assigned+'</div><div class="stat-label">已分配</div></div><div class="stat-card"><div class="stat-num">'+convRate+'%</div><div class="stat-label">转化率</div></div>';
  var grid=document.getElementById('lead-grid'),empty=document.getElementById('lead-empty');
  if(!list.length){grid.innerHTML='';empty.classList.remove('hidden');return}
  empty.classList.add('hidden');
  var statusMap={new:'新线索',assigned:'已分配',contacted:'已联系',converted:'已转化',recycled:'已回收',junk:'无效'};
  var html='';
  for(var i=0;i<list.length;i++){
    var l=list[i];
    var assignee='';
    if(l.assigned_to&&allUsers){var u=allUsers.find(function(x){return x.user_id===l.assigned_to});assignee=u?(u.display_name||u.email||''):''}
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
    if(assignee)html+='<span>分配: '+h(assignee)+'</span>';
    if(l.last_follow_up)html+='<span>跟进: '+l.last_follow_up+'</span>';
    html+='</div>';
    html+='<div class="lead-actions">';
    if(l.status!=='converted')html+='<button class="btn-lead-primary" onclick="event.stopPropagation();openLeadForm(\''+l.id+'\')">编辑</button>';
    if(l.status==='new')html+='<button onclick="event.stopPropagation();assignLead(\''+l.id+'\')">分配</button>';
    if(l.status==='assigned'||l.status==='contacted')html+='<button class="btn-lead-primary" onclick="event.stopPropagation();convertLeadToClient(\''+l.id+'\')">转客户</button>';
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
  var matches=[],seen={};
  for(var i=0;i<allCompanies.length;i++){
    var c=allCompanies[i];var cn=(c.name||'').toLowerCase();
    if(cn&&cn.indexOf(val)>=0&&!seen[cn]){seen[cn]=1;matches.push(c)}
  }
  matches.sort(function(a,b){return (a.name||'').length-(b.name||'').length});
  matches=matches.slice(0,12);
  if(!matches.length){dd.classList.add('hidden');leadCompSuggList=[];leadCompSuggIdx=-1;return}
  leadCompSuggList=matches;leadCompSuggIdx=-1;
  dd.innerHTML=matches.map(function(c,i){return '<div class="name-suggestion'+(i===leadCompSuggIdx?' active':'')+'" data-idx="'+i+'" onmousedown="selectLeadCompany('+i+')"><div class="ns-name">'+escHtml(c.name)+'</div><div class="ns-detail">'+escHtml(c.base||c.legal_person||'')+'</div></div>'}).join('');
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
function selectLeadCompany(idx){
  var c=leadCompSuggList[idx];if(!c)return;
  document.getElementById('lf-name').value=c.name;
  document.getElementById('lead-name-suggestions').classList.add('hidden');
  leadCompSuggList=[];leadCompSuggIdx=-1;
  if(c.industry)document.getElementById('lf-industry').value=c.industry;
  if(c.scale)document.getElementById('lf-scale').value=c.scale;
}

// === Lead Contact Autocomplete (from existing clients) ===
var leadContactSuggIdx=-1,leadContactSuggList=[];
function onLeadContactInput(){
  var inp=document.getElementById('lf-contact-name');
  var val=(inp.value||'').trim().toLowerCase();
  var dd=document.getElementById('lead-contact-suggestions');
  if(!val||val.length<1){dd.classList.add('hidden');leadContactSuggList=[];leadContactSuggIdx=-1;return}
  var matches=[],seen={};
  for(var i=0;i<allContacts.length;i++){
    var co=allContacts[i];var cn=(co.name||'').toLowerCase();
    var key=cn+'|'+co.client_id;
    if(cn&&cn.indexOf(val)>=0&&!seen[key]){
      seen[key]=1;
      var cl=allClients.find(function(x){return x.id===co.client_id});
      var phones='';
      try{var ph=JSON.parse(co.phone||'[]');if(ph.length)phones=ph[0]}catch(e){phones=co.phone||''}
      var emails='';
      try{var em=JSON.parse(co.email||'[]');if(em.length)emails=em[0]}catch(e){emails=co.email||''}
      matches.push({name:co.name,phone:phones,email:emails,clientName:cl?cl.name:'',dept:co.dept||'',position:co.position||''});
    }
  }
  matches.sort(function(a,b){return (a.name||'').length-(b.name||'').length});
  matches=matches.slice(0,12);
  if(!matches.length){dd.classList.add('hidden');leadContactSuggList=[];leadContactSuggIdx=-1;return}
  leadContactSuggList=matches;leadContactSuggIdx=-1;
  dd.innerHTML=matches.map(function(m,i){return '<div class="name-suggestion'+(i===leadContactSuggIdx?' active':'')+'" data-idx="'+i+'" onmousedown="selectLeadContact('+i+')"><div><div class="ns-name">'+escHtml(m.name)+'</div><div class="ns-detail">'+escHtml(m.clientName)+(m.position?' · '+escHtml(m.position):'')+(m.phone?' · '+escHtml(m.phone):'')+'</div></div></div>'}).join('');
  dd.classList.remove('hidden');
}
function onLeadContactKey(e){
  var dd=document.getElementById('lead-contact-suggestions');
  if(dd.classList.contains('hidden'))return;
  if(e.key==='ArrowDown'){e.preventDefault();leadContactSuggIdx=Math.min(leadContactSuggIdx+1,leadContactSuggList.length-1);updateLeadContactActive()}
  else if(e.key==='ArrowUp'){e.preventDefault();leadContactSuggIdx=Math.max(leadContactSuggIdx-1,0);updateLeadContactActive()}
  else if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();if(leadContactSuggIdx>=0)selectLeadContact(leadContactSuggIdx)}
  else if(e.key==='Escape'){dd.classList.add('hidden');leadContactSuggIdx=-1}
}
function updateLeadContactActive(){
  var items=document.querySelectorAll('#lead-contact-suggestions .name-suggestion');
  for(var i=0;i<items.length;i++)items[i].classList.toggle('active',i===leadContactSuggIdx);
  if(leadContactSuggIdx>=0&&items[leadContactSuggIdx])items[leadContactSuggIdx].scrollIntoView({block:'nearest'});
}
function selectLeadContact(idx){
  var m=leadContactSuggList[idx];if(!m)return;
  document.getElementById('lf-contact-name').value=m.name;
  if(m.phone)document.getElementById('lf-contact-phone').value=m.phone;
  if(m.email)document.getElementById('lf-contact-email').value=m.email;
  document.getElementById('lead-contact-suggestions').classList.add('hidden');
  leadContactSuggList=[];leadContactSuggIdx=-1;
}


function openLeadForm(id){
  leadEditId=id||null;
  document.getElementById('lead-form-title').textContent=id?'编辑线索':'新建线索';
  document.getElementById('lead-btn-delete').classList.toggle('hidden',!id);
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
  if(id){
    var l=allLeads.find(function(x){return x.id===id});
    if(l){
      document.getElementById('lf-name').value=l.name||'';
      document.getElementById('lf-contact-name').value=l.contact_name||'';
      document.getElementById('lf-contact-phone').value=l.contact_phone||'';
      document.getElementById('lf-contact-email').value=l.contact_email||'';
      document.getElementById('lf-source').value=l.source||'';
      document.getElementById('lf-industry').value=l.industry||'';
      document.getElementById('lf-scale').value=l.scale||'';
      document.getElementById('lf-max-recycle').value=l.max_recycle_count||3;
      document.getElementById('lf-recycle-days').value=l.recycle_days||30;
      document.getElementById('lf-status').value=l.status||'new';
      document.getElementById('lf-notes').value=l.notes||'';
    }
  }
  document.getElementById('lead-form-modal').classList.remove('hidden');
}

function closeLeadForm(){document.getElementById('lead-form-modal').classList.add('hidden');leadEditId=null}

async function saveLead(){
  var name=document.getElementById('lf-name').value.trim();
  if(!name){showToast('请输入线索名称');return}
  var lead={
    name:name,
    contact_name:document.getElementById('lf-contact-name').value.trim(),
    contact_phone:document.getElementById('lf-contact-phone').value.trim(),
    contact_email:document.getElementById('lf-contact-email').value.trim(),
    source:document.getElementById('lf-source').value,
    industry:document.getElementById('lf-industry').value,
    scale:document.getElementById('lf-scale').value,
    max_recycle_count:parseInt(document.getElementById('lf-max-recycle').value)||3,
    recycle_days:parseInt(document.getElementById('lf-recycle-days').value)||30,
    status:document.getElementById('lf-status').value,
    notes:document.getElementById('lf-notes').value.trim(),
    updated_at:new Date().toISOString()
  };
  if(!leadEditId){
    lead.company_id=currentCompanyId;
    lead.created_by=currentUser.id;
    var {error}=await sb.from('lead_pool').insert(lead);
    if(error){showToast('创建失败: '+error.message);return}
  }else{
    var {error}=await sb.from('lead_pool').update(lead).eq('id',leadEditId);
    if(error){showToast('更新失败: '+error.message);return}
  }
  closeLeadForm();
  loadLeads();
  showToast(leadEditId?'已更新':'已创建');
}

async function deleteLead(id){
  if(!id)return;
  if(leadEditId===id)closeLeadForm();
  await sb.from('lead_pool').delete().eq('id',id);
  loadLeads();
  showToast('已删除');
}

function assignLead(id){
  leadAssignId=id;
  var sel=document.getElementById('la-user-select');
  sel.innerHTML='<option value="">选择用户</option>';
  for(var i=0;i<allUsers.length;i++)sel.innerHTML+='<option value="'+allUsers[i].user_id+'">'+(allUsers[i].display_name||allUsers[i].email||allUsers[i].user_id)+'</option>';
  document.getElementById('lead-assign-modal').classList.remove('hidden');
}

async function doAssignLead(){
  var userId=document.getElementById('la-user-select').value;
  if(!userId){showToast('请选择用户');return}
  var {error}=await sb.from('lead_pool').update({assigned_to:userId,assigned_at:new Date().toISOString(),status:'assigned',updated_at:new Date().toISOString()}).eq('id',leadAssignId);
  document.getElementById('lead-assign-modal').classList.add('hidden');
  if(error){showToast('分配失败: '+error.message);return}
  loadLeads();showToast('已分配');
}

async function convertLeadToClient(id){
  var l=allLeads.find(function(x){return x.id===id});
  if(!l)return;
  var client={name:l.name,type:'[]',address:'',notes:l.notes||'',industry:l.industry||'',scale:l.scale||'',source:l.source||'',lifecycle_stage:'prospect',user_id:currentUser.id,company_id:currentCompanyId};
  var {data:cd,error}=await sb.from('clients').insert(client).select('id');
  if(error){showToast('转化失败: '+error.message);return}
  var clientId=cd[0].id;
  // Create contact if contact info exists
  if(l.contact_name||l.contact_phone||l.contact_email){
    await sb.from('contacts').insert({client_id:clientId,name:l.contact_name||'',phone:JSON.stringify(l.contact_phone?[l.contact_phone]:['']),email:JSON.stringify(l.contact_email?[l.contact_email]:['']),company_id:currentCompanyId,user_id:currentUser.id});
  }
  // Update lead
  await sb.from('lead_pool').update({status:'converted',converted_client_id:clientId,converted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id);
  loadClients();loadLeads();
  showToast('已转化为客户');
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
  if(imported>0){loadLeads();showToast('已导入 '+imported+' 条线索')}
  else showToast('导入失败');
}

async function recycleStale(){
  var now=new Date();
  var recycled=0;
  for(var i=0;i<allLeads.length;i++){
    var l=allLeads[i];
    if(l.status!=='assigned'&&l.status!=='contacted')continue;
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
  if(recycled>0){loadLeads();showToast('已回收 '+recycled+' 条线索')}
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
    for(var i=0;i<allClients.length;i++){var cl=allClients[i];sel.innerHTML+='<option value="'+cl.id+'">'+h(cl.name)+'</option>'}
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
    h+='<div class="schedule-item" style="border-left-color:#8B5CF6"><div class="sch-title"><span style="background:#EDE9FE;color:#7C3AED;padding:1px 6px;border-radius:4px;font-size:11px">'+h(f.type||'其他')+'</span> '+(cl2?h(cl2.name):'未知客户')+'</div><div style="font-size:13px;margin:4px 0">'+h(f.content||'')+'</div>'+(f.outcome?'<div style="font-size:12px;color:#10B981">'+h(f.outcome)+'</div>':'')+(f.next_step?'<div class="sch-meta">下一步: '+h(f.next_step)+(f.next_date?' ('+f.next_date+')':'')+'</div>':'')+'<div class="sch-meta">'+new Date(f.created_at).toLocaleString('zh-CN')+'<button class="btn-sm" style="font-size:10px;padding:1px 6px;color:var(--danger);margin-left:8px" onclick="deleteEngagement(''+f.id+'')">删除</button></div></div>';
  }
  list.innerHTML=h;
}

function openFollowupForm(){
  var h='<div class="modal-overlay" id="followup-modal"><div class="modal-sheet"><h3>新增跟进记录</h3>';
  h+='<div class="form-group"><label>客户 *</label><select id="fu-client"><option value="">请选择</option>';
  for(var i=0;i<allClients.length;i++)h+='<option value="'+allClients[i].id+'">'+h(allClients[i].name)+'</option>';
  h+='</select></div>';
  h+='<div class="form-group"><label>跟进类型</label><select id="fu-type"><option value="电话">电话</option><option value="拜访">拜访</option><option value="微信">微信</option><option value="邮件">邮件</option><option value="会议">会议</option><option value="其他">其他</option></select></div>';
  h+='<div class="form-group"><label>跟进内容 *</label><textarea id="fu-content" rows="3" placeholder="请输入跟进内容..."></textarea></div>';
  h+='<div class="form-group"><label>结果</label><input id="fu-outcome" placeholder="跟进结果（可选）"></div>';
  h+='<div class="form-row"><div class="form-group"><label>下一步计划</label><input id="fu-next-step" placeholder="下一步"></div><div class="form-group"><label>下次跟进日期</label><input type="date" id="fu-next-date"></div></div>';
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest('.modal-overlay').remove()">取消</button><button class="btn-save" onclick="saveFollowup()">保存</button></div></div></div>';
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
    for(var i=0;i<allDepartments.length;i++){var d=allDepartments[i];sel.innerHTML+='<option value="'+d.id+'">'+h(d.name)+'</option>'}
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
    h+='<div class="schedule-item" style="border-left-color:#10B981"><div class="sch-title">'+h(userName)+(dept?' <span style="font-size:11px;color:var(--text3)">@'+h(dept.name)+'</span>':'')+'</div><div style="font-size:14px;margin:4px 0">'+h(m.content)+'</div>'+(m.attachments&&m.attachments.length?'<div style="font-size:11px;color:var(--primary)">附件: '+m.attachments.length+'个</div>':'')+'<div class="sch-meta">'+new Date(m.created_at).toLocaleString('zh-CN')+'</div></div>';
  }
  list.innerHTML=h;
}

function openMsgForm(){
  var h='<div class="modal-overlay" id="msg-modal"><div class="modal-sheet"><h3>发送部门消息</h3>';
  h+='<div class="form-group"><label>目标部门</label><select id="msg-dept"><option value="">全公司</option>';
  for(var i=0;i<allDepartments.length;i++)h+='<option value="'+allDepartments[i].id+'">'+h(allDepartments[i].name)+'</option>';
  h+='</select></div>';
  h+='<div class="form-group"><label>消息内容 *</label><textarea id="msg-content" rows="3" placeholder="输入消息..."></textarea></div>';
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest('.modal-overlay').remove()">取消</button><button class="btn-save" onclick="sendMsg()">发送</button></div></div></div>';
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

// Update switchCollabTab to support new tabs
var _origSwitchCollabTab=switchCollabTab;
switchCollabTab=function(tab){
  _origSwitchCollabTab(tab);
  document.getElementById('collab-followup-panel').classList.toggle('hidden',tab!=='followup');
  document.getElementById('collab-msg-panel').classList.toggle('hidden',tab!=='msg');
  if(tab==='followup')loadFollowups();
  else if(tab==='msg')loadMessages();
};

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
    h+='<div class="schedule-item" style="border-left-color:'+(s.color||'#4F6EF7')+'"><div class="sch-title">'+h(s.title)+' <span style="font-size:11px;color:var(--text3)">'+time+'</span></div>'+(s.description?'<div style="font-size:13px;color:var(--text2)">'+h(s.description)+'</div>':'')+(s.location?'<div class="sch-meta">📍 '+h(s.location)+'</div>':'')+'<div style="margin-top:6px;display:flex;gap:6px"><button class="btn-sm" style="font-size:11px;padding:2px 8px" onclick="editSchedule(''+s.id+'')">编辑</button><button class="btn-sm" style="font-size:11px;padding:2px 8px;color:var(--danger)" onclick="deleteSchedule(''+s.id+'')">删除</button></div></div>';
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
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest('.modal-overlay').remove()">取消</button><button class="btn-save" onclick="saveSchedule(''+(s?s.id:'')+'')">保存</button></div></div></div>';
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
    h+='<div class="task-item task-priority-'+prio+'"><div class="task-title">'+h(t.title)+' <span class="status-badge status-'+(t.status==='in_progress'?'progress':t.status)+'">'+statusLabel+'</span></div>'+(t.description?'<div style="font-size:13px;color:var(--text2)">'+h(t.description)+'</div>':'')+(t.due_date?'<div class="task-meta">📅 截止: '+t.due_date+'</div>':'')+'<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><button class="btn-sm" style="font-size:11px;padding:2px 8px" onclick="editTask(''+t.id+'')">编辑</button><button class="btn-sm" style="font-size:11px;padding:2px 8px;color:var(--danger)" onclick="deleteTask(''+t.id+'')">删除</button></div></div>';
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
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest('.modal-overlay').remove()">取消</button><button class="btn-save" onclick="saveTask(''+(t?t.id:'')+'')">保存</button></div></div></div>';
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
    h+='<div class="approval-item approval-'+(a.status==='pending'?'pending':a.status==='approved'?'approved':a.status==='rejected'?'rejected':'')+'"><div class="appr-title">'+h(a.title)+' <span class="status-badge status-'+(a.status==='pending'?'progress':a.status==='approved'?'done':a.status==='rejected'?'cancelled':'cancelled')+'">'+statusMap[a.status]+'</span></div><div class="appr-meta">'+h(a.type)+' · 步骤 '+a.current_step+'/'+a.total_steps+' · '+new Date(a.created_at).toLocaleDateString('zh-CN')+'</div>'+(a.status==='pending'?'<div style="margin-top:6px"><button class="btn-sm" style="font-size:11px;padding:2px 8px;background:#10B981;color:#fff;border:none;border-radius:4px;margin-right:4px" onclick="approveAction(''+a.id+'','approve')">通过</button><button class="btn-sm" style="font-size:11px;padding:2px 8px;background:#EF4444;color:#fff;border:none;border-radius:4px" onclick="approveAction(''+a.id+'','reject')">驳回</button></div>':'')+'</div>';
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
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest('.modal-overlay').remove()">取消</button><button class="btn-save" onclick="submitApproval()">提交</button></div></div></div>';
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
    h+='<div class="comment-item"><div class="cmt-title">'+h(cm.content)+'</div><div class="cmt-meta">客户: '+(cl?h(cl.name):'未知')+' · '+new Date(cm.created_at).toLocaleString('zh-CN')+'<button class="btn-sm" style="font-size:10px;padding:1px 6px;color:var(--danger);margin-left:8px" onclick="deleteComment(''+cm.id+'')">删除</button></div></div>';
  }
  list.innerHTML=h;
}

function openCommentForm(){
  var h='<div class="modal-overlay" id="comment-modal"><div class="modal-sheet"><h3>添加客户评论</h3>';
  h+='<div class="form-group"><label>客户 *</label><select id="cm-client"><option value="">请选择</option>';
  for(var i=0;i<allClients.length;i++)h+='<option value="'+allClients[i].id+'">'+h(allClients[i].name)+'</option>';
  h+='</select></div>';
  h+='<div class="form-group"><label>评论内容 *</label><textarea id="cm-content" rows="3" placeholder="输入评论..."></textarea></div>';
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest('.modal-overlay').remove()">取消</button><button class="btn-save" onclick="saveComment()">保存</button></div></div></div>';
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

// ============ NEW: Tag & Attachment Helpers ============
function selectGrade(grade){
  var hf=document.getElementById('f-grade');if(hf)hf.value=grade;
  updateGradeSelect(grade);
}
function updateGradeSelect(grade){
  var opts=document.querySelectorAll('#grade-select .grade-option');
  for(var i=0;i<opts.length;i++)opts[i].classList.toggle('selected',opts[i].textContent.trim()===grade);
}

function renderClientTags(){
  var el=document.getElementById('tag-chips');
  if(!el)return;
  var html='';
  for(var i=0;i<clientTags.length;i++)html+='<span class="tag-chip">'+h(clientTags[i])+'<span class="tag-remove" onclick="removeTag('+i+')">×</span></span>';
  el.innerHTML=html;
}

function addTag(tag){
  if(!tag)return;
  if(clientTags.indexOf(tag)>=0){showToast('标签已存在');return}
  clientTags.push(tag);
  renderClientTags();
}

function removeTag(idx){clientTags.splice(idx,1);renderClientTags()}

function renderClientAttachments(){
  var el=document.getElementById('attach-list');
  if(!el)return;
  var html='';
  for(var i=0;i<clientAttachments.length;i++){
    var a=clientAttachments[i];
    html+='<div class="attach-item"><span class="attach-name">'+h(a.name||a.file_name||'文件'+(i+1))+'</span><button class="attach-remove" onclick="removeAttachment('+i+')">×</button></div>';
  }
  if(!html)html='<span style="font-size:11px;color:var(--text3)">暂无附件</span>';
  el.innerHTML=html;
}

async function handleAttachFile(input){
  var files=input.files;
  if(!files||!files.length)return;
  var bucket='client-attachments';
  for(var i=0;i<files.length;i++){
    var f=files[i];
    var safeName=f.name.replace(/[^a-zA-Z0-9._\u4e00-\u9fff-]/g,'_');
    var filePath=currentCompanyId+'/'+Date.now()+'_'+safeName;
    try{
      var {data,error}=await sb.storage.from(bucket).upload(filePath,f,{cacheControl:'3600',upsert:false});
      if(error){showToast('\u4e0a\u4f20\u5931\u8d25: '+error.message);continue}
      var {data:urlData}=sb.storage.from(bucket).getPublicUrl(filePath);
      clientAttachments.push({name:f.name,size:f.size,type:f.type,url:urlData.publicUrl,path:filePath});
    }catch(e){showToast('\u4e0a\u4f20\u5f02\u5e38: '+e.message)}
  }
  renderClientAttachments();
  input.value='';
}

async function removeAttachment(idx){
  var a=clientAttachments[idx];
  if(a&&a.path){try{await sb.storage.from('client-attachments').remove([a.path])}catch(e){}}
  clientAttachments.splice(idx,1);renderClientAttachments();
}


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
  if(allDepartments)for(var i=0;i<allDepartments.length;i++){var d=allDepartments[i];ds.innerHTML+='<option value="'+escHtml(d.id)+'">'+escHtml(d.name)+'</option>';}
  ds.value=df;
  var list=allUsers||[];
  if(df)list=list.filter(function(u){return u.dept_id==df;});
  if(sf)list=list.filter(function(u){return u.status===sf;});
  if(q)list=list.filter(function(u){return (u.display_name||'').toLowerCase().indexOf(q)>=0||(u.email||'').toLowerCase().indexOf(q)>=0;});
  var h='<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:2px solid var(--border)"><th style="padding:10px 8px;text-align:left">姓名</th><th style="padding:10px 8px;text-align:left">邮箱</th><th style="padding:10px 8px;text-align:left">角色</th><th style="padding:10px 8px;text-align:left">部门</th><th style="padding:10px 8px;text-align:left">数据范围</th><th style="padding:10px 8px;text-align:left">状态</th><th style="padding:10px 8px;text-align:center">操作</th></tr></thead><tbody>';
  for(var j=0;j<list.length;j++){
    var u=list[j];var dn=u.display_name||'';var em=u.email||'';var rn=u.role||'';var did=u.dept_id||'';
    var deptName='';for(var k=0;k<(allDepartments||[]).length;k++){if(allDepartments[k].id==did){deptName=allDepartments[k].name;break;}}
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
  if(allDepartments)for(var j=0;j<allDepartments.length;j++)ds.innerHTML+='<option value="'+allDepartments[j].id+'">'+escHtml(allDepartments[j].name)+'</option>';
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
  if(allDepartments)for(var k=0;k<allDepartments.length;k++){ds.innerHTML+='<option value="'+allDepartments[k].id+'"'+(allDepartments[k].id==u.dept_id?' selected':'')+'>'+escHtml(allDepartments[k].name)+'</option>';}
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

