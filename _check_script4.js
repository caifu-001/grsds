
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
  var q;try{q=sb.from('sales_targets').select('*,profiles!user_id(display_name,email)').eq('company_id',currentCompanyId).eq('target_year',year).order('target_month')}catch(e2){q={data:[]}};
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
    var t=allTargets[i],p=t.profiles||{};
    var actual=getPerfActual(t.user_id,t.target_year,t.target_month);
    var rate=t.amount>0?Math.round(actual/t.amount*100):0;
    var rc=rate>=100?'var(--success)':rate>=60?'var(--warning)':'var(--danger)';
    h+='<tr><td>'+escHtml(p.display_name||p.email||'')+'</td><td>'+t.target_year+'-'+String(t.target_month).padStart(2,'0')+'</td><td style="font-weight:600">¥'+fmtNum(t.amount)+'</td><td>¥'+fmtNum(actual)+'</td><td style="color:'+rc+';font-weight:600">'+rate+'%</td><td>'+targetStatusBadge(rate)+'</td><td><button class="btn-sm" style="background:var(--surface);border:1px solid var(--border)" onclick="openTargetForm('+t.id+')">编辑</button> <button class="btn-sm" style="background:#fff;color:var(--danger);border:1px solid var(--danger)" onclick="deleteTarget('+t.id+')">删除</button></td></tr>';
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
  await sb.from('sales_targets').delete().eq('id',id);
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
  var q=sb.from('commission_details').select('*,profiles!user_id(display_name,email)').eq('company_id',currentCompanyId).eq('calc_year',y).eq('calc_month',m);
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
    var c=allCommission[i],p=c.profiles||{};
    total+=parseFloat(c.commission_amount)||0;
    if(c.status==='paid')paid+=parseFloat(c.commission_amount)||0;
    var statusLabels={pending:'🔶 待确认',confirmed:'✅ 已确认',paid:'💰 已发放'};
    h+='<tr><td>'+escHtml(p.display_name||p.email||'')+'</td><td>'+c.calc_year+'-'+String(c.calc_month).padStart(2,'0')+'</td><td>¥'+fmtNum(c.actual_amount)+'</td><td>¥'+fmtNum(c.target_amount)+'</td><td>'+(parseFloat(c.target_completion_rate)||0)+'%</td><td style="font-weight:600;color:var(--primary)">¥'+fmtNum(c.commission_amount)+'</td><td>'+(statusLabels[c.status]||c.status)+'</td><td>';
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
  await sb.from('commission_details').delete().eq('id',id);
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
  await sb.from('commission_rules').delete().eq('id',id);
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
