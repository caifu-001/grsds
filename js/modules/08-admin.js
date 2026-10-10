// ==========================================================================
// grsds · 08-admin.js  —  初始化 · 公司名称补全 · 公司/部门/角色/用户管理
// 源: js/app_v2.js 第 4172-5098 行（机械切片，未改一行代码）
// ==========================================================================
// === Init ===
buildFilterSelect();
sb.auth.getSession().then(async function(res){
  if(res.data&&res.data.session){
    currentUser=res.data.session.user;
    // Fire-and-forget: update last_login_at on session restore
    sb.from('profiles').update({last_login_at:new Date().toISOString()}).eq('user_id',currentUser.id).then(function(){}).catch(function(){});
    // Load profile for company/role
    var {data:profile}=await sb.from('profiles').select('role,company_id,active_company_id').eq('user_id',currentUser.id).single();
    if(profile){currentUserRole=profile.role||'user';isSuperAdmin=profile.role==='super_admin';currentCompanyId=profile.active_company_id||profile.company_id;currentCompanyRole=currentUserRole;currentCompanyName='';}
    if(!currentCompanyId){document.getElementById('login-screen').classList.remove('hidden');return}
    // Load multi-company memberships
    try{var {data:mems}=await sb.rpc('get_my_memberships');if(mems&&mems.length){allMyCompanies=mems;var cur=mems.find(function(m){return m.company_id==currentCompanyId});if(cur){currentCompanyRole=cur.role||currentUserRole;currentCompanyName=cur.company_name||'';currentUserRole=currentCompanyRole;}}}catch(e){console.error('get_my_memberships failed:',e)}
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    switchTab('analytics');
    if(isSuperAdmin||currentUserRole==='admin')document.getElementById('tab-admin').classList.remove('hidden');
  if(isSuperAdmin){document.getElementById('admin-tab-companies-manage').classList.remove('hidden');document.getElementById('admin-tab-companies').classList.remove('hidden');}
    await loadCustomTypes();
    buildFilterSelect();
    buildTypeGrid();
    buildStageGrid();
    // 先加载授权，再加载数据（否则 canAccess 返回 false 过滤所有资源）
    await loadMemberGrants();
    await loadClients();
    loadCompanies();
    loadNotifs();
  }else document.getElementById('login-screen').classList.remove('hidden');
}).catch(function(){document.getElementById('login-screen').classList.remove('hidden')});

// === 公司名称自动补全 ===
let acTimer=null,acSelected=-1;
async function setupCompanyAutocomplete(){
  var input=document.getElementById('f-name');if(!input)return;
  var dd=document.createElement('div');dd.className='company-ac-dropdown';dd.id='company-ac';
  input.parentElement.style.position='relative';input.parentElement.appendChild(dd);
  var items=[];
  input.addEventListener('input',function(){
    clearTimeout(acTimer);var val=input.value.trim();
    if(val.length<2){hideAC();return}
    acTimer=setTimeout(function(){searchCompanies(val)},300);
  });
  input.addEventListener('keydown',function(e){
    if(!dd.classList.contains('show'))return;
    if(e.key==='ArrowDown'){e.preventDefault();acSelected=Math.min(acSelected+1,items.length-1);renderActive();}
    else if(e.key==='ArrowUp'){e.preventDefault();acSelected=Math.max(acSelected-1,0);renderActive();}
    else if(e.key==='Enter'&&acSelected>=0){e.preventDefault();selectCompany(items[acSelected]);}
    else if(e.key==='Escape'){hideAC();}
  });
  input.addEventListener('blur',function(){setTimeout(hideAC,200);});
  async function searchCompanies(q){
    try{var r=await sb.from('companies').select('name,base').ilike('name','%'+q+'%').order('name').limit(8);
      if(r.error||!r.data||!r.data.length){hideAC();return}
      items=r.data;acSelected=-1;renderDD();}
    catch(e){hideAC();}
  }
  function renderDD(){
    dd.innerHTML=items.map(function(c,i){return'<div class="company-ac-item'+(i===acSelected?' active':'')+'" data-idx="'+i+'"><span class="cname">'+escHtml(c.name)+'</span><span class="cbase">'+escHtml(c.base||'')+'</span></div>'}).join('');
    dd.classList.add('show');
    dd.querySelectorAll('.company-ac-item').forEach(function(el){el.addEventListener('mousedown',function(e){e.preventDefault();selectCompany(items[+el.dataset.idx]);});});
  }
  function renderActive(){dd.querySelectorAll('.company-ac-item').forEach(function(el,i){el.classList.toggle('active',i===acSelected)});}
  function hideAC(){dd.classList.remove('show');items=[];acSelected=-1;}
}
function showCompanyRegScreen(){
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('main-screen').classList.add('hidden');
  document.getElementById('pending-screen').classList.add('hidden');
  document.getElementById('company-reg-screen').classList.remove('hidden');
  document.getElementById('cr-err').style.display='none';
}

function showPendingScreen(companyName){
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('main-screen').classList.add('hidden');
  document.getElementById('company-reg-screen').classList.add('hidden');
  document.getElementById('pending-screen').classList.remove('hidden');
  document.getElementById('pending-company-name').textContent='公司: '+companyName;
  // Poll for approval every 30s
  if(window._pendPoll)clearInterval(window._pendPoll);
  window._pendPoll=setInterval(checkPendingCompany,30000);
}

async function checkPendingCompany(){
  var _ses=(await sb.auth.getSession()).data.session;
  var user=_ses&&_ses.user;
  if(!user)return;
  var {data}=await sb.from('companies').select('id,name,status').eq('created_by',user.id).order('created_at',{ascending:false}).limit(1);
  if(!data||data.length===0){showCompanyRegScreen();return}
  if(data[0].status==='approved'){
    currentCompanyId=data[0].id;
    await sb.from('profiles').upsert({user_id:user.id,email:user.email,company_id:currentCompanyId,role:'admin',active_company_id:currentCompanyId},{onConflict:'user_id'});
    await sb.from('company_memberships').upsert({user_id:user.id,company_id:currentCompanyId,role:'admin',status:'active',joined_at:new Date().toISOString()},{onConflict:'user_id,company_id'});
    if(window._pendPoll)clearInterval(window._pendPoll);
    await loadCustomTypes();
 buildFilterSelect();
 buildTypeGrid();
 buildStageGrid();
 await loadClients();
 await loadCompanies();
    document.getElementById('pending-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    if(isSuperAdmin||currentUserRole==='admin')document.getElementById('tab-admin').classList.remove('hidden');
  if(isSuperAdmin){document.getElementById('admin-tab-companies-manage').classList.remove('hidden');document.getElementById('admin-tab-companies').classList.remove('hidden');}
    switchTab('analytics');
  }else if(data[0].status==='rejected'){
    showCompanyRegScreen();
  }
}

/* ── Admin Company Management ── */
var allAdminCompanies=[];
async function loadAdminCompanies(){
  try{var r=await callAdmin('select','companies',{query:'*',filters:[{col:'',op:'order',val:'name.asc'},{col:'',op:'limit',val:'50000'}]});if(r&&r.data){allAdminCompanies=r.data;}else{console.warn('callAdmin companies no data:',r)}}catch(e){}
}
function renderAdminCompanies(){
  var el=document.getElementById('admin-companies-manage-list');
  if(!allAdminCompanies.length){el.innerHTML='<div class="empty-state">暂无公司，点击"+ 新建公司"创建</div>';return}
  var h='';
  for(var i=0;i<allAdminCompanies.length;i++){
    var co=allAdminCompanies[i];
    var badge=co.status==='pending'?'badge-pending':'badge-approved';
    var label=co.status==='pending'?'待审核':co.status==='approved'?'已通过':'已拒绝';
    var metaParts=[];
    if(co.tax_id)metaParts.push('税号: '+escHtml(co.tax_id));
    if(co.legal_person)metaParts.push('法人: '+escHtml(co.legal_person));
    if(co.reg_capital)metaParts.push('注册资金: '+escHtml(co.reg_capital));
    if(co.city)metaParts.push('城市: '+escHtml(co.city));
    if(co.address)metaParts.push('地址: '+escHtml(co.address));
    if(co.established)metaParts.push('成立: '+escHtml(co.established));
    metaParts.push('<span class="company-badge '+badge+'">'+label+'</span>');
    h+='<div class="company-row"><div class="company-info"><div class="company-name">'+escHtml(co.name)+'</div><div class="company-meta">'+metaParts.join(' · ')+'</div>'+(co.business_scope?'<div class="company-scope" style="font-size:11px;color:var(--text2);margin-top:2px;max-width:500px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escHtml(co.business_scope)+'</div>':'')+'</div><div class="dn-actions"><button class="btn-sm btn-sm-primary" onclick="openCompanyForm('+co.id+')">编辑</button><button class="btn-sm btn-sm-danger" onclick="delCompanyById('+co.id+')">删除</button></div></div>';
  }
  el.innerHTML=h;
}
var _companyFormId=null;
function openCompanyForm(id){
  _companyFormId=id||null;
  var co=id?allAdminCompanies.find(function(c){return c.id===id;}):null;
  var div=document.createElement('div');div.className='confirm-overlay';div.id='company-form-modal';
  var of=function(k,def){return escHtml(co&&co[k]!=null?co[k]:def||'')};
  div.innerHTML='<div class="confirm-box" style="max-width:520px;max-height:85vh;overflow-y:auto"><p>'+(id?'编辑公司':'新建公司')+'</p>'
    +'<input id="co-name" placeholder="公司名称 *" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:8px" value="'+of('name')+'">'
    +'<input id="co-tax-id" placeholder="统一社会信用代码（18位）" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:8px" value="'+of('tax_id')+'">'
    +'<input id="co-legal-person" placeholder="法人/联系人" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:8px" value="'+of('legal_person')+'">'
    +'<input id="co-reg-capital" placeholder="注册资金（如：1000000）" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:8px" value="'+of('reg_capital')+'">'
    +'<input id="co-established" placeholder="成立日期（如：2020-01-03）" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:8px" value="'+of('established')+'">'
    +'<input id="co-city" placeholder="城市" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:8px" value="'+of('city')+'">'
    +'<input id="co-province" placeholder="省份" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:8px" value="'+of('province')+'">'
    +'<input id="co-address" placeholder="注册地址" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:8px" value="'+of('address')+'">'
    +'<textarea id="co-business-scope" placeholder="经营范围" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px;min-height:80px;resize:vertical">'+of('business_scope')+'</textarea>'
    +'<div class="btns"><button class="btn-cancel" onclick="closeCompanyFormModal()">取消</button><button class="btn-confirm" onclick="saveCompany()">保存</button></div></div>';
  document.body.appendChild(div);
}
function closeCompanyFormModal(){var m=document.getElementById('company-form-modal');if(m)m.remove();}
async function saveCompany(){
  var name=document.getElementById('co-name').value.trim();
  var tax=document.getElementById('co-tax-id').value.trim();
  var legal=document.getElementById('co-legal-person').value.trim();
  var capital=document.getElementById('co-reg-capital').value.trim();
  var established=document.getElementById('co-established').value.trim();
  var city=document.getElementById('co-city').value.trim();
  var province=document.getElementById('co-province').value.trim();
  var address=document.getElementById('co-address').value.trim();
  var scope=document.getElementById('co-business-scope').value.trim();
  if(!name){showToast('请输入公司名称','warning');return}
  var payload={name:name,tax_id:tax||null,legal_person:legal||null,reg_capital:capital||null,established:established||null,city:city||null,province:province||null,address:address||null,business_scope:scope||null,status:'approved'};
  try{
    if(_companyFormId){
      var r=await callAdmin('update','companies',{payload:payload,filters:[{col:'id',op:'eq',val:_companyFormId}],query:'*'});
      if(r&&r.error){var t=await r.text();showToast('更新失败: '+t,'error');return}
    }else{
      var r=await callAdmin('insert','companies',{payload:payload});
      if(r&&r.error){var t=await r.text();showToast('创建失败: '+t,'error');return}
    }
    closeCompanyFormModal();
    await loadAdminCompanies();renderAdminCompanies();
    showToast(_companyFormId?'公司已更新':'公司已创建');
  }catch(e){showToast('操作失败: '+e.message,'error');}
}
function delCompanyById(id){var co=allAdminCompanies.find(function(c){return c.id===id;});if(co)deleteCompany(id,co.name);}
async function deleteCompany(id,name){
  if(!await uiConfirm('确定删除公司「'+name+'」？此操作不可恢复！'))return;
  try{
    var r=await callAdmin('delete','companies',{filters:[{col:'id',op:'eq',val:id}]});
    if(r&&r.error){var t=await r.text();showToast('删除失败: '+t,'error');return}
    await loadAdminCompanies();renderAdminCompanies();
    showToast('公司已删除');
  }catch(e){showToast('删除失败: '+e.message,'error');}
}

async function submitCompanyReg(){
  var name=document.getElementById('cr-name').value.trim();
  var tax=document.getElementById('cr-tax-id').value.trim();
  var er=document.getElementById('cr-err');
  er.style.display='none';
  if(!name||!tax){er.textContent='请填写公司名称和税号';er.style.display='block';return}
  if(tax.length!==18){er.textContent='税号应为18位信用代码';er.style.display='block';return}
  var _ses=(await sb.auth.getSession()).data.session;
  var user=_ses&&_ses.user;
  if(!user){er.textContent='请先登录';er.style.display='block';return}
  var {error}=await sb.from('companies').insert({name:name,tax_id:tax,status:'pending',created_by:user.id});
  if(error){
    if(error.message.indexOf('unique')>=0||error.message.indexOf('duplicate')>=0){
      er.textContent='该公司名称或税号已被注册';
    }else{
      er.textContent=error.message;
    }
    er.style.display='block';
    return;
  }
  showPendingScreen(name);
}

async function logout(){
  if(window._pendPoll)clearInterval(window._pendPoll);
  if(currentUser)try{await writeOpLog('logout','auth',currentUser.id,currentUser.email,'用户登出')}catch(e){}
  await sb.auth.signOut();
  currentCompanyId=null;isSuperAdmin=false;
  document.getElementById('main-screen').classList.add('hidden');
  document.getElementById('company-reg-screen').classList.add('hidden');
  document.getElementById('pending-screen').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
}

async function loadPendingCompanies(){
  if(!isSuperAdmin)return;
  var {data}=await sb.rpc('list_all_companies');
  if(!data){return}
  allCompanies=data;
  var q=(document.getElementById('admin-user-search')?document.getElementById('admin-user-search').value:'').toLowerCase();
  var html='';
  for(var i=0;i<data.length;i++){
    html+=renderCompanyRow(data[i]);
  }
  var el=document.getElementById('admin-company-list');if(el)el.innerHTML=html||'<div class="empty-state">暂无公司</div>';
}

function renderCompanyRow(c){
  var badge=c.status==='pending'?'badge-pending':'badge-approved';
  var label=c.status==='pending'?'待审核':c.status==='approved'?'已通过':'已拒绝';
  if(c.status==='rejected')badge='badge-rejected';
  var btns='';
  if(c.status==='pending'){
    btns='<button class="btn-sm btn-sm-primary" onclick="approveCompany('+c.id+')">通过</button><button class="btn-sm btn-sm-danger" onclick="rejectCompany('+c.id+')">拒绝</button>';
  }
  return '<div class="company-row"><div class="company-info"><div class="company-name">'+escHtml(c.name)+'</div><div class="company-meta">税号: '+escHtml(c.tax_id)+' | 注册人: '+escHtml(c.creator_email||'')+' | <span class="company-badge '+badge+'">'+label+'</span></div></div><div>'+btns+'</div></div>';
}

async function approveCompany(id){
  var _ses=(await sb.auth.getSession()).data.session;
  var {error}=await sb.from('companies').update({status:'approved',approved_by:_ses&&_ses.user?_ses.user.id:null,approved_at:new Date().toISOString()}).eq('id',id);
  if(error){showToast('操作失败: '+error.message,'error');return}
  // Set the creator as admin
  var {data:comp}=await sb.from('companies').select('created_by').eq('id',id).single();
  if(comp){
    await sb.from('profiles').upsert({user_id:comp.created_by,company_id:id,role:'admin',active_company_id:id},{onConflict:'user_id'});
    await sb.from('company_memberships').upsert({user_id:comp.created_by,company_id:id,role:'admin',status:'active',joined_at:new Date().toISOString()},{onConflict:'user_id,company_id'});
  }
  loadPendingCompanies();
}

async function rejectCompany(id){
  if(!await uiConfirm('确定拒绝该公司的注册申请吗?'))return;
  await sb.from('companies').update({status:'rejected'}).eq('id',id);
  loadPendingCompanies();
}

// escHtml defined below (regex-based)
function selectCompany(c){document.getElementById('f-name').value=c.name;var d=document.getElementById('company-ac-drop');if(d)d.classList.remove('show');fillCompanyInfo(c);}
setupCompanyAutocomplete();

/* ── Admin: Department Management ── */
var allDepartments=[];
var adminUserList=[];
var currentAdminTab='users';
var deptExpanded={};

var adminDataLoaded=false;
async function loadAdminData(force){
  if(adminDataLoaded&&!force){dbg('[loadAdminData] cached, skip');return}
  dbg('[loadAdminData] fetching...');
  // Load departments
  var {data:depts,error}=await sb.from('departments').select('*').eq('company_id',currentCompanyId).order('name');
  if(!error)allDepartments=depts||[];
  // Load roles
  var {data:roles,error:rerr}=await sb.from('roles').select('*').eq('company_id',currentCompanyId).order('name');
  if(!rerr)allRoles=roles||[];
  // Load all users for admin (profiles now has email column populated at login)
  if(isSuperAdmin||currentUserRole==='admin'){await loadAdminCompanies();}
  if(isSuperAdmin||currentUserRole==='admin'){
    if(isSuperAdmin){
      try{var ur=await callAdmin('select','profiles',{query:'*'});if(ur&&ur.data&&ur.data.length>0){adminUserList=ur.data;allUsers=adminUserList;populatePerfSelects();}else{console.warn('callAdmin returned no data, falling back to direct query:',ur);throw new Error('admin-proxy empty')}}catch(e){console.error('callAdmin profiles failed, fallback direct:',e.message);try{var {data:fb,error:fe}=await sb.from('profiles').select('*');if(!fe&&fb){adminUserList=fb;allUsers=adminUserList;populatePerfSelects();dbg('fallback direct: '+fb.length+' users');}else{console.error('fallback direct also failed:',fe)}}catch(e2){console.error('fallback error:',e2)}}
    }else{
      try{var ur=await callAdmin('select','profiles',{query:'*',filters:[{col:'company_id',op:'eq',val:currentCompanyId}]});if(ur&&ur.data){adminUserList=ur.data;allUsers=adminUserList.slice();populatePerfSelects();}else{console.warn('loadAdminData profiles:',ur)}}catch(e){console.error('loadAdminData users:',e)}
    }
  }
  adminDataLoaded=true;
}

/* ── Roles ── */
// Permission matrix - default role permission levels
var DEFAULT_ROLE_PERMS={
  super_admin:{clients:'full',orders:'full',sales:'full',inventory:'full',admin:'full',reports:'full'},
  admin:{clients:'full',orders:'full',sales:'full',inventory:'full',admin:'full',reports:'full'},
  manager:{clients:'view_edit',orders:'view_edit',sales:'view',inventory:'view',admin:'none',reports:'view'},
  user:{clients:'view',orders:'view',sales:'none',inventory:'none',admin:'none',reports:'view'}
};
var PERM_LEVELS=['none','view','view_edit','full'];
var PERM_LABELS={none:'无',view:'查看',view_edit:'查看/编辑',full:'完全控制'};
var PERM_COLORS={none:'#e5e7eb',view:'#93c5fd',view_edit:'#60a5fa',full:'#4F6EF7'};
var PERM_TEXT_COLORS={none:'#6b7280',view:'#1e40af',view_edit:'#fff',full:'#fff'};

function renderAdminPerms(){
  var el=document.getElementById('admin-perms-grid');
  if(!el)return;
  var modules=['clients','orders','sales','inventory','admin','reports'];
  var modNames={clients:'客户',orders:'订单',sales:'销售',inventory:'供应链',admin:'系统',reports:'报表'};
  
  // Build role list: default roles + custom roles
  var roles=[];
  var defaultKeys=Object.keys(DEFAULT_ROLE_PERMS);
  for(var i=0;i<defaultKeys.length;i++){
    roles.push({name:defaultKeys[i],perms:DEFAULT_ROLE_PERMS[defaultKeys[i]],isDefault:true,id:null});
  }
  // Custom roles from DB
  for(var j=0;j<allRoles.length;j++){
    var rp=allRoles[j].permissions;
    if(typeof rp==='string')rp=JSON.parse(rp);
    roles.push({name:allRoles[j].name,perms:rp||{},isDefault:false,id:allRoles[j].id});
  }
  
  var h='<table class="perm-matrix"><thead><tr><th>角色</th>';
  for(var k=0;k<modules.length;k++)h+='<th>'+modNames[modules[k]]+'</th>';
  h+='</tr></thead><tbody>';
  
  for(var ri=0;ri<roles.length;ri++){
    var role=roles[ri];
    h+='<tr><td class="pm-role-name">'+escHtml(role.name)+(role.isDefault?' <span class="pm-badge">默认</span>':'')+'</td>';
    for(var mi=0;mi<modules.length;mi++){
      var lvl=role.perms[modules[mi]]||'none';
      var bg=PERM_COLORS[lvl]||PERM_COLORS.none;
      var tc=PERM_TEXT_COLORS[lvl]||PERM_TEXT_COLORS.none;
      var label=PERM_LABELS[lvl]||'无';
      if(role.isDefault){
        h+='<td class="pm-cell pm-readonly" style="background:'+bg+';color:'+tc+'">'+label+'</td>';
      }else{
        h+='<td class="pm-cell pm-editable" style="background:'+bg+';color:'+tc+'" onclick="cyclePermLevel(this,\''+role.id+',\''+modules[mi]+'\')" title="点击切换">'+label+'</td>';
      }
    }
    h+='</tr>';
  }
  h+='</tbody></table>';
  el.innerHTML=h;
}

async function cyclePermLevel(cell,roleId,module){
  // Find role and cycle permission level
  var role=allRoles.find(function(x){return x.id===parseInt(roleId)});
  if(!role)return;
  var perms=role.permissions;
  if(typeof perms==='string')perms=JSON.parse(perms);
  perms=perms||{};
  var cur=perms[module]||'none';
  var idx=PERM_LEVELS.indexOf(cur);
  var next=PERM_LEVELS[(idx+1)%PERM_LEVELS.length];
  perms[module]=next;
  
  // Save to DB
  var {error}=await sb.from('roles').update({permissions:perms,updated_at:new Date().toISOString()}).eq('id',parseInt(roleId));
  if(error){showToast('保存失败: '+error.message);return;}
  role.permissions=perms;
  
  // Update cell display
  cell.style.background=PERM_COLORS[next];
  cell.style.color=PERM_TEXT_COLORS[next];
  cell.textContent=PERM_LABELS[next];
}

function renderAdminRoles(){
  var el=document.getElementById('admin-role-list');
  if(!allRoles.length){el.innerHTML='<div class="empty-state">暂无自定义角色</div>';return}
  el.innerHTML='';
  for(var i=0;i<allRoles.length;i++){
    var r=allRoles[i];
    var permMap={none:'无',view:'查看',view_edit:'查看/编辑',full:'完全控制'};
    var perms=r.permissions||{};
    if(typeof perms==='string')perms=JSON.parse(perms);
    var labels=[];
    if(perms.clients)labels.push('客户:'+(permMap[perms.clients]||perms.clients));
    if(perms.orders)labels.push('订单:'+(permMap[perms.orders]||perms.orders));
    if(perms.sales)labels.push('销售:'+(permMap[perms.sales]||perms.sales));
    if(perms.inventory)labels.push('供应链:'+(permMap[perms.inventory]||perms.inventory));
    el.innerHTML+='<div class="role-card"><div class="rc-info"><div class="rc-name">'+escHtml(r.name)+'</div><div class="rc-perms">'+escHtml(labels.join(' | '))+'</div></div><div class="rc-actions"><button class="btn-sm btn-sm-primary" onclick="openRoleForm('+r.id+')">编辑</button><button class="btn-sm btn-sm-danger" onclick="deleteRole('+r.id+')">删除</button></div></div>';
  }
}

function openRoleForm(id){
  var r=id?allRoles.find(function(x){return x.id===id}):null;
  var perms=r?r.permissions:null;
  if(typeof perms==='string')perms=JSON.parse(perms);
  perms=perms||{};
  var modules=['clients','orders','sales','inventory','admin','reports'];
  var modNames={clients:'客户管理',orders:'订单管理',sales:'销售管理',inventory:'供应链',admin:'系统管理',reports:'报表'};
  var permOpts='<option value="">无</option><option value="view">查看</option><option value="view_edit">查看/编辑</option><option value="full">完全控制</option>';
  var grid='';
  for(var i=0;i<modules.length;i++){
    var cur=perms[modules[i]]||'';
    grid+='<div class="perm-item"><span style="flex:1;font-size:13px">'+modNames[modules[i]]+'</span><select id="rp-'+modules[i]+'">'+permOpts.replace('value=""'+'">',cur?'value=""':'value="" selected')+'</select></div>';
    if(cur){var ops=['','view','view_edit','full'];for(var j=0;j<ops.length;j++)if(ops[j]===cur){grid=grid.replace('id="rp-'+modules[i],'data-sel="'+j+'" id="rp-'+modules[i]);break}}
  }
  var div=document.createElement('div');div.className='confirm-overlay';div.id='role-form-modal';
  div.innerHTML='<div class="confirm-box" style="max-width:480px;max-height:80vh;overflow-y:auto"><p style="font-weight:600;margin-bottom:12px">'+(id?'编辑角色':'新建角色')+'</p>'+
    '<input id="rf-name" placeholder="角色名称" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px" value="'+escHtml(r?r.name:'')+'">'+
    '<div style="font-size:13px;font-weight:600;margin-bottom:8px">模块权限</div><div class="perm-grid">'+grid+'</div>'+
    '<div class="btns" style="margin-top:12px"><button class="btn-cancel" onclick="closeRoleForm()">取消</button>'+(id?'<button class="btn-danger" style="margin-right:auto" onclick="deleteRole('+id+')">删除</button>':'')+'<button class="btn-confirm" onclick="saveRole('+(id||0)+')">保存</button></div></div>';
  document.body.appendChild(div);
  // Restore selected values
  if(r&&r.permissions){
    setTimeout(function(){
      for(var i=0;i<modules.length;i++){
        var sel=document.getElementById('rp-'+modules[i]);
        if(sel){var idx=parseInt(sel.getAttribute('data-sel')||'0');if(idx>=0&&idx<sel.options.length)sel.selectedIndex=idx}
      }
    },50);
  }
}

function closeRoleForm(){var m=document.getElementById('role-form-modal');if(m)m.remove()}

async function saveRole(id){
  var name=document.getElementById('rf-name').value.trim();
  if(!name){showToast('请输入角色名称');return}
  var perms={};
  var m=['clients','orders','sales','inventory','admin','reports'];
  for(var i=0;i<m.length;i++){var v=document.getElementById('rp-'+m[i]).value;if(v)perms[m[i]]=v}
  var data={company_id:currentCompanyId,name:name,permissions:perms,updated_at:new Date().toISOString()};
  if(id){var {error}=await sb.from('roles').update(data).eq('id',id);if(error){showToast('保存失败: '+error.message);return}}
  else{var {error}=await sb.from('roles').insert(data);if(error){showToast('创建失败: '+error.message);return}}
  showToast(id?'角色已更新':'角色已创建');
  closeRoleForm();
  await loadAdminData(true);
  renderAdminRoles();
}

async function deleteRole(id){
  if(!await uiConfirm('确定删除此角色？'))return;
  // Unset role_id for users assigned to this role
  await sb.from('profiles').update({role_id:null,role:'user'}).eq('role_id',id);
  var {error}=await sb.from('roles').delete().eq('id',id);
  if(error){showToast('删除失败: '+error.message);return}
  showToast('角色已删除');
  await loadAdminData(true);
  renderAdminRoles();
  if(typeof renderAdminEmployees==="function")renderAdminEmployees();
}

async function switchBizTab(sub){
  var bt=document.getElementById('biz-tabs');
  var ov=document.getElementById('order-view');
  var sv=document.getElementById('sales-view');
  var pv=document.getElementById('performance-view');
  var fab=document.getElementById('main-fab');
  if(!bt)return;
  var tabs=bt.querySelectorAll('.biz-subtab');
  for(var i=0;i<tabs.length;i++)tabs[i].classList.remove('active');
  // Hide sub-views
  if(sv)sv.classList.add('hidden');if(pv)pv.classList.add('hidden');
  // Hide order-view internal content
  var otb=ov.querySelector('.toolbar');if(otb)otb.style.display='none';
  var ost=ov.querySelector('.order-stats');if(ost)ost.style.display='none';
  var ogr=document.getElementById('order-grid');if(ogr)ogr.style.display='none';
  var oem=document.getElementById('order-empty');if(oem)oem.classList.add('hidden');
  fab.classList.add('hidden');
  if(sub==='orders'){
    tabs[0].classList.add('active');
    if(otb)otb.style.display='';if(ost)ost.style.display='';if(ogr)ogr.style.display='';if(oem)oem.classList.remove('hidden');
    fab.classList.remove('hidden');fab.textContent='+';fab.onclick=function(){openOrderForm()};
    renderOrders();
  }else if(sub==='sales'){
    tabs[1].classList.add('active');
    sv.classList.remove('hidden');
    fab.classList.remove('hidden');fab.textContent='+';fab.onclick=function(){dbg('[DEBUG] FAB onclick fires');openSalesForm();};
    if(!allClients.length){dbg('[DEBUG] loading clients then calling switchSalesTab');loadClients().then(function(){dbg('[DEBUG] clients loaded, calling switchSalesTab leads');switchSalesTab('leads')});}else{dbg('[DEBUG] clients already cached, direct switchSalesTab');switchSalesTab('leads');}
  }else if(sub==='performance'){
    tabs[2].classList.add('active');
    pv.classList.remove('hidden');
    if(!allTargets.length)loadTargets().then(function(){switchPerfTab('dashboard')});else switchPerfTab('dashboard');
  }
}
function switchResTab(sub){
  var rt=document.getElementById('res-tabs');
  var iv=document.getElementById('inventory-view');
  var spv=document.getElementById('suppliers-view');
  if(!rt)return;
  var tabs=rt.querySelectorAll('.biz-subtab');
  for(var i=0;i<tabs.length;i++)tabs[i].classList.remove('active');
  // Hide sub-views
  if(spv)spv.classList.add('hidden');
  var purchv=document.getElementById('purchase-view');if(purchv)purchv.classList.add('hidden');
  var itabs=iv.querySelector('.inv-subtabs');if(itabs)itabs.style.display='none';
  var ipanels=iv.querySelectorAll('.inv-panel');for(var j=0;j<ipanels.length;j++)ipanels[j].classList.remove('active');
  if(sub==='scouting'){
    tabs[0].classList.add('active');
    var fab3=document.getElementById('main-fab');if(fab3)fab3.classList.add('hidden');
    if(itabs)itabs.style.display='none';
    switchInventoryTab('scouting');
  }else if(sub==='inventory'){
    tabs[1].classList.add('active');
    var fab3=document.getElementById('main-fab');if(fab3)fab3.classList.remove('hidden');
    if(itabs)itabs.style.display='';
    if(!allProducts.length){loadCategories().then(function(){loadWarehouses().then(function(){switchInventoryTab('products')})})}else{switchInventoryTab('products')}
  }else if(sub==='suppliers'){
    tabs[2].classList.add('active');
    spv.classList.remove('hidden');
    var fab2=document.getElementById('main-fab');if(fab2)fab2.classList.add('hidden');
    loadSuppliers();
  }else if(sub==='purchase'){
    tabs[3].classList.add('active');
    document.getElementById('purchase-view').classList.remove('hidden');
    if(!allProducts.length||!allSuppliers||!allSuppliers.length){
      loadCategories().then(function(){loadWarehouses().then(function(){loadSuppliers().then(function(){loadPurchaseOrders()})})});
    }else{
      loadPurchaseOrders();
    }
  }
}
function toggleMoreMenu(){
  var menu=document.getElementById('more-menu');
  var overlay=document.getElementById('more-overlay');
  var isOpen=menu.classList.contains('show');
  if(isOpen){closeMoreMenu()}else{
    // Show/hide admin items
    var isAdmin=currentUserRole==='admin'||currentUserRole==='super_admin';
    var adminTab=document.getElementById('tab-admin');
    if(adminTab)adminTab.classList.toggle('hidden',!isAdmin);
    menu.classList.add('show');overlay.classList.add('show');
  }
}
function closeMoreMenu(){
  var menu=document.getElementById('more-menu');
  var overlay=document.getElementById('more-overlay');
  if(menu)menu.classList.remove('show');
  if(overlay)overlay.classList.remove('show');
}
async function switchAdminTab(tab){
  if(tab==='users')tab='employees'; // 兼容旧调用：'users' 实际对应「员工管理」，否则所有子面板都会被隐藏
  var dt=document.getElementById('admin-depts');
  var rt=document.getElementById('admin-roles');
  var pt=document.getElementById('admin-perms');
  var ct=document.getElementById('admin-companies');
  var cm=document.getElementById('admin-companies-manage');
  var subs=document.querySelectorAll('.admin-subtab');
  dt.classList.add('hidden');rt.classList.add('hidden');if(pt)pt.classList.add('hidden');ct.classList.add('hidden');if(cm)cm.classList.add('hidden');
  var ep=document.getElementById('admin-employees');if(ep)ep.classList.add('hidden');
  var fa=document.getElementById('admin-freeagents');if(fa)fa.classList.add('hidden');
  var ra=document.getElementById('admin-resignations');if(ra)ra.classList.add('hidden');
  var lp=document.getElementById('admin-logs');if(lp)lp.classList.add('hidden');
  var cp=document.getElementById('admin-config');if(cp)cp.classList.add('hidden');
  var sp=document.getElementById('admin-security');if(sp)sp.classList.add('hidden');
  var wf=document.getElementById('admin-workflows');if(wf)wf.classList.add('hidden');
  var gr=document.getElementById('admin-grants');if(gr)gr.classList.add('hidden');
  for(var i=0;i<subs.length;i++)subs[i].classList.remove('active');
  
  if(tab==='depts'){dt.classList.remove('hidden');subs[0].classList.add('active');await loadAdminData();renderAdminDepts();}
  else if(tab==='roles'){rt.classList.remove('hidden');subs[1].classList.add('active');await loadAdminData();renderAdminRoles();}
  else if(tab==='perms'){pt.classList.remove('hidden');subs[2].classList.add('active');await loadAdminData();renderAdminPerms();}
  else if(tab==='companies_manage'){cm.classList.remove('hidden');subs[3].classList.add('active');await loadAdminCompanies();renderAdminCompanies();}
  else if(tab==='companies'){ct.classList.remove('hidden');subs[4].classList.add('active');loadPendingCompanies();}
  else if(tab==='employees'){var ep=document.getElementById('admin-employees');ep.classList.remove('hidden');subs[5].classList.add('active');await loadAdminData();renderAdminEmployees();}
  else if(tab==='freeagents'){var fa=document.getElementById('admin-freeagents');fa.classList.remove('hidden');subs[6].classList.add('active');await loadFreeAgents();renderFreeAgents();}
  else if(tab==='resignations'){var ra=document.getElementById('admin-resignations');ra.classList.remove('hidden');subs[7].classList.add('active');await loadResignations();renderResignations();}
  else if(tab==='logs'){var lp=document.getElementById('admin-logs');lp.classList.remove('hidden');subs[8].classList.add('active');await loadOperationLogs();renderOperationLogs();}
  else if(tab==='config'){var cp=document.getElementById('admin-config');cp.classList.remove('hidden');subs[9].classList.add('active');switchConfigTab('fields');}
  else if(tab==='security'){var sp=document.getElementById('admin-security');sp.classList.remove('hidden');subs[10].classList.add('active');renderSecurityPanel();}
  else if(tab==='workflows'){(async function(){var wf=document.getElementById('admin-workflows');wf.classList.remove('hidden');subs[11].classList.add('active');if(!allRoles||!allRoles.length||!allDepartments||!allDepartments.length)await loadAdminData();renderWorkflowTemplates();})();}
  else if(tab==='grants'){var gr=document.getElementById('admin-grants');gr.classList.remove('hidden');subs[12].classList.add('active');renderGrantsPanel();}
}
function renderGrantsPanel(){
  var panel=document.getElementById('admin-grants');
  panel.classList.remove('hidden');
  // Load members
  var sel=document.getElementById('grant-member-select');
  sel.innerHTML='<option value="">-- 选择成员 --</option>';
  (allUsers||[]).forEach(function(u){
    sel.innerHTML+='<option value="'+u.user_id+'">'+h(u.name||u.email)+'</option>';
  });
  loadMemberGrantsPanel();
}

async function loadMemberGrantsPanel(){
  var user_id=document.getElementById('grant-member-select').value;
  var type=document.getElementById('grant-type-select').value;
  var list=document.getElementById('admin-grants-list');
  if(!user_id){list.innerHTML='<div class="empty-state">请选择成员</div>';return}
  
  // Load all resources of this type
  var resources=[];
  if(type==='clients'){resources=allClients}
  else if(type==='products'){resources=allProducts}
  else if(type==='suppliers'){resources=allSuppliers}
  
  // Load existing grants for this member
  try{
    var rg=await callAdmin('select','resource_grants',{query:'*',filters:[
      {col:'user_id',op:'eq',val:user_id},{col:'resource_type',op:'eq',val:type}
    ]});
    var granted=(rg&&rg.data?rg.data.map(function(r){return r.resource_id}):[]);
  }catch(e){var granted=[]}
  
  if(resources.length===0){list.innerHTML='<div class="empty-state">暂无'+({'clients':'客户','products':'产品','suppliers':'供应商'}[type]||type)+'数据</div>';return}
  
  var htm='<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:var(--bg2)"><th style="padding:8px;text-align:left;border-bottom:1px solid var(--border)">名称</th><th style="padding:8px;text-align:center;border-bottom:1px solid var(--border);width:80px">授权</th></tr></thead><tbody>';
  resources.forEach(function(r){
    var name=h(r.name||r.title||'未命名');
    var checked=granted.indexOf(r.id)>=0?'checked':'';
    htm+='<tr><td style="padding:8px;border-bottom:1px solid var(--border2)">'+name+'</td><td style="padding:8px;text-align:center;border-bottom:1px solid var(--border2)"><input type="checkbox" value="'+r.id+'" '+checked+' onchange="onGrantCheck(this)" style="width:16px;height:16px;cursor:pointer"></td></tr>';
  });
  htm+='</tbody></table>';
  list.innerHTML=htm;
}

// Track checked grants
function onGrantCheck(cb){
  // Just track via the checkbox state
}

async function saveMemberGrants(){
  var user_id=document.getElementById('grant-member-select').value;
  var type=document.getElementById('grant-type-select').value;
  if(!user_id){showToast('请选择成员');return}
  
  var ids=[];
  document.querySelectorAll('#admin-grants-list input[type="checkbox"]:checked').forEach(function(cb){ids.push(cb.value)});
  var idsStr=ids.join(',');
  dbg('[saveMemberGrants] saving',{user_id:user_id,type:type,idsStr:idsStr,companyId:currentCompanyId});
  try{
    var r=await callAdmin('rpc','batch_grant_resources',{payload:{p_user_id:user_id,p_company_id:currentCompanyId,p_resource_type:type,p_resource_ids:idsStr,p_granted_by:currentUser?currentUser.id:null}});
    dbg('[saveMemberGrants] raw response:',JSON.stringify(r));
    var inner=r&&r.data;
    var err=r&&r.error;
    if(inner&&inner.error){err=inner.error;}
    if(err){showToast('授权失败: '+(err.message||JSON.stringify(err)));return}
    showToast('已授权 '+ids.length+' 项');
  }catch(e){console.error('[saveMemberGrants] exception:',e);showToast('授权失败: '+(e.message||e))}
}


/* ── Users ── */
var allRoles=[];


async function setUserRole(userId,role){
  var {error}=await sb.from('profiles').upsert({user_id:userId,role:role},{onConflict:'user_id'});
  if(error){showToast('操作失败: '+error.message,'error');return}
  for(var i=0;i<adminUserList.length;i++){if(adminUserList[i].user_id===userId){adminUserList[i].role=role;break;}}
  if(typeof renderAdminEmployees==="function")renderAdminEmployees();
}

async function deleteUser(userId){
  if(!await uiConfirm('确定要删除该员工账号吗？此操作不可撤销，将同时清除其所有关联数据。'))return;
  try{
    var r=await callAdmin('auth_delete_user','',{userId:userId});
    if(r.error){showToast('删除失败: '+(r.error.message||'未知错误'),'error');return}
    adminUserList=adminUserList.filter(function(u){return u.user_id!==userId});
    allUsers=allUsers.filter(function(u){return u.user_id!==userId});
    if(typeof renderAdminEmployees==="function")renderAdminEmployees();
    showToast('用户已删除');
  }catch(e){showToast('删除失败: '+e.message,'error')}
}


function openUserEditForm(userId){
  var u=null;
  for(var i=0;i<adminUserList.length;i++){if(adminUserList[i].user_id===userId){u=adminUserList[i];break}}
  if(!u)return;
  var deptOpts='<option value="">无部门</option>';
  for(var j=0;j<allDepartments.length;j++){deptOpts+='<option value="'+allDepartments[j].id+'"'+((u.department_id===allDepartments[j].id)?' selected':'')+'>'+escHtml(allDepartments[j].name)+'</option>'}
  var roleOpts='<option value="user">普通用户</option><option value="admin">管理员</option>';
  var baseRoleNames={普通用户:1,管理员:1};
  for(var k=0;k<allRoles.length;k++){if(baseRoleNames[allRoles[k].name])continue;roleOpts+='<option value="r_'+allRoles[k].id+'"'+((u.role_id===allRoles[k].id)?' selected':'')+'>'+escHtml(allRoles[k].name)+'</option>'}
  var div=document.createElement('div');div.className='confirm-overlay';div.id='user-edit-modal';
  div.innerHTML='<div class="confirm-box" style="max-width:420px;max-height:80vh;overflow-y:auto"><p style="font-weight:600;margin-bottom:12px">编辑员工 - '+escHtml(u.display_name||u.email)+'</p>'+
    '<label style="font-size:13px;display:block;margin-bottom:4px">姓名</label><input id="uedit-name" value="'+escHtml(u.display_name||'')+'" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:10px">'+
    '<label style="font-size:13px;display:block;margin-bottom:4px">岗位</label><input id="uedit-position" value="'+escHtml(u.position||'')+'" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:10px">'+
    '<label style="font-size:13px;display:block;margin-bottom:4px">手机</label><input id="uedit-phone" value="'+escHtml(u.phone||'')+'" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:10px">'+
    '<label style="font-size:13px;display:block;margin-bottom:4px">公司</label><input id="uedit-company" list="uedit-company-list" placeholder="输入或选择公司" autocomplete="off" value="'+escHtml(function(){var cab=typeof allAdminCompanies!=='undefined'?allAdminCompanies:allCompanies||[];for(var i=0;i<cab.length;i++){if(cab[i].id===u.company_id)return cab[i].name}return ''}())+'" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:10px"'+(isSuperAdmin?'':' readonly')+'>'+(isSuperAdmin?'<datalist id="uedit-company-list">'+(typeof allAdminCompanies!=='undefined'?allAdminCompanies:allCompanies||[]).map(function(c){return '<option value="'+escHtml(c.name)+'">';}).join('')+'</datalist>':'')+
    '<label style="font-size:13px;display:block;margin-bottom:4px">部门</label><select id="uedit-dept" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:10px">'+deptOpts+'</select>'+
    '<label style="font-size:13px;display:block;margin-bottom:4px">角色</label><select id="uedit-role" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:10px">'+roleOpts+'</select>'+
    (isSuperAdmin||(currentUserRole==='admin'&&u.company_id===currentCompanyId)?'<label style="font-size:13px;display:block;margin-bottom:4px">状态</label><select id="uedit-status" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:10px"><option value="active"'+(u.status==='active'||!u.status?' selected':'')+'>在职</option><option value="inactive"'+(u.status==='inactive'?' selected':'')+'>停用</option><option value="leave"'+(u.status==='leave'?' selected':'')+'>离职</option></select>':'')+
    '<div class="btns"><button class="btn-cancel" onclick="closeUserEditForm()">取消</button><button class="btn-confirm" onclick="saveUserEdit(\''+userId+'\')">保存</button></div></div>';
  document.body.appendChild(div);
}

function closeUserEditForm(){var m=document.getElementById('user-edit-modal');if(m)m.remove()}

async function saveUserEdit(userId){
  var roleVal=document.getElementById('uedit-role').value;
  var role=roleVal,roleId=null;
  if(roleVal&&roleVal.startsWith('r_')){roleId=parseInt(roleVal.slice(2));role='custom'}
  var companyId=currentCompanyId;if(isSuperAdmin){var cname=document.getElementById('uedit-company').value.trim();if(cname){var found=null;var cab=typeof allAdminCompanies!=='undefined'?allAdminCompanies:allCompanies||[];for(var i=0;i<cab.length;i++){if(cab[i].name===cname){found=cab[i];break}}if(found){companyId=found.id}}}
  var targetUser=adminUserList.find(function(u){return u.user_id===userId;});
  var data={
    display_name:document.getElementById('uedit-name').value.trim(),
    position:document.getElementById('uedit-position').value.trim(),
    phone:document.getElementById('uedit-phone').value.trim(),
    department_id:parseInt(document.getElementById('uedit-dept').value)||null,
    role:role,role_id:roleId,
    status:isSuperAdmin||(currentUserRole==='admin'&&targetUser&&targetUser.company_id===currentCompanyId)?document.getElementById('uedit-status').value:undefined,
    company_id:companyId
  };
  var error=null;
  if(!isSuperAdmin&&currentUserRole==='admin'&&targetUser&&targetUser.company_id!==currentCompanyId){
    showToast('权限不足: 不能修改其他公司的成员');return;
  }
  var newStatus=data.status;
  if(!isSuperAdmin&&userId===currentUser.id&&newStatus==='leave'){
    showToast('不能将自己设为离职，请联系其他管理员操作');return;
  }
  if(newStatus==='leave'){data.company_id=null;data.department_id=null;}
  if(isSuperAdmin||currentUserRole==='admin'){
    var ur=await callAdmin('update','profiles',{payload:data,filters:[{col:'user_id',op:'eq',val:userId}],query:'*'});
    if(ur&&ur.error){error={message:ur.error.message||'Update failed'}}
  }else{
    var res=await sb.from('profiles').update(data).eq('user_id',userId);
    error=res.error;
  }
  if(error){showToast('更新失败: '+error.message);return}
  showToast('已更新');
  for(var i=0;i<adminUserList.length;i++){if(adminUserList[i].user_id===userId){
    adminUserList[i].display_name=data.display_name;
    adminUserList[i].position=data.position;
    adminUserList[i].phone=data.phone;
    adminUserList[i].department_id=data.department_id;
    adminUserList[i].role=data.role;
    adminUserList[i].role_id=data.role_id;
    adminUserList[i].status=data.status;
    if(data.company_id!==undefined)adminUserList[i].company_id=data.company_id;
    break;
  }}
  closeUserEditForm();
  // 刷新员工管理列表
  if(typeof renderAdminEmployees==='function')renderAdminEmployees();
}


/* ── Departments ── */
var deptFormId=null;

function openDeptForm(id){
  deptFormId=id||null;
  var dept=id?allDepartments.find(function(d){return d.id===id;}):null;
  var parentOpts='<option value="">无上级</option>';
  for(var i=0;i<allDepartments.length;i++){if(allDepartments[i].id!==id){parentOpts+='<option value="'+allDepartments[i].id+'"'+((dept&&dept.parent_id===allDepartments[i].id)?' selected':'')+'>'+escHtml(allDepartments[i].name)+'</option>';}}
  var div=document.createElement('div');div.className='confirm-overlay';div.id='dept-form-modal';
  var companyOpts='';
  if(isSuperAdmin&&allAdminCompanies&&allAdminCompanies.length){
    companyOpts='<select id="dept-company" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:10px"><option value="">选择归属公司</option>';
    for(var i=0;i<allAdminCompanies.length;i++){companyOpts+='<option value="'+allAdminCompanies[i].id+'"'+((dept&&dept.company_id===allAdminCompanies[i].id)?' selected':'')+'>'+escHtml(allAdminCompanies[i].name)+'</option>';}
    companyOpts+='</select>';
  }
  div.innerHTML='<div class="confirm-box"><p>'+(id?'编辑部门':'新建部门')+'</p><input id="dept-name" placeholder="部门名称" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:10px" value="'+escHtml(dept?dept.name:'')+'">'+companyOpts+'<select id="dept-parent" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px">'+parentOpts+'</select><div class="btns"><button class="btn-cancel" onclick="closeDeptFormModal()">取消</button><button class="btn-confirm" onclick="saveDept()">保存</button></div></div>';
  document.body.appendChild(div);
}

async function saveDept(){
  var name=document.getElementById('dept-name').value.trim();
  if(!name){showToast('请输入部门名称','warning');return}
  var parentId=parseInt(document.getElementById('dept-parent').value)||null;
  var selCid=isSuperAdmin?document.getElementById('dept-company'):null;
  var payload={name:name,parent_id:parentId,company_id:selCid&&selCid.value?parseInt(selCid.value):currentCompanyId};
  if(isSuperAdmin||currentUserRole==='admin'){
    try{var dr;if(deptFormId){dr=await callAdmin('update','departments',{payload:payload,filters:[{col:'id',op:'eq',val:deptFormId}],query:'*'});}else{dr=await callAdmin('insert','departments',{payload:payload});}
    if(dr.error){showToast('保存失败: '+dr.error.message,'error');return}}
    catch(e){showToast('网络错误: '+e.message,'error');return}
  }else{
    if(deptFormId){var{error}=await sb.from('departments').update(payload).eq('id',deptFormId);if(error){showToast('保存失败: '+error.message,'error');return}}
    else{var{error}=await sb.from('departments').insert(payload);if(error){showToast('创建失败: '+error.message,'error');return}}
  }
  document.getElementById('dept-form-modal').remove();
  await loadAdminData(true);renderAdminDepts();
}

async function deleteDept(id,name){
  if(!await uiConfirm('确定删除部门「'+name+'」？下属用户将变为无部门。'))return;
  // Unlink users first
  await sb.from('profiles').update({department_id:null}).eq('department_id',id);
  var error=null;
  if(isSuperAdmin||currentUserRole==='admin'){
    try{var dr=await callAdmin('delete','departments',{filters:[{col:'id',op:'eq',val:id}],query:'*'});
    if(dr&&dr.error){var dj=dr.data.catch(function(){});error={message:dj&&dj.message||dr.statusText}}
    }catch(e){error={message:e.message}}
  }else{
    var res=await sb.from('departments').delete().eq('id',id);error=res.error;
  }
  if(error){showToast('删除失败: '+error.message,'error');return}
  await loadAdminData(true);renderAdminDepts();
}

function expandDept(id){
  deptExpanded[id]=!deptExpanded[id];
  renderAdminDepts();
}

function renderAdminDepts(){
  var tree=buildDeptTree();
  document.getElementById('admin-dept-list').innerHTML=renderDeptTree(tree,0)||'<div style="padding:30px;text-align:center;color:var(--text3)">暂无部门，点击"+ 新建部门"创建</div>';
}

function buildDeptTree(){
  var map={};var roots=[];
  for(var i=0;i<allDepartments.length;i++){var d=allDepartments[i];d.children=[];map[d.id]=d;}
  for(var i=0;i<allDepartments.length;i++){var d=allDepartments[i];if(d.parent_id&&map[d.parent_id]){map[d.parent_id].children.push(d);}else if(!d.parent_id){roots.push(d);}}
  return roots;
}

function renderDeptTree(nodes,level){
  var h='';
  for(var i=0;i<nodes.length;i++){
    var n=nodes[i];
    var hasChildren=n.children&&n.children.length>0;
    var expanded=deptExpanded[n.id]!==false;
    var userCount=0;
    for(var j=0;j<adminUserList.length;j++){if(adminUserList[j].department_id===n.id)userCount++;}
    var expStyle=hasChildren?'':'visibility:hidden';
    var expIcon=expanded?'▼':'▶';
    var escName=escHtml(n.name).replace(/'/g,'&#39;');
    h+='<div class="dept-node"><div class="dept-row"><div class="dn-expand" style="'+expStyle+'" onclick="expandDept('+n.id+')">'+expIcon+'</div>';
    h+='<div class="dn-name">'+escHtml(n.name)+'</div>';
    h+='<div class="dn-count">'+userCount+'人</div>';
    h+='<div class="dn-actions"><button class="btn-sm btn-sm-primary" onclick="openDeptForm('+n.id+')">编辑</button><button class="btn-sm btn-sm-danger" onclick="delDeptById('+n.id+')">删除</button></div>';
    h+='</div>';
    if(hasChildren&&expanded){h+='<div class="dept-children">'+renderDeptTree(n.children,level+1)+'</div>';}
    h+='</div>';
  }
  return h;
}

function formatDateTime(iso){if(!iso)return'';try{var d=new Date(iso);var y=d.getFullYear();var m=String(d.getMonth()+1).padStart(2,'0');var day=String(d.getDate()).padStart(2,'0');var h=String(d.getHours()).padStart(2,'0');var min=String(d.getMinutes()).padStart(2,'0');return y+'-'+m+'-'+day+' '+h+':'+min;}catch(e){return iso;}}
function escHtml(s){return h(s)}  // 与 h() 同义，保留旧名以兼容 400+ 处调用
async function doSetUserDeptCommit(userId,deptId){var tu=adminUserList.find(function(u){return u.user_id===userId;});if(!isSuperAdmin&&currentUserRole==='admin'&&tu&&tu.company_id!==currentCompanyId){showToast('权限不足');return;}var{error}=await sb.from('profiles').update({department_id:deptId}).eq('user_id',userId);if(error){showToast('操作失败: '+error.message,'error');return}for(var i=0;i<adminUserList.length;i++){if(adminUserList[i].user_id===userId){adminUserList[i].department_id=deptId;break;}}var m=document.getElementById('user-dept-modal');if(m)m.remove();if(typeof renderAdminEmployees==="function")renderAdminEmployees();}
function closeDeptFormModal(){var m=document.getElementById('dept-form-modal');if(m)m.remove();}
function delDeptById(id){var dept=null;for(var i=0;i<allDepartments.length;i++){if(allDepartments[i].id===id){dept=allDepartments[i];break;}}if(dept)deleteDept(id,dept.name);}

/* ── Add User ── */
function openAddUserForm(){
  document.getElementById('add-user-modal').classList.remove('hidden');
  // Populate company dropdown (super admin only)
  var cw=document.getElementById('add-user-company-wrap');
  var cs=document.getElementById('add-user-company');
  if(isSuperAdmin&&allAdminCompanies&&allAdminCompanies.length){
    cw.style.display='';var dl=document.getElementById('add-company-list');if(dl){dl.innerHTML='';for(var i=0;i<allAdminCompanies.length;i++)dl.innerHTML+='<option value="'+escHtml(allAdminCompanies[i].name)+'">';}
  }else{cw.style.display='none';}
  // Populate dept dropdown
  var s=document.getElementById('add-user-dept');s.innerHTML='<option value="">无部门</option>';
  for(var i=0;i<allDepartments.length;i++){s.innerHTML+='<option value="'+allDepartments[i].id+'">'+escHtml(allDepartments[i].name)+'</option>';}
  // Populate role dropdown
  var rs=document.getElementById('add-user-role');rs.innerHTML='<option value="user">普通用户</option><option value="admin">管理员</option>';
  for(var j=0;j<allRoles.length;j++){rs.innerHTML+='<option value="r_'+allRoles[j].id+'">'+escHtml(allRoles[j].name)+'</option>'}
  document.getElementById('add-user-email').value='';document.getElementById('add-user-password').value='';document.getElementById('add-user-name').value='';
  document.getElementById('add-user-position').value='';document.getElementById('add-user-phone').value='';
  document.getElementById('add-user-email').focus();
}
function closeAddUserForm(){document.getElementById('add-user-modal').classList.add('hidden');}
async function saveNewUser(){
  var email=document.getElementById('add-user-email').value.trim();
  var password=document.getElementById('add-user-password').value.trim();
  var name=document.getElementById('add-user-name').value.trim();
  var position=document.getElementById('add-user-position').value.trim();
  var phone=document.getElementById('add-user-phone').value.trim();
  var deptId=document.getElementById('add-user-dept').value||null;
  var roleVal=document.getElementById('add-user-role').value;
  var role=roleVal,roleId=null;
  if(roleVal&&roleVal.startsWith('r_')){roleId=parseInt(roleVal.slice(2));role='custom'}
  if(!email){showToast('请输入邮箱');return}
  if(!password||password.length<6){showToast('密码至少6位');return}
  // Step 1: Refresh admin token, capture fresh access_token for fetch
  var adminToken=null;
  try{try{await sb.auth.refreshSession()}catch(e){}var s=(await sb.auth.getSession()).data.session;if(s)adminToken=s.access_token}catch(e){}
  // Step 2: Backup admin localStorage (now contains refreshed tokens from step 1)
  var authKey=null,authVal=null;
  for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf('auth-token')>=0){authKey=k;authVal=localStorage.getItem(k);break}}
  // Step 3: SignUp (auto-switches sb client session to new user)
  var {data,error}=await sb.auth.signUp({email:email,password:password});
  var newUserId=null;
  if(!error&&data.user){newUserId=data.user.id}
  else if(error&&error.message.indexOf('already')>=0){
    showToast('该邮箱已注册，请在Supabase Auth面板中查找用户ID后手动关联档案');
    return;
  }else{showToast('创建失败: '+(error?error.message:'未知错误'));return}
  // Step 4: Restore admin localStorage, reload sb client session
  if(authKey&&authVal){localStorage.setItem(authKey,authVal);await sb.auth.getSession()}
  // Step 5: Write profile via raw fetch (adminToken from step 1 — independent of sb client state)
  var selCompanyId=null;if(isSuperAdmin){var cname=document.getElementById('add-user-company').value.trim();if(cname){var found=null;var cab=typeof allAdminCompanies!=='undefined'?allAdminCompanies:allCompanies||[];for(var i=0;i<cab.length;i++){if(cab[i].name===cname){found=cab[i];break}}if(found){selCompanyId=found.id}else{showToast('未找到公司: '+cname);return}}}
  var body={user_id:newUserId,email:email,role:role||'user',role_id:roleId,company_id:selCompanyId||currentCompanyId,display_name:name,position:position,phone:phone,department_id:deptId?parseInt(deptId):null};
  var res=await callAdmin('upsert','profiles',{payload:body,query:'*'});
  if(!res.ok){var txt=await res.text();console.error('Profile write failed:',res.status,txt);showToast('Profile write failed: HTTP '+res.status);return}
  closeAddUserForm();
  showToast('用户创建成功');
  await loadAdminData(true);
  if(typeof renderAdminEmployees==="function")renderAdminEmployees();
}


var _resetPwdUserId=null;
function openResetPwdForm(userId,userName){
  _resetPwdUserId=userId;
  document.getElementById('reset-pwd-user-name').textContent=userName;
  document.getElementById('reset-pwd-input').value='';
  document.getElementById('reset-pwd-modal').classList.remove('hidden');
}
function closeResetPwdForm(){
  document.getElementById('reset-pwd-modal').classList.add('hidden');
  _resetPwdUserId=null;
}
async function doResetPassword(){
  var pwd=document.getElementById('reset-pwd-input').value.trim();
  if(!pwd||pwd.length<6){showToast('密码至少6位');return}
  try{
    var r=await callAdmin('auth_reset_password','',{userId:_resetPwdUserId,password:pwd});
    if(r.error){showToast('重置失败: '+(r.error.message||'未知错误'));return}
    showToast('密码已重置');
    closeResetPwdForm();
  }catch(e){showToast('重置失败: '+e.message)}
}


