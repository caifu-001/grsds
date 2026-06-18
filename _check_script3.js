
// Supabase
const SUPABASE_URL='https://jyefbatmmbelrhhzsgva.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5ZWZiYXRtbWJlbHJoaHpzZ3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NDIyMDUsImV4cCI6MjA5NTUxODIwNX0.m8pVc7yA9AycSTkexoH76SNo_P40KVRA4pmKECJQea4';
SUPABASE_SERVICE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5ZWZiYXRtbWJlbHJoaHpzZ3ZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTk0MjIwNSwiZXhwIjoyMDk1NTE4MjA1fQ.0bF9vVcZWfBNt3t89VGEvAnu5mDGeqZm8UViY-cKuaU'; // 从 Supabase Dashboard > Settings > API 获取 service_role key（超管重置密码用）
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);

const BUILTIN_TYPES=['甲方','集成商','设计院','运营商','国央企','党政','厂家','制造业','军队','司法','教育','医疗','供应商'];
const BUILTIN_COLORS=['#3B82F6','#10B981','#8B5CF6','#F59E0B','#EF4444','#DC2626','#06B6D4','#EC4899','#84CC16','#6366F1','#F97316','#14B8A6','#A855F7'];
const PALETTE=['#3B82F6','#10B981','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#EC4899','#84CC16','#6366F1','#F97316','#14B8A6','#78716C','#0EA5E9','#D946EF','#E84C3D'];

let loginMode='login',currentUser=null,allClients=[],allContacts=[],allCompanies=[],allCompaniesMap={},currentFilter='all',selTypes=[],customTypes=[],newTypeColor=PALETTE[0];
let allUsers=[];
let editId=null,deleteId=null,formContacts=[],pendingImport=null;
let moveContactIdx=-1,moveContactObj=null;
let clientTags=[],clientAttachments=[],leadEditId=null,leadAssignId=null,allLeads=[];
let c360ClientId=null,c360ActiveTab='overview',c360Orders=[];

function h(s){return s?s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'):''}
// showToast defined below (with type/color support)
function tColor(label){
  var i=BUILTIN_TYPES.indexOf(label);
  if(i>=0)return BUILTIN_COLORS[i];
  var c=customTypes.find(function(ct){return ct.label===label});
  return c?c.color:'#999';
}

// === Auth ===
function switchMode(){
  loginMode=loginMode==='login'?'register':'login';
  document.getElementById('login-btn').textContent=loginMode==='register'?'注册':'登录';
  document.getElementById('register-btn').textContent=loginMode==='register'?'返回登录':'注册新账号';
  document.getElementById('login-err').textContent='';
  var b=document.getElementById('pw-strength-bars'),h=document.getElementById('pw-hint');
  b.classList.toggle('hidden',loginMode!=='register');h.classList.toggle('hidden',loginMode!=='register');
}
function checkPwStrength(pw){
  if(pw.length<6)return{ok:false,level:0,msg:'密码至少6位'};
  if(!/[a-zA-Z]/.test(pw)||!/[0-9]/.test(pw))return{ok:false,level:1,msg:'需包含字母和数字'};
  if(pw.length>=8&&/[!@#$%^&*]/.test(pw))return{ok:true,level:3,msg:'密码强度：强'};
  return{ok:true,level:2,msg:'密码强度：中'};
}
document.getElementById('login-pass').addEventListener('input',function(){
  if(loginMode!=='register')return;
  var r=checkPwStrength(this.value),b1=document.getElementById('pw-b1'),b2=document.getElementById('pw-b2'),b3=document.getElementById('pw-b3');
  b1.className='bar'+(r.level>=1?' l1':'');b2.className='bar'+(r.level>=2?' l2':'');b3.className='bar'+(r.level>=3?' l3':'');
  document.getElementById('pw-hint').textContent=r.msg;
  document.getElementById('pw-hint').style.color=r.ok?'#10B981':'#EF4444';
});
document.getElementById('login-pass').addEventListener('keydown',function(e){if(e.key==='Enter')handleLogin()});

function trErr(msg){
  if(msg.indexOf('Invalid login')>=0)return'邮箱或密码错误';
  if(msg.indexOf('not found')>=0)return'账号不存在，请先注册';
  if(msg.indexOf('already registered')>=0)return'该邮箱已注册';
  return msg;
}
async function handleLogin(){
  var un=document.getElementById('login-user').value.trim(),pw=document.getElementById('login-pass').value.trim();
  var er=document.getElementById('login-err'),btn=document.getElementById('login-btn');er.textContent='';
  if(!un||!pw){er.textContent='请输入邮箱和密码';return}
  btn.disabled=true;btn.textContent='请稍候...';
  try{
    if(loginMode==='login'){
      var r=await sb.auth.signInWithPassword({email:un,password:pw});
      if(r.error){er.textContent=trErr(r.error.message);return}
      await onLoginSuccess(r.data.user);
    }else{
      var s=checkPwStrength(pw);if(!s.ok){er.textContent=s.msg;return}
      var r=await sb.auth.signUp({email:un,password:pw});
      if(r.error){er.textContent=trErr(r.error.message);return}
      if(r.data.user&&!r.data.session){er.textContent='请联系管理员关闭邮件确认';return}
      await onLoginSuccess(r.data.user);
    }
  }catch(e){er.textContent='登录失败: '+(e.message||e.toString());console.error('handleLogin error:',e)}
  finally{btn.disabled=false;btn.textContent=loginMode==='register'?'注册':'登录'}
}
async function onLoginSuccess(user){
  currentUser=user;
  // Upsert profile and load role/company
  var profile=null;
  try{var r2=await sb.from('profiles').upsert({user_id:user.id,email:user.email},{onConflict:'user_id'}).select('role,company_id,display_name,phone,position').single();profile=r2.data}catch(e){console.error('profile upsert failed:',e);throw new Error('无法加载用户档案: '+(e.message||JSON.stringify(e)))}
  if(profile){currentUserRole=profile.role||'user';isSuperAdmin=profile.role==='super_admin';currentCompanyId=profile.company_id;}

  document.getElementById('login-user').value='';
  document.getElementById('login-pass').value='';
  document.getElementById('login-screen').classList.add('hidden');

  if(!currentCompanyId){
    // Check for pending registration
    var {data:pend}=await sb.from('companies').select('id,name,status').eq('created_by',user.id).order('created_at',{ascending:false}).limit(1);
    if(pend && pend.length>0){
      if(pend[0].status==='pending'){showPendingScreen(pend[0].name);return}
      if(pend[0].status==='rejected'){showCompanyRegScreen();return}
      // Approved - set company_id, preserve existing role (don't downgrade super_admin)
      currentCompanyId=pend[0].id;
      if(!currentUserRole||currentUserRole==='user'){
        await sb.from('profiles').upsert({user_id:user.id,email:user.email,company_id:currentCompanyId,role:'admin'},{onConflict:'user_id'});
        currentUserRole='admin';isSuperAdmin=false;
      }else{
        await sb.from('profiles').upsert({user_id:user.id,email:user.email,company_id:currentCompanyId},{onConflict:'user_id'});
      }
    }else{
      showCompanyRegScreen();
      return;
    }
  }

  await loadCustomTypes();
 buildFilterSelect();
 buildTypeGrid();
 buildStageGrid();
 await loadClients();
 await loadCompanies();
  document.getElementById('main-screen').classList.remove('hidden');
  if(isSuperAdmin||currentUserRole==='admin')document.getElementById('tab-admin').classList.remove('hidden');
  if(isSuperAdmin){document.getElementById('admin-tab-companies-manage').classList.remove('hidden');document.getElementById('admin-tab-companies').classList.remove('hidden');}
  pollNotifications();
  switchTab('home');
}
async function doLogout(){await sb.auth.signOut();currentUser=null;allClients=[];allContacts=[];customTypes=[];document.getElementById('main-screen').classList.add('hidden');document.getElementById('login-screen').classList.remove('hidden')}

// === Custom Types ===
async function loadCustomTypes(){
  if(!currentUser)return;
  var {data}=await sb.from('user_custom_types').select('*').eq('user_id',currentUser.id);
  customTypes=(data||[]).map(function(r){return{id:r.id,label:r.label,color:r.color}});
}

function allTypes(){return BUILTIN_TYPES.concat(customTypes.map(function(ct){return ct.label}))}

async function addCustomType(){
  var label=document.getElementById('new-type-label').value.trim();
  if(!label){showToast('请输入属性名称');return}
  if(allTypes().indexOf(label)>=0){showToast('该属性已存在');return}
  var {data,error}=await sb.from('user_custom_types').insert({
    user_id:currentUser.id,label:label,color:newTypeColor
  }).select('*');
  if(error){showToast('添加失败');return}
  customTypes.push({id:data[0].id,label:data[0].label,color:data[0].color});
  document.getElementById('new-type-label').value='';
  showToast('已添加「'+label+'」');
  renderCustomTypes();
  buildFilterSelect();
  buildTypeGrid();
}

async function deleteCustomType(id,label){
  var {error}=await sb.from('user_custom_types').delete().eq('id',id);
  if(error){showToast('删除失败');return}
  customTypes=customTypes.filter(function(ct){return ct.id!==id});
  showToast('已删除「'+label+'」');
  renderCustomTypes();
  buildFilterSelect();
  buildTypeGrid();
}

function renderCustomTypes(){
  var list=document.getElementById('custom-types-list');
  var html='<div style="font-size:12px;color:var(--text3);margin-bottom:6px">内置属性（不可删）</div>';
  html+='<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">';
  for(var i=0;i<BUILTIN_TYPES.length;i++)html+='<span style="background:'+BUILTIN_COLORS[i]+';color:#fff;padding:3px 8px;border-radius:6px;font-size:11px">'+BUILTIN_TYPES[i]+'</span>';
  html+='</div>';
  if(customTypes.length>0){
    html+='<div style="font-size:12px;color:var(--text3);margin-bottom:6px">自定义属性</div>';
    for(var i=0;i<customTypes.length;i++){
      var ct=customTypes[i];
      html+='<div class="custom-type-row"><div class="dot" style="background:'+ct.color+'"></div><span>'+h(ct.label)+'</span><button class="del" onclick="deleteCustomType(\''+ct.id+'\',\''+h(ct.label)+'\')">×</button></div>';
    }
  }
  if(customTypes.length===0)html+='<div style="font-size:13px;color:var(--text3);padding:8px 0">暂无自定义属性</div>';
  list.innerHTML=html;
}

// Init color picker
(function initColorPicker(){
  var html='';
  for(var i=0;i<PALETTE.length;i++){
    html+='<div class="color-dot'+(i===0?' selected':'')+'" style="background:'+PALETTE[i]+'" data-idx="'+i+'" onclick="pickColor(this,'+i+')"></div>';
  }
  document.getElementById('new-type-color').innerHTML=html;
})();
function pickColor(el,i){
  newTypeColor=PALETTE[i];
  var dots=document.querySelectorAll('#new-type-color .color-dot');
  for(var j=0;j<dots.length;j++)dots[j].classList.toggle('selected',j===i);
}

// === Settings ===
function openSettings(){
  document.getElementById('main-screen').classList.add('hidden');
  document.getElementById('settings-screen').style.display='block';
  renderCustomTypes();
}

function openChangePwdForm(){
  document.getElementById('change-pwd-section').classList.toggle('hidden');
}
async function doChangePassword(){
  var oldPwd=document.getElementById('change-old-pwd').value.trim();
  var newPwd=document.getElementById('change-new-pwd').value.trim();
  var confirmPwd=document.getElementById('change-confirm-pwd').value.trim();
  if(!oldPwd){showToast('请输入当前密码');return}
  if(!newPwd||newPwd.length<6){showToast('新密码至少6位');return}
  if(newPwd!==confirmPwd){showToast('两次输入不一致');return}
  try{
    var {error}=await sb.auth.updateUser({password:newPwd});
    if(error){showToast('修改失败: '+error.message);return}
    document.getElementById('change-old-pwd').value='';
    document.getElementById('change-new-pwd').value='';
    document.getElementById('change-confirm-pwd').value='';
    document.getElementById('change-pwd-section').classList.add('hidden');
    showToast('密码修改成功');
  }catch(e){showToast('错误: '+e.message)}
}

function closeSettings(){
  document.getElementById('settings-screen').style.display='none';
    document.getElementById('my-screen').style.display='none';
  document.getElementById('main-screen').classList.remove('hidden');
}

async function openMy(){
  document.getElementById('main-screen').classList.add('hidden');
  document.getElementById('settings-screen').style.display='none';
  document.getElementById('my-screen').style.display='block';
  // Load full profile
  var {data:profile}=await sb.from('profiles').select('*').eq('user_id',currentUser.id).single();
  if(!profile){profile={}}
  // Avatar
  var email=currentUser.email||profile.email||'-';
  document.getElementById('my-avatar').textContent=email.charAt(0).toUpperCase();
  document.getElementById('my-email').textContent=email;
  // Role
  var roleMap={'super_admin':'超级管理员','admin':'管理员','user':'普通用户'};
  var roleName=profile.role||currentUserRole||'user';
  document.getElementById('my-role').textContent=roleMap[roleName]||roleName;
  // Name
  document.getElementById('my-name').textContent=profile.display_name||'-';
  // Phone
  document.getElementById('my-phone').textContent=profile.phone||'-';
  // Company
  if(currentCompanyId){
    var {data:comp}=await sb.from('companies').select('name').eq('id',currentCompanyId).single();
    document.getElementById('my-company').textContent=comp?comp.name:'-';
  }else{
    document.getElementById('my-company').textContent='未加入公司';
  }
  // Department
  if(profile.department_id&&allDepartments.length){
    for(var i=0;i<allDepartments.length;i++){if(allDepartments[i].id===profile.department_id){document.getElementById('my-dept').textContent=allDepartments[i].name;break}}
  }else{document.getElementById('my-dept').textContent='-'}
  // Position
  document.getElementById('my-position').textContent=profile.position||'-';
  // Status
  var statusMap={active:'在职',inactive:'停用',leave:'离职'};
  var st=profile.status||'active';
  document.getElementById('my-status').textContent=statusMap[st]||st;
  // Created
  var created=currentUser.created_at||profile.created_at;
  document.getElementById('my-created').textContent=created?new Date(created).toLocaleDateString('zh-CN'):'-';
  enableMyEditing();
}

function closeMy(){
  document.getElementById('my-screen').style.display='none';
  document.getElementById('main-screen').classList.remove('hidden');
}

// === 我的页面 内联编辑 ===
function enableMyEditing(){
  var el,fields;
  var isAdmin=currentUserRole==='admin'||currentUserRole==='super_admin';
  // 人人可改
  fields=[
    {el:'my-name', col:'display_name', type:'text'},
    {el:'my-phone', col:'phone', type:'tel'}
  ];
  // 管理员可改
  if(isAdmin){
    fields.push({el:'my-position', col:'position', type:'text'});
    fields.push({el:'my-company', col:'_company_id', type:'select', opts:'companies'});
    fields.push({el:'my-dept', col:'department_id', type:'select', opts:'departments'});
    fields.push({el:'my-role', col:'role', type:'role-select'});
  }
  for(var i=0;i<fields.length;i++){
    var f=fields[i];el=document.getElementById(f.el);
    if(!el)continue;
    el.style.cursor='pointer';
    el.title='点击编辑';
    el.setAttribute('data-mf',f.col);
    el.setAttribute('data-mt',f.type);
    if(f.opts)el.setAttribute('data-mo',f.opts);
    el.onclick=startMyEdit;
  }
}
function startMyEdit(e){
  var t=e.target;
  while(t&&!t.getAttribute('data-mf'))t=t.parentNode;
  if(!t)return;
  var col=t.getAttribute('data-mf');
  var type=t.getAttribute('data-mt');
  var opt=t.getAttribute('data-mo');
  var cur=t.textContent==='-'?'':t.textContent;
  if(type==='role-select'){
    var roleMap={super_admin:'超级管理员',admin:'管理员',user:'普通用户'};
    var roles=[
      {v:'super_admin',l:'超级管理员'},
      {v:'admin',l:'管理员'},
      {v:'user',l:'普通用户'}
    ];
    var sel=document.createElement('select');
    sel.style.cssText='width:100%;padding:4px 8px;border:1px solid var(--primary);border-radius:6px;font-size:13px;outline:none;background:#fff';
    for(var i=0;i<roles.length;i++){
      sel.innerHTML+='<option value="'+roles[i].v+'"'+(roles[i].v===currentUserRole?' selected':'')+'>'+roles[i].l+'</option>';
    }
    sel.onchange=function(){
      if(sel.value===currentUserRole){t.innerHTML=roleMap[sel.value]||sel.value;recallMyEdit(t);return;}
      if(currentUserRole==='super_admin'&&sel.value!=='super_admin'){
        if(!confirm('确认将【超级管理员】改为【'+(roleMap[sel.value]||sel.value)+'】？\n\n降级后可能无法访问管理后台，需其他管理员协助恢复。')){
          sel.value=currentUserRole;
        }
      }
      saveMyField(col,sel.value,t.id);
    };
    t.innerHTML='';t.appendChild(sel);sel.focus();
  }else if(type==='select'){
    var list=opt==='companies'?allCompanies:allDepartments;
    var sel=document.createElement('select');
    sel.style.cssText='width:100%;padding:4px 8px;border:1px solid var(--primary);border-radius:6px;font-size:13px;outline:none;background:#fff';
    sel.innerHTML='<option value="">请选择</option>';
    for(var i=0;i<list.length;i++){
      sel.innerHTML+='<option value="'+list[i].id+'"'+(list[i].name===cur?' selected':'')+'>'+list[i].name+'</option>';
    }
    sel.onchange=function(){saveMyField(col,sel.value,t.id);};
    t.innerHTML='';t.appendChild(sel);sel.focus();
  }else{
    var inp=document.createElement('input');
    inp.type=type;inp.value=cur;
    inp.style.cssText='width:100%;padding:4px 8px;border:1px solid var(--primary);border-radius:6px;font-size:13px;outline:none';
    var done=function(){
      var v=inp.value.trim();
      if(v===cur){t.innerHTML=cur||'-';recallMyEdit(t);return;}
      saveMyField(col,v,t.id);
    };
    inp.onblur=done;
    inp.onkeydown=function(ev){if(ev.key==='Enter')done();if(ev.key==='Escape'){t.innerHTML=cur||'-';recallMyEdit(t);}};
    t.innerHTML='';t.appendChild(inp);inp.focus();inp.select();
  }
}
async function saveMyField(col, val, elId){
  var upd={};var isCompany=false;
  if(col==='_company_id'){
    upd.company_id=val;isCompany=true;
  }else{upd[col]=val;}
  var {error}=await sb.from('profiles').update(upd).eq('user_id',currentUser.id);
  if(error){alert('保存失败: '+error.message);return;}
  if(isCompany){
    currentCompanyId=val;
    localStorage.setItem('gr_company_id',val);
  }
  if(col==='role'){
    currentUserRole=val;
    isSuperAdmin=val==='super_admin';
  }
  openMy();
}
function recallMyEdit(el){
  el.style.cursor='pointer';
  el.title='点击编辑';
  el.onclick=startMyEdit;
}

// === Filter ===
function buildFilterSelect(){
  var html='<option value="all">全部类型</option>';
  var types=allTypes();
  for(var i=0;i<types.length;i++)html+='<option value="'+types[i]+'">'+types[i]+'</option>';
  document.getElementById('filter-select').innerHTML=html;
}
function onFilterChange(){
  currentFilter=document.getElementById('filter-select').value;
  renderList();
}

// === Type Grid ===
function buildTypeGrid(){
  var types=allTypes(),html='';
  for(var i=0;i<types.length;i++){
    html+='<div class="type-chk" id="tc-'+i+'" onclick="toggleType('+i+')">'+types[i]+'</div>';
  }
  document.getElementById('type-grid').innerHTML=html;
}
function toggleType(i){
  var el=document.getElementById('tc-'+i);
  if(!el)return;
  var types=allTypes(),label=types[i];
  document.getElementById('type-err').textContent='';
  el.classList.toggle('checked');
  if(el.classList.contains('checked')){
    if(selTypes.indexOf(label)<0)selTypes.push(label);
  }else{
    selTypes=selTypes.filter(function(t){return t!==label});
  }
}
function setSelectedTypes(types){
  selTypes=(types||[]).slice();
  var all=allTypes();
  for(var i=0;i<all.length;i++){
    var el=document.getElementById('tc-'+i);
    if(!el)continue;
    el.classList.toggle('checked',selTypes.indexOf(all[i])>=0);
  }
}
// Initial build
setTimeout(function(){buildTypeGrid()},0);

// === Parse types ===
function parseTypes(raw){
  if(!raw)return[];
  if(Array.isArray(raw))return raw;
  if(typeof raw==='string'){
    try{var p=JSON.parse(raw);if(Array.isArray(p))return p}catch(e){}
    return allTypes().indexOf(raw)>=0?[raw]:[];
  }
  return[];
}

// === Clients ===
async function doRefresh(){
  var btn=document.querySelector('.topbar-btn');btn.classList.add('refreshing');
  try{await loadClients();showToast('已刷新')}
  catch(e){showToast('刷新失败')}
  finally{setTimeout(function(){btn.classList.remove('refreshing')},300)}
}
async function loadClients(){
  var grid=document.getElementById('client-grid');
  var statsBar=document.getElementById('stats-bar');
  grid.innerHTML='<div class="loading"><span class="spinner"></span>加载中...</div>';
  statsBar.innerHTML='';
  try{
    var {data,error}=await sb.from('clients').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
    if(error){grid.innerHTML='<div class="empty"><div class="empty-icon">⚠️</div>加载失败<br><span style="font-size:12px;color:var(--text3)">'+h(error.message)+'</span></div>';statsBar.innerHTML='';return}
    allClients=data||[];
    var {data:cd}=await sb.from('contacts').select('*').eq('company_id',currentCompanyId);
    allContacts=(cd||[]);
    await loadOrders();
    checkBirthdayReminders();
    _clientOrderCache={};
    renderList();
  }catch(e){grid.innerHTML='<div class="empty"><div class="empty-icon">⚠️</div>加载失败</div>';statsBar.innerHTML=''}
}

// === Companies Directory ===
async function loadCompanies(){
  try{
    var {data}=await sb.from('companies').select('*').order('name');
    allCompanies=(data||[]);
    allCompaniesMap={};
    for(var i=0;i<allCompanies.length;i++){
      var c=allCompanies[i],key=(c.name||'').toLowerCase();
      if(key) allCompaniesMap[key]=c;
    }
    buildDirFilter();
  }catch(e){console.error('loadCompanies:',e)}
}
function buildDirFilter(){
  var cats={};
  for(var i=0;i<allCompanies.length;i++){var base=allCompanies[i].base||'未分类';cats[base]=(cats[base]||0)+1}
  var html='<option value="all">全部分类 ('+allCompanies.length+')</option>';
  var sorted=Object.keys(cats).sort(function(a,b){return cats[b]-cats[a]});
  for(var i=0;i<sorted.length;i++)html+='<option value="'+h(sorted[i])+'">'+h(sorted[i])+' ('+cats[sorted[i]]+')</option>';
  document.getElementById('dir-filter').innerHTML=html;
}
function showCompanies(){
  document.getElementById('main-screen').classList.add('hidden');
  document.getElementById('dir-screen').classList.remove('hidden');
  renderDir();
}

async function showLeads(){
  closeMoreMenu();
  document.getElementById('settings-screen').style.display='none';
  document.getElementById('my-screen').style.display='none';
  var allViews=document.querySelectorAll('#main-screen > div[id$="-view"]');
  for(var i=0;i<allViews.length;i++)allViews[i].classList.add('hidden');
  document.getElementById('home-view').classList.add('hidden');
  var lv=document.getElementById('leads-view');
  if(lv)lv.classList.remove('hidden');
  document.getElementById('topbar-title').textContent='线索公海';
  document.getElementById('main-fab').classList.add('hidden');
  await loadLeads();
}
function closeDir(){
  document.getElementById('dir-screen').classList.add('hidden');
  document.getElementById('main-screen').classList.remove('hidden');
}
function renderDir(){
  var q=(document.getElementById('dir-search').value||'').trim().toLowerCase();
  var cat=document.getElementById('dir-filter').value;
  var list=allCompanies;
  if(q) list=list.filter(function(c){return(c.name||'').toLowerCase().indexOf(q)>=0});
  if(cat!=='all') list=list.filter(function(c){return(c.base||'')===cat});
  // Stats
  var cats={},total=list.length;
  for(var i=0;i<list.length;i++){var base=list[i].base||'未分类';cats[base]=(cats[base]||0)+1}
  var sorted=Object.keys(cats).sort(function(a,b){return cats[b]-cats[a]});
  var sh='<div class="dir-stat" onclick="document.getElementById(\'dir-filter\').value=\'all\';renderDir()"><div class="ds-num">'+total+'</div><div class="ds-label">当前筛选</div></div><div class="dir-stat"><div class="ds-num">'+allCompanies.length+'</div><div class="ds-label">全库总计</div></div>';
  for(var i=0;i<Math.min(sorted.length,6);i++){
    sh+='<div class="dir-stat" onclick="document.getElementById(\'dir-filter\').value=\''+h(sorted[i]).replace(/'/g,"\\'")+'\';renderDir()"><div class="ds-num">'+cats[sorted[i]]+'</div><div class="ds-label">'+h(sorted[i])+'</div></div>';
  }
  document.getElementById('dir-stats').innerHTML=sh;
  // List
  var el=document.getElementById('dir-list'),emp=document.getElementById('dir-empty');
  if(!list.length){el.innerHTML='';emp.classList.remove('hidden');return}
  emp.classList.add('hidden');
  var html='';
  for(var i=0;i<list.length;i++){
    var c=list[i];
    var rows='';
    if(c.legal_person)rows+='<span>👔 '+h(c.legal_person)+'</span>';
    if(c.credit_code)rows+='<span>🆔 '+h(c.credit_code)+'</span>';
    if(c.reg_capital)rows+='<span>💰 '+h(c.reg_capital)+'</span>';
    if(c.reg_status)rows+='<span>📌 '+h(c.reg_status)+'</span>';
    var created=c.created_at?new Date(c.created_at).toLocaleDateString('zh-CN'):'';
    if(created)rows+='<span>📅 '+created+'</span>';
    html+='<div class="dir-item" onclick="useCompanyName(\''+h(c.name||'').replace(/'/g,"\\'")+'\')"><div class="di-name">'+h(c.name)+'</div>'+(rows?'<div class="di-row">'+rows+'</div>':'')+(c.base?'<span class="di-badge">'+h(c.base)+'</span>':'')+'</div>';
  }
  el.innerHTML=html;
}
function useCompanyName(name){
  closeDir();
  // Search in main screen for this company
  document.getElementById('search-input').value=name;
  renderList();
  // If company not in clients, open add form
  var exists=allClients.find(function(c){return c.name.toLowerCase()===name.toLowerCase()});
  if(exists) openForm(exists.id);
  else{
    document.getElementById('f-name').value=name;
    // Auto-fill from directory
    var key=name.toLowerCase();
    if(allCompaniesMap[key]) fillCompanyInfo(allCompaniesMap[key]);
  }
}
function fillCompanyInfo(comp){
  document.getElementById('ci-legal').value=comp.legal_person||'';
  document.getElementById('ci-credit').value=comp.credit_code||'';
  document.getElementById('ci-capital').value=comp.reg_capital||'';
  document.getElementById('ci-status').value=comp.reg_status||'';
  (function(){var s=document.getElementById('ci-source');if(s)s.value='来自企业名录';})();
}
function displayCompanyInfo(ci){
  document.getElementById('ci-legal').value=ci.legal_person||'';
  document.getElementById('ci-credit').value=ci.credit_code||'';
  document.getElementById('ci-capital').value=ci.reg_capital||'';
  document.getElementById('ci-status').value=ci.reg_status||'';
  (function(){var s=document.getElementById('ci-source');if(s)s.value=ci.legal_person?'已保存':'';})();
}

function renderList(){
  var q=(document.getElementById('search-input').value||'').trim().toLowerCase();
  var list=allClients;
  if(q) list=list.filter(function(c){
    var arr=[c.name,c.address,c.notes];
    if(c.project)arr.push(c.project); // legacy
    var projs2=[];
    try{projs2=JSON.parse(c.projects||'[]');if(!Array.isArray(projs2))projs2=[];}catch(e){projs2=[]}
    for(var pi=0;pi<projs2.length;pi++){
      arr.push(projs2[pi].project_name||'');
      arr.push(projs2[pi].bidder_name||'');
      arr.push(projs2[pi].bidder_company||'');
    }
    var types=parseTypes(c.type);
    arr=arr.concat(types);
    var contacts=allContacts.filter(function(co){return co.client_id===c.id});
    for(var j=0;j<contacts.length;j++){
      var co=contacts[j];
      arr.push(co.name,co.dept,co.position);
      try{var phs=JSON.parse(co.phone||'[]');if(Array.isArray(phs))arr=arr.concat(phs)}
      catch(exc){if(co.phone)arr.push(co.phone)}
    }
    return arr.some(function(v){return v&&v.toString().toLowerCase().indexOf(q)>=0});
  });
  if(currentFilter!=='all') list=list.filter(function(c){
    var types=parseTypes(c.type);
    return types.indexOf(currentFilter)>=0;
  });

  // Stats
  var statsBar=document.getElementById('stats-bar');
  var totalContacts=allContacts.length;
  var hasFilter=(currentFilter!=='all')||q;
  statsBar.innerHTML=
    '<div class="stat-card"><div class="stat-num">'+list.length+'</div><div class="stat-label">'+(hasFilter?'筛选结果':'客户总数')+'</div></div>'+(
    hasFilter?'<div class="stat-card"><div class="stat-num">'+allClients.length+'</div><div class="stat-label">全部客户</div></div>':'')+
    '<div class="stat-card"><div class="stat-num">'+totalContacts+'</div><div class="stat-label">联系人</div></div>';

  var grid=document.getElementById('client-grid'),empty=document.getElementById('empty-state');
  if(list.length===0){grid.innerHTML='';empty.classList.remove('hidden');statsBar.innerHTML=allClients.length>0?'<div class="stat-card"><div class="stat-num">0</div><div class="stat-label">筛选结果</div></div><div class="stat-card"><div class="stat-num">'+allClients.length+'</div><div class="stat-label">全部客户</div></div><div class="stat-card"><div class="stat-num">'+allContacts.length+'</div><div class="stat-label">联系人</div></div>':'<div class="stat-card"><div class="stat-num">0</div><div class="stat-label">客户总数</div></div><div class="stat-card"><div class="stat-num">0</div><div class="stat-label">联系人</div></div>'}
  else{
    empty.classList.add('hidden');
    var html='';
    for(var i=0;i<list.length;i++){
      var c=list[i],types=parseTypes(c.type);
      var date=c.bidding_date?new Date(c.bidding_date+'T00:00:00').toLocaleDateString('zh-CN'):'';
      var badges='',maxS=3;
      for(var j=0;j<types.length&&j<maxS;j++)badges+='<span class="card-type" style="background:'+tColor(types[j])+'">'+h(types[j])+'</span>';
      if(types.length>maxS)badges+='<span class="card-type-more">+'+(types.length-maxS)+'</span>';
      var contactHtml='';
      var contacts=allContacts.filter(function(co){return co.client_id===c.id});
      if(contacts.length>0){
        contactHtml+='<span class="card-contact-count">👤 '+contacts.length+'人</span>';
        var shown=Math.min(contacts.length,2);
        for(var j=0;j<shown;j++){
          var co=contacts[j],phs=[];
          try{phs=JSON.parse(co.phone||'[]');if(!Array.isArray(phs))phs=[co.phone||'']}catch(e){phs=[co.phone||'']}
          try{var lls=JSON.parse(co.landline||'[]');if(Array.isArray(lls))phs=phs.concat(lls)}catch(e){}
          phs=phs.filter(Boolean);
          for(var k=0;k<phs.length;k++){
            var pn=phs[k].replace(/\s+/g,''),isMobile=pn.match(/^1\d{10}$/);
            var href='tel:'+pn;
            contactHtml+='<a class="contact-phone-link" href="'+href+'" onclick="event.stopPropagation()"><span class="ph-icon">'+((isMobile||k<1)?'📞':'🖥')+'</span>'+h(pn)+'</a>';
          }
          // Show emails
          try{var emls=JSON.parse(co.email||'[]');if(!Array.isArray(emls))emls=[co.email||'']}catch(e){emls=[]}
          emls=emls.filter(Boolean);
          for(var ek=0;ek<Math.min(emls.length,2);ek++){
            contactHtml+='<a class="contact-phone-link" href="mailto:'+h(emls[ek])+'" onclick="event.stopPropagation()"><span class="ph-icon">📧</span>'+h(emls[ek])+'</a>';
          }
        }
        if(contacts.length>shown)contactHtml+='<span style="font-size:11px;color:var(--text3)">等'+contacts.length+'人</span>';
      }
      var gradeBadge='';if(c.grade)gradeBadge='<span class="grade-badge '+h(c.grade)+'">'+h(c.grade)+'级</span>';
      html+='<div class="client-card" onclick="openClient360(\''+c.id+'\')">'+
        (badges?'<div class="card-types">'+badges+'</div>':'')+
        '<div class="card-name">'+h(c.name)+(gradeBadge?' '+gradeBadge:'')+'</div>'+
        (c.address?'<div class="card-addr">📍 '+h(c.address)+'</div>':'')+
        (function(){
      var projs=[];
      try{projs=JSON.parse(c.projects||'[]');if(!Array.isArray(projs))projs=[];}catch(e){projs=[]}
      if(projs.length===0&&c.project)projs=[{project_name:c.project,bidding_date:c.bidding_date||''}];
      if(projs.length===0)return '';
      var tags='<div class="card-projects">';
      for(var pi=0;pi<projs.length;pi++){
        var p=projs[pi],pname=p.project_name||'',bd=p.bidder_name||'';
        tags+='<span class="card-project-tag" title="'+(bd?'中标人:'+h(bd):'')+'">📋 '+h(pname)+(bd?' · '+h(bd):'')+'</span>';
      }
      return tags+'</div>';
    })()+
        (contactHtml?'<div class="card-contact">'+contactHtml+'</div>':'');
      var osum=getClientOrderSummary(c.id);
      if(osum.count>0)html+='<div class="card-contact" style="justify-content:space-between"><span style="font-size:11px;color:var(--text3)">📦 '+osum.count+'个订单</span><span style="font-size:12px;color:var(--primary);font-weight:600">'+formatMoney(osum.total)+'</span></div>';
      html+='</div>';
    }
    grid.innerHTML=html;
  }
}

// === Contacts Form ===
function refCt(){
  var c=document.getElementById('contacts-container');
  if(formContacts.length===0){c.innerHTML='<div class="empty" style="padding:20px">暂无联系人，点击「＋ 添加」</div>';return}
  var html='';
  for(var i=0;i<formContacts.length;i++){
    var co=formContacts[i],phones=co.phones||[],landlines=co.landlines||[];
    if(!phones.length)phones=[''];
    var ph='';
    for(var p=0;p<phones.length;p++)ph+='<div class="phone-row"><input type="tel" value="'+h(phones[p]||'')+'" oninput="upCtPh('+i+','+p+',this.value)" placeholder="手机号">'+(phones.length>1?'<button class="rm-phone" onclick="rmPh('+i+','+p+')">✕</button>':'')+'</div>';
    ph+='<button class="add-phone-btn" onclick="addPh('+i+')">＋ 添加手机</button>';
    var emails=co.emails||[];
    if(!emails.length)emails=[''];
    if(!landlines.length)landlines=[''];
    var ll='';
    var em='';
    for(var l=0;l<landlines.length;l++)ll+='<div class="phone-row"><input type="text" value="'+h(landlines[l]||'')+'" oninput="upCtLl('+i+','+l+',this.value)" placeholder="座机号">'+(landlines.length>1?'<button class="rm-phone" onclick="rmLl('+i+','+l+')">✕</button>':'')+'</div>';
    ll+='<button class="add-phone-btn" onclick="addLl('+i+')">＋ 添加座机</button>';
    for(var e=0;e<emails.length;e++)em+='<div class="phone-row"><input type="email" value="'+h(emails[e]||'')+'" oninput="upCtEm('+i+','+e+',this.value)" placeholder="邮箱">'+(emails.length>1?'<button class="rm-phone" onclick="rmEm('+i+','+e+')">✕</button>':'')+'</div>';
    em+='<button class="add-phone-btn" onclick="addEm('+i+')">＋ 添加邮箱</button>';
    html+='<div class="contact-item">\
      <button class="del-btn" onclick="rmCt('+i+')">✕</button>'+
      '<button class="mv-btn" onclick="openMoveModal('+i+')">转移</button>'+
      '<div class="contact-header">🧑 联系人 #'+(i+1)+'</div>\
      <div class="form-row">\
        <div class="form-group"><label>姓名</label><input value="'+h(co.name||'')+'" oninput="upCt('+i+',\'name\',this.value)" placeholder="联系人姓名"></div>\
        <div class="form-group"><label>部门</label><input value="'+h(co.dept||'')+'" oninput="upCt('+i+',\'dept\',this.value)" placeholder="所属部门"></div>\
      </div>\
      <div class="form-row">\
        <div class="form-group"><label>职务</label><input value="'+h(co.position||'')+'" oninput="upCt('+i+',\'position\',this.value)" placeholder="职位"></div>\
        <div class="form-group"><label>办公室房号</label><input value="'+h(co.room||'')+'" oninput="upCt('+i+',\'room\',this.value)" placeholder="办公室房号"></div>\
      </div>\
      <div class="form-group"><label>手机</label>'+ph+'</div>\
      <div class="form-group"><label>座机</label>'+ll+'</div>\
      <div class="form-group"><label>邮箱</label>'+em+'</div>\
    </div>';
  }
  c.innerHTML=html;
  var pis=c.querySelectorAll('.phone-row input[type="tel"]');
  for(var j=0;j<pis.length;j++)pis[j].addEventListener('input',function(){this.value=this.value.replace(/\s+/g,'')});
}
// global helpers for onclick
var addContact=function(){formContacts.push({id:'t'+Date.now()+Math.random().toString(36).slice(2,6),name:'',dept:'',position:'',phones:[''],landlines:[''],emails:[''],room:'',_new:true});refCt()};
var rmCt=function(i){formContacts.splice(i,1);refCt()};
var upCt=function(i,f,v){if(i>=0&&i<formContacts.length)formContacts[i][f]=v};
var upCtPh=function(i,p,v){if(formContacts[i]&&formContacts[i].phones)formContacts[i].phones[p]=(v||'').replace(/\s+/g,'')};
var addPh=function(i){if(!formContacts[i].phones)formContacts[i].phones=[];formContacts[i].phones.push('');refCt()};
var rmPh=function(i,p){formContacts[i].phones.splice(p,1);if(!formContacts[i].phones.length)formContacts[i].phones=[''];refCt()};
var addLl=function(i){if(!formContacts[i].landlines)formContacts[i].landlines=[];formContacts[i].landlines.push('');refCt()};
var rmLl=function(i,l){formContacts[i].landlines.splice(l,1);if(!formContacts[i].landlines.length)formContacts[i].landlines=[''];refCt()};
var upCtLl=function(i,l,v){if(formContacts[i]&&formContacts[i].landlines)formContacts[i].landlines[l]=(v||'').replace(/\s+/g,'')};
var addEm=function(i){if(!formContacts[i].emails)formContacts[i].emails=[];formContacts[i].emails.push('');refCt()};
var rmEm=function(i,e){formContacts[i].emails.splice(e,1);if(!formContacts[i].emails.length)formContacts[i].emails=[''];refCt()};
var upCtEm=function(i,e,v){if(formContacts[i]&&formContacts[i].emails)formContacts[i].emails[e]=(v||'').trim()};

async function openForm(id){
  editId=id||null;
  document.getElementById('form-title').textContent=id?'编辑客户':'添加客户';
  document.getElementById('btn-delete').classList.toggle('hidden',!id);
  document.getElementById('type-err').textContent='';
  document.getElementById('f-name').value='';
  document.getElementById('f-address').value='';formProjects=[];document.getElementById('project-list').innerHTML='';
  document.getElementById('f-notes').value='';
  formContacts=[];

  if(id){
    var c=allClients.find(function(x){return x.id===id});
    if(c){
      document.getElementById('f-name').value=c.name||'';
      // Load projects (multi-project format, fallback to legacy)
      var projs=[];
      try{projs=JSON.parse(c.projects||'[]');if(!Array.isArray(projs))projs=[];}catch(e){projs=[]}
      if(projs.length===0&&(c.project||c.bidding_date)){
        projs=[{project_name:c.project||'',bidding_date:c.bidding_date||'',bidder_name:'',bidder_phone:'',bidder_company:'',bid_amount:''}];
      }
      formProjects=projs;
      for(var pi=0;pi<projs.length;pi++)addProjectEntry(projs[pi]);
      document.getElementById('f-address').value=c.address||'';
      document.getElementById('f-notes').value=c.notes||'';
      setSelectedTypes(parseTypes(c.type));
      // Load new fields
      var fIndustry=document.getElementById('f-industry');if(fIndustry)fIndustry.value=c.industry||'';
      var fScale=document.getElementById('f-scale');if(fScale)fScale.value=c.scale||'';
      var fSource=document.getElementById('f-source');if(fSource)fSource.value=c.source||'';
      var fCredit=document.getElementById('f-credit-rating');if(fCredit)fCredit.value=c.credit_rating||'';
      var fGrade=document.getElementById('f-grade');if(fGrade)fGrade.value=c.grade||'';updateGradeSelect(c.grade||'');
      var fLifecycle=document.getElementById('f-lifecycle-stage');if(fLifecycle)fLifecycle.value=c.lifecycle_stage||'prospect';
      // Load tags
      try{clientTags=JSON.parse(c.tags||'[]');if(!Array.isArray(clientTags))clientTags=[]}catch(e){clientTags=[]}
      renderClientTags();
      // Load attachments
      try{clientAttachments=JSON.parse(c.attachments||'[]');if(!Array.isArray(clientAttachments))clientAttachments=[]}catch(e){clientAttachments=[]}
      renderClientAttachments();
      // Load company_info
      var ciStr=c.company_info||'{}';
      try{var ci=JSON.parse(ciStr);displayCompanyInfo(ci);}
      catch(e){displayCompanyInfo({});}
    }else{
      setSelectedTypes([]);
    }
    var {data}=await sb.from('contacts').select('*').eq('client_id',id).order('created_at',{ascending:true});
    if(data&&data.length>0){
      for(var i=0;i<data.length;i++){
        var co=data[i],phones=[],landlines=[];
        try{phones=JSON.parse(co.phone||'[]');if(!Array.isArray(phones))phones=co.phone?[co.phone]:['']}
        catch(e){phones=co.phone?[co.phone]:['']}
        if(!phones.length)phones=[''];
        try{landlines=JSON.parse(co.landline||'[]');if(!Array.isArray(landlines))landlines=co.landline?[co.landline]:['']}
        catch(e){landlines=co.landline?[co.landline]:['']}
        if(!landlines.length)landlines=[''];
        var emails=[];
        try{emails=JSON.parse(co.email||'[]');if(!Array.isArray(emails))emails=co.email?[co.email]:['']}
        catch(e){emails=co.email?[co.email]:['']}
        if(!emails.length)emails=[''];
        co.phones=phones;co.landlines=landlines;co.emails=emails;formContacts.push(co);
      }
    }
  }else{
    setSelectedTypes([]);
    displayCompanyInfo({});
    clientTags=[];clientAttachments=[];renderClientTags();renderClientAttachments();
    var fIndustry=document.getElementById('f-industry');if(fIndustry)fIndustry.value='';
    var fScale=document.getElementById('f-scale');if(fScale)fScale.value='';
    var fSource=document.getElementById('f-source');if(fSource)fSource.value='';
    var fCredit=document.getElementById('f-credit-rating');if(fCredit)fCredit.value='';
    var fGrade=document.getElementById('f-grade');if(fGrade)fGrade.value='';updateGradeSelect('');
    var fLifecycle=document.getElementById('f-lifecycle-stage');if(fLifecycle)fLifecycle.value='prospect';
  }
  refCt();
  document.getElementById('form-modal').classList.remove('hidden');
}
function closeForm(){document.getElementById('form-modal').classList.add('hidden');editId=null;formContacts=[];selTypes=[]}

// === Contact Move ===
function openMoveModal(idx){
  moveContactIdx=idx;moveContactObj=formContacts[idx];
  document.getElementById('move-modal').classList.remove('hidden');
  searchMoveTarget();
}
function closeMoveModal(){document.getElementById('move-modal').classList.add('hidden');moveContactIdx=-1;moveContactObj=null}
function searchMoveTarget(){
  var q=(document.getElementById('move-search').value||'').trim().toLowerCase();
  var list=editId?allClients.filter(function(c){return c.id!==editId}):allClients;
  if(q) list=list.filter(function(c){return(c.name||'').toLowerCase().indexOf(q)>=0});
  var container=document.getElementById('move-list'),html='';
  if(list.length===0)html='<div class="empty">无匹配客户</div>';
  else{
    for(var i=0;i<list.length;i++){
      html+='<div class="search-list-item" onclick="doMove(\''+list[i].id+'\',\''+h(list[i].name||'').replace(/'/g,"\\'")+'\')"><div class="name">'+h(list[i].name)+'</div><div class="cnt">'+(list[i].contact_count||0)+'个联系人</div></div>';
    }
  }
  container.innerHTML=html;
}
async function doMove(targetId,targetName){
  if(moveContactIdx<0)return;
  var co=moveContactObj;
  if(!co._new&&co.id){
    var {error}=await sb.from('contacts').update({client_id:targetId}).eq('id',co.id);
    if(error){showToast('转移失败');return}
  }
  // Remove from current form
  formContacts.splice(moveContactIdx,1);
  refCt();
  // Update contact counts
  await updateContactCount(targetId);
  if(editId) await updateContactCount(editId);
  showToast('已转移到「'+targetName+'」');
  closeMoveModal();
  loadClients();
}
async function updateContactCount(clientId){
  var {count,error}=await sb.from('contacts').select('*',{count:'exact',head:true}).eq('client_id',clientId);
  if(!error) await sb.from('clients').update({contact_count:count||0}).eq('id',clientId);
}

// === Save ===

var formProjects=[];
function addProjectEntry(prefill){
  prefill=prefill||{};
  var list=document.getElementById('project-list');
  var idx=list.children.length+1;
  var div=document.createElement('div');
  div.className='project-entry';
  div.innerHTML=
    '<div class="pe-header"><span class="pe-num">项目 '+idx+'</span><button type="button" class="pe-remove" onclick="removeProjectEntry(this)">×</button></div>'+
    '<div class="form-row">'+
      '<div class="form-group"><label>项目名称</label><input class="pe-project" placeholder="项目名称" value="'+h(prefill.project_name||'')+'"></div>'+
      '<div class="form-group"><label>招标日期</label><input type="date" class="pe-bidding-date" value="'+(prefill.bidding_date||'')+'"></div>'+
    '</div>'+
    '<div class="form-row">'+
      '<div class="form-group"><label>中标人</label><input class="pe-bidder" placeholder="中标人姓名" value="'+h(prefill.bidder_name||'')+'"></div>'+
      '<div class="form-group"><label>中标人电话</label><input class="pe-bidder-phone" placeholder="联系电话" value="'+h(prefill.bidder_phone||'')+'"></div>'+
    '</div>'+
    '<div class="form-row">'+
      '<div class="form-group"><label>中标公司</label><input class="pe-bidder-company" placeholder="中标公司" value="'+h(prefill.bidder_company||'')+'"></div>'+
      '<div class="form-group"><label>中标金额</label><input class="pe-bid-amount" placeholder="中标金额" value="'+h(prefill.bid_amount||'')+'"></div>'+
    '</div>';
  list.appendChild(div);
  renumberProjects();
}
function removeProjectEntry(btn){
  var entry=btn.closest('.project-entry');
  if(entry)entry.remove();
  renumberProjects();
}
function renumberProjects(){
  var entries=document.querySelectorAll('#project-list .project-entry');
  for(var i=0;i<entries.length;i++)entries[i].querySelector('.pe-num').textContent='项目 '+(i+1);
}

async function saveClient(){
  if(!selTypes.length){document.getElementById('type-err').textContent='请选择至少一个客户属性';setTimeout(function(){document.getElementById('type-err').textContent=''},3000);return}
  var name=document.getElementById('f-name').value.trim();
  if(!name){showToast('请输入客户名称');return}
  // Company name uniqueness check
  var dup=allClients.filter(function(c){return c.name.toLowerCase()===name.toLowerCase()&&c.id!==editId});
  if(dup.length>0){showToast('客户名称「'+name+'」已存在');return}

  // Phone uniqueness check
  var phonesToCheck=[];
  for(var i=0;i<formContacts.length;i++){
    var phs=formContacts[i].phones||[''];
    for(var p=0;p<phs.length;p++){var ph=phs[p].trim();if(ph)phonesToCheck.push(ph)}
  }
  if(phonesToCheck.length>0){
    var others=editId?allContacts.filter(function(c){return c.client_id!==editId}):allContacts;
    for(var j=0;j<others.length;j++){
      var eps=[];
      try{eps=JSON.parse(others[j].phone||'[]')}catch(e){eps=others[j].phone?[String(others[j].phone)]:[]}
      if(!Array.isArray(eps))eps=eps?[String(eps)]:[];
      for(var k=0;k<eps.length;k++){
        var ep=(eps[k]||'').trim();
        if(ep&&phonesToCheck.indexOf(ep)>=0){showToast('手机号 '+ep+' 已被其他联系人使用');return}
      }
    }
  }

  // Landline uniqueness check: one landline → one company, but can be shared by contacts within same company
  var landlinesToCheck=[];
  for(var i=0;i<formContacts.length;i++){
    var lls=formContacts[i].landlines||[''];
    for(var l=0;l<lls.length;l++){var ll=lls[l].trim();if(ll)landlinesToCheck.push(ll)}
  }
  if(landlinesToCheck.length>0){
    var otherContacts=editId?allContacts.filter(function(c){return c.client_id!==editId}):allContacts;
    for(var j=0;j<otherContacts.length;j++){
      var els=[];
      try{els=JSON.parse(otherContacts[j].landline||'[]')}catch(e){els=otherContacts[j].landline?[String(otherContacts[j].landline)]:[]}
      if(!Array.isArray(els))els=els?[String(els)]:[];
      for(var k=0;k<els.length;k++){
        var el=(els[k]||'').trim();
        if(el&&landlinesToCheck.indexOf(el)>=0){showToast('座机 '+el+' 已被其他公司使用');return}
      }
    }
  }

  // Email uniqueness check
  var emailsToCheck=[];
  for(var i=0;i<formContacts.length;i++){
    var ems=formContacts[i].emails||[''];
    for(var e=0;e<ems.length;e++){var em=ems[e].trim();if(em)emailsToCheck.push(em.toLowerCase())}
  }
  if(emailsToCheck.length>0){
    var otherContacts2=editId?allContacts.filter(function(c){return c.client_id!==editId}):allContacts;
    for(var j=0;j<otherContacts2.length;j++){
      var eems=[];
      try{eems=JSON.parse(otherContacts2[j].email||'[]')}catch(e){eems=otherContacts2[j].email?[String(otherContacts2[j].email)]:[]}
      if(!Array.isArray(eems))eems=eems?[String(eems)]:[];
      for(var k=0;k<eems.length;k++){
        var em2=(eems[k]||'').trim().toLowerCase();
        if(em2&&emailsToCheck.indexOf(em2)>=0){showToast('邮箱 '+eems[k]+' 已被其他联系人使用');return}
      }
    }
  }

  // Build company_info from form
  var ci={};
  var v=document.getElementById('ci-legal').value; if(v)ci.legal_person=v;
  v=document.getElementById('ci-credit').value; if(v)ci.credit_code=v;
  v=document.getElementById('ci-capital').value; if(v)ci.reg_capital=v;
  v=document.getElementById('ci-status').value; if(v)ci.reg_status=v;

  // Build projects array from form
  var projectsArr=[];
  var entries=document.querySelectorAll('#project-list .project-entry');
  for(var ei=0;ei<entries.length;ei++){
    var e=entries[ei];
    var pn=(e.querySelector('.pe-project')||{}).value||'';
    var pd=(e.querySelector('.pe-bidding-date')||{}).value||null;
    var pb=(e.querySelector('.pe-bidder')||{}).value||'';
    var pbp=(e.querySelector('.pe-bidder-phone')||{}).value||'';
    var pbc=(e.querySelector('.pe-bidder-company')||{}).value||'';
    var pba=(e.querySelector('.pe-bid-amount')||{}).value||'';
    if(pn||pb)projectsArr.push({project_name:pn,bidding_date:pd,bidder_name:pb,bidder_phone:pbp,bidder_company:pbc,bid_amount:pba});
  }
  var fp=projectsArr.length>0?projectsArr[0].project_name:'';
  // Collect new fields
  var fIndustry=document.getElementById('f-industry');
  var fScale=document.getElementById('f-scale');
  var fSource=document.getElementById('f-source');
  var fCredit=document.getElementById('f-credit-rating');
  var fGrade=document.getElementById('f-grade');
  var client={
    type:JSON.stringify(selTypes),
    name:name,
    project:fp,
    bidding_date:projectsArr.length>0?projectsArr[0].bidding_date:null,
    address:document.getElementById('f-address').value.trim(),
    notes:document.getElementById('f-notes').value.trim(),
    industry:fIndustry?fIndustry.value:'',
    scale:fScale?fScale.value:'',
    source:fSource?fSource.value:'',
    credit_rating:fCredit?fCredit.value:'',
    grade:fGrade?fGrade.value:'',
    lifecycle_stage:(function(){var ls=document.getElementById('f-lifecycle-stage');return ls?ls.value:'prospect'})(),
    tags:JSON.stringify(clientTags||[]),
    attachments:JSON.stringify(clientAttachments||[]),
    company_info:JSON.stringify(ci),
    contact_count:formContacts.length,
    projects:JSON.stringify(projectsArr),
    updated_at:new Date().toISOString()
  };

  var clientId=editId;
  if(!editId){
    client.user_id=currentUser.id;
    client.company_id=currentCompanyId;
    var {data:nd,error}=await sb.from('clients').insert(client).select('id');
    if(error){showToast('添加失败: '+error.message);return}
    clientId=nd[0].id;
  }else{
    client.company_id=currentCompanyId;
    var{error}=await sb.from('clients').update(client).eq('id',editId);
    if(error){showToast('更新失败: '+error.message);return}
  }

  // Sync contacts
  var existingIds=[];
  if(editId){var {data:oc}=await sb.from('contacts').select('id').eq('client_id',editId);existingIds=(oc||[]).map(function(x){return x.id})}

  var savedIds=[];
  for(var i=0;i<formContacts.length;i++){
    var co=formContacts[i],phones=co.phones||[''],landlines=co.landlines||[''],emails=co.emails||[''];
    phones=phones.filter(function(p){return p.trim()});
    landlines=landlines.filter(function(l){return l.trim()});
    emails=emails.filter(function(e){return e.trim()});
    console.log('save contact',i,co.name,co._new,phones,landlines);
    var cd={
      client_id:clientId,
      name:co.name||'',dept:co.dept||'',position:co.position||'',
      phone:JSON.stringify(phones.length?phones:['']),room:co.room||'',email:JSON.stringify(emails.length?emails:[''])
    };
    if(co._new)cd.user_id=currentUser.id;
    if(landlines.length>0)cd.landline=JSON.stringify(landlines);
    console.log('save cd',i,cd);
    if(co._new){
      cd.company_id=currentCompanyId;
      var {data:nc,error}=await sb.from('contacts').insert(cd).select('id');
      if(error){showToast('新增联系人失败: '+error.message);console.error('contact insert:',error);return}
      if(nc&&nc.length) savedIds.push(nc[0].id); else {showToast('新增联系人异常(无返回ID)');console.error('contact insert empty data:',nc);return}
    }else{
      cd.client_id=clientId; // ensure contact stays with this client
      var {error:upErr}=await sb.from('contacts').update(cd).eq('id',co.id);
      if(upErr){showToast('更新联系人失败: '+upErr.message);console.error('contact update:',upErr,'id:',co.id);return}
      savedIds.push(co.id);
    }
  }

  var toDel=existingIds.filter(function(id){return savedIds.indexOf(id)<0});
  for(var j=0;j<toDel.length;j++){
    var {error:delErr}=await sb.from('contacts').delete().eq('id',toDel[j]);
    if(delErr){console.error('contact delete:',delErr,'id:',toDel[j]);}
  }

  closeForm();
  loadClients();
  showToast(editId?'已更新':'已添加');
}

// === Delete ===
function confirmDelete(){deleteId=editId;document.getElementById('confirm-msg').textContent='确定要删除该客户及所有联系人吗？';document.getElementById('confirm-ok-btn').onclick=doDelete;document.getElementById('confirm-dialog').classList.remove('hidden')}
var _confirmCallback=null,_confirmResolve=null;
function confirmDialog(msg,cb){document.getElementById("confirm-msg").textContent=msg;_confirmCallback=cb;return new Promise(function(resolve){_confirmResolve=resolve;document.getElementById("confirm-ok-btn").onclick=function(){if(_confirmCallback)_confirmCallback();document.getElementById("confirm-dialog").classList.add("hidden");_confirmCallback=null;_confirmResolve=null;resolve(true)};document.getElementById("confirm-dialog").classList.remove("hidden")})}
function cancelConfirmDialog(){document.getElementById('confirm-dialog').classList.add('hidden');deleteId=null;if(_confirmResolve){_confirmResolve(false);_confirmResolve=null}_confirmCallback=null}
async function doDelete(){
  if(!deleteId)return;
  await sb.from('contacts').delete().eq('client_id',deleteId);
  var {error}=await sb.from('clients').delete().eq('id',deleteId);
  document.getElementById('confirm-dialog').classList.add('hidden');
  closeForm();deleteId=null;
  if(error){showToast('删除失败');return}
  loadClients();showToast('已删除');
}

// === Import/Export ===
function doExport(){
  sb.from('clients').select('*').order('created_at').then(function(r1){
    sb.from('contacts').select('*').order('created_at').then(function(r2){
      var wb=XLSX.utils.book_new();

      var clients=r1.data||[],contacts=r2.data||[];
      var crows=[["名称","属性","项目","招标日期","地址","备注","联系人数"]];
      for(var i=0;i<clients.length;i++){
        var c=clients[i],types=parseTypes(c.type).join('、');
        crows.push([c.name||'',types,c.project||'',c.bidding_date||'',c.address||'',c.notes||'',c.contact_count||0]);
      }
      var cs=XLSX.utils.aoa_to_sheet(crows);
      cs['!cols']=[{wch:30},{wch:25},{wch:20},{wch:12},{wch:30},{wch:30},{wch:10}];
      XLSX.utils.book_append_sheet(wb,cs,'客户');

      var prows=[["客户名称","姓名","部门","职务","电话","邮箱","办公室房号"]];
      for(var i=0;i<contacts.length;i++){
        var co=contacts[i];
        var cn='';for(var j=0;j<clients.length;j++){if(clients[j].id===co.client_id){cn=clients[j].name;break}}
        var phones=[];try{phones=JSON.parse(co.phone||'[]');if(!Array.isArray(phones))phones=[co.phone||'']}catch(e){phones=[co.phone||'']}
        var emailsExp=[];try{emailsExp=JSON.parse(co.email||'[]');if(!Array.isArray(emailsExp))emailsExp=co.email?[co.email]:['']}catch(e){emailsExp=[]}
        prows.push([cn,co.name||'',co.dept||'',co.position||'',phones.join(' / '),emailsExp.join(' / '),co.room||'']);
      }
      var ps=XLSX.utils.aoa_to_sheet(prows);
      ps['!cols']=[{wch:30},{wch:12},{wch:14},{wch:14},{wch:25},{wch:22},{wch:12}];
      XLSX.utils.book_append_sheet(wb,ps,'联系人');

      XLSX.writeFile(wb,'crm-export-'+new Date().toISOString().slice(0,10)+'.xlsx');
      showToast('导出成功');
    }).catch(function(){showToast('导出失败')});
  }).catch(function(){showToast('导出失败')});
}

function handleImport(input){
  var f=input.files[0];if(!f)return;
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'});
      var clients=[],contacts=[];

      var cs=wb.Sheets['客户']||wb.Sheets[wb.SheetNames[0]];
      if(!cs){showToast('未找到「客户」工作表');return}
      var cdata=XLSX.utils.sheet_to_json(cs,{header:1});
      if(cdata.length<2){showToast('客户表无数据');return}
      for(var i=1;i<cdata.length;i++){
        var row=cdata[i];
        if(!row[0]||!String(row[0]).trim())continue;
        var typesStr=String(row[1]||'').trim();
        var types=typesStr?typesStr.split(/[、,，\/]/).map(function(t){return t.trim()}).filter(Boolean):[];
        clients.push({
          name:String(row[0]).trim(),type:JSON.stringify(types),
          project:String(row[2]||'').trim(),bidding_date:String(row[3]||'').trim(),
          address:String(row[4]||'').trim(),notes:String(row[5]||'').trim(),
          contact_count:parseInt(row[6])||0
        });
      }

      var ps=wb.Sheets['联系人']||null;
      if(ps){
        var pdata=XLSX.utils.sheet_to_json(ps,{header:1});
        for(var i=1;i<pdata.length;i++){
          var row=pdata[i],cn=String(row[0]||'').trim();
          if(!cn)continue;
          var phones=String(row[4]||'').trim().replace(/\s+/g,'');
          var phoneArr=phones?phones.split(/[\/、,，]/).map(function(p){return p.trim()}).filter(Boolean):[''];
          var importEmails=String(row[5]||'').trim();
          var emailArr=importEmails?importEmails.split(/[\/、,，]/).map(function(e){return e.trim()}).filter(Boolean):[''];
          contacts.push({
            _clientName:cn,name:String(row[1]||'').trim(),
            dept:String(row[2]||'').trim(),position:String(row[3]||'').trim(),
            phone:JSON.stringify(phoneArr),email:JSON.stringify(emailArr),room:String(row[6]||'').trim()
          });
        }
      }

      pendingImport={clients:clients,contacts:contacts};
      document.getElementById('import-summary').textContent='将导入 '+clients.length+' 个客户、'+contacts.length+' 个联系人（同名客户会跳过）';
      document.getElementById('import-preview').classList.remove('hidden');
    }catch(err){showToast('文件解析失败: '+err.message)}
  };
  reader.readAsArrayBuffer(f);
}
function cancelImport(){pendingImport=null;document.getElementById('import-preview').classList.add('hidden');document.getElementById('import-file').value=''}

async function confirmImport(){
  if(!pendingImport)return;
  var nameExists={},added=0,skipped=0,nameToNewId={};
  for(var i=0;i<allClients.length;i++)nameExists[allClients[i].name]=true;

  for(var i=0;i<pendingImport.clients.length;i++){
    var c=pendingImport.clients[i];
    if(!c.name)continue;
    if(nameExists[c.name]){skipped++;continue}
    c.user_id=currentUser.id;c.updated_at=new Date().toISOString();
    c.company_id=currentCompanyId;
    var{data:nd,error}=await sb.from('clients').insert(c).select('id');
    if(nd&&nd.length){nameToNewId[c.name]=nd[0].id;nameExists[c.name]=true;added++}
  }

  var contactAdded=0;
  for(var i=0;i<pendingImport.contacts.length;i++){
    var co=pendingImport.contacts[i];
    if(!co._clientName||!co.name)continue;
    var newId=nameToNewId[co._clientName];
    if(!newId)continue;
    delete co._clientName;
    co.user_id=currentUser.id;co.client_id=newId;
    co.company_id=currentCompanyId;
    var{error}=await sb.from('contacts').insert(co);
    if(!error)contactAdded++;
  }

  cancelImport();
  loadClients();
  showToast('导入了 '+added+' 个客户 + '+contactAdded+' 个联系人，跳过 '+skipped+' 个已存在');
}


// === Crypto helpers (AES-GCM for amount encryption) ===
var _cryptoKey=null;
async function getCryptoKey(){
  if(_cryptoKey)return _cryptoKey;
  try{
    var enc=new TextEncoder();
    var km=await crypto.subtle.importKey('raw',enc.encode((currentUser?currentUser.id:'default')+'-crm-order-key-2026'),'PBKDF2',false,['deriveKey']);
    _cryptoKey=await crypto.subtle.deriveKey({name:'PBKDF2',salt:enc.encode('order-amount-salt'),iterations:100000,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }catch(e){_cryptoKey=null}
  return _cryptoKey;
}
async function encryptAmount(amountStr){
  try{
    var key=await getCryptoKey();if(!key)return amountStr;
    var iv=crypto.getRandomValues(new Uint8Array(12));
    var ct=await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},key,new TextEncoder().encode(amountStr));
    var combined=new Uint8Array(iv.length+ct.byteLength);
    combined.set(iv);combined.set(new Uint8Array(ct),iv.length);
    var bin='';for(var i=0;i<combined.length;i++)bin+=String.fromCharCode(combined[i]);
    return btoa(bin);
  }catch(e){console.error('encrypt error:',e);return amountStr}
}
async function decryptAmount(encStr){
  try{
    if(!encStr||encStr.indexOf('.')>=0)return encStr;
    var key=await getCryptoKey();if(!key)return encStr;
    var bin=atob(encStr);var data=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++)data[i]=bin.charCodeAt(i);
    var iv=data.slice(0,12),ct=data.slice(12);
    var dec=await crypto.subtle.decrypt({name:'AES-GCM',iv:iv},key,ct);
    return new TextDecoder().decode(dec);
  }catch(e){return encStr}
}

// === Order State ===
var allOrders=[],orderEditId=null,orderDeleteId=null;
var orderStage='谈判中',orderClientId=null,orderClientName='';
var ORDER_STAGES=['谈判中','已签约','执行中','已完成','已取消'];

function stageClass(stage){
  switch(stage){
    case '已签约':return 'stage-signed';
    case '执行中':return 'stage-executing';
    case '已完成':return 'stage-completed';
    case '已取消':return 'stage-cancelled';
    default:return 'stage-negotiating';
  }
}

function stageColor(stage){
  switch(stage){
    case '谈判中':return '#F59E0B';
    case '已签约':return '#3B82F6';
    case '执行中':return '#10B981';
    case '已完成':return '#8B5CF6';
    case '已取消':return '#EF4444';
    default:return '#999';
  }
}

// === Tab Switching ===
function loadHomeDashboard(){
  var now=new Date();
  var mStart=new Date(now.getFullYear(),now.getMonth(),1).toISOString();
  sb.from('clients').select('id',{count:'exact',head:true}).eq('company_id',currentCompanyId).then(function(r){
    document.getElementById('dash-client-count').textContent=r.count||0;
  }).catch(function(){document.getElementById('dash-client-count').textContent='-';});
  sb.from('orders').select('id',{count:'exact',head:true}).eq('company_id',currentCompanyId).gte('created_at',mStart).then(function(r){
    document.getElementById('dash-order-count').textContent=r.count||0;
  }).catch(function(){document.getElementById('dash-order-count').textContent='-';});
  sb.from('orders').select('amount').eq('company_id',currentCompanyId).gte('created_at',mStart).not('stage','eq','已取消').then(function(r){
    var sum=0;if(r.data)for(var i=0;i<r.data.length;i++)sum+=parseFloat(r.data[i].amount)||0;
    document.getElementById('dash-revenue').textContent='¥'+sum.toLocaleString('zh-CN',{minimumFractionDigits:0,maximumFractionDigits:0});
  }).catch(function(){document.getElementById('dash-revenue').textContent='-';});
  sb.from('lead_pool').select('id',{count:'exact',head:true}).eq('company_id',currentCompanyId).in('status',['new','assigned','contacted']).then(function(r){
    document.getElementById('dash-leads-count').textContent=r.count||0;
  }).catch(function(){document.getElementById('dash-leads-count').textContent='-';});
  var ovEl=document.getElementById('dash-sales-overview');
  sb.from('orders').select('stage,amount').eq('company_id',currentCompanyId).gte('created_at',mStart).then(function(r){
    if(!r.data||!r.data.length){ovEl.innerHTML='<div class="empty-state">本月暂无订单</div>';return}
    var stages={};var total=0;
    for(var i=0;i<r.data.length;i++){var s=r.data[i].stage||'未知';var a=parseFloat(r.data[i].amount)||0;stages[s]=(stages[s]||0)+a;total+=a}
    var colors={'谈判中':'#F59E0B','已签约':'#3B82F6','执行中':'#8B5CF6','已完成':'#10B981','已取消':'#EF4444'};
    var h='<div class="stage-bars">';
    var order=['谈判中','已签约','执行中','已完成','已取消'];
    for(var j=0;j<order.length;j++){var s=order[j];var v=stages[s]||0;var pct=total>0?Math.round(v/total*100):0;
      h+='<div class="stage-bar-row"><span class="stage-bar-label">'+s+'</span><div class="stage-bar-track"><div class="stage-bar-fill" style="width:'+pct+'%;background:'+(colors[s]||'#999')+'"></div></div><span class="stage-bar-val">¥'+v.toLocaleString('zh-CN',{minimumFractionDigits:0,maximumFractionDigits:0})+'</span></div>';
    }
    h+='</div>';ovEl.innerHTML=h;
    document.getElementById('dash-revenue').textContent='¥'+total.toLocaleString('zh-CN',{minimumFractionDigits:0,maximumFractionDigits:0});
  }).catch(function(){ovEl.innerHTML='<div class="empty-state">加载失败</div>';});
  var remEl=document.getElementById('dash-reminders');
  sb.from('contracts').select('id,title,next_reminder_date,unpaid_amount,customer_name').eq('company_id',currentCompanyId).not('archive_status','eq','archived').order('next_reminder_date',{ascending:true}).limit(5).then(function(r){
    var today=now.toISOString().slice(0,10);
    if(!r.data||!r.data.length){remEl.innerHTML='<div class="empty-state">🎉 暂无待处理提醒</div>';return}
    var hasReminder=false;
    var h='<div class="reminder-list">';
    for(var i=0;i<r.data.length;i++){
      var c=r.data[i];
      if(!c.next_reminder_date)continue;
      hasReminder=true;
      var d=new Date(c.next_reminder_date);var isOver=c.next_reminder_date<today;
      h+='<div class="reminder-item'+(isOver?' reminder-overdue':'')+'"><span class="reminder-icon">'+(isOver?'🔴':'🟡')+'</span><div class="reminder-info"><span class="reminder-title">'+escHtml(c.title||'合同#'+c.id)+'</span><span class="reminder-detail">'+escHtml(c.customer_name||'')+(c.unpaid_amount?' · ¥'+c.unpaid_amount.toLocaleString('zh-CN'):'')+'</span></div><span class="reminder-date">'+d.toLocaleDateString('zh-CN')+'</span></div>';
    }
    h+='</div>';
    if(!hasReminder)h='<div class="empty-state">🎉 暂无待处理提醒</div>';
    remEl.innerHTML=h;
  }).catch(function(){remEl.innerHTML='<div class="empty-state">加载提醒失败</div>';});
  // Render dashboard charts
  renderDashboardCharts();
}

// ============================================================
// DASHBOARD CHARTS (Chart.js)
// ============================================================
var _chartInstances={};
function _destroyChart(key){
  if(_chartInstances[key]){_chartInstances[key].destroy();_chartInstances[key]=null;}
}
function _destroyAllCharts(){
  for(var k in _chartInstances){_destroyChart(k);}
}

async function renderDashboardCharts(){
  try{
    var now=new Date();
    var thisMonth=now.getMonth();
    var thisYear=now.getFullYear();
    
    // ── 1. Revenue Trend (6-month line) ──
    var months=[];
    for(var i=5;i>=0;i--){
      var d=new Date(thisYear,thisMonth-i,1);
      months.push({year:d.getFullYear(),month:d.getMonth()+1,label:d.getMonth()+1+'月'});
    }
    var revData=[];
    for(var ri=0;ri<months.length;ri++){
      var mStart=new Date(months[ri].year,months[ri].month-1,1).toISOString();
      var mEnd=new Date(months[ri].year,months[ri].month,0,23,59,59).toISOString();
      var r=await sb.from('orders').select('amount')
        .eq('company_id',currentCompanyId)
        .gte('created_at',mStart).lte('created_at',mEnd).not('stage','eq','已取消');
      var sum=0;
      if(r.data)for(var j=0;j<r.data.length;j++)sum+=parseFloat(r.data[j].amount)||0;
      revData.push(sum);
    }
    _destroyChart('revenue');
    var ctx1=document.getElementById('chart-revenue-trend');
    if(ctx1){
      _chartInstances.revenue=new Chart(ctx1,{
        type:'line',
        data:{labels:months.map(function(m){return m.label}),
          datasets:[{label:'销售额',data:revData,borderColor:'#4F6EF7',backgroundColor:'rgba(79,110,247,0.08)',fill:true,tension:0.35,pointRadius:4,pointBackgroundColor:'#4F6EF7'}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{y:{ticks:{callback:function(v){return v>=10000?'¥'+(v/10000).toFixed(1)+'万':v>=1000?'¥'+(v/1000).toFixed(1)+'k':'¥'+v}}}}}});
    }

    // ── 2. Lead Distribution (horizontal bar) ──
    var stages=['new','assigned','contacted','qualified','negotiation','won','lost'];
    var stageLabels=['新线索','已分配','已联系','已确认','谈判中','赢单','输单'];
    var stageColors=['#1565C0','#1E88E5','#E65100','#2E7D32','#6B21A8','#166534','#991B1B'];
    var leadCounts=[];
    for(var si=0;si<stages.length;si++){
      var lr=await sb.from('lead_pool').select('id',{count:'exact',head:true}).eq('company_id',currentCompanyId).eq('status',stages[si]);
      leadCounts.push(lr.count||0);
    }
    _destroyChart('leadFunnel');
    var ctx2=document.getElementById('chart-lead-funnel');
    if(ctx2){
      _chartInstances.leadFunnel=new Chart(ctx2,{
        type:'bar',
        data:{labels:stageLabels,datasets:[{label:'数量',data:leadCounts,backgroundColor:stageColors,borderRadius:4}]},
        options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{x:{ticks:{stepSize:1}}}}});
    }

    // ── 3. Client Type Distribution (doughnut) ──
    var cr=await sb.from('clients').select('type').eq('company_id',currentCompanyId);
    var typeMap={};
    if(cr.data)for(var ci=0;ci<cr.data.length;ci++){var tp=cr.data[ci].type||'未分类';typeMap[tp]=(typeMap[tp]||0)+1}
    var typeLabels=Object.keys(typeMap);
    var typeValues=typeLabels.map(function(t){return typeMap[t]});
    _destroyChart('clientTypes');
    var ctx3=document.getElementById('chart-client-types');
    if(ctx3){
      _chartInstances.clientTypes=new Chart(ctx3,{
        type:'doughnut',
        data:{labels:typeLabels,datasets:[{data:typeValues,
          backgroundColor:['#4F6EF7','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316','#84CC16','#6366F1']}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{position:'bottom',labels:{boxWidth:12,font:{size:11}}}}}});
    }

    // ── 4. Performance Comparison (this month) ──
    // Load targets if not already loaded
    if(!allTargets||!allTargets.length){
      try{var tq=await sb.from('sales_targets').select('*').eq('company_id',currentCompanyId).eq('target_year',thisYear);allTargets=tq.data||[];}catch(ee){allTargets=[];}
    }
    var pmStart=new Date(thisYear,thisMonth,1).toISOString();
    var pmEnd=new Date(thisYear,thisMonth+1,0,23,59,59).toISOString();
    var pr=await sb.from('orders').select('amount').eq('company_id',currentCompanyId).gte('created_at',pmStart).lte('created_at',pmEnd).not('stage','eq','已取消');
    var actualTotal=0;
    if(pr.data)for(var pi=0;pi<pr.data.length;pi++)actualTotal+=parseFloat(pr.data[pi].amount)||0;
    var targetTotal2=0;
    for(var ti=0;ti<(allTargets||[]).length;ti++){
      var tt=allTargets[ti];
      if(tt.target_year===thisYear&&tt.target_month===thisMonth+1)targetTotal2+=parseFloat(tt.amount)||0;
    }
    _destroyChart('perfCompare');
    var ctx4=document.getElementById('chart-perf-compare');
    if(ctx4){
      _chartInstances.perfCompare=new Chart(ctx4,{
        type:'bar',
        data:{labels:['实际业绩','目标业绩'],datasets:[{data:[actualTotal,targetTotal2],
          backgroundColor:['#4F6EF7','rgba(79,110,247,0.2)'],borderColor:['#4F6EF7','#4F6EF7'],borderWidth:1,borderRadius:6}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{y:{ticks:{callback:function(v){return v>=10000?'¥'+(v/10000).toFixed(1)+'万':'¥'+v;}}}}}});
    }

    // ── 5. Order Status Distribution (doughnut) ──
    var thisMonthStart=new Date(thisYear,thisMonth,1).toISOString();
    var or=await sb.from('orders').select('stage').eq('company_id',currentCompanyId).gte('created_at',thisMonthStart);
    var stageMap={};var orderStages=['谈判中','已签约','执行中','已完成','已取消'];
    if(or.data)for(var oi=0;oi<or.data.length;oi++){var os=or.data[oi].stage||'未知';stageMap[os]=(stageMap[os]||0)+1}
    var osValues=orderStages.map(function(s){return stageMap[s]||0});
    _destroyChart('orderStatus');
    var ctx5=document.getElementById('chart-order-status');
    if(ctx5){
      _chartInstances.orderStatus=new Chart(ctx5,{
        type:'doughnut',
        data:{labels:orderStages,datasets:[{data:osValues,
          backgroundColor:['#3B82F6','#10B981','#8B5CF6','#F59E0B','#EF4444']}]},
        options:{responsive:true,maintainAspectRatio:false,cutout:'65%',
          plugins:{legend:{position:'bottom',labels:{boxWidth:12,font:{size:11}}}}}});
    }
  }catch(e){console.warn('Dashboard charts render failed:',e);}
}
// ============================================================
// 报表与BI分析模块 — Chart.js 升级版
// 替换原有报表 JS 函数
// ============================================================

// 报表图表实例管理
var _reportCharts={};
function _destroyReportChart(key){ if(_reportCharts[key]){_reportCharts[key].destroy();_reportCharts[key]=null;} }
function _destroyAllReportCharts(){ for(var k in _reportCharts)_destroyReportChart(k); }

// ===== Tab 切换 =====
function switchReportsTab(sub){
  // 销毁当前活跃tab的所有图表实例
  _destroyAllReportCharts();
  var panels={'sales':'rp-sales-panel','clients':'rp-clients-panel','collections':'rp-collections-panel','orders':'rp-orders-panel','dashboard':'rp-dashboard-panel'};
  var tabs=document.querySelectorAll('#reports-tabs-bar .biz-subtab');
  for(var i=0;i<tabs.length;i++)tabs[i].classList.remove('active');
  for(var k in panels){var p=document.getElementById(panels[k]);if(p)p.classList.add('hidden');}
  var active=document.getElementById(panels[sub]);if(active)active.classList.remove('hidden');
  var idx={'sales':0,'clients':1,'collections':2,'orders':3,'dashboard':4};
  if(tabs[idx[sub]])tabs[idx[sub]].classList.add('active');
  if(sub==='sales')renderReportSales();
  else if(sub==='clients')renderReportClients();
  else if(sub==='collections')renderReportCollections();
  else if(sub==='orders')renderReportOrders();
  else if(sub==='dashboard'){renderCustomDashboard();}
}

// ===== 汇总卡片数据加载 =====
function loadReportSummary(){
  var now=new Date();var mStart=new Date(now.getFullYear(),now.getMonth(),1).toISOString();
  sb.from('orders').select('amount,stage').eq('company_id',currentCompanyId).gte('created_at',mStart).then(function(r){
    var sum=0,completed=0;
    if(r.data)for(var i=0;i<r.data.length;i++){var a=parseFloat(r.data[i].amount)||0;sum+=a;if(r.data[i].stage==='已完成')completed++}
    document.getElementById('rp-monthly-sales').textContent='¥'+sum.toLocaleString('zh-CN',{minimumFractionDigits:0,maximumFractionDigits:0});
    document.getElementById('rp-order-complete').textContent=completed;
  }).catch(function(){});
  sb.from('clients').select('id',{count:'exact',head:true}).eq('company_id',currentCompanyId).gte('created_at',mStart).then(function(r){
    document.getElementById('rp-monthly-clients').textContent=r.count||0;
  }).catch(function(){});
  sb.from('contracts').select('total_amount,paid_amount').eq('company_id',currentCompanyId).not('archive_status','eq','archived').then(function(r){
    var total=0,paid=0;
    if(r.data)for(var i=0;i<r.data.length;i++){total+=parseFloat(r.data[i].total_amount)||0;paid+=parseFloat(r.data[i].paid_amount)||0}
    var rate=total>0?Math.round(paid/total*100):0;
    document.getElementById('rp-collect-rate').textContent=rate+'%';
  }).catch(function(){});
}

// 获取year/quarter筛选范围（返回月份数组）
function _getReportMonths(yearElId,quarterElId){
  var year=parseInt(document.getElementById(yearElId).value)||new Date().getFullYear();
  var quarter=parseInt(document.getElementById(quarterElId||'').value)||0;
  var months=[];
  var startM=1,endM=12;
  if(quarter>0){startM=(quarter-1)*3+1;endM=Math.min(startM+2,12);}
  for(var m=startM;m<=endM;m++){
    months.push({month:m,label:year+'年'+m+'月',shortLabel:m+'月',start:new Date(year,m-1,1).toISOString(),end:new Date(year,m,0,23,59,59).toISOString()});
  }
  return {year:year,months:months};
}

// 初始化year选择器
function _initYearSelector(elId,year){
  var sy=document.getElementById(elId);
  if(!sy.options.length){
    var cy=new Date().getFullYear();
    for(var y=cy-3;y<=cy;y++){var o=document.createElement('option');o.value=y;o.textContent=y+'年';if(y===year)o.selected=true;sy.appendChild(o);}
  }
}

// 构建Supabase查询（超管绕过company_id过滤）
function _reportQuery(table){
  var q=sb.from(table).select('*');
  if(!isSuperAdmin)q=q.eq('company_id',currentCompanyId);
  return q;
}

// ============================================================
// 📈 销售报表
// ============================================================
async function renderReportSales(){
  _destroyAllReportCharts();
  var sel=_getReportMonths('rp-sales-year','rp-sales-quarter');
  _initYearSelector('rp-sales-year',sel.year);
  await Promise.all([
    renderSalesFunnel(sel.year),
    renderWinRate(sel),
    renderDealCycle(sel),
    renderAvgDealPrice(sel),
    renderRegionalPerf(sel.year)
  ]);
}

async function renderSalesFunnel(year){
  try{
    var yStart=new Date(year,0,1).toISOString();
    var yEnd=new Date(year,11,31,23,59,59).toISOString();
    var stages=['new','assigned','contacted','qualified','negotiation','won','lost'];
    var stageLabels=['新线索','已分配','已联系','已确认','谈判中','赢单','输单'];
    var stageColors=['#1565C0','#1E88E5','#E65100','#2E7D32','#6B21A8','#166534','#991B1B'];
    var counts=[];
    for(var si=0;si<stages.length;si++){
      var r=await _reportQuery('lead_pool').eq('status',stages[si]).gte('created_at',yStart).lte('created_at',yEnd);
      counts.push((r.data||[]).length);
    }
    _destroyReportChart('salesFunnel');
    var ctx=document.getElementById('rp-sales-salesFunnel');
    if(ctx){
      _reportCharts.salesFunnel=new Chart(ctx,{type:'bar',
        data:{labels:stageLabels,datasets:[{label:'线索数',data:counts,backgroundColor:stageColors,borderRadius:4}]},
        options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{x:{ticks:{stepSize:Math.max(1,Math.ceil(Math.max.apply(null,counts)/6))}}}}});
    }
  }catch(e){console.warn('renderSalesFunnel failed:',e);}
}

async function renderWinRate(sel){
  try{
    var labels=[],rates=[];
    for(var mi=0;mi<sel.months.length;mi++){
      var mo=sel.months[mi];
      var won=await _reportQuery('lead_pool').eq('status','won').gte('created_at',mo.start).lte('created_at',mo.end);
      var lost=await _reportQuery('lead_pool').eq('status','lost').gte('created_at',mo.start).lte('created_at',mo.end);
      var w=(won.data||[]).length,l=(lost.data||[]).length;
      var total=w+l;
      labels.push(mo.shortLabel);
      rates.push(total>0?Math.round(w/total*100):0);
    }
    _destroyReportChart('winRate');
    var ctx=document.getElementById('rp-sales-winRate');
    if(ctx){
      _reportCharts.winRate=new Chart(ctx,{type:'line',
        data:{labels:labels,datasets:[{label:'赢单率(%)',data:rates,borderColor:'#10B981',backgroundColor:'rgba(16,185,129,0.1)',fill:true,tension:0.35,pointRadius:3,pointBackgroundColor:'#10B981'}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{y:{min:0,max:100,ticks:{callback:function(v){return v+'%'}}}}}});
    }
  }catch(e){console.warn('renderWinRate failed:',e);}
}

async function renderDealCycle(sel){
  try{
    var labels=[],cycles=[];
    for(var mi=0;mi<sel.months.length;mi++){
      var mo=sel.months[mi];
      var r=await _reportQuery('orders').select('created_at,updated_at').eq('stage','已完成').gte('created_at',mo.start).lte('created_at',mo.end);
      var totalDays=0,count=0;
      if(r.data)for(var i=0;i<r.data.length;i++){
        var c=new Date(r.data[i].created_at);
        var u=r.data[i].updated_at?new Date(r.data[i].updated_at):new Date();
        var days=Math.round((u-c)/(1000*60*60*24));
        if(days>=0){totalDays+=days;count++;}
      }
      labels.push(mo.shortLabel);
      cycles.push(count>0?Math.round(totalDays/count):0);
    }
    _destroyReportChart('dealCycle');
    var ctx=document.getElementById('rp-sales-dealCycle');
    if(ctx){
      _reportCharts.dealCycle=new Chart(ctx,{type:'bar',
        data:{labels:labels,datasets:[{label:'平均成单天数',data:cycles,backgroundColor:'#8B5CF6',borderRadius:4}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{y:{ticks:{callback:function(v){return v+'天'}}}}}});
    }
  }catch(e){console.warn('renderDealCycle failed:',e);}
}

async function renderAvgDealPrice(sel){
  try{
    var labels=[],prices=[];
    for(var mi=0;mi<sel.months.length;mi++){
      var mo=sel.months[mi];
      var r=await _reportQuery('orders').select('amount').not('stage','eq','已取消').gte('created_at',mo.start).lte('created_at',mo.end);
      var total=0,count=0;
      if(r.data)for(var i=0;i<r.data.length;i++){total+=parseFloat(r.data[i].amount)||0;count++;}
      labels.push(mo.shortLabel);
      prices.push(count>0?Math.round(total/count):0);
    }
    _destroyReportChart('avgDealPrice');
    var ctx=document.getElementById('rp-sales-avgDealPrice');
    if(ctx){
      _reportCharts.avgDealPrice=new Chart(ctx,{type:'line',
        data:{labels:labels,datasets:[{label:'成交均价',data:prices,borderColor:'#F59E0B',backgroundColor:'rgba(245,158,11,0.1)',fill:true,tension:0.35,pointRadius:3,pointBackgroundColor:'#F59E0B'}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{y:{ticks:{callback:function(v){return v>=10000?'¥'+(v/10000).toFixed(1)+'万':'¥'+v;}}}}}});
    }
  }catch(e){console.warn('renderAvgDealPrice failed:',e);}
}

async function renderRegionalPerf(year){
  try{
    var yStart=new Date(year,0,1).toISOString();
    var yEnd=new Date(year,11,31,23,59,59).toISOString();
    var r=await _reportQuery('clients').select('province').gte('created_at',yStart).lte('created_at',yEnd);
    var regionMap={};
    if(r.data)for(var i=0;i<r.data.length;i++){var p=r.data[i].province||'未知';regionMap[p]=(regionMap[p]||0)+1;}
    var labels=Object.keys(regionMap).sort(function(a,b){return regionMap[b]-regionMap[a];});
    var values=labels.map(function(k){return regionMap[k];});
    var regionColors=['#4F6EF7','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316','#84CC16','#6366F1','#A855F7','#14B8A6'];
    _destroyReportChart('regionalPerf');
    var ctx=document.getElementById('rp-sales-regionalPerf');
    if(ctx){
      _reportCharts.regionalPerf=new Chart(ctx,{type:'doughnut',
        data:{labels:labels.slice(0,12),datasets:[{data:values.slice(0,12),backgroundColor:regionColors.slice(0,Math.min(labels.length,12))}]},
        options:{responsive:true,maintainAspectRatio:false,cutout:'60%',
          plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:10},padding:8}}}}});
    }
  }catch(e){console.warn('renderRegionalPerf failed:',e);}
}

// ============================================================
// 👥 客户分析
// ============================================================
async function renderReportClients(){
  _destroyAllReportCharts();
  var sel=_getReportMonths('rp-clients-year','rp-clients-quarter');
  _initYearSelector('rp-clients-year',sel.year);
  await Promise.all([
    renderNewClientsTrend(sel),
    renderChurnAnalysis(sel),
    renderRepurchaseRate(sel),
    renderRFMAnalysis(),
    renderChannelAnalysis(sel)
  ]);
}

async function renderNewClientsTrend(sel){
  try{
    var labels=[],counts=[];
    for(var mi=0;mi<sel.months.length;mi++){
      var mo=sel.months[mi];
      var r=await _reportQuery('clients').select('id',{count:'exact',head:true}).gte('created_at',mo.start).lte('created_at',mo.end);
      labels.push(mo.shortLabel);
      counts.push(r.count||0);
    }
    _destroyReportChart('newClientsTrend');
    var ctx=document.getElementById('rp-clients-newClientsTrend');
    if(ctx){
      _reportCharts.newClientsTrend=new Chart(ctx,{type:'line',
        data:{labels:labels,datasets:[{label:'新增客户',data:counts,borderColor:'#10B981',backgroundColor:'rgba(16,185,129,0.1)',fill:true,tension:0.35,pointRadius:3,pointBackgroundColor:'#10B981'}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{y:{ticks:{stepSize:Math.max(1,Math.ceil(Math.max.apply(null,counts.concat([1]))/6))}}}}});
    }
  }catch(e){console.warn('renderNewClientsTrend failed:',e);}
}

async function renderChurnAnalysis(sel){
  try{
    // 流失定义：该月之前3个月有订单但该月及之后无新订单的客户数
    var labels=[],churnCounts=[];
    for(var mi=0;mi<sel.months.length;mi++){
      var mo=sel.months[mi];
      // 本月有订单的客户
      var activeR=await _reportQuery('orders').select('client_id').gte('created_at',mo.start).lte('created_at',mo.end);
      var activeSet={};if(activeR.data)for(var ai=0;ai<activeR.data.length;ai++)activeSet[activeR.data[ai].client_id]=true;
      // 过去3个月有订单的客户
      var threeMonthsAgo=new Date(sel.year,mo.month-4,1).toISOString();
      var prevR=await _reportQuery('orders').select('client_id').gte('created_at',threeMonthsAgo).lte('created_at',mo.end);
      var prevSet={};if(prevR.data)for(var pi=0;pi<prevR.data.length;pi++)prevSet[prevR.data[pi].client_id]=true;
      // 流失 = 过去3个月有但本月无
      var churn=0;
      for(var cid in prevSet){if(!activeSet[cid])churn++;}
      labels.push(mo.shortLabel);
      churnCounts.push(churn);
    }
    _destroyReportChart('churnAnalysis');
    var ctx=document.getElementById('rp-clients-churnAnalysis');
    if(ctx){
      _reportCharts.churnAnalysis=new Chart(ctx,{type:'bar',
        data:{labels:labels,datasets:[{label:'流失客户数',data:churnCounts,backgroundColor:'#EF4444',borderRadius:4}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{y:{ticks:{stepSize:Math.max(1,Math.ceil(Math.max.apply(null,churnCounts.concat([1]))/6))}}}}});
    }
  }catch(e){console.warn('renderChurnAnalysis failed:',e);}
}

async function renderRepurchaseRate(sel){
  try{
    var labels=[],rates=[];
    for(var mi=0;mi<sel.months.length;mi++){
      var mo=sel.months[mi];
      var r=await _reportQuery('orders').select('client_id').gte('created_at',mo.start).lte('created_at',mo.end);
      var clientOrders={};var repurchase=0,totalClients=0;
      if(r.data){
        for(var i=0;i<r.data.length;i++){var cid=r.data[i].client_id;clientOrders[cid]=(clientOrders[cid]||0)+1;}
        totalClients=Object.keys(clientOrders).length;
        for(var k in clientOrders){if(clientOrders[k]>=2)repurchase++;}
      }
      labels.push(mo.shortLabel);
      rates.push(totalClients>0?Math.round(repurchase/totalClients*100):0);
    }
    // 更新指标卡
    var lastRate=rates.length>0?rates[rates.length-1]:0;
    var metricEl=document.getElementById('rp-clients-repurchaseMetric');
    if(metricEl)metricEl.textContent=lastRate+'%';
    _destroyReportChart('repurchaseRate');
    var ctx=document.getElementById('rp-clients-repurchaseRate');
    if(ctx){
      _reportCharts.repurchaseRate=new Chart(ctx,{type:'line',
        data:{labels:labels,datasets:[{label:'复购率(%)',data:rates,borderColor:'#8B5CF6',backgroundColor:'rgba(139,92,246,0.1)',fill:true,tension:0.35,pointRadius:3,pointBackgroundColor:'#8B5CF6'}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{y:{min:0,max:100,ticks:{callback:function(v){return v+'%'}}}}}});
    }
  }catch(e){console.warn('renderRepurchaseRate failed:',e);}
}

async function renderRFMAnalysis(){
  try{
    var now=new Date();
    // 获取所有订单（不限时间）
    var r=await _reportQuery('orders').select('client_id,amount,created_at');
    if(!r.data||!r.data.length){document.getElementById('rp-clients-rfmTable').querySelector('tbody').innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--text3)">暂无数据</td></tr>';return;}
    // 获取客户名称映射
    var cr=await _reportQuery('clients').select('id,name');
    var clientNames={};if(cr.data)for(var ci=0;ci<cr.data.length;ci++)clientNames[cr.data[ci].id]=cr.data[ci].name||'未知';
    // 按客户聚合
    var rfm={};
    for(var i=0;i<r.data.length;i++){
      var o=r.data[i];var cid=o.client_id;if(!cid)continue;
      if(!rfm[cid])rfm[cid]={clientId:cid,recency:99999,frequency:0,monetary:0};
      var days=(now-new Date(o.created_at))/(1000*60*60*24);
      if(days<rfm[cid].recency)rfm[cid].recency=Math.round(days);
      rfm[cid].frequency++;
      rfm[cid].monetary+=parseFloat(o.amount)||0;
    }
    // 计算RFM评分（1-5分）
    var arr=Object.values(rfm);
    arr.sort(function(a,b){return a.recency-b.recency;});for(var ri=0;ri<arr.length;ri++)arr[ri].r=Math.ceil((ri+1)/arr.length*5);
    arr.sort(function(a,b){return a.frequency-b.frequency;});for(var fi=0;fi<arr.length;fi++)arr[fi].f=Math.ceil((fi+1)/arr.length*5);
    arr.sort(function(a,b){return a.monetary-b.monetary;});for(var mi=0;mi<arr.length;mi++)arr[mi].m=Math.ceil((mi+1)/arr.length*5);
    // 按R+F+M总分排序,取Top20
    arr.sort(function(a,b){return (b.r+b.f+b.m)-(a.r+a.f+a.m);});
    var top=arr.slice(0,20);
    var tbody=document.getElementById('rp-clients-rfmTable').querySelector('tbody');
    var html='';
    for(var ti=0;ti<top.length;ti++){
      var tr=top[ti];
      html+='<tr><td>'+escHtml(clientNames[tr.clientId]||'客户#'+tr.clientId)+'</td><td>'+tr.recency+'</td><td>'+tr.frequency+'</td><td>¥'+tr.monetary.toLocaleString('zh-CN',{minimumFractionDigits:0,maximumFractionDigits:0})+'</td><td style="font-weight:700;color:'+(tr.r+tr.f+tr.m>=12?'#10B981':tr.r+tr.f+tr.m>=8?'#F59E0B':'#EF4444')+'">'+(tr.r+tr.f+tr.m)+'分</td></tr>';
    }
    tbody.innerHTML=html;
  }catch(e){console.warn('renderRFMAnalysis failed:',e);}
}

async function renderChannelAnalysis(sel){
  try{
    var start=sel.months[0].start,end=sel.months[sel.months.length-1].end;
    var r=await _reportQuery('lead_pool').select('source').gte('created_at',start).lte('created_at',end);
    var sourceMap={};
    if(r.data)for(var i=0;i<r.data.length;i++){var s=r.data[i].source||'未知';sourceMap[s]=(sourceMap[s]||0)+1;}
    var labels=Object.keys(sourceMap);
    var values=labels.map(function(k){return sourceMap[k];});
    var colors=['#4F6EF7','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316'];
    _destroyReportChart('channelAnalysis');
    var ctx=document.getElementById('rp-clients-channelAnalysis');
    if(ctx){
      _reportCharts.channelAnalysis=new Chart(ctx,{type:'doughnut',
        data:{labels:labels,datasets:[{data:values,backgroundColor:colors.slice(0,labels.length)}]},
        options:{responsive:true,maintainAspectRatio:false,cutout:'60%',
          plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:10},padding:8}}}}});
    }
  }catch(e){console.warn('renderChannelAnalysis failed:',e);}
}

// ============================================================
// 💳 回款分析
// ============================================================
async function renderReportCollections(){
  _destroyAllReportCharts();
  var sel=_getReportMonths('rp-collections-year','rp-collections-quarter');
  _initYearSelector('rp-collections-year',sel.year);
  await Promise.all([
    renderARAging(sel.year),
    renderPaymentTrend(sel),
    renderContractStats(sel),
    renderBadDebt()
  ]);
}

async function renderARAging(year){
  try{
    var yStart=new Date(year,0,1).toISOString();
    var yEnd=new Date(year,11,31,23,59,59).toISOString();
    var now=new Date();
    var r=await _reportQuery('contracts').select('total_amount,paid_amount,due_date').not('archive_status','eq','archived').gte('created_at',yStart).lte('created_at',yEnd);
    // 按账龄分组：未到期、1-30天、31-60天、61-90天、90天+
    var aging={unexpired:0,days30:0,days60:0,days90:0,over90:0};
    if(r.data)for(var i=0;i<r.data.length;i++){
      var unpaid=parseFloat(r.data[i].total_amount)-(parseFloat(r.data[i].paid_amount)||0);if(unpaid<=0)continue;
      var due=r.data[i].due_date?new Date(r.data[i].due_date):now;
      var overdue=(now-due)/(1000*60*60*24);
      if(overdue<=0)aging.unexpired+=unpaid;
      else if(overdue<=30)aging.days30+=unpaid;
      else if(overdue<=60)aging.days60+=unpaid;
      else if(overdue<=90)aging.days90+=unpaid;
      else aging.over90+=unpaid;
    }
    _destroyReportChart('ARAging');
    var ctx=document.getElementById('rp-collections-ARAging');
    if(ctx){
      _reportCharts.ARAging=new Chart(ctx,{type:'bar',
        data:{labels:['未到期','1-30天','31-60天','61-90天','90天以上'],datasets:[
          {label:'未到期',data:[aging.unexpired,0,0,0,0],backgroundColor:'#10B981',borderRadius:4},
          {label:'1-30天',data:[0,aging.days30,0,0,0],backgroundColor:'#F59E0B',borderRadius:4},
          {label:'31-60天',data:[0,0,aging.days60,0,0],backgroundColor:'#F97316',borderRadius:4},
          {label:'61-90天',data:[0,0,0,aging.days90,0],backgroundColor:'#EF4444',borderRadius:4},
          {label:'90天以上',data:[0,0,0,0,aging.over90],backgroundColor:'#991B1B',borderRadius:4}
        ]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:9},padding:6}}},
          scales:{x:{stacked:true},y:{stacked:true,ticks:{callback:function(v){return v>=10000?'¥'+(v/10000).toFixed(1)+'万':'¥'+v;}}}}}});
    }
  }catch(e){console.warn('renderARAging failed:',e);}
}

async function renderPaymentTrend(sel){
  try{
    var labels=[],amounts=[];
    for(var mi=0;mi<sel.months.length;mi++){
      var mo=sel.months[mi];
      var r=await _reportQuery('payments').select('amount').gte('payment_date',mo.start).lte('payment_date',mo.end);
      var sum=0;if(r.data)for(var i=0;i<r.data.length;i++)sum+=parseFloat(r.data[i].amount)||0;
      labels.push(mo.shortLabel);
      amounts.push(sum);
    }
    _destroyReportChart('paymentTrend');
    var ctx=document.getElementById('rp-collections-paymentTrend');
    if(ctx){
      _reportCharts.paymentTrend=new Chart(ctx,{type:'line',
        data:{labels:labels,datasets:[{label:'回款金额',data:amounts,borderColor:'#10B981',backgroundColor:'rgba(16,185,129,0.1)',fill:true,tension:0.35,pointRadius:3,pointBackgroundColor:'#10B981'}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{y:{ticks:{callback:function(v){return v>=10000?'¥'+(v/10000).toFixed(1)+'万':'¥'+v;}}}}}});
    }
  }catch(e){console.warn('renderPaymentTrend failed:',e);}
}

async function renderContractStats(sel){
  try{
    var labels=[],totals=[],paids=[];
    for(var mi=0;mi<sel.months.length;mi++){
      var mo=sel.months[mi];
      var r=await _reportQuery('contracts').select('total_amount,paid_amount').gte('created_at',mo.start).lte('created_at',mo.end);
      var total=0,paid=0;
      if(r.data)for(var i=0;i<r.data.length;i++){total+=parseFloat(r.data[i].total_amount)||0;paid+=parseFloat(r.data[i].paid_amount)||0;}
      labels.push(mo.shortLabel);
      totals.push(total);paids.push(paid);
    }
    _destroyReportChart('contractStats');
    var ctx=document.getElementById('rp-collections-contractStats');
    if(ctx){
      _reportCharts.contractStats=new Chart(ctx,{type:'bar',
        data:{labels:labels,datasets:[
          {label:'合同总金额',data:totals,backgroundColor:'#4F6EF7',borderRadius:4},
          {label:'已回款金额',data:paids,backgroundColor:'#10B981',borderRadius:4}
        ]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:9},padding:6}}},
          scales:{y:{ticks:{callback:function(v){return v>=10000?'¥'+(v/10000).toFixed(1)+'万':'¥'+v;}}}}}});
    }
  }catch(e){console.warn('renderContractStats failed:',e);}
}

async function renderBadDebt(){
  try{
    var now=new Date();
    var r=await _reportQuery('contracts').select('id,total_amount,paid_amount,due_date').not('archive_status','eq','archived').neq('status','已完成');
    if(!r.data||!r.data.length){document.getElementById('rp-collections-badDebtTable').querySelector('tbody').innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text3)">暂无超期合同</td></tr>';return;}
    // 筛选超期且未完全回款
    var badList=[];
    for(var i=0;i<r.data.length;i++){
      var c=r.data[i];
      var unpaid=(parseFloat(c.total_amount)||0)-(parseFloat(c.paid_amount)||0);
      if(unpaid<=0)continue;
      var due=c.due_date?new Date(c.due_date):null;
      if(!due)continue;
      var overdue=Math.round((now-due)/(1000*60*60*24));
      if(overdue<=0)continue;
      badList.push({id:c.id,total:parseFloat(c.total_amount)||0,paid:parseFloat(c.paid_amount)||0,unpaid:unpaid,dueDate:due.toLocaleDateString('zh-CN'),overdueDays:overdue});
    }
    badList.sort(function(a,b){return b.overdueDays-a.overdueDays;});
    var tbody=document.getElementById('rp-collections-badDebtTable').querySelector('tbody');
    if(!badList.length){tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text3)">暂无超期合同</td></tr>';return;}
    var html='';
    for(var bi=0;bi<badList.length;bi++){
      var b=badList[bi];
      html+='<tr><td>合同#'+b.id+'</td><td>'+b.dueDate+'</td><td>¥'+b.total.toLocaleString('zh-CN',{minimumFractionDigits:0,maximumFractionDigits:0})+'</td><td style="color:#10B981">¥'+b.paid.toLocaleString('zh-CN',{minimumFractionDigits:0,maximumFractionDigits:0})+'</td><td style="color:#EF4444">¥'+b.unpaid.toLocaleString('zh-CN',{minimumFractionDigits:0,maximumFractionDigits:0})+'</td><td style="color:#EF4444;font-weight:700">'+b.overdueDays+'天</td></tr>';
    }
    tbody.innerHTML=html;
  }catch(e){console.warn('renderBadDebt failed:',e);}
}

// ============================================================
// 📦 订单统计（Chart.js升级版）
// ============================================================
async function renderReportOrders(){
  _destroyAllReportCharts();
  var sel=_getReportMonths('rp-orders-year','rp-orders-quarter');
  _initYearSelector('rp-orders-year',sel.year);
  var labels=[],totals=[],completed=[],cancelled=[],rates=[];
  for(var mi=0;mi<sel.months.length;mi++){
    var mo=sel.months[mi];
    var r=await _reportQuery('orders').select('stage').gte('created_at',mo.start).lte('created_at',mo.end);
    var total=0,cmp=0,can=0;
    if(r.data)for(var i=0;i<r.data.length;i++){total++;if(r.data[i].stage==='已完成')cmp++;if(r.data[i].stage==='已取消')can++;}
    labels.push(mo.shortLabel);
    totals.push(total);completed.push(cmp);cancelled.push(can);
    rates.push(total>0?Math.round(cmp/total*100):0);
  }
  // 柱状图：月度订单量
  _destroyReportChart('monthlyOrders');
  var ctx1=document.getElementById('rp-orders-monthlyOrders');
  if(ctx1){
    _reportCharts.monthlyOrders=new Chart(ctx1,{type:'bar',
      data:{labels:labels,datasets:[
        {label:'订单总数',data:totals,backgroundColor:'#4F6EF7',borderRadius:4},
        {label:'已完成',data:completed,backgroundColor:'#10B981',borderRadius:4},
        {label:'已取消',data:cancelled,backgroundColor:'#EF4444',borderRadius:4}
      ]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:9},padding:6}}},
        scales:{y:{ticks:{stepSize:Math.max(1,Math.ceil(Math.max.apply(null,totals.concat([1]))/6))}}}}});
  }
  // 折线图：完成率
  _destroyReportChart('completeRate');
  var ctx2=document.getElementById('rp-orders-completeRate');
  if(ctx2){
    _reportCharts.completeRate=new Chart(ctx2,{type:'line',
      data:{labels:labels,datasets:[{label:'完成率(%)',data:rates,borderColor:'#10B981',backgroundColor:'rgba(16,185,129,0.1)',fill:true,tension:0.35,pointRadius:3,pointBackgroundColor:'#10B981'}]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false}},
        scales:{y:{min:0,max:100,ticks:{callback:function(v){return v+'%'}}}}}});
  }
  // 明细表
  var tbody=document.getElementById('rp-orders-detailTable').querySelector('tbody');
  var thtml='';
  for(var ti=0;ti<labels.length;ti++){
    thtml+='<tr><td>'+labels[ti]+'</td><td>'+totals[ti]+'</td><td style="color:#10B981">'+completed[ti]+'</td><td style="color:#EF4444">'+cancelled[ti]+'</td><td>'+rates[ti]+'%</td></tr>';
  }
  tbody.innerHTML=thtml;
}

// ============================================================
// ⚙️ 自定义仪表盘
// ============================================================
var _currentDashboardId=null;
var _currentDashboardCards=[];

async function renderCustomDashboard(){
  _destroyAllReportCharts();
  await loadDashboardList();
  var sel=document.getElementById('rp-dashboard-selector');
  var dashId=sel.value;
  _currentDashboardId=dashId||null;
  _currentDashboardCards=[];
  if(!dashId){
    document.getElementById('rp-dashboard-title').value='我的仪表盘';
    document.getElementById('rp-dashboard-scope').value='personal';
    document.getElementById('rp-dashboard-grid').innerHTML='<div style="text-align:center;color:var(--text3);padding:60px 0;grid-column:1/-1">点击「添加卡片」开始构建你的仪表盘</div>';
    return;
  }
  try{
    var r=await sb.from('custom_dashboards').select('*').eq('id',parseInt(dashId)).single();
    if(!r.data)return;
    document.getElementById('rp-dashboard-title').value=r.data.title||'我的仪表盘';
    document.getElementById('rp-dashboard-scope').value=r.data.scope||'personal';
    var layout=r.data.layout||[];
    if(typeof layout==='string')layout=JSON.parse(layout);
    _currentDashboardCards=layout;
    var grid=document.getElementById('rp-dashboard-grid');
    if(!layout.length){grid.innerHTML='<div style="text-align:center;color:var(--text3);padding:60px 0;grid-column:1/-1">仪表盘为空，点击「添加卡片」添加图表</div>';return;}
    grid.innerHTML='';
    for(var ci=0;ci<layout.length;ci++){
      var card=layout[ci];
      var cardEl=document.createElement('div');
      cardEl.className='report-chart';
      cardEl.id='rp-dash-card-'+ci;
      cardEl.style.position='relative';
      cardEl.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-weight:600;font-size:12px">'+escHtml(card.title||'图表')+'</span><button style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:14px;padding:0 4px" onclick="removeDashboardCard('+ci+')" title="删除">✕</button></div><canvas id="rp-dash-canvas-'+ci+'" style="max-height:260px"></canvas>';
      grid.appendChild(cardEl);
      renderDashboardCard(card,document.getElementById('rp-dash-canvas-'+ci),ci);
    }
  }catch(e){console.warn('renderCustomDashboard failed:',e);}
}

async function loadDashboardList(){
  try{
    var sel=document.getElementById('rp-dashboard-selector');
    var curVal=sel.value;
    sel.innerHTML='<option value="">新建仪表盘</option>';
    var r=await sb.from('custom_dashboards').select('id,title').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
    if(r.data)for(var i=0;i<r.data.length;i++){
      var o=document.createElement('option');
      o.value=r.data[i].id;
      o.textContent=r.data[i].title||'未命名';
      if(curVal&&parseInt(curVal)===r.data[i].id)o.selected=true;
      sel.appendChild(o);
    }
  }catch(e){console.warn('loadDashboardList failed:',e);}
}

async function saveDashboardLayout(){
  var title=document.getElementById('rp-dashboard-title').value||'我的仪表盘';
  var scope=document.getElementById('rp-dashboard-scope').value||'personal';
  var layout=_currentDashboardCards;
  try{
    if(_currentDashboardId){
      await sb.from('custom_dashboards').update({title:title,layout:layout,scope:scope,updated_at:new Date().toISOString()}).eq('id',_currentDashboardId);
    }else{
      var r=await sb.from('custom_dashboards').insert({company_id:currentCompanyId,user_id:currentUser.id,title:title,layout:layout,scope:scope}).select('id').single();
      if(r.data){_currentDashboardId=r.data.id;}
    }
    alert('仪表盘已保存');
    loadDashboardList();
  }catch(e){console.warn('saveDashboardLayout failed:',e);alert('保存失败：'+e.message);}
}

function addDashboardCard(){
  var cardTypes=[
    {type:'salesFunnel',title:'销售漏斗',chart:'bar',desc:'线索状态分布'},
    {type:'winRate',title:'赢单率趋势',chart:'line',desc:'月度赢单率变化'},
    {type:'newClients',title:'新增客户趋势',chart:'line',desc:'月度新增客户数'},
    {type:'paymentTrend',title:'回款趋势',chart:'line',desc:'月度回款金额'},
    {type:'orderStats',title:'订单统计',chart:'bar',desc:'月度订单量统计'},
    {type:'channelDist',title:'获客渠道',chart:'doughnut',desc:'线索来源分布'},
    {type:'regionalDist',title:'区域分布',chart:'doughnut',desc:'客户地域分布'},
    {type:'contractStats',title:'合同统计',chart:'bar',desc:'合同金额对比'}
  ];
  var type=prompt('选择图表类型：\n1.销售漏斗  2.赢单率  3.新增客户\n4.回款趋势  5.订单统计  6.获客渠道\n7.区域分布  8.合同统计\n\n请输入编号(1-8)：','1');
  var idx=parseInt(type)-1;
  if(idx<0||idx>=cardTypes.length)return;
  var ct=cardTypes[idx];
  var title=prompt('卡片标题：',ct.title)||ct.title;
  var card={type:ct.type,title:title,chart:ct.chart,desc:ct.desc};
  _currentDashboardCards.push(card);
  // 创建新卡片DOM
  var grid=document.getElementById('rp-dashboard-grid');
  if(grid.querySelector('[style*="padding:60px"]'))grid.innerHTML='';
  var ci=_currentDashboardCards.length-1;
  var cardEl=document.createElement('div');
  cardEl.className='report-chart';
  cardEl.id='rp-dash-card-'+ci;
  cardEl.style.position='relative';
  cardEl.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-weight:600;font-size:12px">'+escHtml(title)+'</span><button style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:14px;padding:0 4px" onclick="removeDashboardCard('+ci+')" title="删除">✕</button></div><canvas id="rp-dash-canvas-'+ci+'" style="max-height:260px"></canvas>';
  grid.appendChild(cardEl);
  renderDashboardCard(card,document.getElementById('rp-dash-canvas-'+ci),ci);
}

function removeDashboardCard(cardId){
  _destroyReportChart('dashCanvas_'+cardId);
  _currentDashboardCards.splice(cardId,1);
  var el=document.getElementById('rp-dash-card-'+cardId);
  if(el)el.remove();
  if(!_currentDashboardCards.length){
    document.getElementById('rp-dashboard-grid').innerHTML='<div style="text-align:center;color:var(--text3);padding:60px 0;grid-column:1/-1">仪表盘为空，点击「添加卡片」添加图表</div>';
  }
}

async function renderDashboardCard(card,canvas,idx){
  if(!canvas)return;
  try{
    var year=new Date().getFullYear();
    var chartKey='dashCanvas_'+idx;
    _destroyReportChart(chartKey);
    var ctx=canvas.getContext('2d');
    if(card.type==='salesFunnel'){
      var stages=['new','assigned','contacted','qualified','negotiation','won','lost'];
      var stageLabels=['新线索','已分配','已联系','已确认','谈判中','赢单','输单'];
      var stageColors=['#1565C0','#1E88E5','#E65100','#2E7D32','#6B21A8','#166534','#991B1B'];
      var yStart=new Date(year,0,1).toISOString(),yEnd=new Date(year,11,31,23,59,59).toISOString();
      var counts=[];
      for(var si=0;si<stages.length;si++){
        var lr=await _reportQuery('lead_pool').eq('status',stages[si]).gte('created_at',yStart).lte('created_at',yEnd);
        counts.push((lr.data||[]).length);
      }
      _reportCharts[chartKey]=new Chart(ctx,{type:'bar',data:{labels:stageLabels,datasets:[{label:'数量',data:counts,backgroundColor:stageColors,borderRadius:4}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});
    }else if(card.type==='winRate'){
      var labels=[],rates=[];
      for(var m=1;m<=12;m++){
        var ms=new Date(year,m-1,1).toISOString(),me=new Date(year,m,0,23,59,59).toISOString();
        var wonR=await _reportQuery('lead_pool').eq('status','won').gte('created_at',ms).lte('created_at',me);
        var lostR=await _reportQuery('lead_pool').eq('status','lost').gte('created_at',ms).lte('created_at',me);
        var w=(wonR.data||[]).length,l=(lostR.data||[]).length,total2=w+l;
        labels.push(m+'月');rates.push(total2>0?Math.round(w/total2*100):0);
      }
      _reportCharts[chartKey]=new Chart(ctx,{type:'line',data:{labels:labels,datasets:[{label:'赢单率(%)',data:rates,borderColor:'#10B981',backgroundColor:'rgba(16,185,129,0.1)',fill:true,tension:0.35,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{min:0,max:100}}}});
    }else if(card.type==='newClients'){
      var labels2=[],counts2=[];
      for(var m2=1;m2<=12;m2++){
        var ms2=new Date(year,m2-1,1).toISOString(),me2=new Date(year,m2,0,23,59,59).toISOString();
        var cr2=await _reportQuery('clients').select('id',{count:'exact',head:true}).gte('created_at',ms2).lte('created_at',me2);
        labels2.push(m2+'月');counts2.push(cr2.count||0);
      }
      _reportCharts[chartKey]=new Chart(ctx,{type:'line',data:{labels:labels2,datasets:[{label:'新增客户',data:counts2,borderColor:'#10B981',backgroundColor:'rgba(16,185,129,0.1)',fill:true,tension:0.35,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});
    }else if(card.type==='paymentTrend'){
      var labels3=[],amounts3=[];
      for(var m3=1;m3<=12;m3++){
        var ms3=new Date(year,m3-1,1).toISOString(),me3=new Date(year,m3,0,23,59,59).toISOString();
        var pr3=await _reportQuery('payments').select('amount').gte('payment_date',ms3).lte('payment_date',me3);
        var sum3=0;if(pr3.data)for(var pj=0;pj<pr3.data.length;pj++)sum3+=parseFloat(pr3.data[pj].amount)||0;
        labels3.push(m3+'月');amounts3.push(sum3);
      }
      _reportCharts[chartKey]=new Chart(ctx,{type:'line',data:{labels:labels3,datasets:[{label:'回款金额',data:amounts3,borderColor:'#10B981',backgroundColor:'rgba(16,185,129,0.1)',fill:true,tension:0.35,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:function(v){return v>=10000?'¥'+(v/10000).toFixed(1)+'万':'¥'+v;}}}}}});
    }else if(card.type==='orderStats'){
      var labels4=[],totals4=[],completed4=[];
      for(var m4=1;m4<=12;m4++){
        var ms4=new Date(year,m4-1,1).toISOString(),me4=new Date(year,m4,0,23,59,59).toISOString();
        var or4=await _reportQuery('orders').select('stage').gte('created_at',ms4).lte('created_at',me4);
        var t4=0,c4=0;if(or4.data)for(var oj=0;oj<or4.data.length;oj++){t4++;if(or4.data[oj].stage==='已完成')c4++;}
        labels4.push(m4+'月');totals4.push(t4);completed4.push(c4);
      }
      _reportCharts[chartKey]=new Chart(ctx,{type:'bar',data:{labels:labels4,datasets:[{label:'总数',data:totals4,backgroundColor:'#4F6EF7',borderRadius:4},{label:'已完成',data:completed4,backgroundColor:'#10B981',borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});
    }else if(card.type==='channelDist'){
      var sr=await _reportQuery('lead_pool').select('source');
      var smap={};if(sr.data)for(var sk=0;sk<sr.data.length;sk++){var ss=sr.data[sk].source||'未知';smap[ss]=(smap[ss]||0)+1;}
      var slabels=Object.keys(smap),svalues=slabels.map(function(k){return smap[k];});
      var scolors=['#4F6EF7','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316'];
      _reportCharts[chartKey]=new Chart(ctx,{type:'doughnut',data:{labels:slabels,datasets:[{data:svalues,backgroundColor:scolors.slice(0,slabels.length)}]},options:{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:9}}}}}});
    }else if(card.type==='regionalDist'){
      var rr=await _reportQuery('clients').select('province');
      var rmap={};if(rr.data)for(var rk=0;rk<rr.data.length;rk++){var pp=rr.data[rk].province||'未知';rmap[pp]=(rmap[pp]||0)+1;}
      var rlabels=Object.keys(rmap).sort(function(a,b){return rmap[b]-rmap[a];}).slice(0,12);
      var rvalues=rlabels.map(function(k){return rmap[k];});
      var rcolors=['#4F6EF7','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316','#84CC16','#6366F1','#A855F7','#14B8A6'];
      _reportCharts[chartKey]=new Chart(ctx,{type:'doughnut',data:{labels:rlabels,datasets:[{data:rvalues,backgroundColor:rcolors.slice(0,rlabels.length)}]},options:{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:9}}}}}});
    }else if(card.type==='contractStats'){
      var clabels=[],ctotals=[],cpaids=[];
      for(var cm=1;cm<=12;cm++){
        var cms=new Date(year,cm-1,1).toISOString(),cme=new Date(year,cm,0,23,59,59).toISOString();
        var crr=await _reportQuery('contracts').select('total_amount,paid_amount').gte('created_at',cms).lte('created_at',cme);
        var ctotal=0,cpaid=0;if(crr.data)for(var cj=0;cj<crr.data.length;cj++){ctotal+=parseFloat(crr.data[cj].total_amount)||0;cpaid+=parseFloat(crr.data[cj].paid_amount)||0;}
        clabels.push(cm+'月');ctotals.push(ctotal);cpaids.push(cpaid);
      }
      _reportCharts[chartKey]=new Chart(ctx,{type:'bar',data:{labels:clabels,datasets:[{label:'总额',data:ctotals,backgroundColor:'#4F6EF7',borderRadius:4},{label:'已回',data:cpaids,backgroundColor:'#10B981',borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:function(v){return v>=10000?'¥'+(v/10000).toFixed(1)+'万':'¥'+v;}}}}}});
    }
  }catch(e){console.warn('renderDashboardCard failed:',e);}
}

// ============================================================
// 📥 导出CSV
// ============================================================
function exportReportCSV(type){
  var year,quarter;
  if(type==='sales'){year=document.getElementById('rp-sales-year').value;quarter=document.getElementById('rp-sales-quarter').value;}
  else if(type==='clients'){year=document.getElementById('rp-clients-year').value;quarter=document.getElementById('rp-clients-quarter').value;}
  else if(type==='collections'){year=document.getElementById('rp-collections-year').value;quarter=document.getElementById('rp-collections-quarter').value;}
  else if(type==='orders'){year=document.getElementById('rp-orders-year').value;quarter=document.getElementById('rp-orders-quarter').value;}
  else{return;}
  year=year||new Date().getFullYear();quarter=quarter||'0';
  var prefix=type+'_'+year+(quarter!=='0'?'_Q'+quarter:'');
  var sel=_getReportMonths('rp-'+type+'-year','rp-'+type+'-quarter');
  var csvHeaders,csvData=[];
  if(type==='sales'){
    csvHeaders=['月份','线索新','线索已分配','线索已联系','线索已确认','线索谈判','赢单','输单'];
    // 异步生成比较复杂，简化：收集当前画布中的图表数据
    var chart=_reportCharts.salesFunnel;
    if(chart){csvData=[['-','-(详见图表)']];}else{csvData=[['-','-']];}
  }else if(type==='clients'){
    csvData=[];var chart2=_reportCharts.newClientsTrend;
    if(chart2&&chart2.data&&chart2.data.datasets[0]){
      csvHeaders=['月份','新增客户数'];
      var d=chart2.data;for(var di=0;di<d.labels.length;di++)csvData.push([d.labels[di],d.datasets[0].data[di]]);
    }else{csvHeaders=['月份','数据'];csvData=[['无','-']];}
  }else if(type==='collections'){
    csvData=[];var chart3=_reportCharts.paymentTrend;
    if(chart3&&chart3.data&&chart3.data.datasets[0]){
      csvHeaders=['月份','回款金额'];
      var d2=chart3.data;for(var dj=0;dj<d2.labels.length;dj++)csvData.push([d2.labels[dj],d2.datasets[0].data[dj]]);
    }else{csvHeaders=['月份','数据'];csvData=[['无','-']];}
  }else if(type==='orders'){
    var tbody=document.getElementById('rp-orders-detailTable');
    if(tbody){
      csvHeaders=['月份','订单数','已完成','已取消','完成率'];
      var rows=tbody.querySelectorAll('tbody tr');
      for(var ri=0;ri<rows.length;ri++){var cells=rows[ri].querySelectorAll('td');if(cells.length>=5)csvData.push([cells[0].textContent,cells[1].textContent,cells[2].textContent,cells[3].textContent,cells[4].textContent]);}
    }else{csvHeaders=['月份'];csvData=[['无']];}
  }
  var csv=csvHeaders.join(',')+'\n';
  for(var ci2=0;ci2<csvData.length;ci2++)csv+=csvData[ci2].map(function(v){return '"'+String(v).replace(/"/g,'""')+'"';}).join(',')+'\n';
  var blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.download=prefix+'_report.csv';a.click();
  URL.revokeObjectURL(url);
}
var notifUnread=0;

function toggleNotifPanel(){
  var p=document.getElementById('notif-panel');
  p.classList.toggle('hidden');
  if(!p.classList.contains('hidden')){switchNotifTab('notifications')}
}

function switchNotifTab(sub){
  var tabs=document.querySelectorAll('#notif-panel .biz-subtab');
  for(var i=0;i<tabs.length;i++)tabs[i].classList.remove('active');
  document.getElementById('notif-list').classList.add('hidden');
  document.getElementById('activity-list').classList.add('hidden');
  if(sub==='notifications'){tabs[0].classList.add('active');loadNotifs();document.getElementById('notif-list').classList.remove('hidden')}
  else{tabs[1].classList.add('active');loadActivityLogs();document.getElementById('activity-list').classList.remove('hidden')}
}

async function loadNotifs(){
  var el=document.getElementById('notif-list');
  el.innerHTML='<div class="empty-state">加载中...</div>';
  if(!currentUser)return;
  var {data:notifs}=await sb.from('notifications').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false}).limit(50);
  var unread=0;
  if(notifs&&notifs.length){
    var h='';
    for(var i=0;i<notifs.length;i++){
      var n=notifs[i];if(!n.is_read)unread++;
      var icon={info:'ℹ️',warning:'⚠️',success:'✅',error:'❌'}[n.type]||'🔔';
      var d=new Date(n.created_at);var timeStr=isToday(d)?d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString('zh-CN')+' '+d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
      h+='<div class="notif-item'+(n.is_read?'':' notif-unread')+'" data-nid="'+n.id+'" data-link="'+escAttr(n.link)+'"><span class="notif-icon">'+icon+'</span><div class="notif-body"><div class="notif-title">'+escHtml(n.title)+'</div><div class="notif-text">'+escHtml(n.body)+'</div><div class="notif-time">'+timeStr+'</div></div></div>';
    }
    el.innerHTML=h;
  }else{el.innerHTML='<div class="empty-state">暂无通知</div>'}
  notifUnread=unread;
  updateBellBadge();
  // Event delegation for notif clicks
  el.onclick=function(ev){
    var item=ev.target.closest('.notif-item');
    if(!item)return;
    var nid=parseInt(item.getAttribute('data-nid'));
    var link=item.getAttribute('data-link')||'';
    if(nid)openNotif(nid,link);
  };
}

async function openNotif(id,link){
  await sb.from('notifications').update({is_read:true}).eq('id',id);
  notifUnread=Math.max(0,notifUnread-1);
  updateBellBadge();
  loadNotifs();
  toggleNotifPanel();
  if(link){var parts=link.split('/');if(parts[0])switchTab(parts[0])}
}

function updateBellBadge(){
  var b=document.getElementById('notif-badge');
  if(b){b.textContent=notifUnread>99?'99+':notifUnread;b.classList.toggle('hidden',notifUnread===0)}
}

async function markAllNotifsRead(){
  await sb.from('notifications').update({is_read:true}).eq('company_id',currentCompanyId).eq('is_read',false);
  notifUnread=0;updateBellBadge();loadNotifs();
}

async function addNotif(type,title,body,link){
  if(!currentUser||!currentCompanyId)return;
  await sb.from('notifications').insert({company_id:currentCompanyId,user_id:currentUser.id,type:type,title:title,body:body,link:link||''}).then(function(){
    notifUnread++;updateBellBadge();
  }).catch(function(){});
}

// Activity logging
async function logActivity(action,entityType,entityId,entityName,details){
  if(!currentUser||!currentCompanyId)return;
  sb.from('activity_logs').insert({company_id:currentCompanyId,user_id:currentUser.id,action:action,entity_type:entityType,entity_id:entityId||null,entity_name:entityName||'',details:details||{}}).then(function(){}).catch(function(){});
}

async function loadActivityLogs(){
  var el=document.getElementById('activity-list');
  el.innerHTML='<div class="empty-state">加载中...</div>';
  if(!currentUser)return;
  var {data:logs}=await sb.from('activity_logs').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false}).limit(80);
  if(logs&&logs.length){
    var actionIcon={create:'➕',update:'✏️',delete:'🗑️',status_change:'🔄'};
    var h='';
    for(var i=0;i<logs.length;i++){
      var l=logs[i];var d=new Date(l.created_at);
      var timeStr=isToday(d)?d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString('zh-CN')+' '+d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
      var detail=typeof l.details==='string'?JSON.parse(l.details):(l.details||{});
      h+='<div class="log-item"><span class="log-icon">'+(actionIcon[l.action]||'📋')+'</span><div class="log-body"><div class="log-title">'+escHtml(l.action==='create'?'创建了':l.action==='update'?'更新了':l.action==='delete'?'删除了':'变更了')+' '+escHtml(l.entity_type)+'#'+l.entity_id+(l.entity_name?' ('+escHtml(l.entity_name)+')':'')+'</div><div class="log-time">'+timeStr+'</div></div></div>';
    }
    el.innerHTML=h;
  }else{el.innerHTML='<div class="empty-state">暂无操作记录</div>'}
}

function isToday(d){var now=new Date();return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()&&d.getDate()===now.getDate()}

function escAttr(s){return (s||'').replace(/'/g,"\'").replace(/"/g,'&quot;')}

// Toast system
function showToast(msg,type){
  type=type||'info';
  var colors={info:'#4F6EF7',success:'#10B981',warning:'#F59E0B',error:'#EF4444'};
  var icons={info:'ℹ️',success:'✅',warning:'⚠️',error:'❌'};
  var tc=document.getElementById('toast-container');
  if(!tc)return;
  var t=document.createElement('div');t.className='toast toast-'+type;
  t.innerHTML='<span class="toast-icon">'+(icons[type]||'')+'</span>'+escHtml(msg);
  t.style.borderLeftColor=colors[type]||'#4F6EF7';
  tc.appendChild(t);
  setTimeout(function(){t.classList.add('toast-out');setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t)},300)},3500);
}

// Hook: auto-notify on key events (called after successful CRUD)
function notifyCRUD(action,entityType,entityName){
  var title='';
  if(action==='create')title='新增'+entityName;
  else if(action==='update')title='更新'+entityName;
  else if(action==='delete')title='删除'+entityName;
  else if(action==='status_change')title='状态变更';
  showToast(title+'成功','success');
  logActivity(action,entityType,null,entityName);
}

// Poll notifications periodically (called in onLoginSuccess + switchTab)
async function pollNotifications(){
  if(!currentUser||!currentCompanyId)return;
  var {count}=await sb.from('notifications').select('id',{count:'exact',head:true}).eq('company_id',currentCompanyId).eq('is_read',false);
  notifUnread=count||0;updateBellBadge();
}
function switchTab(tab){
  var cv=document.getElementById('client-view');
  var ov=document.getElementById('order-view');
  var av=document.getElementById('admin-view');
  var sv=document.getElementById('sales-view');
  var iv=document.getElementById('inventory-view');
  var spv=document.getElementById('suppliers-view');
  var pv=document.getElementById('performance-view');
  var purchv=document.getElementById('purchase-view');
  var tc=document.getElementById('tab-clients');
  var to=document.getElementById('tab-orders');
  var ta=document.getElementById('tab-admin');
  var ti=document.getElementById('tab-inventory');
  var fab=document.getElementById('main-fab');
  closeMoreMenu();
  _destroyAllCharts();
  document.getElementById('settings-screen').style.display='none';
  document.getElementById('my-screen').style.display='none';
  // Hide all views first
  var hv_d=document.getElementById('home-view');var rv_r=document.getElementById('reports-view');
  var lv=document.getElementById('leads-view');
  var allViews=[hv_d,cv,ov,rv_r,av,sv,iv];if(spv)allViews.push(spv);if(pv)allViews.push(pv);if(lv)allViews.push(lv);var colv2=document.getElementById('collab-view');if(colv2)allViews.push(colv2);var sv2=document.getElementById('service-view');if(sv2)allViews.push(sv2);if(purchv)allViews.push(purchv);
  for(var i=0;i<allViews.length;i++)if(allViews[i])allViews[i].classList.add('hidden');
  // Deactivate all tabs
  var tr=document.getElementById('tab-reports');var thm=document.getElementById('tab-home');
  var allTabs=[thm,tc,to,document.getElementById('tab-service'),document.getElementById('tab-collab'),tr,ta,ti];for(var j=0;j<allTabs.length;j++)if(allTabs[j])allTabs[j].classList.remove('active');
  fab.classList.add('hidden');

    var hv=document.getElementById('home-view');
  if(tab==='home'){
    hv.classList.remove('hidden');
    document.getElementById('tab-home').classList.add('active');
    document.getElementById('topbar-title').textContent='仪表盘';
    document.getElementById('main-fab').classList.add('hidden');
    loadDashboard();
  }else 
  if(tab==='clients'){
    cv.classList.remove('hidden');tc.classList.add('active');
    fab.classList.remove('hidden');fab.textContent='+';fab.onclick=function(){openForm()};
    document.getElementById('topbar-title').textContent='客户管理';
    loadClients();
  }else if(tab==='orders'){
    ov.classList.remove('hidden');to.classList.add('active');
    fab.classList.remove('hidden');fab.textContent='+';fab.onclick=function(){openOrderForm()};
    document.getElementById('topbar-title').textContent='业务管理';
    switchBizTab('orders');
  }else if(tab==='sales'){
    // Sales accessed via biz-tabs or more-menu → go through orders
    ov.classList.remove('hidden');to.classList.add('active');
    fab.classList.remove('hidden');fab.textContent='+';fab.onclick=function(){openSalesForm()};
    document.getElementById('topbar-title').textContent='业务管理';
    switchBizTab('sales');
  }else if(tab==='performance'){
    // Performance accessed via biz-tabs or more-menu → go through orders
    ov.classList.remove('hidden');to.classList.add('active');
    document.getElementById('topbar-title').textContent='业务管理';
    switchBizTab('performance');
  }else if(tab==='inventory'){
    iv.classList.remove('hidden');ti.classList.add('active');
    document.getElementById('topbar-title').textContent='资源管理';
    switchResTab('inventory');
  }else if(tab==='suppliers'){
    // Suppliers accessed via res-tabs or more-menu → go through inventory
    iv.classList.remove('hidden');ti.classList.add('active');
    document.getElementById('topbar-title').textContent='资源管理';
    switchResTab('suppliers');
  }else if(tab==='reports'){
    rv_r.classList.remove('hidden');tr.classList.add('active');
    fab.classList.add('hidden');
    document.getElementById('topbar-title').textContent='报表中心';
    loadReportSummary();switchReportsTab('sales');
  }else if(tab==='service'){var sv2=document.getElementById('service-view');if(sv2)sv2.classList.remove('hidden');switchServiceTab('tickets');return}
  if(tab==='admin'){
    av.classList.remove('hidden');ta.classList.add('active');
    document.getElementById('topbar-title').textContent='组织管理';
    switchAdminTab('users');
  }else if(tab==='collab'){
  var colv=document.getElementById('collab-view');
  colv.classList.remove('hidden');document.getElementById('tab-collab').classList.add('active');
  document.getElementById('topbar-title').textContent='协同办公';
  switchCollabTab('schedule');
}
}

function handleFab(){
  var ov=document.getElementById('order-view');
  if(ov.classList.contains('hidden'))openForm();else openOrderForm();
}

// === Order Form ===
async function openOrderForm(id){
  // Ensure client data is loaded for the search input
  if(!allClients.length) await loadClients();
  orderEditId=id||null;
  orderClientId=null;orderClientName='';
  orderStage='谈判中';
  document.getElementById('order-form-title').textContent=id?'编辑订单':'创建订单';
  document.getElementById('order-btn-delete').classList.toggle('hidden',!id);
  document.getElementById('of-client-search').value='';
  document.getElementById('of-client-list').classList.add('hidden');
  var cs=document.getElementById('of-client-selected');cs.style.display='none';cs.textContent='';
  document.getElementById('of-project').value='';
  document.getElementById('of-amount').value='';
  document.getElementById('of-start-date').value='';
  document.getElementById('of-expected-date').value='';
  document.getElementById('of-actual-date').value='';
  document.getElementById('of-notes').value='';
  buildStageGrid();
  if(id){
    var o=allOrders.find(function(x){return x.id===id});
    if(o){
      orderClientId=o.client_id;
      orderStage=o.stage||'谈判中';
      document.getElementById('of-number').value=o.order_number||'';
      document.getElementById('of-project').value=o.project_name||'';
      document.getElementById('of-start-date').value=o.start_date||'';
      document.getElementById('of-expected-date').value=o.expected_date||'';
      document.getElementById('of-actual-date').value=o.actual_date||'';
      document.getElementById('of-notes').value=o.notes||'';
      buildStageGrid();
      // Decrypt amount
      decryptAmount(o.amount_enc||'').then(function(v){
        document.getElementById('of-amount').value=v||'';
      });
      // Set client name
      var cl=allClients.find(function(x){return x.id===o.client_id});
      if(cl){orderClientName=cl.name;cs.style.display='block';cs.textContent='已选择: '+cl.name}
    }
  }else{
    document.getElementById('of-number').value='ORD-'+Date.now().toString(36).toUpperCase();
  }
  document.getElementById('order-form-modal').classList.remove('hidden');
}

function closeOrderForm(){
  document.getElementById('order-form-modal').classList.add('hidden');
  orderEditId=null;orderClientId=null;orderClientName='';
}

function buildStageGrid(){
  var g=document.getElementById('order-stage-grid');
  var h='';
  for(var i=0;i<ORDER_STAGES.length;i++){
    h+='<div class="order-stage-opt'+(ORDER_STAGES[i]===orderStage?' selected':'')+'" onclick="selOrderStage(\''+ORDER_STAGES[i]+'\')">'+ORDER_STAGES[i]+'</div>';
  }
  g.innerHTML=h;
}

function selOrderStage(stage){
  orderStage=stage;
  var opts=document.querySelectorAll('.order-stage-opt');
  for(var i=0;i<opts.length;i++)opts[i].classList.toggle('selected',opts[i].textContent===stage);
}

function searchOrderClient(){
  var q=(document.getElementById('of-client-search').value||'').trim().toLowerCase();
  var list=document.getElementById('of-client-list');
  if(q.length<2){list.classList.add('hidden');list.innerHTML='';return}
  // Show spinner while potentially loading
  if(!allClients.length){list.classList.remove('hidden');list.innerHTML='<div class="search-list-item" style="color:var(--text3)">加载客户中...</div>';loadClients().then(function(){searchOrderClient()});return}
  var matches=allClients.filter(function(c){return c.name.toLowerCase().indexOf(q)>=0}).slice(0,8);
  if(!matches.length){list.innerHTML='<div class="search-list-item" style="color:var(--text3)">无匹配客户</div>';list.classList.remove('hidden');return}
  var h='';
  for(var i=0;i<matches.length;i++)h+='<div class="search-list-item" onclick="pickOrderClient(\''+matches[i].id+'\',\''+escHtml(matches[i].name)+'\')"><div class="name">'+escHtml(matches[i].name)+'</div></div>';
  list.innerHTML=h;list.classList.remove('hidden');
}

function pickOrderClient(id,name){
  orderClientId=id;orderClientName=name;
  document.getElementById('of-client-search').value='';
  document.getElementById('of-client-list').classList.add('hidden');
  var cs=document.getElementById('of-client-selected');cs.style.display='block';cs.textContent='已选择: '+name;
}

// === Save Order ===
async function saveOrder(){
  if(!orderClientId){showToast('请选择关联客户');return}
  var number=document.getElementById('of-number').value.trim();if(!number){showToast('请输入订单编号');return}
  var amountStr=document.getElementById('of-amount').value.trim();
  if(!amountStr||isNaN(parseFloat(amountStr))||parseFloat(amountStr)<0){showToast('请输入有效金额');return}
  var amount=parseFloat(amountStr);
  var amountEnc=await encryptAmount(amount.toFixed(2));

  var order={
    client_id:orderClientId,
    order_number:number,
    project_name:document.getElementById('of-project').value.trim(),
    amount_enc:amountEnc,
    stage:orderStage,
    start_date:document.getElementById('of-start-date').value||null,
    expected_date:document.getElementById('of-expected-date').value||null,
    actual_date:document.getElementById('of-actual-date').value||null,
    notes:document.getElementById('of-notes').value.trim(),
    updated_at:new Date().toISOString()
  };
  if(!orderEditId)order.user_id=currentUser.id;

  if(!orderEditId){
    order.company_id=currentCompanyId;
    var {error}=await sb.from('orders').insert(order);
    if(error){showToast('创建失败: '+error.message);return}
    showToast('订单已创建');
  }else{
    var {error}=await sb.from('orders').update(order).eq('id',orderEditId);
    if(error){showToast('更新失败: '+error.message);return}
    showToast('订单已更新');
  }
  closeOrderForm();
  await loadOrders();
  if(!document.getElementById('order-view').classList.contains('hidden'))renderOrders();
  else renderList();
}

async function loadOrders(){
  try{
    var {data,error}=await sb.from('orders').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
    if(error){console.error('loadOrders:',error);return}
    allOrders=(data||[]);
    // Decrypt amounts
    for(var i=0;i<allOrders.length;i++){
      allOrders[i]._amount=allOrders[i].amount||0;
      try{
        var dec=await decryptAmount(allOrders[i].amount_enc||'');
        if(dec)allOrders[i]._amount=parseFloat(dec)||0;
      }catch(e){}
    }
  }catch(e){console.error('loadOrders error:',e)}
}

function renderOrders(){
  var stageF=document.getElementById('order-stage-filter').value;
  var query=(document.getElementById('order-search').value||'').trim().toLowerCase();
  var list=allOrders.slice();

  if(stageF!=='all')list=list.filter(function(o){return o.stage===stageF});
  if(query){
    list=list.filter(function(o){
      var cn='';var cl=allClients.find(function(x){return x.id===o.client_id});if(cl)cn=cl.name.toLowerCase();
      return (o.order_number||'').toLowerCase().indexOf(query)>=0||cn.indexOf(query)>=0||(o.project_name||'').toLowerCase().indexOf(query)>=0||(o.notes||'').toLowerCase().indexOf(query)>=0;
    });
  }

  // Stats
  var statHtml='',totalAmt=0,negAmt=0,sigAmt=0,exeAmt=0,comAmt=0;
  for(var i=0;i<list.length;i++){totalAmt+=list[i]._amount||0}
  for(var i=0;i<list.length;i++){
    var a=list[i]._amount||0;
    if(list[i].stage==='谈判中')negAmt+=a;
    else if(list[i].stage==='已签约')sigAmt+=a;
    else if(list[i].stage==='执行中')exeAmt+=a;
    else if(list[i].stage==='已完成')comAmt+=a;
  }
  statHtml='<div class="order-stat"><div class="os-num">'+list.length+'</div><div class="os-label">订单数</div></div>';
  statHtml+='<div class="order-stat"><div class="os-num">'+formatMoney(totalAmt)+'</div><div class="os-label">总额</div></div>';
  statHtml+='<div class="order-stat"><div class="os-num">'+formatMoney(negAmt+sigAmt+exeAmt)+'</div><div class="os-label">进行中</div></div>';
  document.getElementById('order-stats').innerHTML=statHtml;

  // Grid
  var grid=document.getElementById('order-grid'),empty=document.getElementById('order-empty');
  if(list.length===0){grid.innerHTML='';empty.classList.remove('hidden');return}
  empty.classList.add('hidden');
  var html='';
  for(var i=0;i<list.length;i++){
    var o=list[i],sc=stageClass(o.stage);
    var cn='';var cl=allClients.find(function(x){return x.id===o.client_id});if(cl)cn=h(cl.name);
    html+='<div class="order-card" onclick="openOrderForm(\''+o.id+'\')" style="--card-bar:'+stageColor(o.stage)+'">';
    html+='<div class="oc-number">#'+h(o.order_number||'')+' · <span class="stage-badge '+sc+'">'+h(o.stage)+'</span></div>';
    html+='<div class="oc-header"><span class="oc-client">'+cn+'</span><span class="oc-amount">'+formatMoney(o._amount||0)+'</span></div>';
    if(o.project_name)html+='<div class="oc-project">📋 '+h(o.project_name)+'</div>';
    var dates=[];
    if(o.start_date)dates.push('起: '+o.start_date);
    if(o.expected_date)dates.push('预: '+o.expected_date);
    if(o.actual_date)dates.push('完: '+o.actual_date);
    if(dates.length)html+='<div class="oc-dates">'+dates.join(' · ')+'</div>';
    if(o.notes)html+='<div class="oc-notes">💬 '+h(o.notes)+'</div>';
    html+='</div>';
  }
  grid.innerHTML=html;
}

function formatMoney(v){
  if(v>=10000)return (v/10000).toFixed(1)+'万';
  return v.toFixed(0);
}
var fmtNum=formatMoney;

// === Delete Order ===
function confirmDeleteOrder(){document.getElementById('order-confirm').classList.remove('hidden');orderDeleteId=orderEditId}
async function doDeleteOrder(){
  if(!orderDeleteId)return;
  document.getElementById('order-confirm').classList.add('hidden');
  var {error}=await sb.from('orders').delete().eq('id',orderDeleteId);
  if(error){showToast('删除失败: '+error.message);return}
  showToast('订单已删除');
  closeOrderForm();
  await loadOrders();
  renderOrders();
  renderList();
}

// === Client Card: Add order summary ===
var _clientOrderCache={};
function getClientOrderSummary(clientId){
  if(_clientOrderCache[clientId])return _clientOrderCache[clientId];
  var orders=allOrders.filter(function(o){return o.client_id===clientId});
  var total=0,count=orders.length;
  for(var i=0;i<orders.length;i++)total+=orders[i]._amount||0;
  var r={count:count,total:total};
  _clientOrderCache[clientId]=r;
  return r;
}
// === Init ===
buildFilterSelect();
sb.auth.getSession().then(async function(res){
  if(res.data&&res.data.session){
    currentUser=res.data.session.user;
    // Load profile for company/role
    var {data:profile}=await sb.from('profiles').select('role,company_id').eq('user_id',currentUser.id).single();
    if(profile){currentUserRole=profile.role||'user';isSuperAdmin=profile.role==='super_admin';currentCompanyId=profile.company_id;}
    if(!currentCompanyId){document.getElementById('login-screen').classList.remove('hidden');return}
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    if(isSuperAdmin||currentUserRole==='admin')document.getElementById('tab-admin').classList.remove('hidden');
  if(isSuperAdmin){document.getElementById('admin-tab-companies-manage').classList.remove('hidden');document.getElementById('admin-tab-companies').classList.remove('hidden');}
    await loadCustomTypes();
    buildFilterSelect();
    buildTypeGrid();
    buildStageGrid();
    await loadClients();
    loadCompanies();
  }else document.getElementById('login-screen').classList.remove('hidden');
}).catch(function(){document.getElementById('login-screen').classList.remove('hidden')});

// === 鍏徃鍚嶇О鑷姩琛ュ叏 ===
let acTimer=null,acSelected=-1;
function setupCompanyAutocomplete(){
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
  var user=sb.auth.user();
  if(!user)return;
  var {data}=await sb.from('companies').select('id,name,status').eq('created_by',user.id).order('created_at',{ascending:false}).limit(1);
  if(!data||data.length===0){showCompanyRegScreen();return}
  if(data[0].status==='approved'){
    currentCompanyId=data[0].id;
    await sb.from('profiles').upsert({user_id:user.id,email:user.email,company_id:currentCompanyId,role:'admin'},{onConflict:'user_id'});
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
    switchTab('home');
  }else if(data[0].status==='rejected'){
    showCompanyRegScreen();
  }
}

/* ── Admin Company Management ── */
var allAdminCompanies=[];
async function loadAdminCompanies(){
  try{var r=await fetch(SUPABASE_URL+'/rest/v1/companies?select=*&order=name',{headers:{'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY}});if(r.ok){allAdminCompanies=await r.json();}}catch(e){}
}
function renderAdminCompanies(){
  var el=document.getElementById('admin-companies-manage-list');
  if(!allAdminCompanies.length){el.innerHTML='<div class="empty-state">暂无公司，点击"+ 新建公司"创建</div>';return}
  var h='';
  for(var i=0;i<allAdminCompanies.length;i++){
    var co=allAdminCompanies[i];
    var badge=co.status==='pending'?'badge-pending':'badge-approved';
    var label=co.status==='pending'?'待审核':co.status==='approved'?'已通过':'已拒绝';
    h+='<div class="company-row"><div class="company-info"><div class="company-name">'+escHtml(co.name)+'</div><div class="company-meta">税号: '+escHtml(co.tax_id||'-')+' · <span class="company-badge '+badge+'">'+label+'</span></div></div><div class="dn-actions"><button class="btn-sm btn-sm-primary" onclick="openCompanyForm('+co.id+')">编辑</button><button class="btn-sm btn-sm-danger" onclick="delCompanyById('+co.id+')">删除</button></div></div>';
  }
  el.innerHTML=h;
}
var _companyFormId=null;
function openCompanyForm(id){
  _companyFormId=id||null;
  var co=id?allAdminCompanies.find(function(c){return c.id===id;}):null;
  var div=document.createElement('div');div.className='confirm-overlay';div.id='company-form-modal';
  div.innerHTML='<div class="confirm-box"><p>'+(id?'编辑公司':'新建公司')+'</p><input id="co-name" placeholder="公司名称" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:10px" value="'+escHtml(co?co.name:'')+'"><input id="co-tax-id" placeholder="统一社会信用代码（18位）" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px" value="'+escHtml(co?co.tax_id:'')+'"><div class="btns"><button class="btn-cancel" onclick="closeCompanyFormModal()">取消</button><button class="btn-confirm" onclick="saveCompany()">保存</button></div></div>';
  document.body.appendChild(div);
}
function closeCompanyFormModal(){var m=document.getElementById('company-form-modal');if(m)m.remove();}
async function saveCompany(){
  var name=document.getElementById('co-name').value.trim();
  var tax=document.getElementById('co-tax-id').value.trim();
  if(!name){alert('请输入公司名称');return}
  var payload={name:name,tax_id:tax||null,status:'approved'};
  try{
    if(_companyFormId){
      var r=await fetch(SUPABASE_URL+'/rest/v1/companies?id=eq.'+_companyFormId,{method:'PATCH',headers:{'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(payload)});
      if(!r.ok){var t=await r.text();alert('更新失败: '+t);return}
    }else{
      var r=await fetch(SUPABASE_URL+'/rest/v1/companies',{method:'POST',headers:{'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(payload)});
      if(!r.ok){var t=await r.text();alert('创建失败: '+t);return}
    }
    closeCompanyFormModal();
    await loadAdminCompanies();renderAdminCompanies();
    showToast(_companyFormId?'公司已更新':'公司已创建');
  }catch(e){alert('操作失败: '+e.message);}
}
function delCompanyById(id){var co=allAdminCompanies.find(function(c){return c.id===id;});if(co)deleteCompany(id,co.name);}
async function deleteCompany(id,name){
  if(!confirm('确定删除公司「'+name+'」？此操作不可恢复！'))return;
  try{
    var r=await fetch(SUPABASE_URL+'/rest/v1/companies?id=eq.'+id,{method:'DELETE',headers:{'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY}});
    if(!r.ok){var t=await r.text();alert('删除失败: '+t);return}
    await loadAdminCompanies();renderAdminCompanies();
    showToast('公司已删除');
  }catch(e){alert('删除失败: '+e.message);}
}

async function submitCompanyReg(){
  var name=document.getElementById('cr-name').value.trim();
  var tax=document.getElementById('cr-tax-id').value.trim();
  var er=document.getElementById('cr-err');
  er.style.display='none';
  if(!name||!tax){er.textContent='请填写公司名称和税号';er.style.display='block';return}
  if(tax.length!==18){er.textContent='税号应为18位信用代码';er.style.display='block';return}
  var user=sb.auth.user();
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
  var {error}=await sb.from('companies').update({status:'approved',approved_by:sb.auth.user().id,approved_at:new Date().toISOString()}).eq('id',id);
  if(error){alert('操作失败: '+error.message);return}
  // Set the creator as admin
  var {data:comp}=await sb.from('companies').select('created_by').eq('id',id).single();
  if(comp){await sb.from('profiles').upsert({user_id:comp.created_by,company_id:id,role:'admin'},{onConflict:'user_id'});}
  loadPendingCompanies();
}

async function rejectCompany(id){
  if(!confirm('确定拒绝该公司的注册申请吗?'))return;
  await sb.from('companies').update({status:'rejected'}).eq('id',id);
  loadPendingCompanies();
}

// escHtml defined below (regex-based)
function selectCompany(c){document.getElementById('f-name').value=c.name;hideAC();fillCompanyInfo(c);}
setupCompanyAutocomplete();

/* ── Admin: Department Management ── */
var allDepartments=[];
var adminUserList=[];
var currentAdminTab='users';
var deptExpanded={};

async function loadAdminData(){
  // Load departments
  var {data:depts,error}=await sb.from('departments').select('*').eq('company_id',currentCompanyId).order('name');
  if(!error)allDepartments=depts||[];
  // Load roles
  var {data:roles,error:rerr}=await sb.from('roles').select('*').eq('company_id',currentCompanyId).order('name');
  if(!rerr)allRoles=roles||[];
  // Load all users for admin (profiles now has email column populated at login)
  if(currentUserRole==='super_admin'){await loadAdminCompanies();}
  if(currentUserRole==='admin'||currentUserRole==='super_admin'){
    if(currentUserRole==='super_admin'){
      try{var {data:rpcUsers,error:rpcErr}=await sb.rpc('list_all_users');if(!rpcErr&&rpcUsers&&rpcUsers.length){adminUserList=rpcUsers;allUsers=rpcUsers;populatePerfSelects();}}catch(e){}
      if(!adminUserList.length){
        try{var ur=await fetch(SUPABASE_URL+'/rest/v1/profiles?select=*',{headers:{'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY}});if(ur.ok){adminUserList=await ur.json();allUsers=adminUserList;populatePerfSelects();}}catch(e){}
      }
    }else{
      var {data:pr}=await sb.from('profiles').select('*').eq('company_id',currentCompanyId);
      adminUserList=pr||[];allUsers=pr||[];populatePerfSelects();
    }
  }
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
  var modNames={clients:'客户',orders:'订单',sales:'销售',inventory:'库存',admin:'系统',reports:'报表'};
  
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
    if(perms.inventory)labels.push('库存:'+(permMap[perms.inventory]||perms.inventory));
    el.innerHTML+='<div class="role-card"><div class="rc-info"><div class="rc-name">'+escHtml(r.name)+'</div><div class="rc-perms">'+escHtml(labels.join(' | '))+'</div></div><div class="rc-actions"><button class="btn-sm btn-sm-primary" onclick="openRoleForm('+r.id+')">编辑</button><button class="btn-sm btn-sm-danger" onclick="deleteRole('+r.id+')">删除</button></div></div>';
  }
}

function openRoleForm(id){
  var r=id?allRoles.find(function(x){return x.id===id}):null;
  var perms=r?r.permissions:null;
  if(typeof perms==='string')perms=JSON.parse(perms);
  perms=perms||{};
  var modules=['clients','orders','sales','inventory','admin','reports'];
  var modNames={clients:'客户管理',orders:'订单管理',sales:'销售管理',inventory:'库存管理',admin:'系统管理',reports:'报表'};
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
  await loadAdminData();
  renderAdminRoles();
}

async function deleteRole(id){
  if(!confirm('确定删除此角色？'))return;
  // Unset role_id for users assigned to this role
  await sb.from('profiles').update({role_id:null,role:'user'}).eq('role_id',id);
  var {error}=await sb.from('roles').delete().eq('id',id);
  if(error){showToast('删除失败: '+error.message);return}
  showToast('角色已删除');
  await loadAdminData();
  renderAdminRoles();
  renderAdminUsers();
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
    fab.classList.remove('hidden');fab.textContent='+';fab.onclick=function(){openSalesForm()};
    if(!allClients.length)loadClients().then(function(){switchSalesTab('leads')});else switchSalesTab('leads');
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
  if(sub==='inventory'){
    tabs[0].classList.add('active');
    if(itabs)itabs.style.display='';
    if(!allProducts.length){loadCategories().then(function(){loadWarehouses().then(function(){switchInventoryTab('products')})})}else{switchInventoryTab('products')}
  }else if(sub==='suppliers'){
    tabs[1].classList.add('active');
    spv.classList.remove('hidden');
    loadSuppliers();
  }else if(sub==='purchase'){
    tabs[2].classList.add('active');
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
  var ut=document.getElementById('admin-users');
  var dt=document.getElementById('admin-depts');
  var rt=document.getElementById('admin-roles');
  var pt=document.getElementById('admin-perms');
  var ct=document.getElementById('admin-companies');
  var cm=document.getElementById('admin-companies-manage');
  var subs=document.querySelectorAll('.admin-subtab');
  ut.classList.add('hidden');dt.classList.add('hidden');rt.classList.add('hidden');if(pt)pt.classList.add('hidden');ct.classList.add('hidden');if(cm)cm.classList.add('hidden');
  var ep=document.getElementById('admin-employees');if(ep)ep.classList.add('hidden');
  var lp=document.getElementById('admin-logs');if(lp)lp.classList.add('hidden');
  var cp=document.getElementById('admin-config');if(cp)cp.classList.add('hidden');
  var sp=document.getElementById('admin-security');if(sp)sp.classList.add('hidden');
  for(var i=0;i<subs.length;i++)subs[i].classList.remove('active');
  if(tab==='users'){ut.classList.remove('hidden');subs[0].classList.add('active');await loadAdminData();renderAdminUsers();}
  else if(tab==='depts'){dt.classList.remove('hidden');subs[1].classList.add('active');await loadAdminData();renderAdminDepts();}
  else if(tab==='roles'){rt.classList.remove('hidden');subs[2].classList.add('active');await loadAdminData();renderAdminRoles();}
  else if(tab==='perms'){pt.classList.remove('hidden');subs[3].classList.add('active');await loadAdminData();renderAdminPerms();}
  else if(tab==='companies_manage'){cm.classList.remove('hidden');subs[4].classList.add('active');await loadAdminCompanies();renderAdminCompanies();}
  else if(tab==='companies'){ct.classList.remove('hidden');subs[5].classList.add('active');loadPendingCompanies();}
  else if(tab==='employees'){var ep=document.getElementById('admin-employees');ep.classList.remove('hidden');subs[6].classList.add('active');await loadAdminData();renderAdminEmployees();}
  else if(tab==='logs'){var lp=document.getElementById('admin-logs');lp.classList.remove('hidden');subs[7].classList.add('active');await loadOperationLogs();renderOperationLogs();}
  else if(tab==='config'){var cp=document.getElementById('admin-config');cp.classList.remove('hidden');subs[8].classList.add('active');switchConfigTab('fields');}
  else if(tab==='security'){var sp=document.getElementById('admin-security');sp.classList.remove('hidden');subs[9].classList.add('active');renderSecurityPanel();}
}

/* ── Users ── */
var allRoles=[];

function renderAdminUsers(){
  var q=(document.getElementById('admin-user-search').value||'').trim().toLowerCase();
  var list=adminUserList.filter(function(u){return !q||(u.email||'').toLowerCase().indexOf(q)>=0||(u.display_name||'').toLowerCase().indexOf(q)>=0||(u.position||'').toLowerCase().indexOf(q)>=0;});
  var el=document.getElementById('admin-user-list');
  if(list.length===0){el.innerHTML='<div class="empty-state">暂无员工</div>';return}
  var h='<table class="user-table"><thead><tr><th>姓名</th><th>邮箱</th><th>公司</th><th>部门</th><th>岗位</th><th>状态</th><th>手机</th><th>角色</th><th>操作</th></tr></thead><tbody>';
  for(var i=0;i<list.length;i++){
    var u=list[i];
    var deptName='-';
    for(var j=0;j<allDepartments.length;j++){if(allDepartments[j].id===u.department_id){deptName=allDepartments[j].name;break}}
    var companyName='-';for(var ci=0;ci<(typeof allAdminCompanies!=='undefined'?allAdminCompanies:allCompanies||[]).length;ci++){var cab=typeof allAdminCompanies!=='undefined'?allAdminCompanies:allCompanies||[];if(cab[ci].id===u.company_id){companyName=cab[ci].name;break}}
    var roleName=u.role||'user';
    if(u.role_id&&allRoles){for(var k=0;k<allRoles.length;k++){if(allRoles[k].id===u.role_id){roleName=allRoles[k].name;break}}}
    var status=u.status||'active';
    var statusLabel={active:'在职',inactive:'停用',leave:'离职'}[status]||status;
    h+='<tr><td><strong>'+escHtml(u.display_name||'-')+'</strong></td>';
    h+='<td>'+escHtml(u.email||'-')+'</td>';
    h+='<td>'+escHtml(companyName)+'</td>';
    h+='<td>'+escHtml(deptName)+'</td>';
    h+='<td>'+escHtml(u.position||'-')+'</td>';
    h+='<td><span class="badge-status '+status+'">'+statusLabel+'</span></td>';
    h+='<td>'+escHtml(u.phone||'-')+'</td>';
    h+='<td>'+escHtml(roleName)+'</td>';
    h+='<td><button class="btn-sm btn-sm-primary" onclick="openUserEditForm(\''+u.user_id+'\')" style="font-size:11px;padding:3px 10px">编辑</button>'+(isSuperAdmin?' <button class="btn-sm btn-sm-danger" onclick="openResetPwdForm(\''+u.user_id+'\',\''+escHtml(u.email||u.display_name||'-')+'\')" style="font-size:11px;padding:3px 8px">重置密码</button>':'')+'</td></tr>';
  }
  el.innerHTML=h+'</tbody></table>';
}

async function setUserRole(userId,role){
  var {error}=await sb.from('profiles').upsert({user_id:userId,role:role},{onConflict:'user_id'});
  if(error){alert('操作失败: '+error.message);return}
  for(var i=0;i<adminUserList.length;i++){if(adminUserList[i].user_id===userId){adminUserList[i].role=role;break;}}
  renderAdminUsers();
}

function openUserDeptSelect(userId,currentDept){
  var opts='<option value="">无部门</option>';
  for(var i=0;i<allDepartments.length;i++){opts+='<option value="'+allDepartments[i].id+'"'+((allDepartments[i].name===currentDept)?' selected':'')+'>'+escHtml(allDepartments[i].name)+'</option>';}
  var div=document.createElement('div');div.className='confirm-overlay';div.id='user-dept-modal';
  div.innerHTML='<div class="confirm-box"><p>为用户选择部门</p><select id="user-dept-select" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px">'+opts+'</select><div class="btns"><button class="btn-cancel" onclick="closeUserDeptModal()">取消</button><button class="btn-confirm" onclick="commitUserDept()">确定</button></div></div>';
  document.body.appendChild(div);
  div._userId=userId;
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
    (isSuperAdmin?'<label style="font-size:13px;display:block;margin-bottom:4px">公司</label><input id="uedit-company" list="uedit-company-list" placeholder="输入或选择公司" autocomplete="off" value="'+escHtml(function(){for(var i=0;i<allCompanies.length;i++){if(allCompanies[i].id===u.company_id)return allCompanies[i].name}return ''}())+'" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:10px"><datalist id="uedit-company-list">'+allCompanies.map(function(c){return '<option value="'+escHtml(c.name)+'">';}).join('')+'</datalist>':'')+
    '<label style="font-size:13px;display:block;margin-bottom:4px">部门</label><select id="uedit-dept" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:10px">'+deptOpts+'</select>'+
    '<label style="font-size:13px;display:block;margin-bottom:4px">角色</label><select id="uedit-role" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:10px">'+roleOpts+'</select>'+
    '<label style="font-size:13px;display:block;margin-bottom:4px">状态</label><select id="uedit-status" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:10px"><option value="active"'+(u.status==='active'||!u.status?' selected':'')+'>在职</option><option value="inactive"'+(u.status==='inactive'?' selected':'')+'>停用</option><option value="leave"'+(u.status==='leave'?' selected':'')+'>离职</option></select>'+
    '<div class="btns"><button class="btn-cancel" onclick="closeUserEditForm()">取消</button><button class="btn-confirm" onclick="saveUserEdit(\''+userId+'\')">保存</button></div></div>';
  document.body.appendChild(div);
}

function closeUserEditForm(){var m=document.getElementById('user-edit-modal');if(m)m.remove()}

async function saveUserEdit(userId){
  var roleVal=document.getElementById('uedit-role').value;
  var role=roleVal,roleId=null;
  if(roleVal&&roleVal.startsWith('r_')){roleId=parseInt(roleVal.slice(2));role='custom'}
  var companyId=null;if(isSuperAdmin){var cname=document.getElementById('uedit-company').value.trim();if(cname){var found=null;var cab=typeof allAdminCompanies!=='undefined'?allAdminCompanies:allCompanies||[];for(var i=0;i<cab.length;i++){if(cab[i].name===cname){found=cab[i];break}}if(found){companyId=found.id}}}
  var data={
    display_name:document.getElementById('uedit-name').value.trim(),
    position:document.getElementById('uedit-position').value.trim(),
    phone:document.getElementById('uedit-phone').value.trim(),
    department_id:parseInt(document.getElementById('uedit-dept').value)||null,
    role:role,role_id:roleId,
    status:document.getElementById('uedit-status').value,
    company_id:companyId
  };
  var error=null;
  if(isSuperAdmin||currentUserRole==='admin'){
    var ur=await fetch(SUPABASE_URL+'/rest/v1/profiles?user_id=eq.'+encodeURIComponent(userId),{
      method:'PATCH',headers:{'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'},
      body:JSON.stringify(data)
    });
    if(!ur.ok){var j=await ur.json().catch(function(){});error={message:j&&j.message||ur.statusText}}
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
  renderAdminUsers();
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
  if(!name){alert('请输入部门名称');return}
  var parentId=parseInt(document.getElementById('dept-parent').value)||null;
  var selCid=isSuperAdmin?document.getElementById('dept-company'):null;
  var payload={name:name,parent_id:parentId,company_id:selCid&&selCid.value?parseInt(selCid.value):currentCompanyId};
  if(isSuperAdmin||currentUserRole==='admin'){
    var prefix=deptFormId?'PATCH':'POST';
    var url=deptFormId?SUPABASE_URL+'/rest/v1/departments?id=eq.'+deptFormId:SUPABASE_URL+'/rest/v1/departments';
    try{var dr=await fetch(url,{method:prefix,headers:{'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(payload)});
    if(!dr.ok){var dj=await dr.json().catch(function(){});alert('保存失败: '+(dj&&dj.message||dr.statusText));return}}
    catch(e){alert('网络错误: '+e.message);return}
  }else{
    if(deptFormId){var{error}=await sb.from('departments').update(payload).eq('id',deptFormId);if(error){alert('保存失败: '+error.message);return}}
    else{var{error}=await sb.from('departments').insert(payload);if(error){alert('创建失败: '+error.message);return}}
  }
  document.getElementById('dept-form-modal').remove();
  await loadAdminData();renderAdminDepts();
}

async function deleteDept(id,name){
  if(!confirm('确定删除部门「'+name+'」？下属用户将变为无部门。'))return;
  // Unlink users first
  await sb.from('profiles').update({department_id:null}).eq('department_id',id);
  var error=null;
  if(isSuperAdmin||currentUserRole==='admin'){
    try{var dr=await fetch(SUPABASE_URL+'/rest/v1/departments?id=eq.'+id,{method:'DELETE',headers:{'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Prefer':'return=representation'}});
    if(!dr.ok){var dj=await dr.json().catch(function(){});error={message:dj&&dj.message||dr.statusText}}
    }catch(e){error={message:e.message}}
  }else{
    var res=await sb.from('departments').delete().eq('id',id);error=res.error;
  }
  if(error){alert('删除失败: '+error.message);return}
  await loadAdminData();renderAdminDepts();
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

function escHtml(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function closeUserDeptModal(){var m=document.getElementById('user-dept-modal');if(m)m.remove();}
function commitUserDept(){var m=document.getElementById('user-dept-modal');var uid=m?m._userId:null;var deptId=parseInt(document.getElementById('user-dept-select').value)||null;if(uid)doSetUserDeptCommit(uid,deptId);}
async function doSetUserDeptCommit(userId,deptId){var{error}=await sb.from('profiles').upsert({user_id:userId,department_id:deptId},{onConflict:'user_id'});if(error){alert('操作失败: '+error.message);return}for(var i=0;i<adminUserList.length;i++){if(adminUserList[i].user_id===userId){adminUserList[i].department_id=deptId;break;}}var m=document.getElementById('user-dept-modal');if(m)m.remove();renderAdminUsers();}
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
  var res=await fetch(SUPABASE_URL+'/rest/v1/profiles',{method:'POST',headers:{'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates'},body:JSON.stringify(body)});
  if(!res.ok){var txt=await res.text();console.error('Profile write failed:',res.status,txt);showToast('Profile write failed: HTTP '+res.status);return}
  closeAddUserForm();
  showToast('用户创建成功');
  await loadAdminData();
  renderAdminUsers();
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
  var sk=SUPABASE_SERVICE_KEY;
  if(!sk){showToast('请先配置 SUPABASE_SERVICE_KEY（Supabase Dashboard > Settings > API）');return}
  try{
    var res=await fetch(SUPABASE_URL+'/auth/v1/admin/users/'+_resetPwdUserId,{method:'PUT',headers:{'Authorization':'Bearer '+sk,'Content-Type':'application/json'},body:JSON.stringify({password:pwd})});
    if(!res.ok){var txt=await res.text();showToast('重置失败 HTTP '+res.status+': '+txt);return}
    closeResetPwdForm();
    showToast('密码已重置');
  }catch(e){showToast('网络错误: '+e.message)}
}


// ═══════════ Sales Pipeline ═══════════
var currentSalesTab='leads';
allLeads=[];var allQuotations=[],allContracts=[],allPayments=[],allQfTemplates=[];
var allTargets=[],allPerfRecords=[],allCommission=[],allCommissionRules=[];
var allSuppliers=[],allSupCategories=[];
var leditId=null,qeditId=null,ceditId=null,peditId=null;
var qfItems=[],lfFollowUps=[];

function switchSalesTab(tab){
  currentSalesTab=tab;
  var tbs=document.querySelectorAll('#sales-tabs-bar .sales-subtab');
  for(var i=0;i<tbs.length;i++)tbs[i].classList.toggle('active',tbs[i].textContent.indexOf(tab==='leads'?'线索':tab==='quotations'?'报价':tab==='contracts'?'合同':'回款')>=0);
  document.getElementById('sales-leads-panel').classList.toggle('hidden',tab!=='leads');
  document.getElementById('sales-quotations-panel').classList.toggle('hidden',tab!=='quotations');
  document.getElementById('sales-contracts-panel').classList.toggle('hidden',tab!=='contracts');
  document.getElementById('sales-payments-panel').classList.toggle('hidden',tab!=='payments');
  var fab=document.getElementById('main-fab');
  fab.onclick=function(){openSalesForm()};
  fab.textContent='+';
  if(tab==='leads'){if(!allLeads.length)loadLeads();else renderLeads()}
  else if(tab==='quotations'){if(!allQuotations.length)loadQuotations();else renderQuotations()}
  else if(tab==='contracts'){if(!allContracts.length)loadContracts();else renderContracts()}
  else if(tab==='payments'){if(!allPayments.length)loadPayments();else renderPayments()}
}


// ── Quotations ──
async function loadQuotations(){
  try{
    var r=await sb.from('quotations').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
    if(r.error){console.error('loadQuotations:',r.error);return}
    allQuotations=r.data||[];
  }catch(e){console.error('loadQuotations error:',e)}
}


function renderQuotations(){
  var filter=document.getElementById('quote-status-filter').value;
  var q=(document.getElementById('quote-search').value||'').trim().toLowerCase();
  var list=allQuotations.slice();
  if(filter!=='all')list=list.filter(function(x){return x.status===filter});
  if(q)list=list.filter(function(x){return (x.title||'').toLowerCase().indexOf(q)>=0||(x.notes||'').toLowerCase().indexOf(q)>=0});
  var total=list.length,draft=0,sent=0,approved=0,val=0;
  for(var i=0;i<list.length;i++){val+=list[i].total_amount||0;if(list[i].status==='draft')draft++;else if(list[i].status==='sent')sent++;else if(list[i].status==='approved')approved++}
  document.getElementById('quote-stats').innerHTML='<div class="stat-card"><div class="stat-num">'+total+'</div><div class="stat-label">报价数</div></div><div class="stat-card"><div class="stat-num">'+formatMoney(val)+'</div><div class="stat-label">总金额</div></div><div class="stat-card"><div class="stat-num">'+draft+'</div><div class="stat-label">草稿</div></div><div class="stat-card"><div class="stat-num">'+approved+'</div><div class="stat-label">已批准</div></div>';
  var grid=document.getElementById('quote-grid'),empty=document.getElementById('quote-empty');
  if(!list.length){grid.innerHTML='';empty.classList.remove('hidden');return}
  empty.classList.add('hidden');
  var h='',statusMap={draft:'草稿',sent:'已发送',approved:'已批准',rejected:'已拒绝',expired:'已过期',converted:'已转订单'};
  for(var i=0;i<list.length;i++){
    var qt=list[i],sc='sb-'+qt.status;
    var cn='';var cl=allClients.find(function(x){return x.id===qt.client_id});if(cl)cn=escHtml(cl.name);
    h+='<div class="pipe-card" onclick="openQuoteForm(\''+qt.id+'\')"><div class="pc-header"><span class="pc-name">'+escHtml(qt.title)+'</span><span class="pc-amount">'+formatMoney(qt.total_amount||0)+'</span></div>';
    if(cn)h+='<div class="pc-company">🏢 '+cn+'</div>';
    var meta=[];
    if(qt.discount_rate>0)meta.push('<span style=\'color:#EF4444\'>折扣 '+qt.discount_rate+'%</span>');
    if(qt.tax_rate>0)meta.push('<span>税 '+qt.tax_rate+'%</span>');
    h+='<div class="pc-meta"><span class="status-badge '+sc+'">'+(statusMap[qt.status]||qt.status)+'</span>'+(qt.valid_until?'<span>有效期: '+qt.valid_until+'</span>':'')+meta.join(' ')+'</div>';
    h+='</div>';
  }
  grid.innerHTML=h;
}

function openQuoteForm(id){
  qeditId=id||null;qfItems=[];
  document.getElementById('quote-form-title').textContent=id?'编辑报价':'创建报价';
  document.getElementById('quote-btn-delete').classList.toggle('hidden',!id);
  document.getElementById('quote-btn-convert').classList.toggle('hidden',!id||!(id&&allQuotations.find(function(x){return x.id===id&&x.status==='approved'})));
  document.getElementById('qf-title').value='';
  document.getElementById('qf-valid-until').value='';
  document.getElementById('qf-discount-rate').value='0';
  document.getElementById('qf-tax-rate').value='0';
  document.getElementById('qf-status').value='draft';
  document.getElementById('qf-notes').value='';
  document.getElementById('qf-total').textContent='¥0.00';
  document.getElementById('qf-discount-amount').textContent='-¥0.00';
  document.getElementById('qf-tax-amount').textContent='¥0.00';
  document.getElementById('qf-grand-total').textContent='¥0.00';
  var csel=document.getElementById('qf-client');
  csel.innerHTML='<option value="">选择客户...</option>';
  for(var i=0;i<allClients.length;i++)csel.innerHTML+='<option value="'+allClients[i].id+'">'+escHtml(allClients[i].name)+'</option>';
  var tsel=document.getElementById('qf-template');
  tsel.innerHTML='<option value="">不使用模板</option>';
  for(var i=0;i<allQfTemplates.length;i++)tsel.innerHTML+='<option value="'+allQfTemplates[i].id+'">'+escHtml(allQfTemplates[i].name)+'</option>';
  if(id){var qt=allQuotations.find(function(x){return x.id===id});if(qt){
    document.getElementById('qf-title').value=qt.title||'';
    document.getElementById('qf-valid-until').value=qt.valid_until||'';
    document.getElementById('qf-discount-rate').value=qt.discount_rate||0;
    document.getElementById('qf-tax-rate').value=qt.tax_rate||0;
    document.getElementById('qf-status').value=qt.status||'draft';
    document.getElementById('qf-notes').value=qt.notes||'';
    csel.value=qt.client_id||'';
    qfItems=qt.items||[];if(typeof qfItems==='string')qfItems=JSON.parse(qfItems);
  }}
  renderQfItems();
  updateQfTotals();
  document.getElementById('quote-modal').classList.remove('hidden');
}
function updateQfTotals(){
  var subtotal=0;for(var i=0;i<qfItems.length;i++)subtotal+=(qfItems[i].qty||0)*(qfItems[i].price||0);
  var dr=parseFloat(document.getElementById('qf-discount-rate').value)||0;
  var da=dr>0?Math.round(subtotal*dr/100*100)/100:0;
  var ad=subtotal-da;
  var tr=parseFloat(document.getElementById('qf-tax-rate').value)||0;
  var ta=tr>0?Math.round(ad*tr/100*100)/100:0;
  var gt=ad+ta;
  document.getElementById('qf-total').textContent='¥'+gt.toFixed(2);
  document.getElementById('qf-discount-amount').textContent='-¥'+da.toFixed(2);
  document.getElementById('qf-tax-amount').textContent='¥'+ta.toFixed(2);
  document.getElementById('qf-grand-total').textContent='¥'+gt.toFixed(2);
}
function applyQfTemplate(){
  var tid=document.getElementById('qf-template').value;if(!tid)return;
  var tpl=allQfTemplates.find(function(x){return x.id==parseInt(tid)});if(!tpl)return;
  if(tpl.items&&tpl.items.length){qfItems=JSON.parse(JSON.stringify(tpl.items));renderQfItems()}
  if(tpl.discount_rate)document.getElementById('qf-discount-rate').value=tpl.discount_rate;
  if(tpl.tax_rate)document.getElementById('qf-tax-rate').value=tpl.tax_rate;
  updateQfTotals();
}
function removeContractFile(){document.getElementById('cf-file').value='';document.getElementById('cf-file-info').classList.add('hidden');document.getElementById('cf-file-link').href='#';}
function saveContractTemplate(){var n=prompt('模板名称:');if(!n)return;
  var items=[];for(var i=0;i<qfItems.length;i++)items.push({name:qfItems[i].name||'',spec:qfItems[i].spec||'',unit:qfItems[i].unit||'',qty:qfItems[i].qty||1,price:qfItems[i].price||0});
  var dr=parseFloat(document.getElementById('qf-discount-rate').value)||0;
  var tr=parseFloat(document.getElementById('qf-tax-rate').value)||0;
  sb.from('quote_templates').insert({company_id:currentCompanyId,name:n,items:items,discount_rate:dr,tax_rate:tr,created_at:new Date().toISOString()}).then(function(r){if(r.error)showToast('保存模板失败');else{loadQfTemplates();showToast('模板已保存')}});
}
function loadQfTemplates(){
  sb.from('quote_templates').select('*').eq('company_id',currentCompanyId).order('name').then(function(r){allQfTemplates=r.data||[]});
}
function convertQuoteToOrder(){
  if(!qeditId)return;
  var qt=allQuotations.find(function(x){return x.id===qeditId});if(!qt)return;
  confirmDialog('将此报价转为订单？',async function(){
    var amountEnc=await encryptAmount((qt.total_amount||0).toFixed(2));
    var order={company_id:currentCompanyId,user_id:currentUser.id,client_id:qt.client_id,
      order_number:'ORD-'+Date.now().toString(36).toUpperCase(),
      project_name:qt.title,amount_enc:amountEnc,
      stage:'谈判中',notes:'从报价 '+qt.title+' 转换',created_at:new Date().toISOString()};
    var r=await sb.from('orders').insert(order);
    if(r.error){showToast('转换失败: '+r.error.message);return}
    await sb.from('quotations').update({status:'converted',updated_at:new Date().toISOString()}).eq('id',qeditId);
    closeQuoteForm();await loadQuotations();await loadOrders();showToast('报价已转为订单');
  });
}
function closeQuoteForm(){document.getElementById('quote-modal').classList.add('hidden');qeditId=null;qfItems=[]}

function addQuoteItem(){qfItems.push({name:'',spec:'',unit:'',qty:1,price:0});renderQfItems()}

function renderQfItems(){
  var el=document.getElementById('qf-items'),h='',total=0;
  for(var i=0;i<qfItems.length;i++){
    var it=qfItems[i],amt=(it.qty||0)*(it.price||0);total+=amt;
    h+='<div class="quote-item-row"><input class="qi-name" placeholder="名称" value="'+escHtml(it.name||'')+'" oninput="qfUpdateItem('+i+',\'name\',this.value)"><input class="qi-num" type="number" placeholder="数量" value="'+(it.qty||1)+'" oninput="qfUpdateItem('+i+',\'qty\',parseFloat(this.value)||0)"><input class="qi-price" type="number" step="0.01" placeholder="单价" value="'+(it.price||0)+'" oninput="qfUpdateItem('+i+',\'price\',parseFloat(this.value)||0)"><span class="qi-amount">'+formatMoney(amt)+'</span><button class="qi-del" onclick="qfDeleteItem('+i+')">×</button></div>';
  }
  el.innerHTML=h||'<div style="font-size:12px;color:var(--text3);padding:12px;text-align:center">点击"+ 添加行"添加报价项目</div>';
  document.getElementById('qf-total').textContent=formatMoney(total);
}

function qfUpdateItem(i,field,val){qfItems[i][field]=val;renderQfItems()}
function qfDeleteItem(i){qfItems.splice(i,1);renderQfItems()}

async function saveQuote(){
  var title=document.getElementById('qf-title').value.trim();if(!title){showToast('请输入报价标题');return}
  var cid=document.getElementById('qf-client').value;if(!cid){showToast('请选择关联客户');return}
  var subtotal=0;for(var i=0;i<qfItems.length;i++)subtotal+=(qfItems[i].qty||0)*(qfItems[i].price||0);
  var discountRate=parseFloat(document.getElementById('qf-discount-rate').value)||0;
  var discountAmount=discountRate>0?Math.round(subtotal*discountRate/100*100)/100:0;
  var afterDiscount=subtotal-discountAmount;
  var taxRate=parseFloat(document.getElementById('qf-tax-rate').value)||0;
  var taxAmount=taxRate>0?Math.round(afterDiscount*taxRate/100*100)/100:0;
  var grandTotal=afterDiscount+taxAmount;
  var data={
    company_id:currentCompanyId,user_id:currentUser.id,title:title,client_id:cid,
    items:qfItems,subtotal:subtotal,total_amount:grandTotal,
    discount_rate:discountRate,discount_amount:discountAmount,
    tax_rate:taxRate,tax_amount:taxAmount,
    status:document.getElementById('qf-status').value,
    valid_until:document.getElementById('qf-valid-until').value||null,
    notes:document.getElementById('qf-notes').value.trim(),
    updated_at:new Date().toISOString()
  };
  var error;
  if(qeditId){var r=await sb.from('quotations').update(data).eq('id',qeditId);error=r.error}
  else{data.created_at=new Date().toISOString();var r2=await sb.from('quotations').insert(data);error=r2.error}
  if(error){showToast('保存失败: '+error.message);return}
  closeQuoteForm();await loadQuotations();showToast(qeditId?'报价已更新':'报价已创建');
}

function confirmDeleteQuote(){if(qeditId)confirmDialog('确定删除该报价？',async function(){await sb.from('quotations').delete().eq('id',qeditId);closeQuoteForm();loadQuotations();showToast('报价已删除')})}

// ── Contracts ──
async function loadContracts(){
  var grid=document.getElementById('contract-grid');grid.innerHTML='<div class="loading"><span class="spinner"></span>加载中...</div>';
  var {data,error}=await sb.from('contracts').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
  if(error){grid.innerHTML='<div class="empty">加载失败</div>';return}
  allContracts=data||[];renderContracts();
}

function renderContracts(){
  var filter=document.getElementById('contract-status-filter').value;
  var q=(document.getElementById('contract-search').value||'').trim().toLowerCase();
  var list=allContracts.slice();
  if(filter!=='all')list=list.filter(function(x){return (filter==='expiring'?isContractExpiring(x):x.status===filter)});
  if(q)list=list.filter(function(x){return (x.title||'').toLowerCase().indexOf(q)>=0||(x.contract_no||'').toLowerCase().indexOf(q)>=0||(x.notes||'').toLowerCase().indexOf(q)>=0});
  var total=list.length,signed=0,val=0,expiring=0;
  var today=new Date();today.setHours(0,0,0,0);
  for(var i=0;i<list.length;i++){
    val+=list[i].total_amount||list[i].amount||0;
    if(list[i].status==='signed'||list[i].status==='executing')signed++;
    if(list[i].end_date){
      var ed=new Date(list[i].end_date);ed.setHours(0,0,0,0);
      var diffDays=Math.ceil((ed-today)/(1000*60*60*24));
      if(diffDays<=30&&diffDays>=0)expiring++;
    }
  }
  document.getElementById('contract-stats').innerHTML='<div class="stat-card"><div class="stat-num">'+total+'</div><div class="stat-label">合同数</div></div><div class="stat-card"><div class="stat-num">'+formatMoney(val)+'</div><div class="stat-label">总金额</div></div><div class="stat-card"><div class="stat-num" style="color:#10B981">'+signed+'</div><div class="stat-label">生效中</div></div><div class="stat-card"><div class="stat-num" style="color:#F59E0B">'+expiring+'</div><div class="stat-label">即将到期</div></div>';
  var grid=document.getElementById('contract-grid'),empty=document.getElementById('contract-empty');
  if(!list.length){grid.innerHTML='';empty.classList.remove('hidden');return}
  empty.classList.add('hidden');
  var h='';
  for(var i=0;i<list.length;i++){
    var ct=list[i],sc={'draft':'sb-draft','signed':'sb-signed','executing':'sb-executing','completed':'sb-completed','terminated':'sb-terminated'}[ct.status]||'sb-draft';
    var cn='';var cl=allClients.find(function(x){return x.id===ct.client_id});if(cl)cn=cl.name;
    var paid=ct.paid_amount||0,total=ct.total_amount||ct.amount||1;
    var pct=Math.round(paid/total*100);
    var expiryHtml='';
    if(ct.end_date){
      var ed=new Date(ct.end_date);ed.setHours(0,0,0,0);
      var dd=Math.ceil((ed-today)/(1000*60*60*24));
      if(dd<0)expiryHtml=' <span style=\'background:#FEE2E2;color:#DC2626;padding:1px 6px;border-radius:3px;font-size:11px\'>已逾期</span>';
      else if(dd<=30)expiryHtml=' <span style=\'background:#FEF3C7;color:#D97706;padding:1px 6px;border-radius:3px;font-size:11px\'>'+dd+'天后到期</span>';
    }
    var archiveIcon=ct.archive_status==='archived'?' 📦':'';
    h+='<div class="pipe-card" onclick="openContractForm(\''+ct.id+'\')"><div class="pc-header"><span class="pc-name">'+escHtml(ct.title)+archiveIcon+'</span><span class="pc-amount">'+formatMoney(ct.total_amount||ct.amount||0)+'</span></div>';
    if(ct.file_url&&ct.file_url.indexOf('object/public')>0){var fn=ct.file_name||'下载文件';h+='<div class="pc-file" style="font-size:11px;margin-top:2px"><a href="'+ct.file_url+'" target="_blank" rel="noopener" style="color:var(--primary);text-decoration:none">📎 '+escHtml(fn)+'</a></div>'}
    if(cn)h+='<div class="pc-company">🏢 '+escHtml(cn)+'</div>';
    h+='<div class="pc-meta">'+(ct.contract_no?'<span>📋 '+escHtml(ct.contract_no)+'</span>':'')+'<span class="status-badge '+sc+'">'+({draft:'草稿',signed:'已签署',executing:'执行中',completed:'已完成',terminated:'已终止'}[ct.status]||ct.status)+'</span>'+expiryHtml+'</div>';
    h+='<div style=\'margin:6px 0;background:var(--border);border-radius:4px;height:6px;overflow:hidden\'><div style=\'width:'+pct+'%;height:100%;background:'+(pct>=100?'#10B981':'#4F6EF7')+';border-radius:4px;transition:width .3s\'></div></div>';
    h+='<div style=\'font-size:11px;color:var(--text2);display:flex;justify-content:space-between\'><span>回款 '+formatMoney(paid)+' / '+formatMoney(total)+' ('+pct+'%)</span><span>'+(ct.end_date?'到期: '+ct.end_date:'')+'</span></div>';
    h+='</div>';
  }
  grid.innerHTML=h;
}
function isContractExpiring(ct){
  if(!ct.end_date)return false;
  var ed=new Date(ct.end_date),today=new Date();
  ed.setHours(0,0,0,0);today.setHours(0,0,0,0);
  var diffDays=Math.ceil((ed-today)/(1000*60*60*24));
  return diffDays>=0&&diffDays<=30;
}
function toggleContractArchive(id,archive){
  confirmDialog(archive?'确定归档该合同？':'确定取消归档？',async function(){
    var r=await sb.from('contracts').update({archive_status:archive?'archived':'active',updated_at:new Date().toISOString()}).eq('id',id);
    if(r.error){showToast('操作失败: '+r.error.message);return}
    await loadContracts();showToast(archive?'合同已归档':'合同已取消归档');
  });
}

function openContractForm(id){
  ceditId=id||null;
  document.getElementById('contract-form-title').textContent=id?'编辑合同':'创建合同';
  document.getElementById('contract-btn-delete').classList.toggle('hidden',!id);
  document.getElementById('cf-contract-no').value='';
  document.getElementById('cf-title').value='';
  document.getElementById('cf-amount').value='';
  document.getElementById('cf-our-party').value='';
  document.getElementById('cf-their-party').value='';
  document.getElementById('cf-sign-date').value='';
  document.getElementById('cf-start-date').value='';
  document.getElementById('cf-end-date').value='';
  document.getElementById('cf-status').value='draft';
  var el=document.getElementById('cf-archive-status');if(el)el.value='active';
  document.getElementById('cf-notes').value='';document.getElementById('cf-file').value='';document.getElementById('cf-file-info').classList.add('hidden');
  var csel=document.getElementById('cf-client');
  csel.innerHTML='<option value="">选择客户...</option>';
  for(var i=0;i<allClients.length;i++)csel.innerHTML+='<option value="'+allClients[i].id+'">'+escHtml(allClients[i].name)+'</option>';
  if(id){var ct=allContracts.find(function(x){return x.id===id});if(ct){
    document.getElementById('cf-contract-no').value=ct.contract_no||'';
    document.getElementById('cf-title').value=ct.title||'';
    document.getElementById('cf-amount').value=ct.total_amount||ct.amount||'';
    document.getElementById('cf-our-party').value=ct.our_party||'';
    document.getElementById('cf-their-party').value=ct.their_party||'';
    document.getElementById('cf-sign-date').value=ct.sign_date||'';
    document.getElementById('cf-start-date').value=ct.start_date||'';
    document.getElementById('cf-end-date').value=ct.end_date||'';
    document.getElementById('cf-status').value=ct.status||'draft';
    document.getElementById('cf-archive-status').value=ct.archive_status||'active';
    document.getElementById('cf-notes').value=(ct.notes||'').replace(/^\u5f3f\u0046\u0049\u004c\u0045__:.*?\n*/,'');if(ct.file_url){document.getElementById('cf-file-info').classList.remove('hidden');document.getElementById('cf-file-name').textContent=ct.file_name||'已上传';document.getElementById('cf-file-link').href=ct.file_url};
    csel.value=ct.client_id||'';
  }}
  document.getElementById('contract-modal').classList.remove('hidden');
}
function closeContractForm(){document.getElementById('contract-modal').classList.add('hidden');ceditId=null}

async function saveContract(){
  var title=document.getElementById('cf-title').value.trim();if(!title){showToast('请输入合同标题');return}
  var cid=document.getElementById('cf-client').value;if(!cid){showToast('请选择关联客户');return}
  var totalAmount=parseFloat(document.getElementById('cf-amount').value)||0;
  var fileUrl='',fileName='';
  var fileEl=document.getElementById('cf-file');
  if(fileEl&&fileEl.files&&fileEl.files.length>0){
    var fl=fileEl.files[0];
    var ext=fl.name.split('.').pop();
    var fpath='contract_files/'+currentCompanyId+'/'+Date.now()+'.'+ext;
    try{var fresp=await fetch(SUPABASE_URL+'/storage/v1/object/'+fpath,{method:'POST',headers:{'Authorization':'Bearer '+SUPABASE_SERVICE_KEY},body:fl});
    if(fresp.ok){fileUrl=SUPABASE_URL+'/storage/v1/object/public/'+fpath;fileName=fl.name}else{showToast('文件上传失败');return}}
    catch(e){showToast('文件上传失败: '+e.message);return}
  }else{
    if(ceditId){var ec=allContracts.find(function(x){return x.id===ceditId});if(ec&&ec.file_url){fileUrl=ec.file_url;fileName=ec.file_name||''}}
  }
  var data={
    company_id:currentCompanyId,user_id:currentUser.id,title:title,client_id:cid,
    contract_no:document.getElementById('cf-contract-no').value.trim(),
    total_amount:totalAmount,
    our_party:document.getElementById('cf-our-party').value.trim(),
    their_party:document.getElementById('cf-their-party').value.trim(),
    sign_date:document.getElementById('cf-sign-date').value||null,
    start_date:document.getElementById('cf-start-date').value||null,
    end_date:document.getElementById('cf-end-date').value||null,
    status:document.getElementById('cf-status').value,
    archive_status:document.getElementById('cf-archive-status').value||'active',
    notes:document.getElementById('cf-notes').value.trim(),
    file_url:fileUrl,
    file_name:fileName,
    updated_at:new Date().toISOString()
  };
  var error;
  if(ceditId){var r=await sb.from('contracts').update(data).eq('id',ceditId);error=r.error}
  else{data.created_at=new Date().toISOString();var r2=await sb.from('contracts').insert(data);error=r2.error}
  if(error){showToast('保存失败: '+error.message);return}
  closeContractForm();await loadContracts();showToast(ceditId?'合同已更新':'合同已创建');
}
function confirmDeleteContract(){if(ceditId)confirmDialog('确定删除该合同？',async function(){await sb.from('contracts').delete().eq('id',ceditId);closeContractForm();loadContracts();showToast('合同已删除')})}

// ── Payments ──
async function loadPayments(){
  var grid=document.getElementById('payment-grid');grid.innerHTML='<div class="loading"><span class="spinner"></span>加载中...</div>';
  var {data,error}=await sb.from('payments').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
  if(error){grid.innerHTML='<div class="empty">加载失败</div>';return}
  allPayments=data||[];renderPayments();
}

function renderPayments(){
  var filter=document.getElementById('payment-status-filter').value;
  var q=(document.getElementById('payment-search').value||'').trim().toLowerCase();
  var list=allPayments.slice();
  if(filter!=='all')list=list.filter(function(x){return x.status===filter});
  if(q)list=list.filter(function(x){return (x.invoice_no||'').toLowerCase().indexOf(q)>=0||(x.notes||'').toLowerCase().indexOf(q)>=0});
  // Summary
  var total=0,received=0,planned=0,overdue=0;
  for(var i=0;i<list.length;i++){total+=list[i].amount||0;if(list[i].status==='received')received+=list[i].amount||0;else if(list[i].status==='planned')planned+=list[i].amount||0;else if(list[i].status==='overdue')overdue+=list[i].amount||0}
  document.getElementById('payment-summary').innerHTML='<div class="ps-item"><div class="ps-num" style="color:var(--primary)">'+formatMoney(total)+'</div><div class="ps-label">总额</div></div><div class="ps-item"><div class="ps-num" style="color:#10B981">'+formatMoney(received)+'</div><div class="ps-label">已收款</div></div><div class="ps-item"><div class="ps-num" style="color:#F59E0B">'+formatMoney(planned)+'</div><div class="ps-label">计划中</div></div><div class="ps-item"><div class="ps-num" style="color:#EF4444">'+formatMoney(overdue)+'</div><div class="ps-label">逾期</div></div>';
  var grid=document.getElementById('payment-grid'),empty=document.getElementById('payment-empty');
  if(!list.length){grid.innerHTML='';empty.classList.remove('hidden');return}
  empty.classList.add('hidden');
  var h='',methodMap={bank:'🏦 银行',cash:'💵 现金',wechat:'💚 微信',alipay:'💙 支付宝',check:'📝 支票',other:'📌 其他'};
  for(var i=0;i<list.length;i++){
    var p=list[i],sc={'received':'sb-received','planned':'sb-planned','overdue':'sb-overdue','cancelled':'sb-cancelled'}[p.status]||'sb-planned';
    var cn='';var cl=allClients.find(function(x){return x.id===p.client_id});if(cl)cn=cl.name;
    h+='<div class="pipe-card" onclick="openPaymentForm(\''+p.id+'\')" style="--card-bar:'+({'received':'#10B981','planned':'#F59E0B','overdue':'#EF4444'}[p.status]||'#F59E0B')+'">';
    h+='<div class="pc-header"><span class="pc-name">'+escHtml(cn||'未知客户')+'</span><span class="pc-amount">'+formatMoney(p.amount||0)+'</span></div>';
    h+='<div class="pc-meta"><span class="status-badge '+sc+'">'+({received:'已收款',planned:'计划中',overdue:'逾期',cancelled:'已取消'}[p.status]||p.status)+'</span><span>'+methodMap[p.method||'other']+'</span>'+(p.payment_date?'<span>'+p.payment_date+'</span>':'')+(p.invoice_no?'<span>发票: '+escHtml(p.invoice_no)+'</span>':'')+'</div>';
    if(p.notes)h+='<div style="font-size:12px;color:var(--text2);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">💬 '+escHtml(p.notes)+'</div>';
    h+='</div>';
  }
  grid.innerHTML=h;
}

function openPaymentForm(id){
  peditId=id||null;
  document.getElementById('payment-form-title').textContent=id?'编辑回款':'添加回款';
  document.getElementById('payment-btn-delete').classList.toggle('hidden',!id);
  document.getElementById('pf-amount').value='';
  document.getElementById('pf-date').value='';
  document.getElementById('pf-method').value='bank';
  document.getElementById('pf-status').value='received';
  document.getElementById('pf-invoice').value='';
  document.getElementById('pf-notes').value='';
  // Populate client and contract selects
  var cs=document.getElementById('pf-client'),ct=document.getElementById('pf-contract');
  cs.innerHTML='<option value="">选择客户...</option>';
  ct.innerHTML='<option value="">选择合同...</option>';
  for(var i=0;i<allClients.length;i++)cs.innerHTML+='<option value="'+allClients[i].id+'">'+escHtml(allClients[i].name)+'</option>';
  cs.onchange=function(){var cid=this.value;ct.innerHTML='<option value="">选择合同...</option>';if(cid){for(var j=0;j<allContracts.length;j++){if(allContracts[j].client_id===cid)ct.innerHTML+='<option value="'+allContracts[j].id+'">'+escHtml(allContracts[j].title||allContracts[j].contract_no||'合同')+'</option>'}}};
  if(id){var p=allPayments.find(function(x){return x.id===id});if(p){
    document.getElementById('pf-amount').value=p.amount||'';
    document.getElementById('pf-date').value=p.payment_date||'';
    document.getElementById('pf-method').value=p.method||'bank';
    document.getElementById('pf-status').value=p.status||'received';
    document.getElementById('pf-invoice').value=p.invoice_no||'';
    document.getElementById('pf-notes').value=p.notes||'';
    cs.value=p.client_id||'';cs.onchange();setTimeout(function(){document.getElementById('pf-contract').value=p.contract_id||''},200);
  }}
  document.getElementById('payment-modal').classList.remove('hidden');
}
function closePaymentForm(){document.getElementById('payment-modal').classList.add('hidden');peditId=null}

async function savePayment(){
  var amount=parseFloat(document.getElementById('pf-amount').value)||0;
  var cid=document.getElementById('pf-client').value;if(!cid){showToast('请选择关联客户');return}
  var data={
    company_id:currentCompanyId,user_id:currentUser.id,amount:amount,client_id:cid,
    payment_date:document.getElementById('pf-date').value||null,
    method:document.getElementById('pf-method').value,
    status:document.getElementById('pf-status').value,
    contract_id:document.getElementById('pf-contract').value||null,
    invoice_no:document.getElementById('pf-invoice').value.trim(),
    notes:document.getElementById('pf-notes').value.trim(),
    updated_at:new Date().toISOString()
  };
  var error;
  if(peditId){var {error:err}=await sb.from('payments').update(data).eq('id',peditId);error=err}
  else{data.created_at=new Date().toISOString();var {error:err2}=await sb.from('payments').insert(data);error=err2}
  if(error){showToast('保存失败: '+error.message);return}
  closePaymentForm();loadPayments();showToast(peditId?'回款记录已更新':'回款记录已添加');
}
function confirmDeletePayment(){if(peditId)confirmDialog('确定删除该回款记录？',async function(){await sb.from('payments').delete().eq('id',peditId);closePaymentForm();loadPayments();showToast('回款记录已删除')})}

// ── Common: openSalesForm (FAB) ──
function openSalesForm(){
  if(currentSalesTab==='leads')openLeadForm();
  else if(currentSalesTab==='quotations')openQuoteForm();
  else if(currentSalesTab==='contracts')openContractForm();
  else if(currentSalesTab==='payments')openPaymentForm();
}


// ═══════════ AFTER-SALES SERVICE ═══════════
var svEditId=null; var allTickets=[],allVisits=[],allWarranties=[],allMaintenance=[],allKB=[];

function switchServiceTab(sub){
  var tabs=document.querySelectorAll('#moresubs-after .sub-tab');
  for(var i=0;i<tabs.length;i++)tabs[i].classList.remove('active');
  var panels=['sv-tickets','sv-visits','sv-warranty','sv-kb'];
  for(var j=0;j<panels.length;j++){var p=document.getElementById(panels[j]);if(p)p.classList.add('hidden')}
  var tp=document.getElementById('sv-'+sub);if(tp)tp.classList.remove('hidden');
  var btns=document.querySelectorAll('#moresubs-after .sub-tab');
  var map={tickets:0,visits:1,warranty:2,kb:3};
  if(btns[map[sub]]!=null)btns[map[sub]].classList.add('active');
  if(sub==='tickets')loadTickets();
  else if(sub==='visits'){loadVisits();loadVisitTasks()}
  else if(sub==='warranty'){loadWarranties();loadMaintenancePlans()}
  else if(sub==='kb')loadKB();
}

// ── Tickets ──
async function loadTickets(){
  var grid=document.getElementById('ticket-grid');grid.innerHTML='<div class="loading"><span class="spinner"></span>加载中...</div>';
  var{data,error}=await sb.from('service_tickets').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
  if(error){grid.innerHTML='<div class="empty">加载失败: '+error.message+'</div>';return}
  allTickets=data||[];renderTickets();
}
function renderTickets(){
  var list=allTickets||[];
  var sf=document.getElementById('ticket-status-filter'),tf=document.getElementById('ticket-type-filter');
  var sr=document.getElementById('ticket-search');
  if(sf&&sf.value!=='all')list=list.filter(function(x){return x.status===sf.value});
  if(tf&&tf.value!=='all')list=list.filter(function(x){return x.type===tf.value});
  if(sr){var sq=sr.value.trim().toLowerCase();if(sq)list=list.filter(function(x){return(x.title||'').toLowerCase().indexOf(sq)>=0||(x.description||'').toLowerCase().indexOf(sq)>=0})}
  var grid=document.getElementById('ticket-grid'),empty=document.getElementById('ticket-empty');
  if(!list.length){grid.innerHTML='';empty.classList.remove('hidden');return}
  empty.classList.add('hidden');
  var sm={pending:'待处理',dispatched:'已派单',in_progress:'处理中',completed:'已完成',confirmed:'已确认',closed:'已关闭'};
  var tm={complaint:'投诉',repair:'报修',service:'服务',other:'其他'};
  var pm={urgent:'🔴紧急',high:'🟠高',normal:'🟢普通',low:'⚪低'};
  var h='';for(var i=0;i<list.length;i++){var t=list[i];
    h+='<div class="lead-card" onclick="openTicketForm(\''+t.id+'\')">';
    h+='<div class="lead-name">'+h(t.title)+' <span style="font-size:11px;color:var(--text3)">#'+(t.ticket_no||t.id)+'</span></div>';
    h+='<div class="lead-meta"><span class="lead-status-badge '+t.status+'">'+(sm[t.status]||t.status)+'</span>';
    h+='<span>'+h(tm[t.type]||t.type)+'</span><span>'+h(pm[t.priority]||'')+'</span>';
    if(t.engineer_name)h+='<span>🔧 '+h(t.engineer_name)+'</span>';
    h+='</div>';
    if(t.description)h+='<div style="font-size:12px;color:var(--text2);margin-top:4px">'+h(t.description).substring(0,80)+'</div>';
    h+='<div class="lead-actions"><button class="btn-lead-primary" onclick="event.stopPropagation();changeTicketStatus(\''+t.id+'\',\''+(t.status==='pending'?'dispatched':t.status==='dispatched'?'in_progress':t.status==='in_progress'?'completed':t.status==='completed'?'confirmed':'closed')+'\')">'+(t.status==='pending'?'派单':t.status==='dispatched'?'开始处理':t.status==='in_progress'?'完工':'关闭')+'</button>';
    h+='<button onclick="event.stopPropagation();openTicketForm(\''+t.id+'\')">编辑</button><button class="btn-lead-danger" onclick="event.stopPropagation();confirmDeleteTicket(\''+t.id+'\')">删除</button></div></div>';
  }
  grid.innerHTML=h;
}
function openTicketForm(id){
  svEditId=id||null;
  var t=id?allTickets.find(function(x){return x.id===id}):null;
  document.getElementById('ticket-form-title').textContent=id?'编辑工单':'新建工单';
  document.getElementById('tf-title').value=t?t.title||'':'';
  document.getElementById('tf-type').value=t?t.type||'service':'service';
  document.getElementById('tf-priority').value=t?t.priority||'normal':'normal';
  document.getElementById('tf-engineer').value=t?t.engineer_name||'':'';
  document.getElementById('tf-desc').value=t?t.description||'':'';
  document.getElementById('tf-completion').value=t?t.completion_notes||'':'';
  document.getElementById('tf-satisfaction').value=t?t.satisfaction_rating||5:5;
  // Populate client dropdown
  var cs=document.getElementById('tf-client');cs.innerHTML='<option value="">不关联</option>';
  if(allClients)for(var i=0;i<allClients.length;i++){var c=allClients[i];cs.innerHTML+='<option value="'+c.id+'"'+(t&&t.client_id===c.id?' selected':'')+'>'+h(c.name)+'</option>'}
  document.getElementById('ticket-modal').classList.remove('hidden');
}
function closeTicketForm(){document.getElementById('ticket-modal').classList.add('hidden');svEditId=null}
async function saveTicket(){
  var title=document.getElementById('tf-title').value.trim();if(!title){showToast('请输入标题');return}
  var data={company_id:currentCompanyId,user_id:currentUser.id,title:title,
    type:document.getElementById('tf-type').value,priority:document.getElementById('tf-priority').value,
    client_id:document.getElementById('tf-client').value||null,
    engineer_name:document.getElementById('tf-engineer').value.trim(),
    description:document.getElementById('tf-desc').value.trim(),
    completion_notes:document.getElementById('tf-completion').value.trim(),
    satisfaction_rating:parseInt(document.getElementById('tf-satisfaction').value)||null,
    updated_at:new Date().toISOString()};
  if(!svEditId)data.ticket_no='TK-'+Date.now().toString(36).toUpperCase();
  var error;
  if(svEditId){var r=await sb.from('service_tickets').update(data).eq('id',svEditId);error=r.error}
  else{data.created_at=new Date().toISOString();var r2=await sb.from('service_tickets').insert(data);error=r2.error}
  if(error){showToast('保存失败: '+error.message);return}
  closeTicketForm();await loadTickets();showToast(svEditId?'工单已更新':'工单已创建');
}
async function changeTicketStatus(id,newStatus){
  await sb.from('service_tickets').update({status:newStatus,updated_at:new Date().toISOString()}).eq('id',id);
  loadTickets();showToast('状态已更新');
}

// ── Visits ──
async function loadVisits(){
  var{data,error}=await sb.from('client_visits').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
  if(error){console.error(error);return}
  allVisits=data||[];renderVisits();
}
function renderVisits(){
  var list=allVisits||[];
  var tf=document.getElementById('visit-type-filter'),sf=document.getElementById('visit-status-filter');
  var sr=document.getElementById('visit-search');
  if(tf&&tf.value!=='all')list=list.filter(function(x){return x.visit_type===tf.value});
  if(sf&&sf.value!=='all')list=list.filter(function(x){return x.status===sf.value});
  if(sr){var sq=sr.value.trim().toLowerCase();if(sq)list=list.filter(function(x){return(x.title||'').toLowerCase().indexOf(sq)>=0||(x.content||'').toLowerCase().indexOf(sq)>=0})}
  var grid=document.getElementById('visit-grid'),empty=document.getElementById('visit-empty');
  if(!list.length){grid.innerHTML='';empty.classList.remove('hidden');return}
  empty.classList.add('hidden');
  var vm={post_sale:'成交回访',care:'关怀回访',churn:'流失回访',other:'其他'};
  var mth={phone:'📞',wechat:'💬',email:'📧',visit:'🏠',other:'📋'};
  var ss={planned:'planning',completed:'success',cancelled:'cancelled'};
  var h='';for(var i=0;i<list.length;i++){var v=list[i];var cn='';if(v.client_id&&allClients){var cc=allClients.find(function(x){return x.id===v.client_id});cn=cc?cc.name:''}
    h+='<div class="lead-card">';
    h+='<div class="lead-name">'+h(v.title||'回访记录')+' <span style="font-size:11px;color:var(--text3)">'+h(cn)+'</span></div>';
    h+='<div class="lead-meta"><span class="lead-status-badge '+(ss[v.status]||'')+'">'+(v.status==='planned'?'计划中':v.status==='completed'?'已完成':'已取消')+'</span>';
    h+='<span>'+h(vm[v.visit_type]||v.visit_type)+'</span><span>'+(mth[v.visit_method]||'📋')+' '+h(v.visit_method||'')+'</span>';
    if(v.planned_date)h+='<span>📅 '+v.planned_date+'</span>';
    if(v.satisfaction)h+='<span>⭐ '+v.satisfaction+'</span>';
    h+='</div>';
    if(v.content)h+='<div style="font-size:12px;color:var(--text2);margin-top:4px">'+h(v.content).substring(0,100)+'</div>';
    h+='<div class="lead-actions"><button onclick="event.stopPropagation();openVisitForm(\''+v.id+'\')">编辑</button><button class="btn-lead-danger" onclick="event.stopPropagation();confirmDeleteVisit(\''+v.id+'\')">删除</button></div></div>';
  }
  grid.innerHTML=h;
}
function openVisitForm(id){
  svEditId=id||null;
  var v=id?allVisits.find(function(x){return x.id===id}):null;
  document.getElementById('visit-form-title').textContent=id?'编辑回访':'新建回访';
  document.getElementById('vf-title').value=v?v.title||'':'';
  document.getElementById('vf-type').value=v?v.visit_type||'care':'care';
  document.getElementById('vf-method').value=v?v.visit_method||'phone':'phone';
  document.getElementById('vf-planned-date').value=v?v.planned_date||'':'';
  document.getElementById('vf-content').value=v?v.content||'':'';
  document.getElementById('vf-satisfaction').value=v?v.satisfaction||'':'';
  var cs=document.getElementById('vf-client');cs.innerHTML='<option value="">不关联</option>';
  if(allClients)for(var i=0;i<allClients.length;i++){var cc=allClients[i];cs.innerHTML+='<option value="'+cc.id+'"'+(v&&v.client_id===cc.id?' selected':'')+'>'+h(cc.name)+'</option>'}
  document.getElementById('visit-modal').classList.remove('hidden');
}
function closeVisitForm(){document.getElementById('visit-modal').classList.add('hidden');svEditId=null}
async function saveVisit(){
  var title=document.getElementById('vf-title').value.trim();if(!title){showToast('请输入标题');return}
  var data={company_id:currentCompanyId,user_id:currentUser.id,title:title,
    visit_type:document.getElementById('vf-type').value,visit_method:document.getElementById('vf-method').value,
    client_id:document.getElementById('vf-client').value||null,
    planned_date:document.getElementById('vf-planned-date').value||null,
    content:document.getElementById('vf-content').value.trim(),
    satisfaction:parseInt(document.getElementById('vf-satisfaction').value)||null,
    updated_at:new Date().toISOString()};
  var error;
  if(svEditId){var r=await sb.from('client_visits').update(data).eq('id',svEditId);error=r.error}
  else{data.created_at=new Date().toISOString();var r2=await sb.from('client_visits').insert(data);error=r2.error}
  if(error){showToast('保存失败: '+error.message);return}
  closeVisitForm();await loadVisits();showToast(svEditId?'回访已更新':'回访已创建');
}

// ── Visit Tasks ──
var visitTasks=[];
async function loadVisitTasks(){
  var{data,error}=await sb.from('visit_tasks').select('*').eq('company_id',currentCompanyId).order('scheduled_date');
  if(error){console.error(error);return}
  visitTasks=data||[];
  var ab=document.getElementById('visit-tasks-alert');
  if(visitTasks.length){ab.style.display='block';ab.innerHTML='📅 <b>待办回访任务:</b> '+visitTasks.filter(function(x){return x.status==='pending'}).length+' 个待处理';ab.onclick=function(){showVisitTaskList()}}else ab.style.display='none';
}
function openVisitTaskForm(){var n=document.getElementById('vf-title').value||'';var c=prompt('回访任务标题:',n);if(!c)return;
  var date=prompt('计划日期 (YYYY-MM-DD):',new Date().toISOString().split('T')[0]);if(!date)return;
  sb.from('visit_tasks').insert([{company_id:currentCompanyId,user_id:currentUser.id,title:c,task_type:'care',scheduled_date:date,status:'pending',created_at:new Date().toISOString()}]).then(function(r){
    if(r.error)showToast('创建失败: '+r.error.message);else{loadVisitTasks();showToast('回访任务已创建')}
  });
}
function showVisitTaskList(){
  var rows=visitTasks.map(function(t){return '• '+t.title+' ['+t.scheduled_date+'] '+(t.status==='pending'?'待处理':'已完成')}).join('\n');
  alert('回访任务列表:\n\n'+rows);
}

// ── Warranties ──
async function loadWarranties(){
  var{data,error}=await sb.from('warranties').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
  if(error){console.error(error);return}
  allWarranties=data||[];renderWarranties();
}
function renderWarranties(){
  var list=allWarranties||[];
  var sf=document.getElementById('warranty-status-filter'),sr=document.getElementById('warranty-search');
  if(sf&&sf.value!=='all')list=list.filter(function(x){return x.status===sf.value});
  if(sr){var sq=sr.value.trim().toLowerCase();if(sq)list=list.filter(function(x){return(x.product_name||'').toLowerCase().indexOf(sq)>=0||(x.serial_no||'').toLowerCase().indexOf(sq)>=0})}
  var grid=document.getElementById('warranty-grid'),empty=document.getElementById('warranty-empty');
  if(!list.length){grid.innerHTML='';empty.classList.remove('hidden');}else{empty.classList.add('hidden')}
  // Expiring alert
  var now=new Date(),expiring=allWarranties.filter(function(w){if(!w.warranty_end||w.status!=='active')return false;var ed=new Date(w.warranty_end);var d=Math.ceil((ed-now)/86400000);return d>=0&&d<=30});
  var ab=document.getElementById('warranty-alert');
  if(expiring.length){ab.style.display='block';ab.innerHTML='⚠️ <b>即将到期:</b> '+expiring.length+' 项质保在30天内到期，请关注续费！'}else ab.style.display='none';
  if(!list.length)return;
  var ss={active:'🟢有效',expired:'🔴过期',void:'⚫作废',claimed:'🟡理赔'};
  var h='';for(var i=0;i<list.length;i++){var w=list[i];var cn='';if(w.client_id&&allClients){var cc=allClients.find(function(x){return x.id===w.client_id});cn=cc?cc.name:''}
    var endLabel=w.warranty_end||'';if(w.status==='active'&&w.warranty_end){var dd=Math.ceil((new Date(w.warranty_end)-now)/86400000);endLabel+=' ('+(dd>0?dd+'天':'已到期')+')'}
    h+='<div class="lead-card">';
    h+='<div class="lead-name">'+h(w.product_name)+' <span style="font-size:11px;color:var(--text3)">'+h(cn)+'</span></div>';
    h+='<div class="lead-meta"><span>'+h(ss[w.status]||w.status)+'</span>';
    if(w.serial_no)h+='<span># '+h(w.serial_no)+'</span>';
    h+='<span>📅 '+h(w.warranty_start||'')+' → '+h(endLabel)+'</span>';
    h+='<span>'+h(w.warranty_type||'')+'</span>';
    h+='</div>';
    h+='<div class="lead-actions"><button onclick="event.stopPropagation();openWarrantyForm(\''+w.id+'\')">编辑</button><button class="btn-lead-danger" onclick="event.stopPropagation();confirmDeleteWarranty(\''+w.id+'\')">删除</button></div></div>';
  }
  grid.innerHTML=h;
}
function openWarrantyForm(id){
  svEditId=id||null;
  var w=id?allWarranties.find(function(x){return x.id===id}):null;
  document.getElementById('warranty-form-title').textContent=id?'编辑质保':'新建质保';
  document.getElementById('wf-product').value=w?w.product_name||'':'';
  document.getElementById('wf-serial').value=w?w.serial_no||'':'';
  document.getElementById('wf-start').value=w?w.warranty_start||'':'';
  document.getElementById('wf-end').value=w?w.warranty_end||'':'';
  document.getElementById('wf-type').value=w?w.warranty_type||'standard':'standard';
  document.getElementById('wf-terms').value=w?w.terms||'':'';
  var cs=document.getElementById('wf-client');cs.innerHTML='<option value="">不关联</option>';
  if(allClients)for(var i=0;i<allClients.length;i++){var cc=allClients[i];cs.innerHTML+='<option value="'+cc.id+'"'+(w&&w.client_id===cc.id?' selected':'')+'>'+h(cc.name)+'</option>'}
  document.getElementById('warranty-modal').classList.remove('hidden');
}
function closeWarrantyForm(){document.getElementById('warranty-modal').classList.add('hidden');svEditId=null}
async function saveWarranty(){
  var pn=document.getElementById('wf-product').value.trim();if(!pn){showToast('请输入产品名称');return}
  var data={company_id:currentCompanyId,user_id:currentUser.id,product_name:pn,
    serial_no:document.getElementById('wf-serial').value.trim(),
    client_id:document.getElementById('wf-client').value||null,
    warranty_start:document.getElementById('wf-start').value||null,
    warranty_end:document.getElementById('wf-end').value||null,
    warranty_type:document.getElementById('wf-type').value,
    terms:document.getElementById('wf-terms').value.trim(),
    updated_at:new Date().toISOString()};
  var error;
  if(svEditId){var r=await sb.from('warranties').update(data).eq('id',svEditId);error=r.error}
  else{data.created_at=new Date().toISOString();var r2=await sb.from('warranties').insert(data);error=r2.error}
  if(error){showToast('保存失败: '+error.message);return}
  closeWarrantyForm();await loadWarranties();showToast(svEditId?'质保已更新':'质保已创建');
}

// ── Maintenance Plans ──
async function loadMaintenancePlans(){
  var{data,error}=await sb.from('maintenance_plans').select('*').eq('company_id',currentCompanyId).order('next_maintenance');
  if(error){console.error(error);return}
  allMaintenance=data||[];renderMaintenancePlans();
}
function renderMaintenancePlans(){
  var list=allMaintenance||[];
  var grid=document.getElementById('maintenance-grid'),empty=document.getElementById('maintenance-empty');
  if(!list.length){grid.innerHTML='';empty.classList.remove('hidden');return}
  empty.classList.add('hidden');
  var ss={scheduled:'计划中',in_progress:'进行中',completed:'已完成',overdue:'已逾期',cancelled:'已取消'};
  var sc={scheduled:'planning',in_progress:'active',completed:'success',overdue:'urgent',cancelled:'cancelled'};
  var h='';for(var i=0;i<list.length;i++){var m=list[i];var cn='';if(m.client_id&&allClients){var cc=allClients.find(function(x){return x.id===m.client_id});cn=cc?cc.name:''}
    h+='<div class="lead-card">';
    h+='<div class="lead-name">🔧 '+h(m.product_name||'维保计划')+' <span style="font-size:11px;color:var(--text3)">'+h(cn)+'</span></div>';
    h+='<div class="lead-meta"><span class="lead-status-badge '+(sc[m.status]||'')+'">'+h(ss[m.status]||m.status)+'</span>';
    h+='<span>'+h(m.plan_type||'')+'</span><span>🔄 '+h(m.schedule_interval||'')+'</span>';
    if(m.next_maintenance)h+='<span>📅 下次: '+m.next_maintenance+'</span>';
    h+='</div>';
    h+='<div class="lead-actions"><button onclick="event.stopPropagation();openMaintenanceForm(\''+m.id+'\')">编辑</button><button class="btn-lead-danger" onclick="event.stopPropagation();confirmDeleteMaintenance(\''+m.id+'\')">删除</button></div></div>';
  }
  grid.innerHTML=h;
}
function openMaintenanceForm(id){
  svEditId=id||null;
  var m=id?allMaintenance.find(function(x){return x.id===id}):null;
  document.getElementById('maintenance-form-title').textContent=id?'编辑维保计划':'新建维保计划';
  document.getElementById('mf-product').value=m?m.product_name||'':'';
  document.getElementById('mf-type').value=m?m.plan_type||'preventive':'preventive';
  document.getElementById('mf-interval').value=m?m.schedule_interval||'monthly':'monthly';
  document.getElementById('mf-next').value=m?m.next_maintenance||'':'';
  document.getElementById('mf-assigned').value=m?(getAssignedName(m.assigned_to)||''):'';
  document.getElementById('mf-notes').value=m?m.notes||'':'';
  var cs=document.getElementById('mf-client');cs.innerHTML='<option value="">不关联</option>';
  if(allClients)for(var i=0;i<allClients.length;i++){var cc=allClients[i];cs.innerHTML+='<option value="'+cc.id+'"'+(m&&m.client_id===cc.id?' selected':'')+'>'+h(cc.name)+'</option>'}
  document.getElementById('maintenance-modal').classList.remove('hidden');
}
function closeMaintenanceForm(){document.getElementById('maintenance-modal').classList.add('hidden');svEditId=null}
async function saveMaintenance(){
  var pn=document.getElementById('mf-product').value.trim();if(!pn){showToast('请输入产品名称');return}
  var data={company_id:currentCompanyId,user_id:currentUser.id,product_name:pn,
    client_id:document.getElementById('mf-client').value||null,
    plan_type:document.getElementById('mf-type').value,schedule_interval:document.getElementById('mf-interval').value,
    next_maintenance:document.getElementById('mf-next').value||null,
    notes:document.getElementById('mf-notes').value.trim(),
    updated_at:new Date().toISOString()};
  var error;
  if(svEditId){var r=await sb.from('maintenance_plans').update(data).eq('id',svEditId);error=r.error}
  else{data.created_at=new Date().toISOString();var r2=await sb.from('maintenance_plans').insert(data);error=r2.error}
  if(error){showToast('保存失败: '+error.message);return}
  closeMaintenanceForm();await loadMaintenancePlans();showToast(svEditId?'维保计划已更新':'维保计划已创建');
}
function getAssignedName(uid){if(!uid||!allUsers)return'';var u=allUsers.find(function(x){return x.user_id===uid});return u?(u.display_name||u.email||''):''}

// ── Knowledge Base ──
async function loadKB(){
  var{data,error}=await sb.from('kb_articles').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
  if(error){console.error(error);return}
  allKB=data||[];renderKB();
}
function renderKB(){
  var list=allKB||[];
  var cf=document.getElementById('kb-category-filter'),sr=document.getElementById('kb-search');
  if(cf&&cf.value!=='all')list=list.filter(function(x){return x.category===cf.value});
  if(sr){var sq=sr.value.trim().toLowerCase();if(sq)list=list.filter(function(x){return(x.title||'').toLowerCase().indexOf(sq)>=0||(x.content||'').toLowerCase().indexOf(sq)>=0||(x.tags||[]).some(function(t){return t.toLowerCase().indexOf(sq)>=0})})}
  var grid=document.getElementById('kb-grid'),empty=document.getElementById('kb-empty');
  if(!list.length){grid.innerHTML='';empty.classList.remove('hidden');return}
  empty.classList.add('hidden');
  var cm={faq:'❓常见问题',solution:'💡解决方案',script:'📝标准话术',policy:'📜政策法规',other:'📋其他'};
  var h='';for(var i=0;i<list.length;i++){var k=list[i];
    h+='<div class="lead-card" style="cursor:pointer" onclick="toggleKBDetail('+k.id+')">';
    h+='<div class="lead-name">'+h(k.title)+' <span style="font-size:11px;color:var(--text3)">'+h(cm[k.category]||k.category)+'</span></div>';
    h+='<div class="lead-meta">';
    if(k.tags&&k.tags.length)h+='<span>'+k.tags.map(function(t){return '#'+t}).join(' ')+'</span>';
    if(k.related_products)h+='<span>📦 '+h(k.related_products)+'</span>';
    h+='<span>👁 '+k.view_count+'</span>';
    h+='</div>';
    h+='<div id="kb-detail-'+k.id+'" style="display:none;padding:12px 0;font-size:13px;color:var(--text);line-height:1.7;white-space:pre-wrap;border-top:1px solid var(--border);margin-top:8px">'+h(k.content||'')+'</div>';
    h+='<div class="lead-actions"><button onclick="event.stopPropagation();openKBForm(\''+k.id+'\')">编辑</button><button class="btn-lead-danger" onclick="event.stopPropagation();confirmDeleteKB(\''+k.id+'\')">删除</button></div></div>';
  }
  grid.innerHTML=h;
}
function toggleKBDetail(id){
  var el=document.getElementById('kb-detail-'+id);if(!el)return;
  if(el.style.display==='none'){el.style.display='block';sb.from('kb_articles').update({view_count:((allKB.find(function(x){return x.id===id})||{}).view_count||0)+1}).eq('id',id)}
  else el.style.display='none';
}
function openKBForm(id){
  svEditId=id||null;
  var k=id?allKB.find(function(x){return x.id===id}):null;
  document.getElementById('kb-form-title').textContent=id?'编辑文章':'新建文章';
  document.getElementById('kbf-title').value=k?k.title||'':'';
  document.getElementById('kbf-category').value=k?k.category||'faq':'faq';
  document.getElementById('kbf-products').value=k?k.related_products||'':'';
  document.getElementById('kbf-tags').value=k?(k.tags||[]).join(','):'';
  document.getElementById('kbf-content').value=k?k.content||'':'';
  document.getElementById('kb-modal').classList.remove('hidden');
}
function closeKBForm(){document.getElementById('kb-modal').classList.add('hidden');svEditId=null}
async function saveKB(){
  var title=document.getElementById('kbf-title').value.trim();if(!title){showToast('请输入标题');return}
  var tags=(document.getElementById('kbf-tags').value||'').split(',').map(function(t){return t.trim()}).filter(Boolean);
  var data={company_id:currentCompanyId,user_id:currentUser.id,title:title,
    category:document.getElementById('kbf-category').value,
    content:document.getElementById('kbf-content').value.trim(),
        tags:JSON.stringify(tags),
    related_products:document.getElementById('kbf-products').value.trim(),
    updated_at:new Date().toISOString()};
  var error;
  if(svEditId){var r=await sb.from('kb_articles').update(data).eq('id',svEditId);error=r.error}
  else{data.created_at=new Date().toISOString();var r2=await sb.from('kb_articles').insert(data);error=r2.error}
  if(error){showToast('保存失败: '+error.message);return}
  closeKBForm();await loadKB();showToast(svEditId?'文章已更新':'文章已创建');
}


// —— After-sales delete helpers
async function confirmDeleteTicket(id){confirmDialog('确定删除该工单？',async function(){await sb.from('service_tickets').delete().eq('id',id);loadTickets()})}
async function confirmDeleteVisit(id){confirmDialog('确定删除？',async function(){await sb.from('client_visits').delete().eq('id',id);loadVisits()})}
async function confirmDeleteWarranty(id){confirmDialog('确定删除？',async function(){await sb.from('warranties').delete().eq('id',id);loadWarranties()})}
async function confirmDeleteMaintenance(id){confirmDialog('确定删除？',async function(){await sb.from('maintenance_plans').delete().eq('id',id);loadMaintenancePlans()})}
async function confirmDeleteKB(id){confirmDialog('确定删除？',async function(){await sb.from('kb_articles').delete().eq('id',id);loadKB()})}


// ═══════════ INVENTORY ═══════════
var currentInventoryTab='products';
var allProducts=[],allCategories=[],allWarehouses=[],allStockRecords=[],allAlerts=[],allChecks=[];
var productEditId=null,warehouseEditId=null,categoryEditId=null,alertEditId=null,checkEditId=null;
var tempSpecs=[],tempImages=[],checkItems=[];

function switchInventoryTab(t){
  currentInventoryTab=t;
  document.querySelectorAll('.inv-subtab').forEach(function(b){b.classList.remove('active')});
  document.querySelectorAll('.inv-panel').forEach(function(p){p.classList.remove('active')});
  var btns=document.querySelectorAll('.inv-subtab');
  var idx={products:0,records:1,alerts:2,checks:3,warehouses:4,transfers:5,ledger:6}[t]||0;
  if(btns[idx])btns[idx].classList.add('active');
  var panel=document.getElementById('inv-'+t);
  if(panel)panel.classList.add('active');
  if(t==='products')loadProducts();
  else if(t==='records')loadStockRecords();
  else if(t==='alerts')loadStockAlerts();
  else if(t==='checks')loadStockChecks();
  else if(t==='warehouses')loadWarehousesPanel();
  else if(t==='transfers')loadStockTransfers();
  else if(t==='ledger')loadStockLedger();
}

async function loadCategories(){
  var r=await sb.from('product_categories').select('*').eq('company_id',currentCompanyId).order('name');
  if(r.error){console.error(r.error);return}
  allCategories=r.data||[];
  var sel=document.getElementById('inv-product-cat-filter');
  if(!sel)return;
  var v=sel.value;
  sel.innerHTML='<option value="">全部分类</option>';
  for(var i=0;i<allCategories.length;i++)sel.innerHTML+='<option value="'+allCategories[i].id+'">'+escHtml(allCategories[i].name)+'</option>';
  sel.value=v;
  var psel=document.getElementById('pfm-category');
  if(psel){psel.innerHTML='<option value="">选择分类</option>';for(var j=0;j<allCategories.length;j++)psel.innerHTML+='<option value="'+allCategories[j].id+'">'+escHtml(allCategories[j].name)+'</option>'}
}

function openCategoryForm(){
  categoryEditId=null;
  document.getElementById('cat-name').value='';
  document.getElementById('cat-desc').value='';
  document.getElementById('category-form-title').textContent='产品分类';
  renderCategoryList();
  document.getElementById('category-modal').classList.remove('hidden');
}

function closeCategoryForm(){document.getElementById('category-modal').classList.add('hidden')}

function renderCategoryList(){
  var el=document.getElementById('cat-list');
  if(!el)return;
  if(allCategories.length===0){el.innerHTML='<div class="empty-state">暂无分类</div>';return}
  el.innerHTML='';
  for(var i=0;i<allCategories.length;i++){
    var c=allCategories[i];
    el.innerHTML+='<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px"><span>'+escHtml(c.name)+'</span><button class="btn-sm btn-sm-danger" onclick="deleteCategory('+c.id+')" style="font-size:11px;padding:2px 8px">删除</button></div>';
  }
}

async function saveCategory(){
  var name=document.getElementById('cat-name').value.trim();
  if(!name){showToast('请输入分类名称');return}
  var r=await sb.from('product_categories').insert({company_id:currentCompanyId,name:name,description:document.getElementById('cat-desc').value.trim()}).select().single();
  if(r.error){showToast('保存失败:'+r.error.message);return}
  showToast('分类已添加');
  document.getElementById('cat-name').value='';
  document.getElementById('cat-desc').value='';
  await loadCategories();
  renderCategoryList();
}

async function deleteCategory(id){
  if(!confirm('确定删除此分类？'))return;
  await sb.from('product_categories').delete().eq('id',id);
  showToast('已删除');
  await loadCategories();
  renderCategoryList();
}

async function loadProducts(){
  var cat=document.getElementById('inv-product-cat-filter');
  var catId=cat?cat.value:'';
  var search=(document.getElementById('inv-product-search')||{}).value||'';
  var q=sb.from('products').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
  if(catId)q=q.eq('category_id',catId);
  if(search)q=q.or('name.ilike.%'+search+'%,code.ilike.%'+search+'%');
  var r=await q;
  if(r.error){console.error(r.error);return}
  allProducts=r.data||[];
  await loadStockBalances();
  renderProducts();
}

async function loadStockBalances(){
  if(allProducts.length===0)return;
  var r=await sb.from('stock_records').select('product_id,warehouse_id,type,quantity').eq('company_id',currentCompanyId);
  if(r.error)return;
  var bal={};
  for(var i=0;i<r.data.length;i++){
    var d=r.data[i],k=d.product_id+'_'+(d.warehouse_id||'');
    if(!bal[k])bal[k]=0;
    bal[k]+=d.type==='in'?d.quantity:-d.quantity;
  }
  for(var j=0;j<allProducts.length;j++){
    var total=0;for(var k in bal){if(k.startsWith(allProducts[j].id+'_'))total+=bal[k]}
    allProducts[j]._balance=Math.round(total*100)/100;
  }
}

function renderProducts(){
  var el=document.getElementById('product-list');
  if(!el)return;
  if(allProducts.length===0){el.innerHTML='<div class="empty-state">暂无产品，点击"＋ 产品"添加</div>';return}
  el.innerHTML='';
  for(var i=0;i<allProducts.length;i++){
    var p=allProducts[i];
    var catName='';
    for(var j=0;j<allCategories.length;j++)if(allCategories[j].id===p.category_id){catName=allCategories[j].name;break}
    el.innerHTML+='<div class="product-card" onclick="editProduct('+p.id+')">'+
      '<div class="pc-code">'+escHtml(p.code||'-')+'</div>'+
      '<div class="pc-name">'+escHtml(p.name)+'</div>'+
      (catName?'<div class="pc-cat">'+escHtml(catName)+'</div>':'')+
      '<div class="pc-prices"><span class="pc-cost">成本 ¥'+(p.cost_price||0)+'</span><span class="pc-sell">售价 ¥'+(p.selling_price||0)+'</span></div>'+
      '<div class="pc-stock">库存: '+(p._balance||0)+' '+escHtml(p.unit||'个')+'</div>'+
      '</div>';
  }
}

function openProductForm(){
  productEditId=null;tempSpecs=[];tempImages=[];
  document.getElementById('product-form-title').textContent='添加产品';
  document.getElementById('pfm-name').value='';
  document.getElementById('pfm-code').value='';
  document.getElementById('pfm-category').value='';
  document.getElementById('pfm-unit').value='个';
  document.getElementById('pfm-cost').value='';
  document.getElementById('pfm-price').value='';
  document.getElementById('pfm-desc').value='';
  document.getElementById('pfm-image-url').value='';
  document.getElementById('product-btn-delete').classList.add('hidden');
  renderSpecs();
  renderProductImages();
  document.getElementById('product-modal').classList.remove('hidden');
}

function editProduct(id){
  var p=allProducts.find(function(x){return x.id===id});if(!p)return;
  productEditId=id;
  document.getElementById('product-form-title').textContent='编辑产品';
  document.getElementById('pfm-name').value=p.name||'';
  document.getElementById('pfm-code').value=p.code||'';
  document.getElementById('pfm-category').value=p.category_id||'';
  document.getElementById('pfm-unit').value=p.unit||'个';
  document.getElementById('pfm-cost').value=p.cost_price||'';
  document.getElementById('pfm-price').value=p.selling_price||'';
  document.getElementById('pfm-desc').value=p.description||'';
  tempSpecs=(p.specs&&typeof p.specs==='object'&&!Array.isArray(p.specs))?Object.entries(p.specs).map(function(e){return{key:e[0],val:e[1]}}):[];
  tempImages=(p.images&&Array.isArray(p.images))?p.images:[];
  document.getElementById('pfm-image-url').value='';
  document.getElementById('product-btn-delete').classList.remove('hidden');
  renderSpecs();
  renderProductImages();
  document.getElementById('product-modal').classList.remove('hidden');
}

function closeProductForm(){document.getElementById('product-modal').classList.add('hidden')}

function addSpecRow(){tempSpecs.push({key:'',val:''});renderSpecs()}
function removeSpecRow(i){tempSpecs.splice(i,1);renderSpecs()}
function renderSpecs(){
  var el=document.getElementById('pfm-specs');if(!el)return;
  el.innerHTML='';
  for(var i=0;i<tempSpecs.length;i++)el.innerHTML+='<div class="spec-row"><input placeholder="参数名" value="'+escHtml(tempSpecs[i].key||'')+'" oninput="tempSpecs['+i+'].key=this.value"><input placeholder="参数值" value="'+escHtml(tempSpecs[i].val||'')+'" oninput="tempSpecs['+i+'].val=this.value"><button class="btn-sm btn-sm-danger" onclick="removeSpecRow('+i+')" style="font-size:11px;padding:2px 6px">✕</button></div>';
}

function addProductImage(){
  var url=document.getElementById('pfm-image-url').value.trim();
  if(!url)return;
  tempImages.push(url);
  document.getElementById('pfm-image-url').value='';
  renderProductImages();
}
function removeProductImage(i){tempImages.splice(i,1);renderProductImages()}
function renderProductImages(){
  var el=document.getElementById('pfm-images');if(!el)return;
  el.innerHTML='';
  for(var i=0;i<tempImages.length;i++)el.innerHTML+='<div style="position:relative;display:inline-block"><img class="img-item" src="'+escHtml(tempImages[i])+'" onerror="this.style.display=\'none\'"><button style="position:absolute;top:-4px;right:-4px;background:var(--danger);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer;line-height:18px" onclick="removeProductImage('+i+')">✕</button></div>';
}

async function saveProduct(){
  var name=document.getElementById('pfm-name').value.trim();
  if(!name){showToast('请输入产品名称');return}
  var specs={};
  for(var i=0;i<tempSpecs.length;i++)if(tempSpecs[i].key)specs[tempSpecs[i].key]=tempSpecs[i].val||'';
  var data={
    company_id:currentCompanyId,
    name:name,
    code:document.getElementById('pfm-code').value.trim(),
    category_id:document.getElementById('pfm-category').value||null,
    unit:document.getElementById('pfm-unit').value.trim()||'个',
    cost_price:parseFloat(document.getElementById('pfm-cost').value)||0,
    selling_price:parseFloat(document.getElementById('pfm-price').value)||0,
    description:document.getElementById('pfm-desc').value.trim(),
    specs:JSON.stringify(specs),
    images:JSON.stringify(tempImages),
    updated_at:new Date().toISOString()
  };
  var r;
  if(productEditId){r=await sb.from('products').update(data).eq('id',productEditId)}else{r=await sb.from('products').insert(data)}
  if(r.error){showToast('保存失败:'+r.error.message);return}
  showToast(productEditId?'已更新':'已添加');
  closeProductForm();
  await loadProducts();
}

async function deleteProduct(){
  if(!confirm('确定删除此产品？'))return;
  await sb.from('products').delete().eq('id',productEditId);
  showToast('已删除');
  closeProductForm();
  await loadProducts();
}

async function loadWarehouses(){
  var r=await sb.from('warehouses').select('*').eq('company_id',currentCompanyId).order('name');
  if(r.error){console.error(r.error);return}
  allWarehouses=r.data||[];
  var sels=['srm-warehouse','inv-record-warehouse','inv-alert-warehouse','inv-check-warehouse','alm-warehouse','chm-warehouse'];
  for(var s=0;s<sels.length;s++){
    var sel=document.getElementById(sels[s]);if(!sel)continue;
    var v=sel.value;
    sel.innerHTML=(sels[s]==='alm-warehouse'?'<option value="">全部仓库</option>':(sels[s].startsWith('inv-')?'<option value="">全部仓库</option>':'<option value="">选择仓库</option>'));
    for(var i=0;i<allWarehouses.length;i++)sel.innerHTML+='<option value="'+allWarehouses[i].id+'">'+escHtml(allWarehouses[i].name)+'</option>';
    sel.value=v;
  }
}

function loadWarehousesPanel(){
  var el=document.getElementById('warehouse-list');if(!el)return;
  if(allWarehouses.length===0){el.innerHTML='<div class="empty-state">暂无仓库</div>';return}
  el.innerHTML='';
  for(var i=0;i<allWarehouses.length;i++){
    var w=allWarehouses[i];
    el.innerHTML+='<div class="alert-card"><div class="ac-info"><div class="ac-name">'+escHtml(w.name)+'</div><div class="ac-stock">'+escHtml(w.address||'')+' '+escHtml(w.description||'')+'</div></div><div class="ac-action"><button class="btn-sm" onclick="editWarehouse('+w.id+')">编辑</button><button class="btn-sm btn-sm-danger" onclick="deleteWarehouseById('+w.id+')">删除</button></div></div>';
  }
}

function openWarehouseForm(){
  warehouseEditId=null;
  document.getElementById('warehouse-form-title').textContent='添加仓库';
  document.getElementById('wh-name').value='';
  document.getElementById('wh-addr').value='';
  document.getElementById('wh-desc').value='';
  document.getElementById('warehouse-btn-delete').classList.add('hidden');
  document.getElementById('warehouse-modal').classList.remove('hidden');
}

function editWarehouse(id){
  var w=allWarehouses.find(function(x){return x.id===id});if(!w)return;
  warehouseEditId=id;
  document.getElementById('warehouse-form-title').textContent='编辑仓库';
  document.getElementById('wh-name').value=w.name||'';
  document.getElementById('wh-addr').value=w.address||'';
  document.getElementById('wh-desc').value=w.description||'';
  document.getElementById('warehouse-btn-delete').classList.remove('hidden');
  document.getElementById('warehouse-modal').classList.remove('hidden');
}

function closeWarehouseForm(){document.getElementById('warehouse-modal').classList.add('hidden')}

async function saveWarehouse(){
  var name=document.getElementById('wh-name').value.trim();
  if(!name){showToast('请输入仓库名称');return}
  var data={company_id:currentCompanyId,name:name,address:document.getElementById('wh-addr').value.trim(),description:document.getElementById('wh-desc').value.trim()};
  if(warehouseEditId){await sb.from('warehouses').update(data).eq('id',warehouseEditId)}else{await sb.from('warehouses').insert(data)}
  showToast(warehouseEditId?'已更新':'已添加');
  closeWarehouseForm();
  await loadWarehouses();
  loadWarehousesPanel();
}

async function deleteWarehouse(){await deleteWarehouseById(warehouseEditId);closeWarehouseForm()}
async function deleteWarehouseById(id){
  if(!confirm('确定删除此仓库？'))return;
  await sb.from('warehouses').delete().eq('id',id);
  showToast('已删除');
  await loadWarehouses();
  loadWarehousesPanel();
}

async function loadStockRecords(){
  var wh=document.getElementById('inv-record-warehouse');
  var whId=wh?wh.value:'';
  var tp=(document.getElementById('inv-record-type')||{}).value||'';
  var search=(document.getElementById('inv-record-search')||{}).value||'';
  var q=sb.from('stock_records').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false}).limit(200);
  if(whId)q=q.eq('warehouse_id',whId);
  if(tp)q=q.eq('type',tp);
  var r=await q;
  if(r.error){console.error(r.error);return}
  allStockRecords=r.data||[];
  if(search){allStockRecords=allStockRecords.filter(function(sr){
    var pn=findProductName(sr.product_id).toLowerCase();
    var bn=(sr.batch_no||'').toLowerCase();
    var s=search.toLowerCase();
    return pn.indexOf(s)>=0||bn.indexOf(s)>=0;
  })}
  renderStockRecords();
}

function findProductName(id){
  var p=allProducts.find(function(x){return x.id===id});
  return p?p.name:'';
}
function findWarehouseName(id){
  var w=allWarehouses.find(function(x){return x.id===id});
  return w?w.name:'';
}

function renderStockRecords(){
  var el=document.getElementById('stock-records-table');
  if(!el)return;
  if(allStockRecords.length===0){el.innerHTML='<div class="empty-state">暂无出入库记录</div>';return}
  var h='<table class="stock-table"><tr><th>时间</th><th>类型</th><th>产品</th><th>仓库</th><th>数量</th><th>单价</th><th>金额</th><th>批次</th><th>备注</th></tr>';
  for(var i=0;i<allStockRecords.length;i++){
    var sr=allStockRecords[i];
    h+='<tr><td>'+new Date(sr.created_at).toLocaleString('zh-CN')+'</td>'+
      '<td class="type-'+(sr.type||'')+'">'+(sr.type==='in'?'入库':'出库')+'</td>'+
      '<td>'+escHtml(findProductName(sr.product_id))+'</td>'+
      '<td>'+escHtml(findWarehouseName(sr.warehouse_id))+'</td>'+
      '<td>'+sr.quantity+'</td><td>¥'+(sr.unit_price||0)+'</td><td>¥'+(sr.quantity*sr.unit_price).toFixed(2)+'</td>'+
      '<td>'+escHtml(sr.batch_no||'')+'</td><td class="text-wrap">'+escHtml(sr.remark||'')+'</td></tr>';
  }
  el.innerHTML=h+'</table>';
}

function openStockRecordForm(){
  document.getElementById('stock-record-title').textContent='出入库';
  document.getElementById('srm-type').value='in';
  document.getElementById('srm-product').value='';
  document.getElementById('srm-qty').value='';
  document.getElementById('srm-price').value='';
  document.getElementById('srm-batch').value='';
  document.getElementById('srm-remark').value='';
  document.getElementById('stock-record-modal').classList.remove('hidden');
  var psel=document.getElementById('srm-product');
  psel.innerHTML='<option value="">选择产品</option>';
  for(var i=0;i<allProducts.length;i++)psel.innerHTML+='<option value="'+allProducts[i].id+'">'+escHtml(allProducts[i].name)+'</option>';
}

function closeStockRecordForm(){document.getElementById('stock-record-modal').classList.add('hidden')}

async function saveStockRecord(){
  var pid=document.getElementById('srm-product').value;
  var wid=document.getElementById('srm-warehouse').value;
  if(!pid||!wid){showToast('请选择产品和仓库');return}
  var qty=parseFloat(document.getElementById('srm-qty').value)||0;
  if(qty<=0){showToast('请输入有效数量');return}
  var type=document.getElementById('srm-type').value;
  if(type==='out'){
    var balance=await getProductStock(pid,wid);
    if(qty>balance){showToast('库存不足！当前库存:'+balance);return}
  }
  var data={
    company_id:currentCompanyId,product_id:pid,warehouse_id:wid,type:type,
    quantity:qty,unit_price:parseFloat(document.getElementById('srm-price').value)||0,
    batch_no:document.getElementById('srm-batch').value.trim(),
    remark:document.getElementById('srm-remark').value.trim(),
    recorded_by:currentUser.id
  };
  var r=await sb.from('stock_records').insert(data);
  if(r.error){showToast('保存失败:'+r.error.message);return}
  showToast('记录已保存');
  closeStockRecordForm();
  await loadStockRecords();
  await loadProducts();
}

async function getProductStock(pid,wid){
  var r=await sb.from('stock_records').select('type,quantity').eq('company_id',currentCompanyId).eq('product_id',pid).eq('warehouse_id',wid);
  if(r.error)return 0;
  var bal=0;
  for(var i=0;i<r.data.length;i++)bal+=r.data[i].type==='in'?r.data[i].quantity:-r.data[i].quantity;
  return Math.round(bal*100)/100;
}

async function loadStockAlerts(){
  var wh=document.getElementById('inv-alert-warehouse');
  var whId=wh?wh.value:'';
  var q=sb.from('stock_alerts').select('*').eq('company_id',currentCompanyId).eq('enabled',true);
  if(whId)q=q.eq('warehouse_id',whId);
  var r=await q;
  if(r.error){console.error(r.error);return}
  allAlerts=r.data||[];
  renderAlerts();
}

async function renderAlerts(){
  var el=document.getElementById('alert-list');if(!el)return;
  if(allAlerts.length===0){el.innerHTML='<div class="empty-state">暂无预警设置</div>';return}
  el.innerHTML='';
  for(var i=0;i<allAlerts.length;i++){
    var a=allAlerts[i];
    var bal=0;
    if(a.warehouse_id)bal=await getProductStock(a.product_id,a.warehouse_id);
    else{
      for(var j=0;j<allWarehouses.length;j++)bal+=await getProductStock(a.product_id,allWarehouses[j].id);
    }
    var cls='';
    if(a.min_stock>0&&bal<=a.min_stock)cls='danger';
    else if(a.max_stock>0&&bal>=a.max_stock)cls='warning';
    el.innerHTML+='<div class="alert-card '+(cls?cls:'')+'"><div class="ac-info"><div class="ac-name">'+escHtml(findProductName(a.product_id))+'</div><div class="ac-stock">当前库存: '+bal+' | 最低: '+(a.min_stock||'-')+' 最高: '+(a.max_stock||'-')+' | '+escHtml(a.warehouse_id?findWarehouseName(a.warehouse_id):'全部仓库')+'</div></div><div class="ac-action"><button class="btn-sm" onclick="editAlert('+a.id+')">编辑</button><button class="btn-sm btn-sm-danger" onclick="deleteAlertById('+a.id+')">删除</button></div></div>';
  }
}

function openAlertForm(){
  alertEditId=null;
  document.getElementById('alert-form-title').textContent='库存预警设置';
  document.getElementById('alm-product').value='';
  document.getElementById('alm-warehouse').value='';
  document.getElementById('alm-min').value='';
  document.getElementById('alm-max').value='';
  document.getElementById('alm-enabled').checked=true;
  document.getElementById('alert-btn-delete').classList.add('hidden');
  var psel=document.getElementById('alm-product');
  psel.innerHTML='<option value="">选择产品</option>';
  for(var i=0;i<allProducts.length;i++)psel.innerHTML+='<option value="'+allProducts[i].id+'">'+escHtml(allProducts[i].name)+'</option>';
  document.getElementById('alert-modal').classList.remove('hidden');
}

function editAlert(id){
  var a=allAlerts.find(function(x){return x.id===id});if(!a)return;
  alertEditId=id;
  document.getElementById('alert-form-title').textContent='编辑预警';
  document.getElementById('alm-product').value=a.product_id;
  document.getElementById('alm-warehouse').value=a.warehouse_id||'';
  document.getElementById('alm-min').value=a.min_stock||'';
  document.getElementById('alm-max').value=a.max_stock||'';
  document.getElementById('alm-enabled').checked=a.enabled!==false;
  document.getElementById('alert-btn-delete').classList.remove('hidden');
  document.getElementById('alert-modal').classList.remove('hidden');
}

function closeAlertForm(){document.getElementById('alert-modal').classList.add('hidden')}

async function saveAlert(){
  var pid=document.getElementById('alm-product').value;
  if(!pid){showToast('请选择产品');return}
  var wid=document.getElementById('alm-warehouse').value||null;
  var data={company_id:currentCompanyId,product_id:pid,warehouse_id:wid,min_stock:parseFloat(document.getElementById('alm-min').value)||0,max_stock:parseFloat(document.getElementById('alm-max').value)||0,enabled:document.getElementById('alm-enabled').checked};
  if(alertEditId){await sb.from('stock_alerts').update(data).eq('id',alertEditId)}else{await sb.from('stock_alerts').insert(data)}
  showToast(alertEditId?'已更新':'已添加');
  closeAlertForm();
  await loadStockAlerts();
}

async function deleteAlert(){await deleteAlertById(alertEditId);closeAlertForm()}
async function deleteAlertById(id){
  if(!confirm('确定删除此预警？'))return;
  await sb.from('stock_alerts').delete().eq('id',id);
  showToast('已删除');
  await loadStockAlerts();
}

async function loadStockChecks(){
  var wh=document.getElementById('inv-check-warehouse');
  var whId=wh?wh.value:'';
  var q=sb.from('stock_checks').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false});
  if(whId)q=q.eq('warehouse_id',whId);
  var r=await q;
  if(r.error){console.error(r.error);return}
  allChecks=r.data||[];
  renderChecks();
}

function renderChecks(){
  var el=document.getElementById('check-list');if(!el)return;
  if(allChecks.length===0){el.innerHTML='<div class="empty-state">暂无盘点记录</div>';return}
  el.innerHTML='';
  for(var i=0;i<allChecks.length;i++){
    var ch=allChecks[i];
    var statusBadge=ch.status==='done'?'<span style="color:var(--success);font-weight:600">已完成</span>':(ch.status==='cancelled'?'<span style="color:var(--text-secondary)">已取消</span>':'<span style="color:var(--warning);font-weight:600">草稿</span>');
    el.innerHTML+='<div class="alert-card"><div class="ac-info"><div class="ac-name">'+escHtml(findWarehouseName(ch.warehouse_id))+' - '+new Date(ch.check_date).toLocaleDateString('zh-CN')+'</div><div class="ac-stock">'+statusBadge+' | '+escHtml(ch.remark||'')+'</div></div><div class="ac-action"><button class="btn-sm" onclick="viewCheck('+ch.id+')">查看</button><button class="btn-sm btn-sm-danger" onclick="deleteCheckById('+ch.id+')">删除</button></div></div>';
  }
}

function openCheckForm(){
  checkEditId=null;checkItems=[];
  document.getElementById('check-form-title').textContent='新增盘点';
  document.getElementById('chm-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('chm-remark').value='';
  document.getElementById('check-btn-delete').classList.add('hidden');
  document.getElementById('chm-items-title').style.display='none';
  document.getElementById('chm-summary').style.display='none';
  document.getElementById('chm-items').innerHTML='';
  document.getElementById('chm-add-btn').innerHTML='<button class="btn-sm btn-sm-primary" onclick="initCheckItems()">加载盘点明细</button>';
  document.getElementById('check-modal').classList.remove('hidden');
}

async function initCheckItems(){
  var wid=document.getElementById('chm-warehouse').value;
  if(!wid){showToast('请先选择仓库');return}
  checkItems=[];
  for(var i=0;i<allProducts.length;i++){
    var bal=await getProductStock(allProducts[i].id,wid);
    checkItems.push({product_id:allProducts[i].id,book_qty:bal,actual_qty:0,diff_qty:0,remark:''});
  }
  renderCheckItems();
  document.getElementById('chm-items-title').style.display='block';
  document.getElementById('chm-summary').style.display='flex';
  document.getElementById('chm-add-btn').innerHTML='';
  updateCheckSummary();
}

function renderCheckItems(){
  var el=document.getElementById('chm-items');if(!el)return;
  el.innerHTML='<table class="check-table"><tr><th>产品</th><th>账面库存</th><th>实盘数量</th><th>差异</th><th>备注</th></tr>';
  for(var i=0;i<checkItems.length;i++){
    var ci=checkItems[i];
    el.innerHTML+='<tr><td>'+escHtml(findProductName(ci.product_id))+'</td><td>'+ci.book_qty+'</td><td><input type="number" step="0.01" value="'+ci.actual_qty+'" oninput="updateCheckItem('+i+',this.value)"></td><td style="color:'+(ci.actual_qty!==ci.book_qty?'var(--danger)':'var(--text)')+'">'+(ci.actual_qty-ci.book_qty).toFixed(2)+'</td><td><input style="width:100%" placeholder="备注" value="'+escHtml(ci.remark||'')+'" oninput="checkItems['+i+'].remark=this.value"></td></tr>';
  }
  el.innerHTML+='</table>';
}

function updateCheckItem(i,val){
  checkItems[i].actual_qty=parseFloat(val)||0;
  checkItems[i].diff_qty=checkItems[i].actual_qty-checkItems[i].book_qty;
  updateCheckSummary();
}

function updateCheckSummary(){
  document.getElementById('chm-total-items').textContent=checkItems.length;
  var match=0,diff=0;
  for(var i=0;i<checkItems.length;i++){if(checkItems[i].actual_qty===checkItems[i].book_qty)match++;else diff++}
  document.getElementById('chm-match').textContent=match;
  document.getElementById('chm-diff').textContent=diff;
}

async function viewCheck(id){
  var ch=allChecks.find(function(x){return x.id===id});if(!ch)return;
  checkEditId=id;
  document.getElementById('check-form-title').textContent='盘点详情';
  document.getElementById('chm-warehouse').value=ch.warehouse_id;
  document.getElementById('chm-date').value=ch.check_date||'';
  document.getElementById('chm-remark').value=ch.remark||'';
  document.getElementById('check-btn-delete').classList.remove('hidden');
  var r=await sb.from('stock_check_items').select('*').eq('check_id',id);
  checkItems=r.data||[];
  renderCheckItems();
  document.getElementById('chm-items-title').style.display='block';
  document.getElementById('chm-summary').style.display='flex';
  document.getElementById('chm-add-btn').innerHTML='';
  updateCheckSummary();
  document.getElementById('check-modal').classList.remove('hidden');
  document.getElementById('chm-warehouse').disabled=true;
}

function closeCheckForm(){
  document.getElementById('check-modal').classList.add('hidden');
  document.getElementById('chm-warehouse').disabled=false;
}

async function saveCheck(){
  var wid=document.getElementById('chm-warehouse').value;
  if(!wid){showToast('请选择仓库');return}
  if(checkItems.length===0){showToast('请先加载盘点明细');return}
  var data={
    company_id:currentCompanyId,warehouse_id:wid,
    check_date:document.getElementById('chm-date').value,
    remark:document.getElementById('chm-remark').value.trim(),
    checked_by:currentUser.id
  };
  var r;
  if(checkEditId){
    data.status=document.getElementById('check-btn-delete').classList.contains('hidden')?'draft':'done';
    r=await sb.from('stock_checks').update(data).eq('id',checkEditId);
  }else{
    data.status='done';
    r=await sb.from('stock_checks').insert(data).select().single();
  }
  if(r.error){showToast('保存失败:'+r.error.message);return}
  var checkId=checkEditId||r.data.id;
  await sb.from('stock_check_items').delete().eq('check_id',checkId);
  var items=[];
  for(var i=0;i<checkItems.length;i++){
    items.push({check_id:checkId,product_id:checkItems[i].product_id,book_qty:checkItems[i].book_qty,actual_qty:checkItems[i].actual_qty,remark:checkItems[i].remark||''});
  }
  if(items.length>0)await sb.from('stock_check_items').insert(items);
  showToast('盘点已保存');
  closeCheckForm();
  document.getElementById('chm-warehouse').disabled=false;
  await loadStockChecks();
}

async function deleteCheck(){await deleteCheckById(checkEditId);closeCheckForm();document.getElementById('chm-warehouse').disabled=false}
async function deleteCheckById(id){
  if(!confirm('确定删除此盘点？'))return;
  await sb.from('stock_checks').delete().eq('id',id);
  showToast('已删除');
  await loadStockChecks();
}

// ====== Stock Transfers 库存调拨 ======
let allTransfers=[],transferEditId=null,transferItems=[];
async function loadStockTransfers(){
  var from=(document.getElementById('inv-transfer-from')||{}).value||'';
  var to=(document.getElementById('inv-transfer-to')||{}).value||'';
  var status=(document.getElementById('inv-transfer-status')||{}).value||'';
  var q=sb.from('stock_transfers').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false});
  if(from)q=q.eq('from_warehouse_id',from);
  if(to)q=q.eq('to_warehouse_id',to);
  if(status)q=q.eq('status',status);
  var r=await q;
  if(r.error){console.error(r.error);return}
  allTransfers=r.data||[];
  renderTransfers();
}
function renderTransfers(){
  var el=document.getElementById('transfer-list');if(!el)return;
  if(allTransfers.length===0){el.innerHTML='<div class="empty-state">暂无调拨记录</div>';return}
  var h='<table class="stock-table"><tr><th>日期</th><th>调出仓库</th><th>调入仓库</th><th>状态</th><th>备注</th><th>操作</th></tr>';
  for(var i=0;i<allTransfers.length;i++){
    var tf=allTransfers[i];
    var sBadge='';
    if(tf.status==='draft')sBadge='<span style="color:var(--warning);font-weight:600">草稿</span>';
    else if(tf.status==='confirmed')sBadge='<span style="color:var(--primary);font-weight:600">已确认</span>';
    else if(tf.status==='completed')sBadge='<span style="color:var(--success);font-weight:600">已完成</span>';
    h+='<tr><td>'+new Date(tf.transfer_date||tf.created_at).toLocaleDateString('zh-CN')+'</td><td>'+escHtml(findWarehouseName(tf.from_warehouse_id))+'</td><td>'+escHtml(findWarehouseName(tf.to_warehouse_id))+'</td><td>'+sBadge+'</td><td>'+escHtml(tf.notes||'')+'</td><td><button class="btn-sm" onclick="editTransfer('+tf.id+')">查看</button><button class="btn-sm btn-sm-danger" onclick="deleteTransferById('+tf.id+')">删除</button></td></tr>';
  }
  el.innerHTML=h+'</table>';
}
async function openTransferForm(){
  transferEditId=null;transferItems=[];
  document.getElementById('transfer-form-title').textContent='新增调拨';
  document.getElementById('tfm-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('tfm-notes').value='';
  document.getElementById('transfer-btn-delete').classList.add('hidden');
  document.getElementById('transfer-btn-confirm').style.display='none';
  var fsel=document.getElementById('tfm-from');
  var tsel=document.getElementById('tfm-to');
  fsel.innerHTML='<option value="">选择仓库</option>';
  tsel.innerHTML='<option value="">选择仓库</option>';
  for(var i=0;i<allWarehouses.length;i++){
    fsel.innerHTML+='<option value="'+allWarehouses[i].id+'">'+escHtml(allWarehouses[i].name)+'</option>';
    tsel.innerHTML+='<option value="'+allWarehouses[i].id+'">'+escHtml(allWarehouses[i].name)+'</option>';
  }
  document.getElementById('tfm-items').innerHTML='';
  document.getElementById('transfer-modal').classList.remove('hidden');
}
async function editTransfer(id){
  var tf=allTransfers.find(function(x){return x.id===id});if(!tf)return;
  transferEditId=id;
  document.getElementById('transfer-form-title').textContent='调拨单详情';
  document.getElementById('tfm-from').value=tf.from_warehouse_id||'';
  document.getElementById('tfm-to').value=tf.to_warehouse_id||'';
  document.getElementById('tfm-date').value=tf.transfer_date||'';
  document.getElementById('tfm-notes').value=tf.notes||'';
  document.getElementById('transfer-btn-delete').classList.remove('hidden');
  document.getElementById('transfer-btn-confirm').style.display=tf.status==='draft'?'':'none';
  var r=await sb.from('stock_transfer_items').select('*').eq('transfer_id',id);
  transferItems=(r.data||[]).map(function(x){return{product_id:x.product_id,quantity:x.quantity,remark:x.remark||''}});
  renderTransferItems();
  document.getElementById('transfer-modal').classList.remove('hidden');
}
function closeTransferForm(){document.getElementById('transfer-modal').classList.add('hidden')}
function addTransferItem(){transferItems.push({product_id:'',quantity:0,remark:''});renderTransferItems()}
function removeTransferItem(i){transferItems.splice(i,1);renderTransferItems()}
function renderTransferItems(){
  var el=document.getElementById('tfm-items');if(!el)return;
  el.innerHTML='';
  for(var i=0;i<transferItems.length;i++){
    var ti=transferItems[i];
    var opts='<option value="">选择产品</option>';
    for(var j=0;j<allProducts.length;j++)opts+='<option value="'+allProducts[j].id+'"'+(allProducts[j].id==ti.product_id?' selected':'')+'>'+escHtml(allProducts[j].name)+'</option>';
    el.innerHTML+='<div class="spec-row"><select onchange="transferItems['+i+'].product_id=this.value" style="flex:2">'+opts+'</select><input type="number" min="0" step="0.01" placeholder="数量" value="'+ti.quantity+'" oninput="transferItems['+i+'].quantity=parseFloat(this.value)||0" style="width:80px"><input placeholder="备注" value="'+escHtml(ti.remark||'')+'" oninput="transferItems['+i+'].remark=this.value" style="flex:1"><button class="btn-sm btn-sm-danger" onclick="removeTransferItem('+i+')" style="font-size:11px;padding:2px 6px">✕</button></div>';
  }
}
async function saveTransfer(){
  var from=document.getElementById('tfm-from').value;
  var to=document.getElementById('tfm-to').value;
  if(!from||!to){showToast('请选择调出和调入仓库');return}
  if(from===to){showToast('调出和调入仓库不能相同');return}
  if(transferItems.length===0){showToast('请添加调拨明细');return}
  var data={
    company_id:currentCompanyId,
    from_warehouse_id:from,to_warehouse_id:to,
    transfer_date:document.getElementById('tfm-date').value,
    notes:document.getElementById('tfm-notes').value.trim(),
    created_by:currentUser.id
  };
  var r;
  if(transferEditId){r=await sb.from('stock_transfers').update(data).eq('id',transferEditId).select().single()}
  else{r=await sb.from('stock_transfers').insert(data).select().single()}
  if(r.error){showToast('保存失败:'+r.error.message);return}
  var tfId=transferEditId||r.data.id;
  await sb.from('stock_transfer_items').delete().eq('transfer_id',tfId);
  var items=[];
  for(var i=0;i<transferItems.length;i++){
    if(!transferItems[i].product_id||transferItems[i].quantity<=0)continue;
    items.push({transfer_id:tfId,product_id:transferItems[i].product_id,quantity:transferItems[i].quantity,remark:transferItems[i].remark||''});
  }
  if(items.length>0)await sb.from('stock_transfer_items').insert(items);
  showToast(transferEditId?'已更新':'已创建');
  closeTransferForm();
  await loadStockTransfers();
}
async function confirmTransfer(){
  if(!transferEditId){showToast('请先保存调拨单');return}
  var tf=allTransfers.find(function(x){return x.id===transferEditId});if(!tf)return;
  // 创建出库记录
  for(var i=0;i<transferItems.length;i++){
    var ti=transferItems[i];
    if(!ti.product_id||ti.quantity<=0)continue;
    var bal=await getProductStock(ti.product_id,tf.from_warehouse_id);
    if(ti.quantity>bal){showToast('库存不足: '+findProductName(ti.product_id)+' 当前库存'+bal);return}
  }
  for(var j=0;j<transferItems.length;j++){
    var ti2=transferItems[j];
    if(!ti2.product_id||ti2.quantity<=0)continue;
    await sb.from('stock_records').insert({company_id:currentCompanyId,product_id:ti2.product_id,warehouse_id:tf.from_warehouse_id,type:'out',quantity:ti2.quantity,remark:'调拨出库 #'+transferEditId,recorded_by:currentUser.id});
    await sb.from('stock_records').insert({company_id:currentCompanyId,product_id:ti2.product_id,warehouse_id:tf.to_warehouse_id,type:'in',quantity:ti2.quantity,remark:'调拨入库 #'+transferEditId,recorded_by:currentUser.id});
  }
  await sb.from('stock_transfers').update({status:'completed'}).eq('id',transferEditId);
  showToast('调拨完成');
  closeTransferForm();
  await loadStockTransfers();
  await loadProducts();
}
async function deleteTransfer(){await deleteTransferById(transferEditId);closeTransferForm()}
async function deleteTransferById(id){
  if(!confirm('确定删除此调拨单？'))return;
  await sb.from('stock_transfer_items').delete().eq('transfer_id',id);
  await sb.from('stock_transfers').delete().eq('id',id);
  showToast('已删除');
  await loadStockTransfers();
}

// ====== Stock Ledger 库存台账 ======
async function loadStockLedger(){
  try{
  var pid=(document.getElementById('inv-ledger-product')||{}).value||'';
  var wid=(document.getElementById('inv-ledger-warehouse')||{}).value||'';
  var search=((document.getElementById('inv-ledger-search')||{}).value||'').toLowerCase();
  var q=sb.from('stock_records').select('*').eq('company_id',currentCompanyId).order('product_id',{ascending:false}).order('created_at',{ascending:true});
  if(pid)q=q.eq('product_id',pid);
  if(wid)q=q.eq('warehouse_id',wid);
  var r=await q.limit(500);
  if(r.error){console.error('loadStockLedger:',r.error);showToast('台账加载失败: '+r.error.message);return}
  var records=r.data||[];
  if(search)records=records.filter(function(sr){var pn=findProductName(sr.product_id).toLowerCase();var bn=(sr.batch_no||'').toLowerCase();return pn.indexOf(search)>=0||bn.indexOf(search)>=0});
  // Build running balance
  var balMap={};
  var outQty={},inQty={},outAmt={},inAmt={};
  for(var i=0;i<records.length;i++){
    var rec=records[i];
    var key=rec.product_id+'_'+(rec.warehouse_id||'');
    if(!balMap[key])balMap[key]=0;
    var prev=balMap[key];
    balMap[key]+=rec.type==='in'?rec.quantity:-rec.quantity;
    rec._balance=Math.round(balMap[key]*100)/100;
    rec._prev=prev;
    if(rec.type==='in'){inQty[key]=(inQty[key]||0)+rec.quantity;inAmt[key]=(inAmt[key]||0)+rec.quantity*(rec.unit_price||0)}
    else{outQty[key]=(outQty[key]||0)+rec.quantity;outAmt[key]=(outAmt[key]||0)+rec.quantity*(rec.unit_price||0)}
  }
  allLedgerRecords=records;
  // Summary
  var el=document.getElementById('ledger-summary');if(!el)return;
  var totalIn=0,totalOut=0,totalInAmt=0,totalOutAmt=0;
  for(var k in inQty){totalIn+=inQty[k];totalInAmt+=inAmt[k]}
  for(var k2 in outQty){totalOut+=outQty[k2];totalOutAmt+=outAmt[k2]}
  el.innerHTML='入库合计: <b style="color:var(--success)">'+totalIn.toFixed(2)+'</b> 件 / ¥<b style="color:var(--success)">'+totalInAmt.toFixed(2)+'</b> &nbsp;|&nbsp; 出库合计: <b style="color:var(--danger)">'+totalOut.toFixed(2)+'</b> 件 / ¥<b style="color:var(--danger)">'+totalOutAmt.toFixed(2)+'</b> &nbsp;|&nbsp; 记录数: '+records.length;
  renderLedger();
  }catch(e){console.error('loadStockLedger error:',e);showToast('台账加载失败: '+e.message)}
}
function renderLedger(){
  var el=document.getElementById('ledger-table');if(!el)return;
  if(allLedgerRecords.length===0){el.innerHTML='<div class="empty-state">暂无台账记录</div>';return}
  var h='<table class="stock-table"><tr><th>时间</th><th>产品</th><th>仓库</th><th>类型</th><th>数量</th><th>单价</th><th>金额</th><th>结存</th><th>批次</th><th>备注</th></tr>';
  for(var i=0;i<allLedgerRecords.length;i++){
    var sr=allLedgerRecords[i];
    h+='<tr><td>'+new Date(sr.created_at).toLocaleString('zh-CN')+'</td><td>'+escHtml(findProductName(sr.product_id))+'</td><td>'+escHtml(findWarehouseName(sr.warehouse_id))+'</td><td class="type-'+(sr.type||'')+'">'+(sr.type==='in'?'入库':'出库')+'</td><td>'+sr.quantity+'</td><td>¥'+(sr.unit_price||0)+'</td><td>¥'+(sr.quantity*(sr.unit_price||0)).toFixed(2)+'</td><td style="font-weight:600;color:'+(sr._balance>=0?'var(--success)':'var(--danger)')+'">'+sr._balance+'</td><td>'+escHtml(sr.batch_no||'')+'</td><td class="text-wrap">'+escHtml(sr.remark||'')+'</td></tr>';
  }
  el.innerHTML=h+'</table>';
}
function exportLedgerCSV(){
  var rows=['时间,产品,仓库,类型,数量,单价,金额,结存,批次,备注'];
  for(var i=0;i<allLedgerRecords.length;i++){
    var sr=allLedgerRecords[i];
    rows.push([new Date(sr.created_at).toISOString(),findProductName(sr.product_id),findWarehouseName(sr.warehouse_id),sr.type==='in'?'入库':'出库',sr.quantity,sr.unit_price||0,(sr.quantity*(sr.unit_price||0)).toFixed(2),sr._balance,sr.batch_no||'',sr.remark||''].join(','));
  }
  var csv='\uFEFF'+rows.join('\n');
  var blob=new Blob([csv],{type:'text/csv'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='库存台账_'+new Date().toISOString().split('T')[0]+'.csv';a.click();
  showToast('已导出');
}

// ====== Purchase Orders 采购管理 ======
let allPurchaseOrders=[],poEditId=null,poItems=[];
async function loadPurchaseOrders(){
  var sup=(document.getElementById('po-supplier-filter')||{}).value||'';
  var status=(document.getElementById('po-status-filter')||{}).value||'';
  var search=((document.getElementById('po-search')||{}).value||'').toLowerCase();
  var q=sb.from('purchase_orders').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false});
  if(sup)q=q.eq('supplier_id',sup);
  if(status)q=q.eq('status',status);
  var r=await q.limit(200);
  if(r.error){console.error(r.error);return}
  allPurchaseOrders=r.data||[];
  if(search)allPurchaseOrders=allPurchaseOrders.filter(function(po){return(po.po_number||'').toLowerCase().indexOf(search)>=0||(po.notes||'').toLowerCase().indexOf(search)>=0});
  // Stats
  var total=0,draft=0,ordered=0,done=0;
  for(var i=0;i<allPurchaseOrders.length;i++){
    total+=allPurchaseOrders[i].total_amount||0;
    if(allPurchaseOrders[i].status==='draft')draft++;
    else if(allPurchaseOrders[i].status==='ordered')ordered++;
    else if(allPurchaseOrders[i].status==='received')done++;
  }
  var sel=document.getElementById('po-stats');if(sel)sel.innerHTML='<div class="sup-stat"><div class="ss-val" style="font-size:16px">'+allPurchaseOrders.length+'</div><div class="ss-label">采购单</div></div><div class="sup-stat"><div class="ss-val" style="font-size:16px">¥'+total.toFixed(0)+'</div><div class="ss-label">总金额</div></div><div class="sup-stat"><div class="ss-val" style="font-size:16px;color:var(--warning)">'+draft+'</div><div class="ss-label">草稿</div></div><div class="sup-stat"><div class="ss-val" style="font-size:16px;color:var(--primary)">'+ordered+'</div><div class="ss-label">已下单</div></div><div class="sup-stat"><div class="ss-val" style="font-size:16px;color:var(--success)">'+done+'</div><div class="ss-label">已入库</div></div>';
  renderPurchaseOrders();
}
function renderPurchaseOrders(){
  var el=document.getElementById('po-list');if(!el)return;
  if(allPurchaseOrders.length===0){el.innerHTML='<div class="empty-state">暂无采购单，点击"＋ 采购单"添加</div>';return}
  el.innerHTML='';
  for(var i=0;i<allPurchaseOrders.length;i++){
    var po=allPurchaseOrders[i];
    var sBadge='';
    if(po.status==='draft')sBadge='<span class="tag" style="background:#FEF3C7;color:#D97706">草稿</span>';
    else if(po.status==='ordered')sBadge='<span class="tag" style="background:#DBEAFE;color:#2563EB">已下单</span>';
    else if(po.status==='partial')sBadge='<span class="tag" style="background:#E0E7FF;color:#4F46E5">部分入库</span>';
    else if(po.status==='received')sBadge='<span class="tag" style="background:#D1FAE5;color:#059669">已入库</span>';
    else if(po.status==='cancelled')sBadge='<span class="tag" style="background:#F3F4F6;color:#9CA3AF">已取消</span>';
    var supName='',supObj=allSuppliers?allSuppliers.find(function(s){return s.id==po.supplier_id}):null;
    if(supObj)supName=supObj.name;
    el.innerHTML+='<div class="alert-card" onclick="editPurchaseOrder('+po.id+')"><div class="ac-info"><div class="ac-name">'+escHtml(po.po_number)+' '+sBadge+'</div><div class="ac-stock">'+(supName?escHtml(supName):'')+' | ¥'+(po.total_amount||0).toFixed(2)+' | '+new Date(po.order_date||po.created_at).toLocaleDateString('zh-CN')+'</div></div><div class="ac-action"><button class="btn-sm btn-sm-danger" onclick="event.stopPropagation();deletePOById('+po.id+')">删除</button></div></div>';
  }
}
async function openPurchaseOrderForm(){
  poEditId=null;poItems=[];
  document.getElementById('po-form-title').textContent='新建采购单';
  document.getElementById('pof-number').value='PO-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+(Math.random().toString(36).substr(2,4).toUpperCase());
  document.getElementById('pof-order-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('pof-expected-date').value='';
  document.getElementById('pof-status').value='draft';
  document.getElementById('pof-notes').value='';
  document.getElementById('po-btn-delete').classList.add('hidden');
  document.getElementById('po-btn-receive').style.display='none';
  document.getElementById('pof-items').innerHTML='';
  document.getElementById('pof-total').textContent='¥0.00';
  // Fill suppliers
  var ssel=document.getElementById('pof-supplier');
  ssel.innerHTML='<option value="">选择供应商</option>';
  if(allSuppliers)for(var i=0;i<allSuppliers.length;i++)ssel.innerHTML+='<option value="'+allSuppliers[i].id+'">'+escHtml(allSuppliers[i].name)+'</option>';
  // Fill warehouses
  var wsel=document.getElementById('pof-warehouse');
  wsel.innerHTML='<option value="">选择仓库</option>';
  if(allWarehouses)for(var j=0;j<allWarehouses.length;j++)wsel.innerHTML+='<option value="'+allWarehouses[j].id+'">'+escHtml(allWarehouses[j].name)+'</option>';
  document.getElementById('po-modal').classList.remove('hidden');
}
async function editPurchaseOrder(id){
  var po=allPurchaseOrders.find(function(x){return x.id===id});if(!po)return;
  poEditId=id;
  document.getElementById('po-form-title').textContent='编辑采购单';
  document.getElementById('pof-supplier').value=po.supplier_id||'';
  document.getElementById('pof-number').value=po.po_number||'';
  document.getElementById('pof-order-date').value=po.order_date||'';
  document.getElementById('pof-expected-date').value=po.expected_date||'';
  document.getElementById('pof-status').value=po.status||'draft';
  document.getElementById('pof-notes').value=po.notes||'';
  document.getElementById('po-btn-delete').classList.remove('hidden');
  document.getElementById('po-btn-receive').style.display=(po.status==='draft'||po.status==='ordered'||po.status==='partial')?'':'none';
  var r=await sb.from('purchase_order_items').select('*').eq('po_id',id);
  poItems=(r.data||[]).map(function(x){return{product_id:x.product_id,quantity:x.quantity,unit_price:x.unit_price,total_price:x.total_price,received_qty:x.received_qty||0,warehouse_id:x.warehouse_id||'',remark:x.remark||''}});
  renderPOItems();
  updatePOTotal();
  // Fill suppliers
  var ssel=document.getElementById('pof-supplier');
  ssel.innerHTML='<option value="">选择供应商</option>';
  if(allSuppliers)for(var i=0;i<allSuppliers.length;i++)ssel.innerHTML+='<option value="'+allSuppliers[i].id+'"'+(allSuppliers[i].id==po.supplier_id?' selected':'')+'>'+escHtml(allSuppliers[i].name)+'</option>';
  var wsel=document.getElementById('pof-warehouse');
  wsel.innerHTML='<option value="">选择仓库</option>';
  if(allWarehouses)for(var j=0;j<allWarehouses.length;j++)wsel.innerHTML+='<option value="'+allWarehouses[j].id+'">'+escHtml(allWarehouses[j].name)+'</option>';
  document.getElementById('po-modal').classList.remove('hidden');
}
function closePOForm(){document.getElementById('po-modal').classList.add('hidden')}
function addPOItem(){poItems.push({product_id:'',quantity:0,unit_price:0,total_price:0,received_qty:0,warehouse_id:'',remark:''});renderPOItems()}
function removePOItem(i){poItems.splice(i,1);renderPOItems();updatePOTotal()}
function renderPOItems(){
  var el=document.getElementById('pof-items');if(!el)return;
  el.innerHTML='';
  for(var i=0;i<poItems.length;i++){
    var pi=poItems[i];
    var popts='<option value="">选择产品</option>';
    for(var j=0;j<allProducts.length;j++)popts+='<option value="'+allProducts[j].id+'"'+(allProducts[j].id==pi.product_id?' selected':'')+'>'+escHtml(allProducts[j].name)+'</option>';
    var wopts='<option value="">仓库</option>';
    for(var k=0;k<allWarehouses.length;k++)wopts+='<option value="'+allWarehouses[k].id+'"'+(allWarehouses[k].id==pi.warehouse_id?' selected':'')+'>'+escHtml(allWarehouses[k].name)+'</option>';
    el.innerHTML+='<div class="po-item-row" style="display:flex;gap:4px;align-items:center;padding:4px 0;border-bottom:1px solid var(--border)"><select onchange="poItems['+i+'].product_id=this.value;updatePOItem('+i+')" style="flex:2;min-width:120px">'+popts+'</select><input type="number" min="0" step="0.01" placeholder="数量" value="'+pi.quantity+'" oninput="poItems['+i+'].quantity=parseFloat(this.value)||0;updatePOItem('+i+')" style="width:60px"><input type="number" min="0" step="0.01" placeholder="单价" value="'+pi.unit_price+'" oninput="poItems['+i+'].unit_price=parseFloat(this.value)||0;updatePOItem('+i+')" style="width:80px"><span style="font-size:12px;min-width:60px;text-align:right">¥'+((pi.quantity*pi.unit_price)||0).toFixed(2)+'</span><select onchange="poItems['+i+'].warehouse_id=this.value" style="width:70px;font-size:11px">'+wopts+'</select><button class="btn-sm btn-sm-danger" onclick="removePOItem('+i+')" style="font-size:11px;padding:2px 6px">✕</button></div>';
  }
}
function updatePOItem(i){
  poItems[i].total_price=(poItems[i].quantity||0)*(poItems[i].unit_price||0);
  updatePOTotal();
  renderPOItems();
}
function updatePOTotal(){
  var total=0;
  for(var i=0;i<poItems.length;i++)total+=poItems[i].total_price||0;
  document.getElementById('pof-total').textContent='¥'+total.toFixed(2);
}
async function savePurchaseOrder(){
  var supId=document.getElementById('pof-supplier').value;
  var num=document.getElementById('pof-number').value.trim();
  if(!supId){showToast('请选择供应商');return}
  if(!num){showToast('请输入采购单号');return}
  if(poItems.length===0){showToast('请添加采购明细');return}
  var total=0;
  for(var i=0;i<poItems.length;i++)total+=poItems[i].total_price||0;
  var data={
    company_id:currentCompanyId,
    supplier_id:supId,
    po_number:num,
    order_date:document.getElementById('pof-order-date').value,
    expected_date:document.getElementById('pof-expected-date').value||null,
    status:document.getElementById('pof-status').value,
    total_amount:total,
    notes:document.getElementById('pof-notes').value.trim(),
    created_by:currentUser.id
  };
  var r;
  if(poEditId){r=await sb.from('purchase_orders').update(data).eq('id',poEditId).select().single()}
  else{r=await sb.from('purchase_orders').insert(data).select().single()}
  if(r.error){showToast('保存失败:'+r.error.message);return}
  var poId=poEditId||r.data.id;
  await sb.from('purchase_order_items').delete().eq('po_id',poId);
  var items=[];
  for(var j=0;j<poItems.length;j++){
    var pi=poItems[j];
    if(!pi.product_id||pi.quantity<=0)continue;
    items.push({po_id:poId,product_id:pi.product_id,quantity:pi.quantity,unit_price:pi.unit_price,total_price:pi.total_price,received_qty:pi.received_qty,warehouse_id:pi.warehouse_id||null,remark:pi.remark||''});
  }
  if(items.length>0)await sb.from('purchase_order_items').insert(items);
  showToast(poEditId?'已更新':'已创建');
  closePOForm();
  await loadPurchaseOrders();
}
async function receivePO(){
  if(!poEditId){showToast('请先保存采购单');return}
  var r=await sb.from('purchase_order_items').select('*').eq('po_id',poEditId);
  var items=r.data||[];
  if(items.length===0){showToast('无采购明细');return}
  for(var i=0;i<items.length;i++){
    var it=items[i];
    var toReceive=it.quantity-(it.received_qty||0);
    if(toReceive<=0)continue;
    await sb.from('stock_records').insert({company_id:currentCompanyId,product_id:it.product_id,warehouse_id:it.warehouse_id,type:'in',quantity:toReceive,unit_price:it.unit_price,remark:'采购入库 #'+poEditId,recorded_by:currentUser.id});
    await sb.from('purchase_order_items').update({received_qty:it.quantity}).eq('id',it.id);
  }
  await sb.from('purchase_orders').update({status:'received',received_date:new Date().toISOString().split('T')[0]}).eq('id',poEditId);
  showToast('入库完成');
  closePOForm();
  await loadPurchaseOrders();
  await loadProducts();
}
async function deletePurchaseOrder(){await deletePOById(poEditId);closePOForm()}
async function deletePOById(id){
  if(!confirm('确定删除此采购单？'))return;
  await sb.from('purchase_order_items').delete().eq('po_id',id);
  await sb.from('purchase_orders').delete().eq('id',id);
  showToast('已删除');
  await loadPurchaseOrders();
}

// ====== Supplier Settlement 供应商结算 ======
let allSettlements=[],settlementEditId=null;
async function openSettlementForm(supplierId){
  settlementEditId=null;
  document.getElementById('settlement-form-title').textContent='供应商结算';
  document.getElementById('sf-supplier').value=supplierId||'';
  document.getElementById('sf-po').value='';
  document.getElementById('sf-amount').value='';
  document.getElementById('sf-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('sf-method').value='bank';
  document.getElementById('sf-status').value='pending';
  document.getElementById('sf-notes').value='';
  document.getElementById('settlement-btn-delete').classList.add('hidden');
  // Fill suppliers
  var ssel=document.getElementById('sf-supplier');
  ssel.innerHTML='<option value="">选择供应商</option>';
  if(allSuppliers)for(var i=0;i<allSuppliers.length;i++)ssel.innerHTML+='<option value="'+allSuppliers[i].id+'">'+escHtml(allSuppliers[i].name)+'</option>';
  ssel.value=supplierId||'';
  // Fill POs for supplier
  updateSettlementPOs();
  document.getElementById('sf-supplier').onchange=updateSettlementPOs;
  document.getElementById('settlement-modal').classList.remove('hidden');
}
async function updateSettlementPOs(){
  var supId=document.getElementById('sf-supplier').value;
  var psel=document.getElementById('sf-po');
  psel.innerHTML='<option value="">选择采购单</option>';
  if(!supId)return;
  var r=await sb.from('purchase_orders').select('id,po_number,total_amount,paid_amount').eq('supplier_id',supId).eq('company_id',currentCompanyId).in('status',['ordered','partial','received']);
  if(r.error)return;
  var pos=r.data||[];
  for(var i=0;i<pos.length;i++){
    var po=pos[i];
    var unpaided=(po.total_amount||0)-(po.paid_amount||0);
    psel.innerHTML+='<option value="'+po.id+'">'+escHtml(po.po_number)+' - ¥'+po.total_amount+' (未结:¥'+unpaided.toFixed(2)+')</option>';
  }
  // On change, prefill amount
  psel.onchange=function(){var val=psel.value;if(val){var p=pos.find(function(x){return x.id==parseInt(val)});if(p)document.getElementById('sf-amount').value=((p.total_amount||0)-(p.paid_amount||0)).toFixed(2)}};
}
function closeSettlementForm(){document.getElementById('settlement-modal').classList.add('hidden')}
async function saveSettlement(){
  var supId=document.getElementById('sf-supplier').value;
  var amount=parseFloat(document.getElementById('sf-amount').value)||0;
  if(!supId){showToast('请选择供应商');return}
  if(amount<=0){showToast('请输入结算金额');return}
  var data={
    company_id:currentCompanyId,
    supplier_id:supId,
    po_id:document.getElementById('sf-po').value||null,
    amount:amount,
    settlement_date:document.getElementById('sf-date').value,
    method:document.getElementById('sf-method').value,
    status:document.getElementById('sf-status').value,
    notes:document.getElementById('sf-notes').value.trim(),
    created_by:currentUser.id
  };
  var r;
  if(settlementEditId){r=await sb.from('supplier_settlements').update(data).eq('id',settlementEditId)}
  else{r=await sb.from('supplier_settlements').insert(data)}
  if(r.error){showToast('保存失败:'+r.error.message);return}
  // Update PO paid_amount
  var poId=document.getElementById('sf-po').value;
  if(poId){
    var poData=await sb.from('purchase_orders').select('paid_amount,total_amount').eq('id',poId).single();
    if(poData.data){var newPaid=(poData.data.paid_amount||0)+amount;await sb.from('purchase_orders').update({paid_amount:newPaid}).eq('id',poId)}
  }
  showToast(settlementEditId?'已更新':'已结算');
  closeSettlementForm();
  // Refresh supplier detail if open
  if(typeof renderSupplierDetail==='function')renderSupplierDetail();
}
async function deleteSettlement(){
  if(!confirm('确定删除此结算记录？'))return;
  await sb.from('supplier_settlements').delete().eq('id',settlementEditId);
  showToast('已删除');
  closeSettlementForm();
}

