// ==========================================================================
// grsds · 03-settings.js  —  自定义类型 · 系统设置 · 我的页面
// 源: js/app_v2.js 第 453-762 行（机械切片，未改一行代码）
// ==========================================================================
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
  var ss=document.getElementById('settings-screen');
  document.body.appendChild(ss);
  ss.style.display='block';ss.style.position='fixed';ss.style.top='0';ss.style.left='0';ss.style.width='100%';ss.style.height='100vh';ss.style.zIndex='10000';ss.style.overflow='auto';ss.style.background='var(--bg)';
  renderCustomTypes();
  updateRecycleBadge();
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
  var ss=document.getElementById('settings-screen'),mn=document.getElementById('main-screen');
  ss.style.display='none';ss.style.position='';ss.style.top='';ss.style.left='';ss.style.width='';ss.style.height='';ss.style.zIndex='';ss.style.overflow='';ss.style.background='';
  mn.classList.remove('hidden');mn.appendChild(ss);
}

async function openMy(){
  document.getElementById('settings-screen').style.display='none';
  var ms=document.getElementById('my-screen');
  document.body.appendChild(ms);
  ms.style.display='block';ms.style.position='fixed';ms.style.top='0';ms.style.left='0';ms.style.width='100%';ms.style.height='100vh';ms.style.zIndex='10000';ms.style.overflow='auto';ms.style.background='var(--bg)';
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
  // Resignation
  var rs=profile.resignation_status;
  var btn=document.getElementById('my-resign-btn');
  var row=document.getElementById('my-resign-row');
  var warn=document.getElementById('my-resign-warn');
  if(rs){row.style.display='flex';document.getElementById('my-resign-status').textContent={'pending':'待审批','approved':'已通过','rejected':'已拒绝'}[rs]||rs;if(rs==='pending'||rs==='approved')btn.style.display='none';else if(currentCompanyId)btn.style.display='block'}else{if(currentCompanyId)btn.style.display='block';else btn.style.display='none';row.style.display='none'}
  if(rs==='approved'&&profile.resignation_date){warn.style.display='block';document.getElementById('my-resign-warn-date').textContent='离职日期: '+profile.resignation_date}else{warn.style.display='none'}
  // Load invitations
  var invSection=document.getElementById('my-invitation-section');
  if(!currentCompanyId){await loadMyInvitations();if(myInvitations.length>0){invSection.style.display='block';renderMyInvitations()}else{invSection.style.display='none'}}else{invSection.style.display='none'}
  enableMyEditing();
}

function closeMy(){
  var ms=document.getElementById('my-screen'),mn=document.getElementById('main-screen');
  ms.style.display='none';ms.style.position='';ms.style.top='';ms.style.left='';ms.style.width='';ms.style.height='';ms.style.zIndex='';ms.style.overflow='';ms.style.background='';
  mn.classList.remove('hidden');mn.appendChild(ms);
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
    sel.onchange=async function(){
      if(sel.value===currentUserRole){t.innerHTML=roleMap[sel.value]||sel.value;recallMyEdit(t);return;}
      if(currentUserRole==='super_admin'&&sel.value!=='super_admin'){
        if(!await uiConfirm('确认将【超级管理员】改为【'+(roleMap[sel.value]||sel.value)+'】？\n\n降级后可能无法访问管理后台，需其他管理员协助恢复。')){
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
      sel.innerHTML+='<option value="'+list[i].id+'"'+(list[i].name===cur?' selected':'')+'>'+escHtml(list[i].name)+'</option>';
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
  if(error){showToast('保存失败: '+error.message,'error');return;}
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
  for(var i=0;i<types.length;i++)html+='<option value="'+escHtml(types[i])+'">'+escHtml(types[i])+'</option>';
  document.getElementById('filter-select').innerHTML=html;
}
function onFilterChange(){
  currentFilter=document.getElementById('filter-select').value;
  clientPage=1;
  renderList();
}

// === Type Grid ===
function buildTypeGrid(){
  var types=allTypes(),html='';
  for(var i=0;i<types.length;i++){
    html+='<div class="type-chk" id="tc-'+i+'" onclick="toggleType('+i+')">'+escHtml(types[i])+'</div>';
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

