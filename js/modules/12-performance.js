// ==========================================================================
// grsds · 12-performance.js  —  业绩统计 · 供应商 · 附件 · 名称自动完成
// 源: js/app_v2.js 第 7765-8746 行（机械切片，未改一行代码）
// ==========================================================================
// === Performance Functions ===

function switchPerfTab(sub){
  var panels=document.querySelectorAll('.perf-panel');
  var tabs=document.querySelectorAll('.perf-subtab');
  for(var i=0;i<panels.length;i++)panels[i].classList.remove('active');
  for(var j=0;j<tabs.length;j++)tabs[j].classList.remove('active');
  var panel=document.getElementById('perf-'+sub);
  var tab=document.querySelector('.perf-subtab[onclick="switchPerfTab(\''+sub+'\')"]');
  if(panel)panel.classList.add('active');
  if(tab)tab.classList.add('active');
  if(sub==='targets')loadTargets();
  else if(sub==='dashboard'){loadTargets().then(function(){loadDashboard()})}
  else if(sub==='commission'){loadTargets().then(function(){loadCommission()})}
  else if(sub==='rules')loadCommissionRules();
}

function getYearMonths(){
  var now=new Date();
  var y=now.getFullYear(),m=now.getMonth()+1;
  return {year:y,month:m, years:[y-1,y,y+1], months:[1,2,3,4,5,6,7,8,9,10,11,12]};
}

function populatePerfSelects(){
  var ym=getYearMonths();
  var sel=document.getElementById('perf-target-year');
  var sel2=document.getElementById('perf-dash-year');
  var sel3=document.getElementById('perf-comm-year');
  var sm=document.getElementById('perf-dash-month');
  var sc=document.getElementById('perf-comm-month');
  var h='';for(var i=0;i<ym.years.length;i++)h+='<option value="'+ym.years[i]+'"'+(ym.years[i]===ym.year?' selected':'')+'>'+ym.years[i]+'年</option>';
  if(sel)sel.innerHTML=h;
  if(sel2)sel2.innerHTML=h;
  if(sel3)sel3.innerHTML=h;
  var mh='';for(var j=0;j<ym.months.length;j++)mh+='<option value="'+ym.months[j]+'"'+(ym.months[j]===ym.month?' selected':'')+'>'+ym.months[j]+'月</option>';
  if(sm)sm.innerHTML=mh;
  if(sc)sc.innerHTML=mh;
  // Users
  if(allUsers&&allUsers.length){
    var uh='<option value="">全部人员</option>';
    for(var k=0;k<allUsers.length;k++)uh+='<option value="'+allUsers[k].user_id+'">'+escHtml(allUsers[k].display_name||allUsers[k].email)+'</option>';
    var pu=document.getElementById('perf-target-user');
    var du=document.getElementById('perf-dash-user');
    if(pu)pu.innerHTML=uh;
    if(du)du.innerHTML=uh;
  }
}

async function loadTargets(){
  var y=document.getElementById('perf-target-year');
  var u=document.getElementById('perf-target-user');
  var year=y?parseInt(y.value):new Date().getFullYear();
  var uid=u?u.value:'';
  var q=sb.from('sales_targets').select('*').eq('company_id',currentCompanyId).eq('target_year',year).order('target_month');
  if(uid)q=q.eq('user_id',uid);
  var r=await q;
  allTargets=r.data||[];
  populatePerfSelects();
  renderTargets();
}

function renderTargets(){
  var tbody=document.getElementById('perf-target-tbody');
  if(!tbody)return;
  if(!allTargets.length){tbody.innerHTML='<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-secondary)">暂无目标数据</td></tr>';return;}
  var h='';
  for(var i=0;i<allTargets.length;i++){
    var t=allTargets[i];
    var uname='';var u=(allUsers||[]).find(function(x){return x.user_id===t.user_id});if(u)uname=u.display_name||u.email||'';
    var actual=getPerfActual(t.user_id,t.target_year,t.target_month);
    var rate=t.amount>0?Math.round(actual/t.amount*100):0;
    var rc=rate>=100?'var(--success)':rate>=60?'var(--warning)':'var(--danger)';
    h+='<tr><td>'+escHtml(uname)+'</td><td>'+t.target_year+'-'+String(t.target_month).padStart(2,'0')+'</td><td style="font-weight:600">¥'+fmtNum(t.amount)+'</td><td>¥'+fmtNum(actual)+'</td><td style="color:'+rc+';font-weight:600">'+rate+'%</td><td>'+targetStatusBadge(rate)+'</td><td><button class="btn-sm" style="background:var(--surface);border:1px solid var(--border)" onclick="openTargetForm('+t.id+')">编辑</button> <button class="btn-sm" style="background:#fff;color:var(--danger);border:1px solid var(--danger)" onclick="deleteTarget('+t.id+')">删除</button></td></tr>';
  }
  tbody.innerHTML=h;
}

function getPerfActual(uid,year,month){
  if(!allPerfRecords.length)return 0;
  var sum=0;
  for(var i=0;i<allPerfRecords.length;i++){
    var r=allPerfRecords[i];
    if(r.user_id===uid&&r.record_year===year&&r.record_month===month)sum+=(parseFloat(r.amount)||0);
  }
  return sum;
}

function targetStatusBadge(rate){
  if(rate>=100)return '<span class="badge-status active">已完成</span>';
  if(rate>=60)return '<span class="badge-status inactive">进行中</span>';
  return '<span class="badge-status leave">未达标</span>';
}

function openTargetForm(id){
  var t=id?allTargets.find(function(x){return x.id===id}):null;
  targetEditId=t?t.id:null;
  document.getElementById('perf-target-modal-title').textContent=t?'编辑目标':'设定目标';
  document.getElementById('pt-target-year').value=t?t.target_year:new Date().getFullYear();
  document.getElementById('pt-target-month').value=t?t.target_month:(new Date().getMonth()+1);
  document.getElementById('pt-target-amount').value=t?t.amount:'';
  document.getElementById('pt-target-notes').value=t?(t.notes||''):'';
  // user dropdown
  var su=document.getElementById('pt-target-user');
  if(allUsers&&allUsers.length){
    var uh='';
    for(var i=0;i<allUsers.length;i++)uh+='<option value="'+allUsers[i].user_id+'"'+(t&&allUsers[i].user_id===t.user_id?' selected':'')+'>'+escHtml(allUsers[i].display_name||allUsers[i].email)+'</option>';
    su.innerHTML=uh;
  }
  document.getElementById('pt-btn-delete').classList.toggle('hidden',!t);
  document.getElementById('perf-target-modal').classList.remove('hidden');
}

function closeTargetForm(){
  document.getElementById('perf-target-modal').classList.add('hidden');
  targetEditId=null;
}

async function saveTarget(){
  var y=parseInt(document.getElementById('pt-target-year').value);
  var m=parseInt(document.getElementById('pt-target-month').value);
  var a=parseFloat(document.getElementById('pt-target-amount').value)||0;
  var u=document.getElementById('pt-target-user').value;
  var n=document.getElementById('pt-target-notes').value.trim();
  if(!u||!a)return;
  var obj={company_id:currentCompanyId,user_id:u,target_year:y,target_month:m,amount:a,notes:n||null};
  if(targetEditId){obj.updated_at=new Date().toISOString();await sb.from('sales_targets').update(obj).eq('id',targetEditId)}
  else await sb.from('sales_targets').insert([obj]);
  closeTargetForm();
  await loadTargets();
}

async function deleteTarget(id){
  if(!await confirmDialog('确定删除此目标？'))return;
  var _delErr=(await sb.from('sales_targets').delete().eq('id',id)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
  await loadTargets();
}

var targetEditId=null;

async function loadDashboard(){
  await loadTargets();
  await loadPerfRecords();
  var y=parseInt(document.getElementById('perf-dash-year').value);
  var m=parseInt(document.getElementById('perf-dash-month').value);
  var u=document.getElementById('perf-dash-user').value;
  // Filter records
  var records=[];
  for(var i=0;i<allPerfRecords.length;i++){
    var r=allPerfRecords[i];
    if(r.record_year===y&&r.record_month===m&&(!u||r.user_id===u))records.push(r);
  }
  renderDashboard(records,y,m,u);
}

async function loadPerfRecords(){
  var y=parseInt(document.getElementById('perf-dash-year').value);
  var m=parseInt(document.getElementById('perf-dash-month').value);
  var q=sb.from('performance_records').select('*').eq('company_id',currentCompanyId);
  if(y)q=q.eq('record_year',y);
  if(m)q=q.eq('record_month',m);
  var r=await q;
  allPerfRecords=r.data||[];
}

function renderDashboard(records,y,m,uid){
  // KPI summary
  var total=0,count=records.length;
  for(var i=0;i<records.length;i++)total+=parseFloat(records[i].amount)||0;
  var targetTotal=0;
  for(var j=0;j<allTargets.length;j++){
    var t=allTargets[j];
    if(t.target_year===y&&t.target_month===m){
      if(!uid||t.user_id===uid)targetTotal+=parseFloat(t.amount);
    }
  }
  var rate=targetTotal>0?Math.round(total/targetTotal*100):0;
  var kpi=document.getElementById('kpi-cards');
  if(kpi)kpi.innerHTML='<div class="kpi-card"><div class="kpi-val kpi-primary">¥'+fmtNum(total)+'</div><div class="kpi-label">实际业绩</div><div class="kpi-sub">'+count+' 条记录</div></div><div class="kpi-card"><div class="kpi-val kpi-primary">¥'+fmtNum(targetTotal)+'</div><div class="kpi-label">目标金额</div></div><div class="kpi-card"><div class="kpi-val '+(rate>=100?'kpi-success':rate>=60?'kpi-warning':'kpi-danger')+'">'+rate+'%</div><div class="kpi-label">完成率</div><div class="progress-bar"><div class="progress-fill '+(rate>=100?'progress-high':rate>=60?'progress-mid':'progress-low')+'" style="width:'+Math.min(rate,100)+'%"></div></div></div>';

  // Detail table
  var tbody=document.getElementById('perf-dash-tbody');
  if(!tbody)return;
  var userMap={},users=[];
  for(var k=0;k<records.length;k++){
    var rec=records[k];
    if(!userMap[rec.user_id]){userMap[rec.user_id]={total:0,count:0};users.push(rec.user_id)}
    userMap[rec.user_id].total+=parseFloat(rec.amount)||0;
    userMap[rec.user_id].count++;
  }
  if(!users.length){tbody.innerHTML='<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-secondary)">暂无业绩数据</td></tr>';return;}
  var h='';
  for(var ki=0;ki<users.length;ki++){
    var uid2=users[ki],um=userMap[uid2];
    var uname=getUserName(uid2);
    // Find target for this user
    var utarget=0;
    for(var tj=0;tj<allTargets.length;tj++){
      var tt=allTargets[tj];
      if(tt.user_id===uid2&&tt.target_year===y&&tt.target_month===m)utarget=parseFloat(tt.amount);
    }
    var urate=utarget>0?Math.round(um.total/utarget*100):0;
    var urc=urate>=100?'var(--success)':urate>=60?'var(--warning)':'var(--danger)';
    var comm=getCommissionForUser(uid2,y,m);
    h+='<tr><td>'+escHtml(uname)+'</td><td>'+um.count+'</td><td style="font-weight:600">¥'+fmtNum(um.total)+'</td><td>¥'+fmtNum(utarget)+'</td><td style="color:'+urc+';font-weight:600">'+urate+'%</td><td style="color:var(--primary);font-weight:600">¥'+fmtNum(comm)+'</td></tr>';
  }
  tbody.innerHTML=h;
}

function getUserName(uid){
  if(allUsers)for(var i=0;i<allUsers.length;i++)if(allUsers[i].user_id===uid)return allUsers[i].display_name||allUsers[i].email||'';
  return uid;
}

function getCommissionForUser(uid,year,month){
  if(!allCommission.length)return 0;
  for(var i=0;i<allCommission.length;i++){
    var c=allCommission[i];
    if(c.user_id===uid&&c.calc_year===year&&c.calc_month===month)return parseFloat(c.commission_amount)||0;
  }
  return 0;
}

async function loadCommission(){
  await loadTargets();
  var y=parseInt(document.getElementById('perf-comm-year').value);
  var m=parseInt(document.getElementById('perf-comm-month').value);
  var s=document.getElementById('perf-comm-status').value;
  var q=sb.from('commission_details').select('*').eq('company_id',currentCompanyId).eq('calc_year',y).eq('calc_month',m);
  if(s)q=q.eq('status',s);
  var r=await q;
  allCommission=r.data||[];
  renderCommission();
}

function renderCommission(){
  var tbody=document.getElementById('perf-comm-tbody');
  var bar=document.getElementById('comm-total-bar');
  if(!tbody)return;
  if(!allCommission.length){tbody.innerHTML='<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-secondary)">暂无提成数据，点击"计算提成"生成</td></tr>';if(bar)bar.textContent='';return;}
  var total=0,paid=0;
  var h='';
  for(var i=0;i<allCommission.length;i++){
    var c=allCommission[i];
    var uname='';var u2=(allUsers||[]).find(function(x){return x.user_id===c.user_id});if(u2)uname=u2.display_name||u2.email||'';
    total+=parseFloat(c.commission_amount)||0;
    if(c.status==='paid')paid+=parseFloat(c.commission_amount)||0;
    var statusLabels={pending:'🔶 待确认',confirmed:'✅ 已确认',paid:'💰 已发放'};
    h+='<tr><td>'+escHtml(uname)+'</td><td>'+c.calc_year+'-'+String(c.calc_month).padStart(2,'0')+'</td><td>¥'+fmtNum(c.actual_amount)+'</td><td>¥'+fmtNum(c.target_amount)+'</td><td>'+(parseFloat(c.target_completion_rate)||0)+'%</td><td style="font-weight:600;color:var(--primary)">¥'+fmtNum(c.commission_amount)+'</td><td>'+(statusLabels[c.status]||c.status)+'</td><td>';
    if(c.status==='pending')h+='<button class="btn-sm" style="background:var(--success);color:#fff;border:none" onclick="updateCommissionStatus('+c.id+',\'confirmed\')">确认</button> ';
    if(c.status==='confirmed')h+='<button class="btn-sm" style="background:var(--primary);color:#fff;border:none" onclick="updateCommissionStatus('+c.id+',\'paid\')">已发放</button> ';
    h+='<button class="btn-sm" style="background:#fff;color:var(--danger);border:1px solid var(--danger)" onclick="deleteCommission('+c.id+')">删除</button></td></tr>';
  }
  tbody.innerHTML=h;
  if(bar)bar.textContent='合计提成: ¥'+fmtNum(total)+' | 已发放: ¥'+fmtNum(paid)+' | 待发放: ¥'+fmtNum(total-paid);
}

async function updateCommissionStatus(id,status){
  var upd={status:status};
  if(status==='paid')upd.paid_at=new Date().toISOString();
  await sb.from('commission_details').update(upd).eq('id',id);
  await loadCommission();
}

async function deleteCommission(id){
  if(!await confirmDialog('确定删除此提成记录？'))return;
  var _delErr=(await sb.from('commission_details').delete().eq('id',id)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
  await loadCommission();
}

async function calcCommission(){
  var y=parseInt(document.getElementById('perf-comm-year').value);
  var m=parseInt(document.getElementById('perf-comm-month').value);
  // Load actual performance and targets
  await loadPerfRecords();
  await loadTargets();
  await loadCommissionRules();
  // Build user->actual map
  var userActual={};
  for(var i=0;i<allPerfRecords.length;i++){
    var r=allPerfRecords[i];
    if(r.record_year===y&&r.record_month===m){
      if(!userActual[r.user_id])userActual[r.user_id]=0;
      userActual[r.user_id]+=parseFloat(r.amount)||0;
    }
  }
  // Build user->target map
  var userTarget={};
  for(var j=0;j<allTargets.length;j++){
    var t=allTargets[j];
    if(t.target_year===y&&t.target_month===m){
      if(!userTarget[t.user_id])userTarget[t.user_id]=0;
      userTarget[t.user_id]=parseFloat(t.amount);
    }
  }
  var userIds=Object.keys(userActual).concat(Object.keys(userTarget));
  userIds=userIds.filter(function(v,i,a){return a.indexOf(v)===i});
  if(!userIds.length){showToast('该月份没有业绩数据');return;}
  var inserted=0;
  for(var k=0;k<userIds.length;k++){
    var uid=userIds[k];
    var actual=userActual[uid]||0;
    var targetAmt=userTarget[uid]||0;
    var rate=targetAmt>0?Math.min(Math.round(actual/targetAmt*10000)/100,999.99):0;
    var commAmt=calcCommissionAmount(actual);
    // upsert
    var exist=allCommission.find(function(x){return x.user_id===uid&&x.calc_year===y&&x.calc_month===m});
    var tid=allTargets.find(function(x){return x.user_id===uid&&x.target_year===y&&x.target_month===m});
    var obj={company_id:currentCompanyId,user_id:uid,target_id:tid?tid.id:null,calc_year:y,calc_month:m,actual_amount:actual,target_amount:targetAmt,target_completion_rate:rate,commission_amount:commAmt,status:'pending'};
    if(exist){await sb.from('commission_details').update(obj).eq('id',exist.id)}
    else {await sb.from('commission_details').insert([obj])}
    inserted++;
  }
  showToast('已计算 '+inserted+' 人提成');
  await loadCommission();
}

function calcCommissionAmount(actual){
  if(!allCommissionRules.length)return 0;
  var rules=allCommissionRules.sort(function(a,b){return parseFloat(a.min_amount)-parseFloat(b.min_amount)});
  var comm=0;
  for(var i=0;i<rules.length;i++){
    var r=rules[i];
    var minAmt=parseFloat(r.min_amount),maxAmt=parseFloat(r.max_amount),rate=parseFloat(r.rate);
    if(actual<=minAmt)break;
    var slab=Math.min(actual-minAmt,maxAmt-minAmt);
    comm+=slab*rate/100;
  }
  return Math.round(comm*100)/100;
}

async function loadCommissionRules(){
  var r=await sb.from('commission_rules').select('*').eq('company_id',currentCompanyId).order('min_amount');
  allCommissionRules=r.data||[];
  renderCommissionRules();
}

function renderCommissionRules(){
  var el=document.getElementById('perf-rules-list');
  if(!el)return;
  if(!allCommissionRules.length){el.innerHTML='<div style="text-align:center;padding:24px;color:var(--text-secondary)">暂未设置提成规则</div>';return;}
  var h='';
  for(var i=0;i<allCommissionRules.length;i++){
    var r=allCommissionRules[i];
    h+='<div class="rule-card"><div><div class="rc-name">'+escHtml(r.name)+'</div><div class="rc-range">¥'+fmtNum(r.min_amount)+' - ¥'+fmtNum(r.max_amount)+'</div></div><div class="rc-rate">'+r.rate+'%</div><div class="rc-action"><button class="btn-sm" style="background:var(--surface);border:1px solid var(--border)" onclick="openRuleForm('+r.id+')">编辑</button> <button class="btn-sm" style="background:#fff;color:var(--danger);border:1px solid var(--danger)" onclick="deleteRule('+r.id+')">删除</button></div></div>';
  }
  el.innerHTML=h;
}

function openRuleForm(id){
  var r=id?allCommissionRules.find(function(x){return x.id===id}):null;
  ruleEditId=r?r.id:null;
  document.getElementById('perf-rule-modal-title').textContent=r?'编辑提成规则':'新建提成规则';
  document.getElementById('pr-name').value=r?r.name:'';
  document.getElementById('pr-min').value=r?r.min_amount:'0';
  document.getElementById('pr-max').value=r?(r.max_amount===99999999?'':r.max_amount):'';
  document.getElementById('pr-rate').value=r?r.rate:'';
  document.getElementById('pr-desc').value=r?(r.description||''):'';
  document.getElementById('pr-btn-delete').classList.toggle('hidden',!r);
  document.getElementById('perf-rule-modal').classList.remove('hidden');
}

function closeRuleForm(){
  document.getElementById('perf-rule-modal').classList.add('hidden');
  ruleEditId=null;
}

async function saveRule(){
  var n=document.getElementById('pr-name').value.trim();
  var minAmt=parseFloat(document.getElementById('pr-min').value)||0;
  var maxAmtTxt=document.getElementById('pr-max').value.trim();
  var maxAmt=maxAmtTxt?parseFloat(maxAmtTxt):99999999;
  var rate=parseFloat(document.getElementById('pr-rate').value)||0;
  var desc=document.getElementById('pr-desc').value.trim();
  if(!n){showToast('请输入规则名称');return;}
  var obj={company_id:currentCompanyId,name:n,min_amount:minAmt,max_amount:maxAmt,rate:rate,description:desc||null};
  if(ruleEditId)await sb.from('commission_rules').update(obj).eq('id',ruleEditId);
  else await sb.from('commission_rules').insert([obj]);
  closeRuleForm();
  await loadCommissionRules();
}

async function deleteRule(id){
  if(!await confirmDialog('确定删除此提成规则？'))return;
  var _delErr=(await sb.from('commission_rules').delete().eq('id',id)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
  await loadCommissionRules();
}

var ruleEditId=null;

// Modal HTML injection
(function(){
  var modals=document.createElement('div');
  modals.innerHTML='<div id="perf-target-modal" class="modal hidden"><div class="modal-box" style="max-width:420px"><div class="modal-head"><span id="perf-target-modal-title">设定目标</span><span class="modal-close" onclick="closeTargetForm()">×</span></div><div class="modal-body"><div class="form-group"><label>人员</label><select id="pt-target-user"></select></div><div class="form-group"><label>目标年份</label><input id="pt-target-year" type="number" min="2024" max="2030"></div><div class="form-group"><label>目标月份</label><input id="pt-target-month" type="number" min="1" max="12"></div><div class="form-group"><label>目标金额</label><input id="pt-target-amount" type="number" step="0.01" placeholder="销售额目标"></div><div class="form-group"><label>备注</label><input id="pt-target-notes" placeholder="可选"></div></div><div class="modal-actions"><button class="btn-cancel" onclick="closeTargetForm()">取消</button><button class="btn-delete hidden" id="pt-btn-delete" onclick="deleteTarget(targetEditId)">删除</button><button class="btn-save" onclick="saveTarget()">保存</button></div></div></div><div id="perf-rule-modal" class="modal hidden"><div class="modal-box" style="max-width:420px"><div class="modal-head"><span id="perf-rule-modal-title">新建提成规则</span><span class="modal-close" onclick="closeRuleForm()">×</span></div><div class="modal-body"><div class="form-group"><label>规则名称</label><input id="pr-name" placeholder="例如：基础提成"></div><div class="form-group"><label>最低销售额</label><input id="pr-min" type="number" step="0.01" value="0"></div><div class="form-group"><label>最高销售额（留空不封顶）</label><input id="pr-max" type="number" step="0.01" placeholder="不填不设上限"></div><div class="form-group"><label>提成比例 (%)</label><input id="pr-rate" type="number" step="0.1" placeholder="例如 5 = 5%"></div><div class="form-group"><label>说明</label><input id="pr-desc" placeholder="可选"></div></div><div class="modal-actions"><button class="btn-cancel" onclick="closeRuleForm()">取消</button><button class="btn-delete hidden" id="pr-btn-delete" onclick="deleteRule(ruleEditId)">删除</button><button class="btn-save" onclick="saveRule()">保存</button></div></div></div>';
  document.body.appendChild(modals);
  populatePerfSelects();
})();

// === Supplier Functions ===

async function loadSuppliers(){
  var r;
  if(!isAdmin()){
    r=await callAdmin('select','suppliers',{query:'*',filters:[{col:'company_id',op:'eq',val:currentCompanyId},{col:'',op:'order',val:'updated_at.desc'},{col:'',op:'limit',val:'50000'}]});
    allSuppliers=(r&&r.data?r.data:[]);
  }else{
    var q=sb.from('suppliers').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
    var res=await q;
    allSuppliers=res.data||[];
  }
  if(!isAdmin()){allSuppliers=allSuppliers.filter(function(s){return canAccess('suppliers',s.id)})}
  var clientMap={};
  for(var i=0;i<allClients.length;i++)clientMap[allClients[i].id]=allClients[i].name;
  // Resolve company directory names for suppliers
  for(var j=0;j<allSuppliers.length;j++){
    allSuppliers[j].linked_client_name=clientMap[allSuppliers[j].linked_client_id]||'';
    if(allSuppliers[j].company_directory_id&&allCompaniesMap){
      var co=allSuppliers[j];var dco=null;
      for(var dk2 in allCompaniesMap){if(allCompaniesMap[dk2].id===co.company_directory_id){dco=allCompaniesMap[dk2];break}}
      if(dco)co._dir_name=dco.name;
    }
  }
  buildSupCategories();
  renderSuppliers();
  // Defense-in-depth: ensure FAB hidden on supplier view
  var supFab=document.getElementById('main-fab');if(supFab)supFab.classList.add('hidden');
}

// ── Supplier Category Management ──
var customSupCats=JSON.parse(localStorage.getItem('custom_sup_cats')||'[]');
function saveCustomSupCats(){localStorage.setItem('custom_sup_cats',JSON.stringify(customSupCats));}
function getAllSupCategories(){var s=new Set();for(var i=0;i<allSuppliers.length;i++){if(allSuppliers[i].category)s.add(allSuppliers[i].category)}for(var j=0;j<customSupCats.length;j++)s.add(customSupCats[j]);return Array.from(s).sort();}
function toggleSupCatManage(){var p=document.getElementById('sup-cat-manage');p.classList.toggle('hidden');if(!p.classList.contains('hidden'))renderSupCatTags();}
function renderSupCatTags(){var ct=document.getElementById('sup-cat-tags');var cats=getAllSupCategories();var h='';for(var i=0;i<cats.length;i++)h+='<span class="sup-cat-tag">'+escHtml(cats[i])+'<span class="cat-tag-del" onclick="removeSupCategory(\x27'+escHtml(cats[i]).replace(/'/g,"\\'")+'\x27)">&times;</span></span>';ct.innerHTML=h||'<span style="font-size:12px;color:var(--text3)">暂无类别</span>';}
function addSupCategory(){var inp=document.getElementById('sup-cat-new');var v=inp.value.trim();if(!v)return;if(customSupCats.indexOf(v)<0){customSupCats.push(v);saveCustomSupCats();}inp.value='';renderSupCatTags();buildSupCategories();}
function removeSupCategory(cat){customSupCats=customSupCats.filter(function(c){return c!==cat});saveCustomSupCats();renderSupCatTags();buildSupCategories();}

function buildSupCategories(){
  var cats=new Set();
  for(var i=0;i<allSuppliers.length;i++){
    var c=allSuppliers[i].category;
    if(c)cats.add(c);
  }
  for(var j=0;j<customSupCats.length;j++)cats.add(customSupCats[j]);
  allSupCategories=Array.from(cats).sort();
  var sel=document.getElementById('sup-cat-filter');
  var v=sel?sel.value:'';
  var h='<option value="">全部类别</option>';
  for(var k=0;k<allSupCategories.length;k++)h+='<option value="'+escHtml(allSupCategories[k])+'"'+(v===allSupCategories[k]?' selected':'')+'>'+escHtml(allSupCategories[k])+'</option>';
  if(sel)sel.innerHTML=h;
  // Populate modal datalist
  var dl=document.getElementById('sup-cat-list');
  if(dl)dl.innerHTML=allSupCategories.map(function(c){return '<option value="'+escHtml(c)+'">'}).join('');
}

function renderSuppliers(){
  var search=(document.getElementById('sup-search')||{}).value||'';
  var cat=(document.getElementById('sup-cat-filter')||{}).value||'';
  var lv=(document.getElementById('sup-level-filter')||{}).value||'';
  var list=allSuppliers;
  if(search){
    var s=search.toLowerCase();
    list=list.filter(function(sp){
      var prods=[];
      try{prods=JSON.parse(sp.products||'[]')}catch(e){}
      var pn=prods.map(function(p){return p.name||''}).join(' ');
      return (sp.name||'').toLowerCase().indexOf(s)>=0||(sp.contact_name||'').toLowerCase().indexOf(s)>=0||(sp.contact_phone||'').toLowerCase().indexOf(s)>=0||pn.toLowerCase().indexOf(s)>=0||(sp.notes||'').toLowerCase().indexOf(s)>=0;
    });
  }
  if(cat)list=list.filter(function(sp){return sp.category===cat});
  if(lv)list=list.filter(function(sp){return sp.cooperation_level===lv});
  // Stats
  var st=document.getElementById('sup-stats');
  if(st){
    var lvCount={A:0,B:0,C:0,D:0,E:0};
    for(var i=0;i<list.length;i++){var l=list[i].cooperation_level||'C';lvCount[l]=(lvCount[l]||0)+1}
    var catCount={};var sortedCats=[];
    for(var ci=0;ci<list.length;ci++){var cc=list[ci].category||'\u672a\u5206\u7c7b';catCount[cc]=(catCount[cc]||0)+1}
    sortedCats=Object.keys(catCount).sort(function(a,b){return catCount[b]-catCount[a]});
    var catHtml='<div class="sup-stat" style="background:var(--primary-light)"><div class="ss-val">'+list.length+'</div><div class="ss-label">\u603b\u8ba1</div></div>'+
      '<div class="sup-stat"><div class="ss-val" style="color:var(--success)">'+lvCount.A+'</div><div class="ss-label">A\u7ea7</div></div>'+
      '<div class="sup-stat"><div class="ss-val" style="color:var(--primary)">'+lvCount.B+'</div><div class="ss-label">B\u7ea7</div></div>'+
      '<div class="sup-stat"><div class="ss-val" style="color:var(--warning)">'+lvCount.C+'</div><div class="ss-label">C\u7ea7</div></div>'+
      '<div class="sup-stat"><div class="ss-val" style="color:var(--danger)">'+lvCount.D+'</div><div class="ss-label">D\u7ea7</div></div>'+
      '<div class="sup-stat"><div class="ss-val" style="color:var(--danger)">'+lvCount.E+'</div><div class="ss-label">E\u7ea7</div></div>';
    st.innerHTML=catHtml+'<div style="width:100%;height:1px;background:var(--border);margin:4px 0"></div>'+
      sortedCats.map(function(cc){return '<div class="sup-stat sup-cat-stat" onclick="document.getElementById(\'sup-cat-filter\').value=\''+escHtml(cc)+'\';loadSuppliers()"><div class="ss-val" style="font-size:16px">'+catCount[cc]+'</div><div class="ss-label" style="max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+escHtml(cc)+'">'+escHtml(cc)+'</div></div>'}).join('');
  }
  // List
  var el=document.getElementById('sup-list');
  if(!list.length){el.innerHTML='<div style="text-align:center;padding:40px;color:var(--text-secondary)">\u6682\u65e0\u4f9b\u5e94\u5546\uff0c\u70b9\u51fb\u53f3\u4e0a\u89d2\u6dfb\u52a0</div>';return}
  var h='';
  for(var i=0;i<list.length;i++){
    var sp=list[i];
    var prods=[];
    try{prods=JSON.parse(sp.products||'[]')}catch(e){}
    var phones=[];
    try{phones=JSON.parse(sp.contact_phone||'[]')}catch(e){}
    var phoneStr=phones.join(', ');
    var dr=parseFloat(sp.defect_rate)||0;
    var drCls=dr<=1?'defect-ok':dr<=3?'defect-warn':'defect-bad';
    var prodRows='';
    for(var pj=0;pj<prods.length;pj++){
      var pr=prods[pj];
      prodRows+='<tr><td>'+escHtml(pr.name)+'</td><td>'+escHtml(pr.moq)+'</td><td style="font-weight:600;color:var(--primary)">'+(pr.unit_price?'\u00a5'+fmtNum(pr.unit_price):'')+'</td></tr>';
    }
    h+='<div class="sup-card"><div class="sc-header"><div><div class="sc-name">'+escHtml(sp.name||'')+'</div><div class="sc-cat">'+(sp.category||'\u672a\u5206\u7c7b')+'</div>'+(sp._dir_name&&sp._dir_name!==sp.name?'<div class="sc-dir-link" style="font-size:11px;color:var(--primary)">\ud83d\udcc2 \u4f01\u4e1a\u540d\u5f55: '+escHtml(sp._dir_name)+'</div>':'')+'</div><span class="level-badge level-'+sp.cooperation_level+'">'+(sp.cooperation_level||'C')+'\u7ea7</span></div>';
    if(sp.contact_name||phoneStr)h+='<div class="sc-contact">\U0001f464 '+escHtml(sp.contact_name||'\u672a\u77e5')+(phoneStr?' &nbsp; <a href="tel:'+phones[0]+'">'+escHtml(phoneStr)+'</a>':'')+'</div>';
    if(sp.linked_client_name)h+='<div class="sc-linked"><span style="opacity:0.6">\u2192 \u5173\u8054\u5ba2\u6237:</span> '+escHtml(sp.linked_client_name)+'</div>';
    if(prodRows)h+='<table class="sup-products"><thead><tr><th>\u4ea7\u54c1</th><th>MOQ</th><th>\u5355\u4ef7</th></tr></thead><tbody>'+prodRows+'</tbody></table>';
    h+='<div class="sc-footer"><div class="sc-meta"><span>\U0001f4cd \u5408\u4f5c '+(sp.cooperation_count||0)+' \u6b21</span><span class="'+drCls+'">\u26a0\ufe0f \u6b21\u54c1\u7387 '+(sp.defect_rate||0)+'%</span></div><div class="sc-actions"><button class="btn-sm" style="background:var(--surface);border:1px solid var(--border)" onclick="openSupplierForm('+sp.id+')">\u7f16\u8f91</button><button class="btn-sm" style="background:#fff;color:var(--danger);border:1px solid var(--danger)" onclick="deleteSupplier('+sp.id+')">\u5220\u9664</button></div></div></div>';
  }
  el.innerHTML=h;
}

function openSupplierForm(id){
  supplierEditId=id||null;
  var sp=id?allSuppliers.find(function(x){return x.id===id}):null;
  document.getElementById('sup-modal-title').textContent=sp?'\u7f16\u8f91\u4f9b\u5e94\u5546':'\u65b0\u5efa\u4f9b\u5e94\u5546';
  document.getElementById('sup-name').value=sp?(sp.name||''):'';
  document.getElementById('sup-contact-name').value=sp?(sp.contact_name||''):'';
  document.getElementById('sup-category').value=sp?(sp.category||''):'';
  document.getElementById('sup-cooperation-count').value=sp?(sp.cooperation_count||0):0;
  document.getElementById('sup-cooperation-level').value=sp?(sp.cooperation_level||'C'):'C';
  document.getElementById('sup-defect-rate').value=sp?(sp.defect_rate||0):0;
  document.getElementById('sup-notes').value=sp?(sp.notes||''):'';
  document.getElementById('sup-compliance').value=sp?(sp.compliance_requirements||''):'';
  // FK: if has company_directory_id, show linked company
  if(sp&&sp.company_directory_id&&allCompaniesMap){
    for(var dk4 in allCompaniesMap){if(allCompaniesMap[dk4].id===sp.company_directory_id){document.getElementById('sup-name').dataset.dirId=sp.company_directory_id;document.getElementById('sup-name').title='\u5173\u8054\u4f01\u4e1a\u540d\u5f55: '+allCompaniesMap[dk4].name;break}}
  }
  // Linked client
  supLinkedClientId=sp?(sp.linked_client_id||null):null;
  supLinkedClientName=sp?(sp.linked_client_name||''):'';
  var lcs=document.getElementById('sup-link-selected');
  if(supLinkedClientId){lcs.style.display='block';document.getElementById('sup-link-client-name').textContent=supLinkedClientName;document.getElementById('sup-link-client').value='';}else{lcs.style.display='none';document.getElementById('sup-link-client').value='';document.getElementById('sup-link-list').classList.add('hidden');}
  // Phones
  var supPhones=[];
  try{supPhones=JSON.parse(sp?(sp.contact_phone||'[]'):'[]')}catch(e){supPhones=[]}
  if(!supPhones.length)supPhones=[''];
  var phEl=document.getElementById('sup-phones');
  phEl.innerHTML='';
  for(var i=0;i<supPhones.length;i++){
    var row=document.createElement('div');
    row.className='sup-prod-row';
    row.style.marginBottom='6px';
    row.innerHTML='<input value="'+escHtml(supPhones[i])+'" oninput="syncSupPhones()" placeholder="\u8054\u7cfb\u7535\u8bdd '+ (i+1) +'" style="flex:2">'+(supPhones.length>1?'<button class="btn-sm" style="background:#fff;color:var(--danger);border:1px solid var(--danger)" onclick="this.parentElement.remove();syncSupPhones()">\u00d7</button>':'');
    phEl.appendChild(row);
  }
  // Products
  var supProds=[];
  try{supProds=JSON.parse(sp?(sp.products||'[]'):'[]')}catch(e){supProds=[]}
  if(!supProds.length)supProds=[{name:'',moq:'',unit_price:''}];
  var prEl=document.getElementById('sup-products');
  prEl.innerHTML='';
  for(var j=0;j<supProds.length;j++){
    var pr=supProds[j];
    var row2=document.createElement('div');
    row2.className='sup-prod-row';
    row2.innerHTML='<input class="prod-name" value="'+escHtml(pr.name||'')+'" oninput="syncSupProducts()" placeholder="\u4ea7\u54c1\u540d\u79f0"><input class="prod-moq" value="'+escHtml(pr.moq||'')+'" oninput="syncSupProducts()" placeholder="MOQ"><input class="prod-price" value="'+escHtml(pr.unit_price||'')+'" oninput="syncSupProducts()" type="number" step="0.01" placeholder="\u5355\u4ef7">'+(supProds.length>1?'<button class="btn-sm" style="background:#fff;color:var(--danger);border:1px solid var(--danger)" onclick="this.parentElement.remove();syncSupProducts()">\u00d7</button>':'');
    prEl.appendChild(row2);
  }
  document.getElementById('sup-btn-delete').classList.toggle('hidden',!sp);
  // 附件
  try{supAttachments=JSON.parse(sp?(sp.attachments||'[]'):'[]')}catch(e){supAttachments=[]}
  renderSupAttachments();
  document.getElementById('supplier-modal').classList.remove('hidden');
}

function syncSupPhones(){
  var inp=document.querySelectorAll('#sup-phones input');
  var arr=[];
  for(var i=0;i<inp.length;i++){var v=inp[i].value.trim();if(v)arr.push(v)}
}

function syncSupProducts(){
  var rows=document.querySelectorAll('#sup-products .sup-prod-row');
  var arr=[];
  for(var i=0;i<rows.length;i++){
    var r=rows[i];
    var nm=r.querySelector('.prod-name');
    var moq=r.querySelector('.prod-moq');
    var pr=r.querySelector('.prod-price');
    if(nm&&nm.value.trim())arr.push({name:nm.value.trim(),moq:moq?moq.value.trim():'',unit_price:pr?parseFloat(pr.value)||0:0});
  }
}

function addSupPhone(){var el=document.getElementById('sup-phones');var row=document.createElement('div');row.className='sup-prod-row';row.style.marginBottom='6px';row.innerHTML='<input oninput="syncSupPhones()" placeholder="\u8054\u7cfb\u7535\u8bdd" style="flex:2"><button class="btn-sm" style="background:#fff;color:var(--danger);border:1px solid var(--danger)" onclick="this.parentElement.remove();syncSupPhones()">\u00d7</button>';el.appendChild(row)}
function addSupProduct(){var el=document.getElementById('sup-products');var row=document.createElement('div');row.className='sup-prod-row';row.innerHTML='<input class="prod-name" oninput="syncSupProducts()" placeholder="\u4ea7\u54c1\u540d\u79f0"><input class="prod-moq" oninput="syncSupProducts()" placeholder="MOQ"><input class="prod-price" oninput="syncSupProducts()" type="number" step="0.01" placeholder="\u5355\u4ef7"><button class="btn-sm" style="background:#fff;color:var(--danger);border:1px solid var(--danger)" onclick="this.parentElement.remove();syncSupProducts()">\u00d7</button>';el.appendChild(row)}


function searchSupplierLinkClient(){
  var q=document.getElementById('sup-link-client').value.trim().toLowerCase();
  var list=document.getElementById('sup-link-list');
  if(q.length<1){list.classList.add('hidden');return}
  if(!allClients.length){list.innerHTML='<div class="search-list-item" style="color:var(--text3)">\u52a0\u8f7d\u5ba2\u6237\u4e2d...</div>';list.classList.remove('hidden');loadClients().then(function(){searchSupplierLinkClient()});return}
  var matches=allClients.filter(function(c){var cn=(c.name||'').toLowerCase();return cn.indexOf(q)>=0}).slice(0,8);
  if(!matches.length){list.innerHTML='<div class="search-list-item" style="color:var(--text3)">\u65e0\u5339\u914d\u5ba2\u6237</div>';list.classList.remove('hidden');return}
  var h='';
  for(var i=0;i<matches.length;i++){h+='<div class="search-list-item" onclick="selectSupLinkClient(\''+matches[i].id+'\',\''+escHtml(matches[i].name)+'\')"><div class="name">'+escHtml(matches[i].name)+'</div></div>'}
  list.innerHTML=h;list.classList.remove('hidden');
}

function supLinkClientKeydown(e){
  if(e.key==='Escape'){document.getElementById('sup-link-list').classList.add('hidden')}
}

function selectSupLinkClient(id,name){
  supLinkedClientId=id;supLinkedClientName=name;
  document.getElementById('sup-link-client').value='';
  document.getElementById('sup-link-list').classList.add('hidden');
  var lcs=document.getElementById('sup-link-selected');lcs.style.display='block';
  document.getElementById('sup-link-client-name').textContent=name;
}

function clearSupLinkClient(){
  supLinkedClientId=null;supLinkedClientName='';
  document.getElementById('sup-link-selected').style.display='none';
  document.getElementById('sup-link-client').value='';
  var cp=document.getElementById('sup-contact-picker');if(cp)cp.classList.add('hidden');
}

function importClientContacts(){
  if(!supLinkedClientId)return;
  var cl=allClients.find(function(x){return x.id===supLinkedClientId});
  if(!cl){showToast('\u5ba2\u6237\u4e0d\u5b58\u5728');return}
  sb.from('contacts').select('*').eq('client_id',supLinkedClientId).then(function(r){
    if(r.error){showToast('\u52a0\u8f7d\u8054\u7cfb\u4eba\u5931\u8d25');return}
    var contacts=r.data||[];
    if(!contacts.length){showToast('\u8be5\u5ba2\u6237\u6ca1\u6709\u8054\u7cfb\u4eba');return}
    if(contacts.length===1){doImportContact(contacts[0]);return}
    window._supContactCache=contacts;
    var picker=document.getElementById('sup-contact-picker');
    var h='';
    for(var i=0;i<contacts.length;i++){
      var ct=contacts[i];
      var roleLabel=ct.role||'';
      var phones=[];
      try{phones=JSON.parse(ct.phone||'[]')}catch(e){}
      var phonePreview=phones.slice(0,2).join(', ');
      h+='<div class="search-list-item" onclick="doImportContact(window._supContactCache['+i+'])"><div class="name">'+escHtml(ct.name||'\u672a\u547d\u540d')+'</div><div class="sub">'+(roleLabel?escHtml(roleLabel)+' \u00b7 ':'')+(phonePreview||'\u65e0\u7535\u8bdd')+'</div></div>';
    }
    picker.innerHTML=h;picker.classList.remove('hidden');
  })
}

function doImportContact(ct){
  if(!ct)return;
  var nameInp=document.getElementById('sup-contact-name');
  if(!nameInp.value.trim()&&ct.name)nameInp.value=ct.name;
  var phones=[];
  try{phones=JSON.parse(ct.phone||'[]')}catch(e){phones=[]}
  if(phones.length){
    var phEl=document.getElementById('sup-phones');
    phEl.innerHTML='';
    for(var j=0;j<phones.length;j++){
      var row=document.createElement('div');
      row.className='sup-prod-row';
      row.style.marginBottom='6px';
      row.innerHTML='<input value="'+escHtml(phones[j])+'" oninput="syncSupPhones()" placeholder="\u8054\u7cfb\u7535\u8bdd '+(j+1)+'" style="flex:2">'+(phones.length>1?'<button class="btn-sm" style="background:#fff;color:var(--danger);border:1px solid var(--danger)" onclick="this.parentElement.remove();syncSupPhones()">\u00d7</button>':'');
      phEl.appendChild(row);
    }
  }
  document.getElementById('sup-contact-picker').classList.add('hidden');
  showToast('\u5df2\u5bfc\u5165\u8054\u7cfb\u4eba\u4fe1\u606f');
}


function closeSupplierForm(){
  document.getElementById('supplier-modal').classList.add('hidden');
  supplierEditId=null;
  supLinkedClientId=null;supLinkedClientName='';
}

async function saveSupplier(){
  dbg('[saveSupplier] called, role:',currentCompanyRole,'editId:',supplierEditId);
  try{
  var name=document.getElementById('sup-name').value.trim();
  if(!name){showToast('\u8bf7\u8f93\u5165\u4f9b\u5e94\u5546\u540d\u79f0');return}
  var dirId=null;var dk=name.toLowerCase();if(allCompaniesMap&&allCompaniesMap[dk])dirId=allCompaniesMap[dk].id;
  var phInputs=document.querySelectorAll('#sup-phones input');
  var phones=[];
  for(var i=0;i<phInputs.length;i++){var v=phInputs[i].value.trim();if(v)phones.push(v)}
  var prows=document.querySelectorAll('#sup-products .sup-prod-row');
  var prods=[];
  for(var j=0;j<prows.length;j++){
    var r=prows[j];
    var nm=r.querySelector('.prod-name');
    var moq=r.querySelector('.prod-moq');
    var pr=r.querySelector('.prod-price');
    if(nm&&nm.value.trim())prods.push({name:nm.value.trim(),moq:moq?moq.value.trim():'',unit_price:pr?parseFloat(pr.value)||0:0});
  }
  var obj={
    company_id:currentCompanyId,
    company_directory_id:dirId,
    name:name,
    contact_name:document.getElementById('sup-contact-name').value.trim()||null,
    contact_phone:JSON.stringify(phones),
    products:JSON.stringify(prods),
    category:document.getElementById('sup-category').value.trim()||null,
    cooperation_count:parseInt(document.getElementById('sup-cooperation-count').value)||0,
    cooperation_level:document.getElementById('sup-cooperation-level').value,
    defect_rate:parseFloat(document.getElementById('sup-defect-rate').value)||0,
    notes:document.getElementById('sup-notes').value.trim()||null,
    compliance_requirements:document.getElementById('sup-compliance').value.trim()||null,
    linked_client_id:supLinkedClientId||null,
    updated_at:new Date().toISOString()
  };
  if(supAttachments.length)obj.attachments=JSON.stringify(supAttachments);
  if(supplierEditId){
    if(!isAdmin()){
      await callAdmin('update','suppliers',{payload:obj,filters:[{col:'id',op:'eq',val:supplierEditId}]});
    }else{await sb.from('suppliers').update(obj).eq('id',supplierEditId)}
  }
  else {
    var supRes;
    if(!isAdmin()){
      dbg('[saveSupplier] callAdmin insert via edge function...');
      supRes=await callAdmin('insert','suppliers',{payload:{...obj}});
      dbg('[saveSupplier] callAdmin insert result:',JSON.stringify(supRes));
    }else{supRes=await sb.from('suppliers').insert([obj]).select('id')}
  }
  var newSid=null;
  var insertErr=null;
  if(supRes&&supRes.data&&supRes.data[0])newSid=supRes.data[0].id;
  else if(supRes&&supRes.payload&&supRes.payload.id)newSid=supRes.payload.id;
  else if(supRes&&supRes.error)insertErr=supRes.error;
  
  if(insertErr){showToast('保存失败: '+(typeof insertErr==='string'?insertErr:insertErr.message||JSON.stringify(insertErr)),'error');console.error('[saveSupplier] insert error:',insertErr);return}
  // 非管理员自动给自己授权
  if(!supplierEditId&&newSid&&!isAdmin()){
    var grRes=await callAdmin('insert','resource_grants',{payload:{user_id:currentUser.id,company_id:currentCompanyId,resource_type:'suppliers',resource_id:newSid,granted_by:currentUser.id}});
    dbg('[saveSupplier] self-grant result:',grRes);
    if(!memberGrants.suppliers||memberGrants.suppliers==='all')memberGrants.suppliers=[];
    memberGrants.suppliers.push(String(newSid).toLowerCase());
  }
  closeSupplierForm();
  await loadSuppliers();
  showToast('供应商已保存');
  }catch(e){console.error('[saveSupplier] exception:',e);showToast('保存失败: '+e.message)}
}

async function deleteSupplier(id){
  var sp=allSuppliers.find(function(x){return x.id===id});
  if(!await confirmDialog('\u786e\u5b9a\u5220\u9664\u4f9b\u5e94\u5546 "'+escHtml(sp?sp.name:'')+'"\uff1f'))return;
  var _delErr=(await sb.from('suppliers').delete().eq('id',id)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
  await loadSuppliers();
}

var supplierEditId=null;var supAttachments=[];
var supLinkedClientId=null;var supLinkedClientName='';

// Modal injection
(function(){
  var modals=document.createElement('div');
  modals.innerHTML='<div class="modal-overlay hidden" id="supplier-modal" onclick="closeSupplierForm()"><div class="modal" onclick="event.stopPropagation()"><div class="modal-box" style="max-width:560px"><div class="modal-head"><span id="sup-modal-title">\u65b0\u5efa\u4f9b\u5e94\u5546</span><span class="modal-close" onclick="closeSupplierForm()">\u00d7</span></div><div class="modal-body"><div class="form-group"><label>\u4f9b\u5e94\u5546\u540d\u79f0 <span style="font-size:11px;color:var(--text-secondary);font-weight:400">\u2014 \u652f\u6301\u4f01\u4e1a\u540d\u5f55\u81ea\u52a8\u5339\u914d</span></label><div style="position:relative"><input id="sup-name" placeholder="\u5fc5\u586b" autocomplete="off" oninput="onSupNameInput()" onfocus="onSupNameInput()" onkeydown="onSupNameKeydown(event)"><div class="name-suggestions hidden" id="sup-name-suggestions"></div></div></div><div class="form-group"><label>\u8054\u7cfb\u4eba</label><input id="sup-contact-name" placeholder="\u8054\u7cfb\u4eba\u59d3\u540d"></div></div><div class="form-group"><label>\u5173\u8054\u5ba2\u6237</label><div style="position:relative"><input id="sup-link-client" placeholder="\u641c\u7d22\u5173\u8054\u5ba2\u6237..." autocomplete="off" oninput="searchSupplierLinkClient()" onkeydown="supLinkClientKeydown(event)"><div class="search-list hidden" id="sup-link-list"></div></div><div id="sup-link-selected" style="display:none;margin-top:4px;padding:6px 10px;background:var(--primary-light);border-radius:6px;font-size:13px"><span id="sup-link-client-name"></span><button class="btn-xs" style="color:var(--text-secondary);margin-left:8px;cursor:pointer" onclick="clearSupLinkClient()">\u00d7</button><button class="btn-xs" style="color:var(--primary);margin-left:8px;cursor:pointer" onclick="importClientContacts()">\u5bfc\u5165\u8054\u7cfb\u4eba</button><div class="search-list hidden" id="sup-contact-picker" style="margin-top:6px;max-height:160px;overflow-y:auto"></div></div><div class="form-group"><label>\u8054\u7cfb\u7535\u8bdd</label><div id="sup-phones"></div><button class="btn-sm" style="background:var(--surface);border:1px solid var(--border);margin-top:4px" onclick="addSupPhone()">\uff0b \u6dfb\u52a0\u7535\u8bdd</button></div><div class="form-group"><label>\u4ea7\u54c1\u6e05\u5355</label><div id="sup-products"></div><button class="btn-sm" style="background:var(--surface);border:1px solid var(--border);margin-top:4px" onclick="addSupProduct()">\uff0b \u6dfb\u52a0\u4ea7\u54c1</button></div><div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><label>\u7c7b\u522b</label><input id="sup-category" placeholder="\u5982\uff1a\u7535\u5b50\u5143\u4ef6" list="sup-cat-list"><datalist id="sup-cat-list"></datalist></div><div><label>\u5408\u4f5c\u6b21\u6570</label><input id="sup-cooperation-count" type="number" min="0"></div></div><div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><label>\u5408\u4f5c\u7ea7\u522b</label><select id="sup-cooperation-level"><option value="A">A\u7ea7</option><option value="B">B\u7ea7</option><option value="C" selected>C\u7ea7</option><option value="D">D\u7ea7</option><option value="E">E\u7ea7</option></select></div><div><label>\u6b21\u54c1\u7387 (%)</label><input id="sup-defect-rate" type="number" step="0.01" min="0" max="100" value="0"></div></div><div class="form-group"><label>\u5907\u6ce8</label><input id="sup-notes" placeholder="\u53ef\u9009"></div><div class="form-group"><label>\u5408\u89c4\u8981\u6c42</label><textarea id="sup-compliance" rows="2" placeholder="\u8d44\u8d28\u8bc1\u4e66\u3001\u73af\u4fdd\u6807\u51c6\u3001ISO\u8ba4\u8bc1\u7b49..."></textarea></div><div class="form-group"><label>\u9644\u4ef6 <span style="font-size:11px;color:var(--text-secondary);font-weight:400">\u2014 \u5408\u540c\u3001\u8d44\u8d28\u8bc1\u4e66\u3001\u62a5\u4ef7\u5355\u7b49</span></label><div id="sup-attachments"></div><label class="attach-btn" style="display:inline-block;margin-top:6px;padding:6px 14px;background:var(--primary-light);color:var(--primary);border-radius:6px;cursor:pointer;font-size:12px"><input type="file" multiple onchange="handleSupAttachFile(this)" style="display:none">\uff0b \u4e0a\u4f20\u9644\u4ef6</label></div></div><div class="modal-actions"><button class="btn-cancel" onclick="closeSupplierForm()">\u53d6\u6d88</button><button class="btn-delete hidden" id="sup-btn-delete" onclick="deleteSupplier(supplierEditId)">\u5220\u9664</button><button class="btn-save" onclick="saveSupplier()">\u4fdd\u5b58</button></div></div></div></div>';
  document.body.appendChild(modals);
})();

// === 供应商附件 ===
function renderSupAttachments(){
  var el=document.getElementById('sup-attachments');
  if(!el)return;
  var html='';
  for(var i=0;i<supAttachments.length;i++){
    var a=supAttachments[i];
    var fn=a.name||a.file_name||('文件'+(i+1));
    var dn=fn.length>30?fn.substring(0,27)+'...':fn;
    html+='<div class="attach-item" style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:var(--surface);border:1px solid var(--border);border-radius:6px;margin-bottom:4px;font-size:12px"><a href="'+escHtml(a.url||'#')+'" target="_blank" style="color:var(--primary);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1" title="'+escHtml(fn)+'">📎 '+escHtml(dn)+'</a><button style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:14px;margin-left:8px;flex-shrink:0" onclick="removeSupAttachment('+i+')">×</button></div>';
  }
  if(!html)html='<span style="font-size:11px;color:var(--text3)">暂无附件</span>';
  el.innerHTML=html;
}

async function handleSupAttachFile(input){
  var files=input.files;
  if(!files||!files.length)return;
  var bucket='supplier-files';
  for(var i=0;i<files.length;i++){
    var f=files[i];
    var ext='';var dot=f.name.lastIndexOf('.');if(dot>0)ext=f.name.substring(dot);
    var safeName=Date.now()+'_'+Math.random().toString(36).substring(2,8)+ext;
    var filePath=currentCompanyId+'/'+safeName;
    try{
      var {data,error}=await sb.storage.from(bucket).upload(filePath,f,{cacheControl:'3600',upsert:false});
      if(error){showToast('上传失败: '+error.message);continue}
      var {data:urlData}=sb.storage.from(bucket).getPublicUrl(filePath);
      supAttachments.push({name:f.name,size:f.size,type:f.type,url:urlData.publicUrl,path:filePath});
    }catch(e){showToast('上传异常: '+e.message)}
  }
  renderSupAttachments();
  input.value='';
}

async function removeSupAttachment(idx){
  var a=supAttachments[idx];
  if(a&&a.path){try{await sb.storage.from('supplier-files').remove([a.path])}catch(e){}}
  supAttachments.splice(idx,1);renderSupAttachments();
}

// === Client Name Autocomplete ===
var nameSuggIdx=-1,nameSuggList=[];

function onClientNameInput(){
  var inp=document.getElementById('f-name');
  var val=(inp.value||'').trim().toLowerCase();
  var dd=document.getElementById('name-suggestions');
  if(!val||val.length<1){dd.classList.add('hidden');nameSuggList=[];nameSuggIdx=-1;return}
  // Search allCompanies table (company directory)
  var matches=[];
  var seen={};
  var exactMatch=null;
  // Check existing clients
  for(var i=0;i<allClients.length;i++){
    var c=allClients[i];
    var cn=(c.name||'').toLowerCase();
    if(!cn||cn===val)exactMatch=c;
    if(cn&&cn.indexOf(val)>=0&&!seen[cn]){
      seen[cn]=1;
      matches.push({name:c.name,source:'已存客户',exists:true,id:c.id});
    }
  }
  // Check company directory
  for(var j=0;j<allCompanies.length;j++){
    var co=allCompanies[j];
    var con=(co.name||'').toLowerCase();
    if(con===val)exactMatch=exactMatch||co;
    if(con&&con.indexOf(val)>=0&&!seen[con]){
      seen[con]=1;
      var detail=(co.legal_person||'')+(co.reg_capital?' · 注册资本'+co.reg_capital:'');
      matches.push({name:co.name,source:'企业名录',exists:false,detail:detail,comp:co});
    }
  }
  // Sort: exact match first, then shortest name first
  matches.sort(function(a,b){
    if(a.exists&&!b.exists)return -1;
    if(!a.exists&&b.exists)return 1;
    return (a.name||'').length-(b.name||'').length;
  });
  // Limit to 20
  matches=matches.slice(0,20);
  if(!matches.length){dd.classList.add('hidden');nameSuggList=[];nameSuggIdx=-1;return}
  nameSuggList=matches;
  nameSuggIdx=-1;
  var h='';
  var lastSource='';
  for(var k=0;k<matches.length;k++){
    var m=matches[k];
    if(m.source!==lastSource){
      h+='<div class="ns-group-label">'+(m.source==='已存客户'?'📋 '+m.source:'📂 '+m.source)+'</div>';
      lastSource=m.source;
    }
    h+='<div class="name-suggestion" data-idx="'+k+'" onmousedown="selectNameSuggestion('+k+')"><div><div class="ns-name">'+escHtml(m.name)+'</div>'+(m.detail?'<div class="ns-detail">'+escHtml(m.detail)+'</div>':'')+'</div>'+(m.exists?'<span class="ns-exists">⚠ 已存在</span>':'<span class="ns-source">点击填充</span>')+'</div>';
  }
  dd.innerHTML=h;
  dd.classList.remove('hidden');
}

function onNameKeydown(e){
  var dd=document.getElementById('name-suggestions');
  if(dd.classList.contains('hidden'))return;
  if(e.key==='ArrowDown'){e.preventDefault();nameSuggIdx=Math.min(nameSuggIdx+1,nameSuggList.length-1);updateNameActive()}
  else if(e.key==='ArrowUp'){e.preventDefault();nameSuggIdx=Math.max(nameSuggIdx-1,0);updateNameActive()}
  else if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();if(nameSuggIdx>=0&&nameSuggIdx<nameSuggList.length)selectNameSuggestion(nameSuggIdx)}
  else if(e.key==='Escape'){dd.classList.add('hidden');nameSuggIdx=-1}
}

function updateNameActive(){
  var items=document.querySelectorAll('#name-suggestions .name-suggestion');
  for(var i=0;i<items.length;i++){items[i].classList.toggle('active',i===nameSuggIdx)}
  if(nameSuggIdx>=0){items[nameSuggIdx].scrollIntoView({block:'nearest'})}
}

function selectNameSuggestion(idx){
  var m=nameSuggList[idx];
  if(!m)return;
  document.getElementById('f-name').value=m.name;
  document.getElementById('name-suggestions').classList.add('hidden');
  nameSuggList=[];nameSuggIdx=-1;
  // If selected from directory, auto-fill company info
  if(m.comp){
    var inp=document.getElementById('f-name');
    var key=m.name.toLowerCase();
    if(allCompaniesMap[key])fillCompanyInfo(allCompaniesMap[key]);
    else fillCompanyInfo(m.comp);
  }
  // If it's an existing client, show warning
  if(m.exists){
    showToast('客户 "'+m.name+'" 已存在');
  }
}

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
  if(ddSup&&!ddSup.classList.contains('hidden')&&!e.target.closest("#supplier-modal"))ddSup.classList.add('hidden');
  // Also handle client name suggestions
  var ns=document.getElementById('name-suggestions');
  if(ns&&!ns.classList.contains('hidden')&&!e.target.closest("#form-modal"))ns.classList.add('hidden');
});

