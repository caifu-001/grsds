// ==========================================================================
// grsds · 02-auth.js  —  资源授权 · 登录 · 多公司 · 成员管理面板
// 源: js/app_v2.js 第 39-452 行（机械切片，未改一行代码）
// ==========================================================================
// === 资源授权缓存（member 只能看授权的资源）===
// 平台超级管理员：role 与邮箱必须同时匹配（与 sql/tenant_security_hardening.sql、
// admin-proxy v5 保持同一口径）。只把 profiles.role 改成 super_admin 不再算超管。
var PLATFORM_SUPER_EMAIL='767142066@qq.com';
function isPlatformSuperProfile(p){
  var em=String((p&&p.email)||(currentUser&&currentUser.email)||'').trim().toLowerCase();
  return !!p&&p.role==='super_admin'&&em===PLATFORM_SUPER_EMAIL;
}
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
// ---------------------------------------------------------------------------
// 三个必须：多源、超时、可重试。
// 原来只挂 cdn.sheetjs.com 一个源，该域名在国内经常直接连不通；而「连不通」和
// 「明确失败」在浏览器里表现不同——连不通时 onerror 要等浏览器自己超时（可能 1~2 分钟），
// 这期间 ensureXlsx 的 Promise 既不 resolve 也不 reject，用户看到的就是
// 「点了导出，什么反应都没有」。所以每个源都加 8 秒超时，超时即换下一个源。
// 顺序按国内可达性排：360 前端库 → jsdelivr(主) → jsdelivr(fastly)。
var XLSX_CDN=[
  'https://lib.baomitu.com/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://fastly.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];
var _xlsxPromise=null;
function ensureXlsx(){
  if(window.XLSX)return Promise.resolve(window.XLSX);
  if(_xlsxPromise)return _xlsxPromise;
  _xlsxPromise=new Promise(function(resolve,reject){
    var idx=0;
    function cleanup(node){try{node&&node.parentNode&&node.parentNode.removeChild(node)}catch(e){}}
    function tryNext(){
      if(window.XLSX)return resolve(window.XLSX);
      if(idx>=XLSX_CDN.length){_xlsxPromise=null;return reject(new Error('表格组件加载失败，请检查网络后重试'))}
      var src=XLSX_CDN[idx++],settled=false;
      var s=document.createElement('script');
      s.async=true;s.src=src;
      var timer=setTimeout(function(){if(settled)return;settled=true;cleanup(s);tryNext()},8000);
      s.onload=function(){
        if(settled)return;settled=true;clearTimeout(timer);
        if(window.XLSX)resolve(window.XLSX);else{cleanup(s);tryNext()}
      };
      s.onerror=function(){if(settled)return;settled=true;clearTimeout(timer);cleanup(s);tryNext()};
      document.head.appendChild(s);
    }
    tryNext();
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
// AI 采集来源短名（与 13 · LEAD_SITE_LABEL 的 value 一一对应）。
// 采集线索转成客户后，clients.source 存的就是这些短名，卡片与详情据此标注
// 「AI 采集」，跟销售手工录入的「自主开发 / 客户介绍」区分开。
var AI_SOURCE_SITES=['交易网','行采家','政采网','重庆政采','竞采中心','招标采集'];
function isAiSource(s){return AI_SOURCE_SITES.indexOf(String(s||'').trim())>=0}

// source_site（域名）→ 站点短名。13 的 LEAD_SITE_LABEL 也指向这张表，
// 线索 / 客户 / 项目 / 联系人四处必须用同一套名字，别各写各的。
var AI_SITE_LABEL={'cqggzy.com':'交易网','gec123.com':'行采家','ccgp.gov.cn':'政采网','ccgp-chongqing.gov.cn':'重庆政采','xj.ccgp-chongqing.gov.cn':'竞采中心'};
function aiSiteOf(l){
  l=l||{};
  return AI_SITE_LABEL[String(l.source_site||'')]||((l.auto_fetched||l.source_url)?'招标采集':'');
}
// 项目 JSON 里的 AI 来源（近期项目 / 360 项目共用）
function aiProjOf(p){return String((p&&p.ai_source)||'').trim()}
// 联系人没有 source 列，AI 标记写在 notes 里（联系人表单不显示也不保存 notes，
// 用户改姓名电话不会抹掉它）；存量 1512 位联系人 notes 全空，不会误伤人工备注。
function aiCtOf(co){
  var m=String((co&&co.notes)||'').match(/^AI导入[:：](.+)$/);
  return m?String(m[1]).trim():'';
}
function aiMarkHtml(src){
  src=String(src||'').trim();
  if(!src)return '';
  var tip='AI 自动采集导入'+(src?(' · '+src):'');
  var txt='🤖 AI导入'+(src&&src!=='招标采集'?('·'+src):'');
  return '<span class="ai-import-mark" title="'+escHtml(tip)+'">'+escHtml(txt)+'</span>';
}
// 「一套人马多块牌子」联系人在采集时被打了「兼职多个单位」备注（写在 notes，表单不展示不覆盖）。
// 这里按固定标记解析成小徽标，让销售在客户详情 / 360 里一眼看到；与 AI 标记互不干扰。
var MULTI_UNIT_TAG='🔗兼职多个单位';
function multiUnitOf(co){
  var s=String((co&&co.notes)||''),i=s.indexOf(MULTI_UNIT_TAG);
  if(i<0)return '';
  // 备注里可能还有「· 公告:url」这类幂等标记，别让它跟进 tooltip
  var t=s.slice(i).split(/[；;\n]/)[0].split(' · 公告')[0].trim();
  return t||MULTI_UNIT_TAG;
}
/** 一条联系人是否被标记为「兼职多个单位」。
 *  表单里用 multi_unit（0/1）表示本次编辑的勾选状态，未定义时回落到 notes 里的标记。 */
function ctMultiOn(co){
  if(!co)return false;
  if(co.multi_unit!==undefined&&co.multi_unit!==null)
    return !!(co.multi_unit===true||co.multi_unit===1||co.multi_unit==='1');
  return !!multiUnitOf(co);
}
/** 人工勾选「兼职」时写进备注的文案（与采集端自动生成的区分开） */
function ctManualMultiNote(){
  return MULTI_UNIT_TAG+'：人工标记为兼职多个单位，该联系人号码可与其他单位共用，请人工确认';
}
/**
 * 把「兼职多个单位」标记按勾选状态同步进备注：
 *  - on  = true  → 已有标记就保留，没有就追加（不覆盖 AI 前缀等其它内容）
 *  - on  = false → 只摘掉这一个分段，其余（AI 前缀 / 公告:url / 冲突提示）原样保留
 * 幂等：重复调用结果一致。
 */
function ctNotesWithMulti(notes,on){
  var s=String(notes==null?'':notes);
  // 标记段落在「；」或「 · 公告」或结尾处结束，避免把公告幂等标记一起吃掉
  var re=new RegExp(MULTI_UNIT_TAG+'[^；;\\n]*?(?=[；;]|\\s·\\s|$)','g');
  s=s.replace(re,'');
  // 收拾摘除后残留的分隔符
  s=s.replace(/^[；;·\s]+/,'').replace(/[；;]\s*·/g,' ·').replace(/；{2,}/g,'；').replace(/[；;]\s*$/,'').replace(/\s+$/,'');
  if(!on)return s;
  return s?(s+'；'+ctManualMultiNote()):ctManualMultiNote();
}
function multiUnitMarkHtml(co){
  // 表单里刚取消勾选：笔记还没落库，但徽标要立刻消失
  if(co&&(co.multi_unit===false||co.multi_unit===0||co.multi_unit==='0'))return '';
  var t=multiUnitOf(co);
  if(!t&&!ctMultiOn(co))return '';
  return '<span class="multi-unit-mark" title="'+escHtml(t||MULTI_UNIT_TAG)+'">🔗 兼职多单位</span>';
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
  isSuperAdmin=isPlatformSuperProfile(profile);
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

  // 更新 profiles.active_company_id（只写激活公司；role 由数据库守卫，
  // 前端写 role 会被 guard_profile_privileges 还原，且超管身份不再靠这条写入维持）
  try{await sb.from('profiles').update({active_company_id:currentCompanyId}).eq('user_id',user.id)}catch(e){}
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
    // 服务端 list_company_members 已剔除平台超管，这里再兜一层：
    // 其他公司的任何成员都不应看到超管账号
    var members=(r.data||[]).filter(function(m){
      return String((m&&m.email)||'').trim().toLowerCase()!==PLATFORM_SUPER_EMAIL;
    });
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
    // 直连改成员关系会命中 RLS 的 0 行静默失败，统一走代理（校验本公司管理员身份）
    var r=await callAdmin('update','company_memberships',{payload:{role:'admin'},filters:[{col:'user_id',op:'eq',val:userId},{col:'company_id',op:'eq',val:currentCompanyId}],query:'id'});
    if(!r||r.error){showToast('提升失败: '+((r&&r.error&&r.error.message)||'未知错误'));return}
    if(!r.data||r.data.length===0){showToast('未生效：目标不是本公司成员');return}
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

