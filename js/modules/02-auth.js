// ==========================================================================
// grsds · 02-auth.js  —  资源授权 · 登录 · 多公司 · 成员管理面板
// 源: js/app_v2.js 第 39-452 行（机械切片，未改一行代码）
// ==========================================================================
// === 资源授权缓存（member 只能看授权的资源）===
let memberGrants={clients:'all',products:'all',suppliers:'all'};
async function loadMemberGrants(){
  if(isSuperAdmin){memberGrants={clients:'all',products:'all',suppliers:'all'};return}
  if(currentCompanyRole==='admin'){memberGrants={clients:'all',products:'all',suppliers:'all'};return}
  dbg('[loadMemberGrants] loading for user:',currentUser.id,'company:',currentCompanyId);
  try{
    // 直接查 resource_grants 表（由创建者自授权写入），不用 RPC 避免 404
    var r=await callAdmin('select','resource_grants',{
      query:'resource_type,resource_id',
      filters:[{col:'user_id',op:'eq',val:currentUser.id},{col:'company_id',op:'eq',val:currentCompanyId},{col:'',op:'limit',val:'50000'}]
    });
    var rows=r&&r.data||[];
    dbg('[loadMemberGrants] rows:',rows.length);
    if(rows.length>0){
      // 只有对应类型有授权行才覆盖默认 'all'
      for(var i=0;i<rows.length;i++){
        var row=rows[i];
        var type=row.resource_type;
        if(memberGrants[type]==='all')memberGrants[type]=[];
        memberGrants[type].push(String(row.resource_id||'').toLowerCase());
      }
    }
    dbg('[loadMemberGrants] clients:',Array.isArray(memberGrants.clients)?memberGrants.clients.length:memberGrants.clients,'products:',Array.isArray(memberGrants.products)?memberGrants.products.length:memberGrants.products,'suppliers:',Array.isArray(memberGrants.suppliers)?memberGrants.suppliers.length:memberGrants.suppliers);
  }catch(e){console.error('[loadMemberGrants] exception:',e)}
}
function canAccess(type,id){
  if(isSuperAdmin)return true;
  if(currentCompanyRole==='admin')return true;
  if(memberGrants[type]==='all')return true;
  var grants=memberGrants[type];if(!grants||!Array.isArray(grants))return false;
  var ok=grants.indexOf(String(id||'').toLowerCase())>=0;
  if(!ok)dbg('[canAccess] DENY:',type,id,'grants count:',grants.length);
  return ok;
}
let allUsers=[];
let editId=null,deleteId=null,formContacts=[],pendingImport=null;
let moveContactIdx=-1,moveContactObj=null;
let clientTags=[],clientAttachments=[],leadEditId=null,leadAssignId=null,allLeads=[],leadFormSource='pool';
let c360ClientId=null,c360ActiveTab='overview',c360Orders=[];

function h(s){if(s===null||s===undefined)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
// 与 h() 同义（旧名，400+ 处调用）。定义在 02 而非 08：拆成多模块后，
// 各模块的顶层语句（如 03-settings.js 的 setTimeout(buildTypeGrid,0)）可能在
// 后续模块下载期间抢先执行，若定义留在 08 会偶发 ReferenceError。
function escHtml(s){return h(s)}
// 把任意字符串安全地嵌进「双引号 HTML 属性内的单引号 JS 字符串」，如 onclick="f('...')"
function jsStr(s){
  return String(s===null||s===undefined?'':s)
    .replace(/\\/g,'\\\\')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'\\&#39;');
}
// SheetJS 按需加载（xlsx.full.min.js 约 900KB，仅导入/导出用得到，避免首屏阻塞）
var _xlsxPromise=null;
function ensureXlsx(){
  if(window.XLSX)return Promise.resolve(window.XLSX);
  if(_xlsxPromise)return _xlsxPromise;
  _xlsxPromise=new Promise(function(resolve,reject){
    var s=document.createElement('script');
    s.async=true;
    s.src='https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    s.onload=function(){resolve(window.XLSX)};
    s.onerror=function(){_xlsxPromise=null;reject(new Error('表格组件加载失败，请检查网络后重试'))};
    document.head.appendChild(s);
  });
  return _xlsxPromise;
}
// showToast defined below (with type/color support)
function tColor(label){
  var i=BUILTIN_TYPES.indexOf(label);
  if(i>=0)return BUILTIN_COLORS[i];
  var c=customTypes.find(function(ct){return ct.label===label});
  return c?c.color:'#999';
}

// === Auth ===
var loginFailCount=0,loginLockUntil=null;
function switchMode(){
  loginMode=loginMode==='login'?'register':'login';
  document.getElementById('login-btn').textContent=loginMode==='register'?'注册':'登录';
  document.getElementById('register-btn').textContent=loginMode==='register'?'返回登录':'注册新账号';
  document.getElementById('login-err').textContent='';
  var b=document.getElementById('pw-strength-bars'),h=document.getElementById('pw-hint');
  b.classList.toggle('hidden',loginMode!=='register');h.classList.toggle('hidden',loginMode!=='register');
}
function checkPwStrength(pw){
  if(!pw||pw.length<8)return{ok:false,level:0,msg:'密码至少8位'};
  var hasLetter=/[a-zA-Z]/.test(pw),hasDigit=/[0-9]/.test(pw),hasSpecial=/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw);
  if(!hasLetter)return{ok:false,level:1,msg:'需包含字母'};
  if(!hasDigit)return{ok:false,level:1,msg:'需包含数字'};
  if(!hasSpecial)return{ok:false,level:2,msg:'需包含特殊字符（如!@#$%等）'};
  if(pw.length>=12)return{ok:true,level:3,msg:'密码强度：强'};
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
  if(msg.indexOf('locked')>=0||msg.indexOf('security')>=0||msg.indexOf('rate')>=0||msg.indexOf('many requests')>=0||msg.indexOf('too many')>=0)return'密码错误次数过多，账号已临时锁定。请联系超级管理员或公司管理员重置密码';
  return msg;
}
var captchaCode='';
function refreshCaptcha(){
  var canvas=document.getElementById('captcha-canvas');
  if(!canvas)return;
  var ctx=canvas.getContext('2d');
  var chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  captchaCode='';
  for(var i=0;i<4;i++)captchaCode+=chars[Math.floor(Math.random()*chars.length)];
  ctx.fillStyle='#f0f4ff';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  for(var i=0;i<40;i++){ctx.fillStyle='rgba('+Math.floor(Math.random()*180)+','+Math.floor(Math.random()*180)+','+Math.floor(Math.random()*220)+',0.25)';ctx.fillRect(Math.random()*canvas.width,Math.random()*canvas.height,3,3)}
  for(var i=0;i<4;i++){ctx.strokeStyle='rgba(100,120,200,0.25)';ctx.beginPath();ctx.moveTo(Math.random()*canvas.width,Math.random()*canvas.height);ctx.lineTo(Math.random()*canvas.width,Math.random()*canvas.height);ctx.stroke()}
  for(var i=0;i<captchaCode.length;i++){ctx.font='bold '+(22+Math.random()*8)+'px "Segoe UI","Microsoft YaHei",Arial';ctx.fillStyle='rgb('+Math.floor(Math.random()*140)+','+Math.floor(Math.random()*90)+','+Math.floor(Math.random()*200)+')';var x=8+i*30+Math.random()*8;var y=30+Math.random()*8;ctx.save();ctx.translate(x,y);ctx.rotate((Math.random()-0.5)*0.45);ctx.fillText(captchaCode[i],0,0);ctx.restore()}
}
async function handleLogin(){
  var er=document.getElementById('login-err'),btn=document.getElementById('login-btn');
  // 登录频率限制 (P2-10 修复)
  if(loginLockUntil&&Date.now()<loginLockUntil){var sec=Math.ceil((loginLockUntil-Date.now())/1000);er.textContent='登录过于频繁，请'+sec+'秒后重试';return}
  if(loginFailCount>=5){loginLockUntil=Date.now()+60000;loginFailCount=0;er.textContent='密码错误次数过多，请1分钟后重试';return}
  var captchaInput=document.getElementById('login-captcha').value.trim().toUpperCase();
  er.textContent='';
  if(captchaInput!==captchaCode){er.textContent='验证码错误，请重新输入';refreshCaptcha();document.getElementById('login-captcha').value='';document.getElementById('login-captcha').focus();return}
  var un=document.getElementById('login-user').value.trim(),pw=document.getElementById('login-pass').value.trim();
  if(!un||!pw){er.textContent='请输入邮箱和密码';return}
  btn.disabled=true;btn.textContent='请稍候...';
  try{
    if(loginMode==='login'){
      var r=await sb.auth.signInWithPassword({email:un,password:pw});
      if(r.error){loginFailCount++;er.textContent=trErr(r.error.message);return}
      loginFailCount=0;await onLoginSuccess(r.data.user);
    }else{
      var s=checkPwStrength(pw);if(!s.ok){er.textContent=s.msg;return}
      var r=await sb.auth.signUp({email:un,password:pw});
      if(r.error){er.textContent=trErr(r.error.message);return}
      if(r.data.user&&!r.data.session){er.textContent='请联系管理员关闭邮件确认';return}
      loginFailCount=0;await onLoginSuccess(r.data.user);
    }
  }catch(e){er.textContent='登录失败: '+(e.message||e.toString());console.error('handleLogin error:',e)}
  finally{btn.disabled=false;btn.textContent=loginMode==='register'?'注册':'登录'}
}
async function onLoginSuccess(user){
  currentUser=user;
  // Upsert profile
  var profile=null;
  try{var r2=await sb.from('profiles').upsert({user_id:user.id,email:user.email},{onConflict:'user_id'}).select('*').single();profile=r2.data}catch(e){console.error('profile upsert failed:',e);throw new Error('无法加载用户档案: '+(e.message||JSON.stringify(e)))}
  try{sb.from('profiles').update({last_login_at:new Date().toISOString()}).eq('user_id',user.id).then(function(){}).catch(function(){})}catch(e){}

  // === 多公司支持 ===
  isSuperAdmin=profile&&profile.role==='super_admin';
  document.getElementById('login-user').value='';
  document.getElementById('login-pass').value='';
  document.getElementById('login-screen').classList.add('hidden');

  // 获取所有公司成员关系
  var memberships=[];
  dbg('profile after upsert:',{role:profile&&profile.role,company_id:profile&&profile.company_id,active_company_id:profile&&profile.active_company_id});
  try{
    var memResp=await sb.rpc('get_my_memberships');
    if(!memResp.error&&memResp.data)memberships=memResp.data;
  }catch(e){console.error('get_my_memberships error:',e)}

  // 兼容旧数据：如果 memberships 为空但有 profile.company_id
  if(memberships.length===0&&profile&&profile.company_id){
    memberships.push({company_id:profile.company_id,company_name:'默认公司',role:profile.role==='super_admin'?'admin':(profile.role||'member'),status:'active'});
  }

  allMyCompanies=memberships;
  dbg('allMyCompanies set to:',JSON.parse(JSON.stringify(allMyCompanies)));

  // 决定激活哪家公司
  if(memberships.length===0){
    // 无任何公司：检查注册中的公司或邀请
    var {data:pend}=await sb.from('companies').select('id,name,status').eq('created_by',user.id).order('created_at',{ascending:false}).limit(1);
    if(pend&&pend.length>0&&pend[0].status==='pending'){showPendingScreen(pend[0].name);return}
    // 检查邀请
    var {data:invites}=await sb.from('invitations').select('*').eq('to_email',user.email).eq('status','pending');
    if(invites&&invites.length>0){showMyInvitations(invites);return}
    showCompanyRegScreen();return;
  }

  if(memberships.length===1){
    // 只有一家公司，直接激活
    currentCompanyId=memberships[0].company_id;
    currentCompanyRole=memberships[0].role||'member';
    currentCompanyName=memberships[0].company_name||'';
  }else{
    // 多家公司，尝试从 profiles.active_company_id 恢复
    var activeCid=profile&&profile.active_company_id;
    var found=memberships.find(function(m){return m.company_id===activeCid});
    if(found){
      currentCompanyId=found.company_id;
      currentCompanyRole=found.role||'member';
      currentCompanyName=found.company_name||'';
    }else{
      // 弹公司选择器
      showCompanySelector(memberships);
      return;
    }
  }

  // 更新 profiles.active_company_id
  try{await sb.from('profiles').update({active_company_id:currentCompanyId,role:isSuperAdmin?'super_admin':currentCompanyRole}).eq('user_id',user.id)}catch(e){}
  // Load departments and set currentUser.department for permission checks
  if(currentCompanyId){
    var {data:depts}=await sb.from('departments').select('*').eq('company_id',currentCompanyId);
    if(depts&&depts.length){
      allDepartments=depts;
      if(profile&&profile.department_id){
        var myDept=depts.find(function(d){return d.id===profile.department_id});
        if(myDept)currentUser.department=myDept.name;
      }
    }
  }
  // Sync currentUserRole for code that still uses the old variable
  currentUserRole=currentCompanyRole;
  document.getElementById('main-screen').classList.remove('hidden');
  updateCompanyUIBadge();
  if(isAdmin())document.getElementById('tab-admin').classList.remove('hidden');
  if(isSuperAdmin){document.getElementById('admin-tab-companies-manage').classList.remove('hidden');document.getElementById('admin-tab-companies').classList.remove('hidden');}
  pollNotifications();
  writeOpLog('login','auth',currentUser.id,currentUser.email,'用户登录');
  switchTab('analytics');
}

// === 多公司：切换激活公司 ===
async function switchActiveCompany(companyId){
  var mem=allMyCompanies.find(function(m){return m.company_id===companyId});
  if(!mem)return;
  try{await sb.rpc('set_active_company',{p_company_id:companyId})}catch(e){console.error('set_active_company failed:',e)}
  currentCompanyId=companyId;
  currentCompanyRole=mem.role||'member';
  currentCompanyName=mem.company_name||'';
  currentUserRole=currentCompanyRole;
  updateCompanyUIBadge();
  // 重新加载所有数据
  location.reload();
}

function updateCompanyUIBadge(){
  var badge=document.getElementById('current-company-badge');
  if(badge){
    badge.textContent=currentCompanyName||'未选择公司';
    badge.title='点击切换公司';
  }
}

// === 多公司：公司选择器 ===
function showCompanySelector(memberships){
  dbg('showCompanySelector incoming:',JSON.parse(JSON.stringify(memberships)));
  var overlay=document.createElement('div');
  overlay.className='modal-overlay';
  overlay.style.cssText='position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);z-index:20000;display:flex;align-items:center;justify-content:center';
  var html='<div class="modal" style="background:var(--card);border-radius:12px;padding:24px;max-width:420px;width:90%;max-height:80vh;overflow-y:auto">';
  html+='<h3 style="margin:0 0 16px">选择公司</h3>';
  html+='<p style="color:var(--muted);font-size:14px;margin:0 0 16px">你在以下公司有职位，请选择进入哪家公司：</p>';
  for(var i=0;i<memberships.length;i++){
    var m=memberships[i];
    var roleLabel=m.role==='admin'?'管理员':m.role==='editor'?'编辑':'成员';
    html+='<div onclick="closeModal();switchActiveCompany('+m.company_id+')" style="cursor:pointer;padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;transition:all 0.2s" onmouseenter="this.style.borderColor=&#39;var(--primary)&#39;;this.style.background=&#39;var(--bg)&#39;" onmouseleave="this.style.borderColor=&#39;var(--border)&#39;;this.style.background=&#39;transparent&#39;">';
    html+='<div style="font-weight:600">'+escHtml(m.company_name||'未命名公司')+'</div>';
    html+='<div style="font-size:13px;color:var(--muted)">'+roleLabel+'</div>';
    html+='</div>';
  }
  html+='<button class="btn-sm btn-sm-primary" onclick="closeModal();showCompanyRegScreen()" style="width:100%;margin-bottom:8px">＋ 注册新公司</button>';
  html+='<button class="btn-sm" onclick="closeModal()" style="width:100%">取消</button>';
  html+='</div>';
  overlay.innerHTML=html;
  overlay.onclick=function(e){if(e.target===overlay)closeModal()};
  document.body.appendChild(overlay);
}

function closeModal(){
  var overlays=document.querySelectorAll('.modal-overlay');
  for(var i=overlays.length-1;i>=0;i--){
    var ov=overlays[i];
    if(ov.style.zIndex&&parseInt(ov.style.zIndex)>=20000){ov.remove();break}
  }
  // Clean up temp overlays
  var allOv=document.querySelectorAll('.modal-overlay');
  for(var j=allOv.length-1;j>=0;j--){
    var o=allOv[j];
    if(parseInt(o.style.zIndex||'0')>=20000)o.remove();
  }
}

// === 多公司：我的邀请列表 ===
function showMyInvitations(invitations){
  var overlay=document.createElement('div');
  overlay.className='modal-overlay';
  overlay.style.cssText='position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);z-index:20000;display:flex;align-items:center;justify-content:center';
  var html='<div class="modal" style="background:var(--card);border-radius:12px;padding:24px;max-width:450px;width:90%;max-height:80vh;overflow-y:auto">';
  html+='<h3 style="margin:0 0 16px">入职邀请</h3>';
  html+='<p style="color:var(--muted);font-size:14px;margin:0 0 16px">以下公司邀请你加入：</p>';
  for(var i=0;i<invitations.length;i++){
    var inv=invitations[i];
    html+='<div style="padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px">';
    html+='<div style="font-weight:600;margin-bottom:6px">公司ID: '+inv.from_company_id+'</div>';
    html+='<div style="display:flex;gap:8px">';
    html+='<button class="btn-sm btn-sm-primary" onclick="handleInvite('+inv.id+',&quot;accept&quot;)">接受</button>';
    html+='<button class="btn-sm" onclick="handleInvite('+inv.id+',&quot;reject&quot;)">拒绝</button>';
    html+='</div></div>';
  }
  html+='<button class="btn-sm" onclick="closeModal()" style="width:100%;margin-top:8px">关闭</button>';
  html+='</div>';
  overlay.innerHTML=html;
  overlay.onclick=function(e){if(e.target===overlay)closeModal()};
  document.body.appendChild(overlay);
}

async function handleInvite(invitationId,action){
  try{
    var r=await sb.rpc('handle_invitation',{p_invitation_id:invitationId,p_action:action});
    if(r.error){showToast(r.error.message||'操作失败');return}
    closeModal();
    if(action==='accept'){
      showToast('已加入公司！正在刷新...');
      // Reload memberships and activate
      var memResp=await sb.rpc('get_my_memberships');
      if(!memResp.error&&memResp.data){
        allMyCompanies=memResp.data;
        closeModal();
        location.reload();
      }
    }else{
      showToast('已拒绝邀请');
    }
  }catch(e){showToast('操作失败: '+(e.message||e.toString()))}
}

// === 管理面板：成员管理 ===
async function loadCompanyMembersForAdmin(){
  var list=document.getElementById('member-list');
  if(!list)return;
  list.innerHTML='<div style="text-align:center;color:var(--muted);padding:20px">加载中...</div>';
  try{
    var r=await sb.rpc('list_company_members',{p_company_id:currentCompanyId});
    if(r.error){list.innerHTML='<div class="empty-state">加载失败: '+r.error.message+'</div>';return}
    var members=r.data||[];
    if(members.length===0){list.innerHTML='<div class="empty-state">暂无成员</div>';return}
    var html='';
    for(var i=0;i<members.length;i++){
      var m=members[i];
      var roleLabel=m.role==='admin'?'管理员':m.role==='editor'?'编辑':'成员';
      var canManage=currentCompanyRole==='admin'&&m.user_id!==currentUser.id;
      html+='<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid var(--border)">';
      html+='<div><div style="font-weight:600">'+escHtml(m.display_name||m.email||'未命名')+'</div><div style="font-size:12px;color:var(--muted)">'+escHtml(m.email||'')+(m.department_name?' · '+escHtml(m.department_name):'')+' · '+roleLabel+'</div></div>';
      if(canManage){
        html+='<div style="display:flex;gap:6px">';
        if(m.role!=='admin')html+='<button class="btn-sm" onclick="promoteMember(&quot;'+m.user_id+'&quot;)" title="提升为管理员">设管理</button>';
        html+='<button class="btn-sm" style="color:var(--danger)" onclick="removeMemberFromCompany(&quot;'+m.user_id+'&quot;)">移除</button>';
        html+='</div>';
      }
      html+='</div>';
    }
    list.innerHTML=html;
  }catch(e){list.innerHTML='<div class="empty-state">加载失败</div>';console.error(e)}
}

async function promoteMember(userId){
  if(!await uiConfirm('确认提升该成员为管理员？'))return;
  try{
    var r=await sb.from('company_memberships').update({role:'admin'}).eq('user_id',userId).eq('company_id',currentCompanyId);
    if(r.error){showToast(r.error.message);return}
    showToast('已提升为管理员');
    loadCompanyMembersForAdmin();
  }catch(e){showToast('操作失败: '+(e.message||e.toString()))}
}

async function removeMemberFromCompany(userId){
  if(!await uiConfirm('确认移除该成员？该成员将失去对该公司数据的访问权限。'))return;
  try{
    var r=await sb.rpc('remove_member',{p_company_id:currentCompanyId,p_user_id:userId});
    if(r.error){showToast(r.error.message);return}
    showToast('已移除');
    loadCompanyMembersForAdmin();
  }catch(e){showToast('操作失败: '+(e.message||e.toString()))}
}

// === 多公司：成员管理面板开关 ===
function toggleMemberPanel(){
  var panel=document.getElementById('member-panel');
  if(!panel)return;
  var hidden=panel.classList.contains('hidden');
  if(hidden){panel.classList.remove('hidden');loadCompanyMembersForAdmin()}else{panel.classList.add('hidden')}
}

async function inviteMemberToCompany(){
  var email=document.getElementById('invite-email-input');
  var role=document.getElementById('invite-role-select');
  if(!email||!email.value.trim()){showToast('请输入邮箱');return}
  try{
    var r=await sb.rpc('invite_member',{p_company_id:currentCompanyId,p_email:email.value.trim(),p_role:role?role.value:'member'});
    if(r.error){showToast(r.error.message);return}
    showToast('邀请已发送！');
    if(email)email.value='';
  }catch(e){showToast('邀请失败: '+(e.message||e.toString()))}
}

// === 多公司：currentUserRole 是 profiles.role（超管保持 super_admin）
// currentCompanyRole 是当前企业内的角色（admin/editor/member）
// 不再用代理覆盖 currentUserRole，改为分别判断
let currentUserRole='user';
async function doLogout(){await sb.auth.signOut();currentUser=null;allClients=[];allContacts=[];customTypes=[];document.getElementById('main-screen').classList.add('hidden');document.getElementById('login-screen').classList.remove('hidden')}

