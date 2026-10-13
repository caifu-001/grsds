// ==========================================================================
// grsds · 06-client-tools.js  —  招标排序 · 录入时间 · 导入导出
// 源: js/app_v2.js 第 2166-2609 行（机械切片，未改一行代码）
// ==========================================================================
// === 招标日期排序 / 录入时间辅助 ===
function todayLocalStr(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
// 招标日期倒序：日期越新越靠前；空日期排最后；两者都空保持原序
function cmpBiddingDateDesc(a,b){
  var da=(a||'').toString().trim(),db=(b||'').toString().trim();
  if(!da&&!db)return 0;
  if(!da)return 1;
  if(!db)return -1;
  return db<da?-1:(db>da?1:0);
}
// 把「近期项目」录入框按招标日期倒序重排
function sortProjectEntriesByBiddingDate(){
  var list=document.getElementById('project-list');
  if(!list)return;
  var entries=[].slice.call(list.querySelectorAll('.project-entry'));
  if(entries.length<2)return;
  entries.sort(function(x,y){
    var dx=(x.querySelector('.pe-bidding-date')||{}).value||'';
    var dy=(y.querySelector('.pe-bidding-date')||{}).value||'';
    return cmpBiddingDateDesc(dx,dy);
  });
  for(var i=0;i<entries.length;i++)list.appendChild(entries[i]);
  renumberProjects();
}

async function saveClient(){
  vfClearAll(document.getElementById('form-modal'));
  if(!selTypes.length){document.getElementById('type-err').textContent='请选择至少一个客户属性';setTimeout(function(){document.getElementById('type-err').textContent=''},3000);return}
  var nameEl=document.getElementById('f-name');
  var name=nameEl.value.trim();
  if(!name){vfMark(nameEl,'请填写客户名称');vfScrollToError();return}
  if(!validateClientCustomFields()){vfScrollToError();return}
  // FK: match company directory
  var dirId=null;var dk=name.toLowerCase();if(allCompaniesMap&&allCompaniesMap[dk])dirId=allCompaniesMap[dk].id;
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
    var pco=(e.querySelector('.pe-client-owner')||{}).value||'';
    var pnotes=(e.querySelector('.pe-notes')||{}).value||'';
    if(pn||pb)projectsArr.push({project_name:pn,bidding_date:pd,bidder_name:pb,bidder_phone:pbp,bidder_company:pbc,bid_amount:pba,client_owner:pco,notes:pnotes});
  }
  // 统一按招标日期倒序落库，保证表单/卡片/详情顺序一致（日期越新越靠前）
  projectsArr.sort(function(x,y){return cmpBiddingDateDesc(x.bidding_date,y.bidding_date)});
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
    company_directory_id:dirId,
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
    custom_data:collectClientCustomFields(),
    attachments:JSON.stringify(clientAttachments||[]),
    company_info:JSON.stringify(ci),
    contact_count:formContacts.length,
    projects:JSON.stringify(projectsArr),
    updated_at:new Date().toISOString()
  };
  // 未执行 custom_fields_values.sql 时不发送该字段，避免整条保存失败
  if(!_customDataReady)delete client.custom_data;

  var clientId=editId;
  if(!editId){
    client.user_id=currentUser.id;
    client.company_id=currentCompanyId;
    var {data:nd,error}=await sb.from('clients').insert(client).select('id');
    if(error){showToast('添加失败: '+error.message);return}
    clientId=nd[0].id;
    // 非管理员自动给自己授权（能看见自己建的客户）
    if(!isAdmin()){
      var grRes=await callAdmin('insert','resource_grants',{payload:{user_id:currentUser.id,company_id:currentCompanyId,resource_type:'clients',resource_id:clientId,granted_by:currentUser.id}});
      dbg('[saveClient] self-grant result:',grRes);
      // 同步更新本地缓存，避免 loadClients 过滤
      if(!memberGrants.clients||memberGrants.clients==='all')memberGrants.clients=[];
      memberGrants.clients.push(String(clientId).toLowerCase());
    }
  }else{
    client.company_id=currentCompanyId;
    // 统一写通道：客户若非本人创建，直连 update 会被 RLS 静默过滤成 0 行，
    // safeWriteById 会如实返回 hit=0 并自动改走代理通道。
    var w=await safeWriteById('clients','update',client,editId);
    if(w.hit===0){showToast('更新失败: '+(((w.error||{}).message)||'未命中任何行（可能无权修改该客户）'));return}
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
    dbg('save contact',i,co.name,co._new,phones,landlines);
    var cd={
      client_id:clientId,
      name:co.name||'',dept:co.dept||'',position:co.position||'',
      phone:JSON.stringify(phones.length?phones:['']),room:co.room||'',email:JSON.stringify(emails.length?emails:['']),
      entered_date:co.entered_date||null
    };
    if(co._new)cd.user_id=currentUser.id;
    if(landlines.length>0)cd.landline=JSON.stringify(landlines);
    dbg('save cd',i,cd);
    if(co._new){
      cd.company_id=currentCompanyId;
      var {data:nc,error}=await sb.from('contacts').insert(cd).select('id');
      // 容错：若数据库尚未新增 entered_date 列，去掉该字段重试一次，避免联系人保存被阻断
      if(error&&/entered_date/.test(error.message||'')){console.warn('[save contact] entered_date 列缺失，已降级保存');delete cd.entered_date;var _r2=await sb.from('contacts').insert(cd).select('id');nc=_r2.data;error=_r2.error;}
      if(error){showToast('新增联系人失败: '+error.message);console.error('contact insert:',error);return}
      if(nc&&nc.length) savedIds.push(nc[0].id); else {showToast('新增联系人异常(无返回ID)');console.error('contact insert empty data:',nc);return}
    }else{
      cd.client_id=clientId; // ensure contact stays with this client
      var uw=await safeWriteContacts('update',cd,co.id);
      var upErr=uw.hit?null:uw.error;
      // 容错：若数据库尚未新增 entered_date 列，去掉该字段重试一次，避免联系人保存被阻断
      if(upErr&&/entered_date/.test(upErr.message||'')){console.warn('[save contact] entered_date 列缺失，已降级保存');delete cd.entered_date;uw=await safeWriteContacts('update',cd,co.id);upErr=uw.hit?null:uw.error;}
      if(upErr){showToast('更新联系人失败: '+upErr.message);console.error('contact update:',upErr,'id:',co.id);return}
      savedIds.push(co.id);
    }
  }

  var toDel=existingIds.filter(function(id){return savedIds.indexOf(id)<0});
  var delFailed=0;
  for(var j=0;j<toDel.length;j++){
    // 旧写法只看 error：被行级策略过滤时会命中 0 行且不报错，等于「删了但没删」——
    // 表单已关闭、列表一刷新联系人又冒出来。
    var dw=await safeWriteContacts('delete',null,toDel[j]);
    if(dw.hit===0){delFailed++;console.error('contact delete failed:',dw.error,'id:',toDel[j]);}
  }

  closeForm();
  loadClients();
  if(delFailed)showToast((editId?'已更新':'已添加')+'，但有 '+delFailed+' 个联系人未能删除（可能无权修改，刷新后仍会存在）','error');
  else showToast(editId?'已更新':'已添加');
}

// === Delete ===
/* ==============================================================
   统一反馈组件：uiConfirm / uiAlert / uiPrompt
   替代浏览器原生弹窗（原生弹窗在 iOS 上样式割裂、阻塞事件循环、
   且无法自定义按钮文案与危险色）。
   uiConfirm 返回 Promise<boolean>，uiPrompt 返回 Promise<string|null>。
   ============================================================== */
var _uiConfirmResolve=null,_uiPromptResolve=null;

function uiConfirm(msg,opts){
  opts=opts||{};
  var ov=document.getElementById("confirm-dialog");
  var msgEl=document.getElementById("confirm-msg"),okBtn=document.getElementById("confirm-ok-btn");
  if(!ov||!msgEl||!okBtn)return Promise.resolve(false);
  var btns=ov.querySelector(".btns"),cancelBtn=btns?btns.querySelector("button"):null;
  // 上一个弹窗若未决，先按取消收尾，避免 Promise 悬挂
  if(_uiConfirmResolve){var prev=_uiConfirmResolve;_uiConfirmResolve=null;prev(false)}
  msgEl.textContent=msg==null?"":String(msg);
  okBtn.textContent=opts.okText||"确定";
  okBtn.style.background=opts.danger===false?"var(--primary)":"var(--danger)";
  if(cancelBtn){cancelBtn.textContent=opts.cancelText||"取消";cancelBtn.style.display=opts.hideCancel?"none":""}
  function settle(v){
    ov.classList.add("hidden");ov.onclick=null;
    if(_uiConfirmResolve){var r=_uiConfirmResolve;_uiConfirmResolve=null;r(v)}
  }
  okBtn.onclick=function(){settle(true)};
  if(cancelBtn&&!opts.hideCancel)cancelBtn.onclick=function(){settle(false)};
  ov.onclick=function(e){if(e.target===ov)settle(false)};
  ov.classList.remove("hidden");
  return new Promise(function(resolve){_uiConfirmResolve=resolve});
}

/* 单按钮提示（用于需要阅读确认的长文本） */
function uiAlert(msg){return uiConfirm(msg,{hideCancel:true,okText:"知道了",danger:false})}

/* 兼容旧调用：confirmDialog(消息, 回调) */
function confirmDialog(msg,cb){
  return uiConfirm(msg).then(function(ok){
    if(ok&&typeof cb==="function")cb();
    return ok;
  });
}
function cancelConfirmDialog(){
  var ov=document.getElementById("confirm-dialog");if(ov)ov.classList.add("hidden");
  deleteId=null;
  if(_uiConfirmResolve){var r=_uiConfirmResolve;_uiConfirmResolve=null;r(false)}
}

/* 通用输入弹窗 */
function uiPrompt(msg,def,opts){
  opts=opts||{};
  var ov=document.getElementById("prompt-dialog");
  var msgEl=document.getElementById("prompt-msg"),inp=document.getElementById("prompt-input"),okBtn=document.getElementById("prompt-ok-btn");
  if(!ov||!msgEl||!inp||!okBtn)return Promise.resolve(null);
  var btns=ov.querySelector(".btns"),cancelBtn=btns?btns.querySelector("button"):null;
  if(_uiPromptResolve){var prev=_uiPromptResolve;_uiPromptResolve=null;prev(null)}
  msgEl.textContent=msg==null?"":String(msg);
  inp.value=def==null?"":String(def);
  inp.type=opts.inputType||"text";
  okBtn.textContent=opts.okText||"确定";
  function settle(v){
    ov.classList.add("hidden");ov.onclick=null;inp.onkeydown=null;
    if(_uiPromptResolve){var r=_uiPromptResolve;_uiPromptResolve=null;r(v)}
  }
  function ok(){
    var v=inp.value;
    if(opts.required&&!String(v).trim()){inp.focus();return}
    settle(v);
  }
  okBtn.onclick=ok;
  if(cancelBtn)cancelBtn.onclick=function(){settle(null)};
  inp.onkeydown=function(e){if(e.key==="Enter"){e.preventDefault();ok()}else if(e.key==="Escape"){settle(null)}};
  ov.onclick=function(e){if(e.target===ov)settle(null)};
  ov.classList.remove("hidden");
  setTimeout(function(){try{inp.focus();inp.select()}catch(e){}},60);
  return new Promise(function(resolve){_uiPromptResolve=resolve});
}
function cancelPromptDialog(){
  var ov=document.getElementById("prompt-dialog");if(ov)ov.classList.add("hidden");
  if(_uiPromptResolve){var r=_uiPromptResolve;_uiPromptResolve=null;r(null)}
}

/* 删除客户：走统一确认弹窗 */
function confirmDelete(){
  deleteId=editId;
  var msg=_softDeleteReady?"确定要删除该客户及所有联系人吗？删除后可到「设置 → 回收站」恢复。":"确定要删除该客户及所有联系人吗？";
  uiConfirm(msg,{okText:"删除"}).then(function(ok){
    if(ok)doDelete();else deleteId=null;
  });
}
async function doDelete(){
  if(!deleteId)return;
  var id=deleteId;
  var r=await softDeleteClients([id]);
  document.getElementById('confirm-dialog').classList.add('hidden');
  closeForm();deleteId=null;
  if(!r.ok){showToast('删除失败: '+((r.error&&r.error.message)||'未知错误'),'error');return}
  await loadClients();
  if(r.contactError)showToast('客户已删除，但'+r.contactError.message,'error');
  else showToast(r.soft?'已移入回收站':'已删除');
}

// === Import/Export ===
function doExport(){
  ensureXlsx().then(function(){
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
  }).catch(function(e){showToast(e.message||'导出失败','error')});
}

function handleImport(input){
  var f=input.files[0];if(!f)return;
  ensureXlsx().then(function(){
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
  }).catch(function(e){showToast(e.message||'表格组件加载失败','error')});
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


