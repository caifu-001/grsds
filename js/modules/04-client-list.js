// ==========================================================================
// grsds · 04-client-list.js  —  类型解析 · 筛选 · 客户列表（分页/搜索/批量）
// 源: js/app_v2.js 第 763-1281 行（机械切片，未改一行代码）
// ==========================================================================
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

// ============================================================
// 批次D：回收站（软删除）+ 客户查重合并
// ============================================================
var allDeletedClients=[],allDeletedContacts=[],_softDeleteReady=false,_customDataReady=false;

// 软删除一批客户（自动探测 deleted_at 列；缺列时回退物理删除）
async function softDeleteClients(ids){
  ids=(ids||[]).filter(Boolean);
  if(!ids.length)return {ok:true,soft:true,count:0};
  var nowIso=new Date().toISOString();
  var r=await sb.from('clients').update({deleted_at:nowIso}).in('id',ids);
  if(r.error){
    if(/deleted_at/i.test(r.error.message||'')){
      var d=await sb.from('clients').delete().in('id',ids);
      if(d.error)return {ok:false,soft:false,error:d.error};
      await sb.from('contacts').delete().in('client_id',ids);
      return {ok:true,soft:false,count:ids.length};
    }
    return {ok:false,soft:true,error:r.error};
  }
  var c=await sb.from('contacts').update({deleted_at:nowIso}).in('client_id',ids);
  return {ok:true,soft:true,count:ids.length,contactError:c&&c.error};
}
async function restoreClients(ids){
  ids=(ids||[]).filter(Boolean);
  if(!ids.length)return {ok:true};
  var r=await sb.from('clients').update({deleted_at:null}).in('id',ids);
  if(r.error)return {ok:false,error:r.error};
  await sb.from('contacts').update({deleted_at:null}).in('client_id',ids);
  return {ok:true};
}
async function purgeClients(ids){
  ids=(ids||[]).filter(Boolean);
  if(!ids.length)return {ok:true};
  await sb.from('contacts').delete().in('client_id',ids);
  var r=await sb.from('clients').delete().in('id',ids);
  if(r.error)return {ok:false,error:r.error};
  return {ok:true};
}

function updateRecycleBadge(){
  var el=document.getElementById('recycle-count');
  if(el){
    var n=allDeletedClients.length;
    el.textContent=n?'('+n+')':'';
    el.style.color=n?'var(--danger)':'var(--text3)';
  }
  var hint=document.getElementById('data-maint-hint');
  if(hint)hint.textContent=_softDeleteReady
    ? '删除客户后会先进入回收站，可随时恢复或彻底删除。'
    : '提示：如需「删除后可恢复」，请在 Supabase 执行 sql/soft_delete_clients.sql（未执行时删除仍为物理删除）。';
}
function openRecycleBin(){
  var old=document.getElementById('recycle-overlay');if(old)old.remove();
  var m=document.createElement('div');
  m.className='confirm-overlay';m.id='recycle-overlay';m.style.zIndex='11000';
  m.innerHTML='<div class="confirm-box" style="max-width:760px;width:94vw;max-height:84vh;overflow-y:auto;text-align:left">'
    +'<h3 style="margin:0 0 4px;font-size:16px">🗑 回收站</h3>'
    +'<p id="recycle-hint" style="font-size:12px;color:var(--text3);margin:0 0 12px;text-align:left"></p>'
    +'<div id="recycle-body"></div>'
    +'<div class="btns" style="margin-top:16px"><button style="flex:1;padding:11px;border:none;border-radius:var(--radius);font-size:14px;font-weight:600;cursor:pointer;background:var(--border);color:var(--text)" onclick="document.getElementById(\'recycle-overlay\').remove()">关闭</button></div>'
    +'</div>';
  document.body.appendChild(m);
  renderRecycleBody();
}
function renderRecycleBody(){
  var body=document.getElementById('recycle-body'),hint=document.getElementById('recycle-hint');
  if(!body)return;
  if(!_softDeleteReady){
    body.innerHTML='<div style="padding:24px;text-align:center;color:var(--text3);font-size:13px">当前数据表尚未启用软删除。</div>';
    if(hint)hint.textContent='';
    return;
  }
  if(hint)hint.textContent='已删除的客户会保留在此处，可随时恢复。';
  var list=allDeletedClients;
  if(!list.length){body.innerHTML='<div style="padding:26px;text-align:center;color:var(--text3);font-size:13px">回收站是空的</div>';return}
  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
    +'<span style="font-size:13px;color:var(--text2)">共 <b>'+list.length+'</b> 个客户</span>'
    +'<button style="padding:6px 12px;border-radius:var(--radius-sm);border:1px solid #FECACA;background:var(--card);color:var(--danger);font-size:12px;font-weight:600;cursor:pointer" onclick="purgeAllDeleted()">清空回收站</button></div>';
  html+='<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:2px solid var(--border)">'
    +'<th style="padding:8px;text-align:left">客户名称</th><th style="padding:8px;text-align:left">类型</th>'
    +'<th style="padding:8px;text-align:left">删除时间</th><th style="padding:8px;text-align:center">操作</th></tr></thead><tbody>';
  for(var i=0;i<list.length;i++){
    var c=list[i];
    var dt=c.deleted_at?new Date(c.deleted_at).toLocaleString('zh-CN'):'-';
    html+='<tr style="border-bottom:1px solid var(--border)">'
      +'<td style="padding:8px">'+h(c.name||'(未命名)')+'</td>'
      +'<td style="padding:8px;color:var(--text2)">'+escapeOrDash(parseTypes(c.type).join('、'))+'</td>'
      +'<td style="padding:8px;color:var(--text3);font-size:12px">'+h(dt)+'</td>'
      +'<td style="padding:8px;text-align:center;white-space:nowrap">'
      +'<a href="javascript:void(0)" onclick="doRestoreClient(\''+c.id+'\')" style="color:var(--primary);font-size:13px">恢复</a>'
      +'<a href="javascript:void(0)" onclick="doPurgeClient(\''+c.id+'\')" style="color:var(--danger);font-size:13px;margin-left:10px">彻底删除</a>'
      +'</td></tr>';
  }
  html+='</tbody></table>';
  body.innerHTML=html;
}
function escapeOrDash(s){return s?'<span>'+h(s)+'</span>':'<span style="color:var(--text3)">-</span>'}
function doRestoreClient(id){
  uiConfirm('恢复该客户及其联系人？',{danger:false,okText:'恢复'}).then(function(ok){
    if(!ok)return;
    (async function(){
      var r=await restoreClients([id]);
      if(!r.ok){showToast('恢复失败: '+(r.error&&r.error.message||'未知错误'),'error');return}
      await loadClients();renderRecycleBody();showToast('已恢复');
    })();
  });
}
function doPurgeClient(id){
  uiConfirm('彻底删除后无法恢复，确定继续？',{danger:true,okText:'彻底删除'}).then(function(ok){
    if(!ok)return;
    (async function(){
      var r=await purgeClients([id]);
      if(!r.ok){showToast('删除失败: '+(r.error&&r.error.message||'未知错误'),'error');return}
      await loadClients();renderRecycleBody();showToast('已彻底删除');
    })();
  });
}
function purgeAllDeleted(){
  var ids=allDeletedClients.map(function(c){return c.id}).filter(Boolean);
  if(!ids.length)return;
  uiConfirm('确定清空回收站？将彻底删除 '+ids.length+' 个客户及其联系人，不可恢复。',{danger:true,okText:'全部删除'}).then(function(ok){
    if(!ok)return;
    (async function(){
      var r=await purgeClients(ids);
      if(!r.ok){showToast('清空失败: '+(r.error&&r.error.message||'未知错误'),'error');return}
      await loadClients();renderRecycleBody();showToast('回收站已清空');
    })();
  });
}

// ── 查重合并 ──
function normalizeClientName(s){
  return String(s||'').toLowerCase()
    .replace(/[\s\u3000]+/g,'')
    .replace(/[()（）\[\]【】{}<>《》]/g,'')
    .replace(/[·・.,，。、\-—_/\\|:：;；'"`~!！?？*#￥$&+]/g,'');
}
function findDuplicateGroups(){
  var map={};
  for(var i=0;i<allClients.length;i++){
    var c=allClients[i],k=normalizeClientName(c.name);
    if(!k)continue;
    (map[k]||(map[k]=[])).push(c);
  }
  var groups=[];
  for(var key in map)if(Object.prototype.hasOwnProperty.call(map,key)&&map[key].length>1)groups.push(map[key]);
  groups.sort(function(a,b){return b.length-a.length});
  return groups;
}
function clientContactCount(id){return contactsOf(id).length}
function openDedupeMerge(){
  var groups=findDuplicateGroups();
  var old=document.getElementById('dedupe-overlay');if(old)old.remove();
  var m=document.createElement('div');
  m.className='confirm-overlay';m.id='dedupe-overlay';m.style.zIndex='11000';
  var head='<h3 style="margin:0 0 4px;font-size:16px">🔎 客户查重合并</h3>'
    +'<p style="font-size:12px;color:var(--text3);margin:0 0 12px;text-align:left">按「去掉空格与符号后的名称」分组，勾选要保留的一条，其余会被合并过去并移入回收站。</p>';
  var bodyHtml='';
  if(!groups.length){
    bodyHtml='<div style="padding:26px;text-align:center;color:var(--text3);font-size:13px">未发现重复客户 🎉</div>';
  }else{
    for(var gi=0;gi<groups.length;gi++){
      var g=groups[gi];
      bodyHtml+='<div style="border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px;margin-bottom:10px">'
        +'<div style="font-size:12px;color:var(--text3);margin-bottom:6px">重复组 '+(gi+1)+' · '+g.length+' 条</div>';
      for(var k=0;k<g.length;k++){
        var c=g[k];
        var checked=k===0?' checked':'';
        bodyHtml+='<label style="display:flex;align-items:center;gap:8px;padding:6px 4px;font-size:13px;cursor:pointer">'
          +'<input type="radio" name="dp-'+gi+'" value="'+c.id+'"'+checked+' style="flex:0 0 auto">'
          +'<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+h(c.name||'(未命名)')+'</span>'
          +'<span style="color:var(--text3);font-size:12px;white-space:nowrap">联系人 '+clientContactCount(c.id)+' · '+h((c.address||'').slice(0,12))+'</span>'
          +'</label>';
      }
      bodyHtml+='<div style="text-align:right;margin-top:6px"><button data-gi="'+gi+'" class="dp-merge-btn" style="padding:6px 14px;border:none;border-radius:var(--radius-sm);background:var(--primary);color:#fff;font-size:12px;font-weight:600;cursor:pointer">合并这一组</button></div></div>';
    }
  }
  m.innerHTML='<div class="confirm-box" style="max-width:700px;width:94vw;max-height:84vh;overflow-y:auto;text-align:left">'
    +head+'<div id="dedupe-body">'+bodyHtml+'</div>'
    +'<div class="btns" style="margin-top:14px"><button style="flex:1;padding:11px;border:none;border-radius:var(--radius);font-size:14px;font-weight:600;cursor:pointer;background:var(--border);color:var(--text)" onclick="document.getElementById(\'dedupe-overlay\').remove()">关闭</button></div>'
    +'</div>';
  document.body.appendChild(m);
  var btns=m.querySelectorAll('.dp-merge-btn');
  for(var bi=0;bi<btns.length;bi++){
    btns[bi].onclick=(function(gi2){return function(){mergeDuplicateGroup(gi2)}})(parseInt(btns[bi].getAttribute('data-gi'),10));
  }
  m._groups=groups;
}
function mergeDuplicateGroup(gi){
  var ov=document.getElementById('dedupe-overlay');if(!ov||!ov._groups)return;
  var g=ov._groups[gi];if(!g||g.length<2)return;
  var sel=ov.querySelector('input[name="dp-'+gi+'"]:checked');
  var keepId=sel?sel.value:g[0].id;
  var dups=g.filter(function(c){return c.id!==keepId});
  if(!dups.length)return;
  uiConfirm('将以选中客户为主，合并 '+dups.length+' 条重复客户（联系人会转移过来，其余移入回收站）。',{danger:false,okText:'确认合并'}).then(function(ok){
    if(!ok)return;
    (async function(){
      showToast('正在合并...');
      var keep=allClients.find(function(c){return c.id===keepId});
      if(!keep){showToast('目标客户不存在','error');return}
      var dupIds=dups.map(function(c){return c.id});
      // 1) 联系人转移
      var cr=await sb.from('contacts').update({client_id:keepId}).in('client_id',dupIds);
      if(cr.error){showToast('合并失败(联系人): '+cr.error.message,'error');return}
      // 2) 合并 projects / types / notes
      var projs=[],seen={};
      try{projs=JSON.parse(keep.projects||'[]');if(!Array.isArray(projs))projs=[]}catch(e){projs=[]}
      for(var i=0;i<projs.length;i++)seen[(projs[i]&&projs[i].project_name)||'']=true;
      var types=parseTypes(keep.type).slice();
      var notes=[keep.notes||''];
      for(var j=0;j<dups.length;j++){
        var d=dups[j];
        var dp=[];try{dp=JSON.parse(d.projects||'[]');if(!Array.isArray(dp))dp=[]}catch(e){dp=[]}
        for(var m=0;m<dp.length;m++){var nm=(dp[m]&&dp[m].project_name)||'';if(!seen[nm]){seen[nm]=true;projs.push(dp[m])}}
        var dt=parseTypes(d.type);
        for(var n=0;n<dt.length;n++)if(types.indexOf(dt[n])<0)types.push(dt[n]);
        if(d.notes&&notes.indexOf(d.notes)<0)notes.push(d.notes);
        if(d.created_at&&keep.created_at&&d.created_at<keep.created_at)keep.created_at=d.created_at;
      }
      var upd={projects:JSON.stringify(projs),type:JSON.stringify(types),notes:notes.filter(Boolean).join('\n')};
      var ur=await sb.from('clients').update(upd).eq('id',keepId);
      if(ur.error){showToast('合并失败(主客户): '+ur.error.message,'error');return}
      // 3) 重复项进回收站（未启用软删除则物理删除）
      var delRes=await softDeleteClients(dupIds);
      if(!delRes.ok){showToast('合并部分完成：重复项移除失败 '+(delRes.error&&delRes.error.message||''),'error');await loadClients();return}
      await loadClients();
      openDedupeMerge();
      showToast('已合并 '+(dups.length+1)+' 条为 1 条');
    })();
  });
}
function openDedupeDialog(){openDedupeMerge()}

// ============================================================
// 批次E：表单字段级校验 + 配置中心打通
// ============================================================
// ── E1 字段级校验 ──
function vfGroup(el){
  if(!el)return null;
  var p=el.parentNode;
  for(var i=0;i<4&&p;i++){if(p.classList&&p.classList.contains('form-group'))return p;p=p.parentNode}
  return el.parentNode;
}
function vfMark(el,msg){
  if(!el)return false;
  var g=vfGroup(el);if(!g)return false;
  g.classList.add('field-error');
  var m=g.querySelector('.field-err-msg');
  if(!m){m=document.createElement('div');m.className='field-err-msg';g.appendChild(m)}
  m.textContent=msg;
  return false;
}
function vfClearAll(scope){
  var s=scope||document,els=s.querySelectorAll('.field-error');
  for(var i=0;i<els.length;i++)els[i].classList.remove('field-error');
}
function vfScrollToError(){
  var e=document.querySelector('.field-error');
  if(!e)return;
  try{e.scrollIntoView({block:'center',behavior:'smooth'})}catch(err){try{e.scrollIntoView()}catch(e2){}}
}
// 用户一输入就自动消掉红框
document.addEventListener('input',function(e){
  var t=e.target;
  if(t&&t.closest){var g=t.closest('.field-error');if(g)g.classList.remove('field-error')}
},true);
document.addEventListener('change',function(e){
  var t=e.target;
  if(t&&t.closest){var g=t.closest('.field-error');if(g)g.classList.remove('field-error')}
},true);

// ── E2 配置中心：统一加载 ──
var cfgStages=[],cfgTags=[],cfgNumRules=[],cfgClientFields=[],_cfgLoaded=false,_cfgPromise=null;
function loadConfigCenter(force){
  if(_cfgLoaded&&!force)return Promise.resolve();
  if(_cfgPromise)return _cfgPromise;
  if(!currentCompanyId)return Promise.resolve();
  _cfgPromise=(function(){
    var fl=function(extra){
      var a=[{col:'company_id',op:'eq',val:currentCompanyId}];
      (extra||[]).forEach(function(x){a.push(x)});
      return a;
    };
    return Promise.all([
      callAdmin('select','sales_stages_def',{query:'*',filters:fl([{col:'',op:'order',val:'sort_order.asc'}])}),
      callAdmin('select','custom_tags',{query:'*',filters:fl([{col:'',op:'order',val:'sort_order.asc'}])}),
      callAdmin('select','numbering_rules',{query:'*',filters:fl([])}),
      callAdmin('select','custom_field_defs',{query:'*',filters:fl([{col:'entity_type',op:'eq',val:'client'},{col:'',op:'order',val:'sort_order.asc'}])})
    ]).then(function(res){
      cfgStages=(res[0]&&res[0].data)||[];
      cfgTags=(res[1]&&res[1].data)||[];
      cfgNumRules=(res[2]&&res[2].data)||[];
      cfgClientFields=(res[3]&&res[3].data)||[];
      _cfgLoaded=true;
      try{buildOrderStageFilter()}catch(e){console.error(e)}
    }).catch(function(e){console.error('loadConfigCenter:',e)}).then(function(){_cfgPromise=null});
  })();
  return _cfgPromise;
}

// ── E3 销售阶段：订单表单 + 阶段筛选 ──
function orderStageList(){
  if(cfgStages&&cfgStages.length){
    var a=[];
    for(var i=0;i<cfgStages.length;i++){var n=cfgStages[i]&&cfgStages[i].stage_name;if(n&&a.indexOf(n)<0)a.push(n)}
    if(a.length)return a;
  }
  return ORDER_STAGES;
}
function buildOrderStageFilter(){
  var sel=document.getElementById('order-stage-filter');if(!sel)return;
  var cur=sel.value||'all',list=orderStageList();
  var html='<option value="all">全部阶段</option>';
  for(var i=0;i<list.length;i++)html+='<option value="'+h(list[i])+'">'+h(list[i])+'</option>';
  sel.innerHTML=html;
  sel.value=(cur&&(cur==='all'||list.indexOf(cur)>=0))?cur:'all';
}

// ── E4 自定义标签：客户表单快捷标签 ──
var DEFAULT_TAG_SUGGESTIONS=['重点客户','长期合作','新开发','高利润','需维护','战略伙伴','年框','潜在'];
function tagSuggestionList(){
  if(cfgTags&&cfgTags.length){
    var a=[];
    for(var i=0;i<cfgTags.length;i++){
      var t=cfgTags[i],n=t&&(t.tag_name||t.name);
      if(n&&a.indexOf(n)<0)a.push(n);
    }
    if(a.length)return a;
  }
  return DEFAULT_TAG_SUGGESTIONS;
}
function renderTagSuggestions(){
  var box=document.getElementById('tag-suggestions-box');if(!box)return;
  var list=tagSuggestionList(),isCfg=!!(cfgTags&&cfgTags.length),html='';
  for(var i=0;i<list.length;i++){
    html+='<span class="tag-suggestion'+(isCfg?' tag-cfg':'')+'" onclick="addTag(\''+jsStr(list[i])+'\')">'+h(list[i])+'</span>';
  }
  box.innerHTML=html;
}

// ── E5 自定义字段：客户表单 ──
function cfFieldKey(f,i){return String((f&&(f.field_key||f.key))||('cf'+i))}
function cfFieldLabel(f,i){return String((f&&(f.label||f.field_label))||cfFieldKey(f,i))}
function cfFieldType(f){return String((f&&(f.field_type||f.type))||'text')}
function cfFieldRequired(f){return !!(f&&(f.required||f.is_required||f.is_required===1))}
function cfFieldOptions(f){
  var o=f&&f.options;
  if(typeof o==='string'){try{o=JSON.parse(o)}catch(e){o=String(o).split(',')}}
  if(!Array.isArray(o))o=[];
  return o.filter(function(x){return x!==null&&x!==undefined&&String(x).trim()!==''});
}
function renderClientCustomFields(data){
  var sec=document.getElementById('cf-client-section'),box=document.getElementById('cf-client-fields');
  if(!sec||!box)return;
  if(!cfgClientFields||!cfgClientFields.length){sec.style.display='none';box.innerHTML='';return}
  sec.style.display='';
  var html='';
  for(var i=0;i<cfgClientFields.length;i++){
    var f=cfgClientFields[i],key=cfFieldKey(f,i),label=cfFieldLabel(f,i),type=cfFieldType(f);
    var val=(data&&data[key]!=null)?data[key]:'';
    var req=cfFieldRequired(f)?'<span class="cf-req">*</span>':'';
    html+='<div class="form-group"><label>'+h(label)+req+'</label>';
    if(type==='select'){
      html+='<select class="cf-input" data-cfkey="'+h(key)+'"><option value="">请选择</option>';
      var opts=cfFieldOptions(f);
      for(var k=0;k<opts.length;k++)html+='<option value="'+h(opts[k])+'"'+(String(val)===String(opts[k])?' selected':'')+'>'+h(opts[k])+'</option>';
      html+='</select>';
    }else if(type==='textarea'){
      html+='<textarea class="cf-input" data-cfkey="'+h(key)+'">'+h(val)+'</textarea>';
    }else{
      var t=type==='number'?'number':(type==='date'?'date':'text');
      html+='<input class="cf-input" type="'+t+'" data-cfkey="'+h(key)+'" value="'+h(val)+'">';
    }
    html+='</div>';
  }
  if(!_customDataReady){
    html+='<div style="font-size:12px;color:var(--warning);line-height:1.5;padding:4px 0">⚠ 尚未启用自定义字段存储，保存时不会写入。请在 Supabase 执行 sql/custom_fields_values.sql。</div>';
  }
  box.innerHTML=html;
}
function collectClientCustomFields(){
  var out={},box=document.getElementById('cf-client-fields');
  if(!box)return out;
  var els=box.querySelectorAll('.cf-input');
  for(var i=0;i<els.length;i++)out[els[i].getAttribute('data-cfkey')]=String(els[i].value||'').trim();
  return out;
}
function validateClientCustomFields(){
  var box=document.getElementById('cf-client-fields');if(!box)return true;
  var ok=true;
  for(var i=0;i<cfgClientFields.length;i++){
    if(!cfFieldRequired(cfgClientFields[i]))continue;
    var el=box.querySelector('.cf-input[data-cfkey="'+cfFieldKey(cfgClientFields[i],i)+'"]');
    if(el&&!String(el.value||'').trim()){vfMark(el,'此项为必填');ok=false}
  }
  return ok;
}
function renderClientCustomValues(container,data){
  if(!container)return;
  if(!cfgClientFields||!cfgClientFields.length){container.innerHTML='';return}
  var rows='',any=false;
  for(var i=0;i<cfgClientFields.length;i++){
    var key=cfFieldKey(cfgClientFields[i],i);
    var v=data&&data[key];
    if(v===null||v===undefined||String(v).trim()==='')continue;
    any=true;
    rows+='<div class="cf-row"><span class="cf-k">'+h(cfFieldLabel(cfgClientFields[i],i))+'</span><span class="cf-v">'+h(v)+'</span></div>';
  }
  container.innerHTML=any?rows:'<div style="color:var(--text3);font-size:13px">暂无自定义字段内容</div>';
}

// ── E6 编号规则：新建订单自动编号 ──
function numRuleFor(entity){
  for(var i=0;i<cfgNumRules.length;i++){var r=cfgNumRules[i];if(r&&r.entity_type===entity)return r}
  return null;
}
function numRuleFormat(r,seq){
  if(!r)return '';
  var s=String(seq).padStart(parseInt(r.seq_length,10)||4,'0');
  var d='';
  if(r.date_format&&r.date_format!=='none'){
    var dt=new Date();
    var y=String(dt.getFullYear()),m=String(dt.getMonth()+1).padStart(2,'0'),dd=String(dt.getDate()).padStart(2,'0');
    if(r.date_format==='YYYY')d=y;
    else if(r.date_format==='YYYYMM')d=y+m;
    else d=y+m+dd;
  }
  return String(r.prefix||'')+(d?'-'+d:'')+'-'+s;
}
async function autoFillOrderNumber(){
  var el=document.getElementById('of-number');
  if(!el||el.value.trim())return;
  var r=numRuleFor('order');
  if(!r)return;
  var next=(parseInt(r.current_seq,10)||0)+1;
  el.value=numRuleFormat(r,next);
  var res=await callAdmin('update','numbering_rules',{payload:{current_seq:next},filters:[{col:'id',op:'eq',val:r.id}]});
  if(res&&res.error)console.error('[编号规则] 递增序号失败:',res.error);
  else r.current_seq=next;
}

// === Clients ===
async function doRefresh(){
  var btn=document.querySelector('.topbar-btn');btn.classList.add('refreshing');
  try{await loadClients();showToast('已刷新')}
  catch(e){showToast('刷新失败')}
  finally{setTimeout(function(){btn.classList.remove('refreshing')},300)}
}
let _loadClientsBusy=false;
async function loadClients(){
  if(_loadClientsBusy){dbg('[loadClients] skipped (busy)');return}
  _loadClientsBusy=true;
  try{
  var grid=document.getElementById('client-grid');
  var statsBar=document.getElementById('stats-bar');
  grid.innerHTML='<div class="loading"><span class="spinner"></span>加载中...</div>';
  statsBar.innerHTML='';
  try{
    var clientsData,clientsError;
    // 非管理员用 callAdmin 绕过 RLS，再前端 canAccess 过滤
    if(!isAdmin()){
      var r=await callAdmin('select','clients',{query:'*',filters:[{col:'company_id',op:'eq',val:currentCompanyId},{col:'',op:'order',val:'updated_at.desc'},{col:'',op:'limit',val:'50000'}]});
      clientsData=r&&r.data||[];clientsError=r&&r.error;
      dbg('[loadClients] callAdmin for member, data:',(clientsData||[]).length,'error:',clientsError);
    }else{
      var res=await sb.from('clients').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
      clientsData=res.data;clientsError=res.error;
    }
    if(clientsError){grid.innerHTML='<div class="empty"><div class="empty-icon">⚠️</div>加载失败<br><span style="font-size:12px;color:var(--text3)">'+h(clientsError.message)+'</span></div>';statsBar.innerHTML='';return}
    allClients=(clientsData||[]);
    dbg('[loadClients] fetched '+allClients.length+' clients, currentCompanyRole='+currentCompanyRole+' isSuperAdmin='+isSuperAdmin);
    if(!isAdmin()){
      dbg('[loadClients] filtering by grants, memberGrants.clients=',JSON.stringify(memberGrants.clients));
      if(allClients.length>0)dbg('[loadClients] sample client id:',JSON.stringify(allClients[0].id),' grant sample:',JSON.stringify(memberGrants.clients&&memberGrants.clients[0]));
      allClients=allClients.filter(function(cl){var ok=canAccess('clients',cl.id);if(!ok)dbg('[loadClients] DENY client '+cl.id+' not in grants (case check: '+JSON.stringify(memberGrants.clients)+')');return ok});
      dbg('[loadClients] after filter: '+allClients.length+' clients');
    }
    var {data:cd}=await sb.from('contacts').select('*').eq('company_id',currentCompanyId);
    allContacts=(cd||[]);
    // 回收站：把软删除的客户分离出来，其余逻辑完全不受影响
    _softDeleteReady=false;_customDataReady=false;
    for(var _di=0;_di<allClients.length;_di++){
      if(!allClients[_di])continue;
      if(allClients[_di].deleted_at!==undefined)_softDeleteReady=true;
      if(allClients[_di].custom_data!==undefined)_customDataReady=true;
      if(_softDeleteReady&&_customDataReady)break;
    }
    if(_softDeleteReady){
      var _alive=[],_trash=[];
      for(var _dj=0;_dj<allClients.length;_dj++){var _c=allClients[_dj];if(_c&&_c.deleted_at)_trash.push(_c);else _alive.push(_c)}
      allDeletedClients=_trash;
      allClients=_alive;
      allDeletedContacts=allContacts.filter(function(co){return co&&co.deleted_at});
      allContacts=allContacts.filter(function(co){return !co||!co.deleted_at});
    }else{
      allDeletedClients=[];allDeletedContacts=[];
    }
    updateRecycleBadge();
    await loadOrders();
    checkBirthdayReminders();
    _clientOrderCache={};
    renderList();
  }catch(e){grid.innerHTML='<div class="empty"><div class="empty-icon">⚠️</div>加载失败</div>';statsBar.innerHTML=''}
  }finally{_loadClientsBusy=false;}
}

