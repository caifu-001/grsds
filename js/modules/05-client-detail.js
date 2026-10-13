// ==========================================================================
// grsds · 05-client-detail.js  —  公司名录 · 联系人 · 客户表单 · 软删除
// 源: js/app_v2.js 第 1282-2165 行（机械切片，未改一行代码）
// ==========================================================================
// === Companies Directory ===
async function loadCompanies(){
  try{
    var {data}=await sb.from('companies').select('*',{count:'exact'}).order('name').limit(50000);
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
  var ds=document.getElementById('dir-screen');
  document.body.appendChild(ds);
  ds.classList.remove('hidden');ds.style.position='fixed';ds.style.top='0';ds.style.left='0';ds.style.width='100%';ds.style.height='100vh';ds.style.zIndex='10000';ds.style.overflow='auto';ds.style.background='var(--bg)';
  renderDir();
}

async function showLeads(){
  closeMoreMenu();
  document.getElementById('settings-screen').style.display='none';
  document.getElementById('my-screen').style.display='none';
  var allViews=document.querySelectorAll('#main-screen > div[id$="-view"]');
  for(var i=0;i<allViews.length;i++)allViews[i].classList.add('hidden');
  var hv=document.getElementById('home-view');if(hv)hv.classList.add('hidden');
  var lv=document.getElementById('leads-view');
  if(lv)lv.classList.remove('hidden');
  document.getElementById('topbar-title').textContent='线索公海';
  document.getElementById('main-fab').classList.add('hidden');
  await loadPoolLeads();
}
function closeDir(){
  var ds=document.getElementById('dir-screen');
  ds.classList.add('hidden');ds.style.position='';ds.style.top='';ds.style.left='';ds.style.width='';ds.style.height='';ds.style.zIndex='';ds.style.overflow='';ds.style.background='';
  document.getElementById('main-screen').appendChild(ds);
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
    html+='<div class="dir-item" onclick="showCompanyDetail(\''+h(c.name||'').replace(/'/g,"\\'")+'\')"><div class="di-name">'+h(c.name)+'</div>'+(rows?'<div class="di-row">'+rows+'</div>':'')+(c.base?'<span class="di-badge">'+h(c.base)+'</span>':'')+'</div>';
  }
  el.innerHTML=html;
}
function showCompanyDetail(name){
  var key=name.toLowerCase();
  var comp=allCompaniesMap[key];
  if(!comp){showToast('未找到公司信息');return}
  // 在名录内弹窗展示详情
  var rows='';
  if(comp.legal_person)rows+='<tr><td class="di-l">法人</td><td>'+h(comp.legal_person)+'</td></tr>';
  if(comp.credit_code)rows+='<tr><td class="di-l">信用代码</td><td>'+h(comp.credit_code)+'</td></tr>';
  if(comp.reg_capital)rows+='<tr><td class="di-l">注册资金</td><td>'+h(comp.reg_capital)+'</td></tr>';
  if(comp.reg_status)rows+='<tr><td class="di-l">状态</td><td>'+h(comp.reg_status)+'</td></tr>';
  if(comp.established)rows+='<tr><td class="di-l">成立日期</td><td>'+h(comp.established)+'</td></tr>';
  if(comp.address)rows+='<tr><td class="di-l">地址</td><td>'+h(comp.address)+'</td></tr>';
  if(comp.business_scope)rows+='<tr><td class="di-l">经营范围</td><td style="max-width:300px">'+h(comp.business_scope).substring(0,200)+'</td></tr>';
  var modal=document.createElement('div');modal.className='confirm-overlay';modal.style.zIndex='10100';
  modal.innerHTML='<div class="confirm-box" style="max-width:480px;max-height:80vh;overflow-y:auto"><h3 style="margin:0 0 12px">'+h(name)+'</h3>'
    +'<table style="width:100%;font-size:13px;border-collapse:collapse"><tbody>'+rows+'</tbody></table>'
    +'<div class="btns" style="margin-top:16px"><button class="btn-cancel" onclick="this.closest(\'.confirm-overlay\').remove()">关闭</button>'
    +'<button class="btn-confirm" onclick="this.closest(\'.confirm-overlay\').remove();addCompanyAsClient(\''+h(name).replace(/'/g,"\\'")+'\')">➕ 添加为客户</button></div></div>';
  document.body.appendChild(modal);
}
function addCompanyAsClient(name){
  closeDir();
  document.getElementById('search-input').value=name;
  renderList();
  var exists=allClients.find(function(c){return c.name.toLowerCase()===name.toLowerCase()});
  if(exists){openForm(exists.id);showToast('该客户已存在');return}
  // 先打开空白表单，再回填（否则 openForm 会清空所有字段）
  var fab=document.getElementById('main-fab');if(fab)fab.click();
  document.getElementById('f-name').value=name;
  var key=name.toLowerCase();
  if(allCompaniesMap[key]) fillCompanyInfo(allCompaniesMap[key]);
}
function fillCompanyInfo(comp){
  document.getElementById('ci-legal').value=comp.legal_person||'';
  document.getElementById('ci-credit').value=comp.credit_code||'';
  document.getElementById('ci-capital').value=comp.reg_capital||'';
  document.getElementById('ci-status').value=comp.reg_status||'';
  // 自动回填客户地址
  if(comp.address){
    var addr=document.getElementById('f-address');
    if(addr&&!addr.value.trim())addr.value=comp.address;
  }
  (function(){var s=document.getElementById('ci-source');if(s)s.value='来自企业名录';})();
}
function displayCompanyInfo(ci){
  document.getElementById('ci-legal').value=ci.legal_person||'';
  document.getElementById('ci-credit').value=ci.credit_code||'';
  document.getElementById('ci-capital').value=ci.reg_capital||'';
  document.getElementById('ci-status').value=ci.reg_status||'';
  (function(){var s=document.getElementById('ci-source');if(s)s.value=ci.legal_person?'已保存':'';})();
}

// ============================================================
// 批次B：列表分页 / 批量多选 / 全局搜索
// ============================================================
var clientPage=1,_clientPageSizeOverride=0,_clientFiltered=[],_clientVisible=[];
var clientBulkMode=false,clientSel={},clientSelOnly=false;
var orderPage=1,_orderPageSizeOverride=0,_orderFiltered=[];

// 联系人索引：避免每次搜索/渲染都 O(n×m) 遍历 allContacts
var _contactsIdx=null,_contactsIdxSrc=null;
function contactsIndex(){
  if(_contactsIdx&&_contactsIdxSrc===allContacts)return _contactsIdx;
  var m={};
  for(var i=0;i<allContacts.length;i++){
    var co=allContacts[i];if(!co||!co.client_id)continue;
    (m[co.client_id]||(m[co.client_id]=[])).push(co);
  }
  _contactsIdx=m;_contactsIdxSrc=allContacts;
  return m;
}
function contactsOf(id){return contactsIndex()[id]||[]}
// 输入防抖
function _debounce(fn,ms){
  var t=null;
  return function(){var args=arguments,self=this;if(t)clearTimeout(t);t=setTimeout(function(){t=null;fn.apply(self,args)},ms||160)};
}
var _debouncedRenderList=_debounce(function(){renderList()},160);
var _debouncedRenderOrders=_debounce(function(){renderOrders()},160);

function clientPageSize(){
  if(_clientPageSizeOverride>0)return _clientPageSizeOverride;
  return window.innerWidth<768?12:24;
}
function orderPageSize(){
  if(_orderPageSizeOverride>0)return _orderPageSizeOverride;
  return window.innerWidth<768?12:24;
}
function clientSearchInput(){clientPage=1;_debouncedRenderList();}
function orderSearchInput(){orderPage=1;_debouncedRenderOrders();}
function goClientPage(n){clientPage=parseInt(n,10)||1;renderList();try{window.scrollTo({top:0,behavior:'smooth'})}catch(e){window.scrollTo(0,0)}}
function goOrderPage(n){orderPage=parseInt(n,10)||1;renderOrders();try{window.scrollTo({top:0,behavior:'smooth'})}catch(e){window.scrollTo(0,0)}}

// 生成分页器 HTML（fnName 为页码跳转函数名）
function buildPagerHtml(total,size,page,pages,fnName){
  if(total<=size||pages<=1)return '';
  var h='';
  h+='<button class="pager-btn" '+(page<=1?'disabled':'')+' onclick="'+fnName+'(1)" title="首页">«</button>';
  h+='<button class="pager-btn" '+(page<=1?'disabled':'')+' onclick="'+fnName+'('+(page-1)+')" title="上一页">‹</button>';
  var start=Math.max(1,page-2),end=Math.min(pages,start+4);start=Math.max(1,end-4);
  if(start>1)h+='<span class="pager-dots">…</span>';
  for(var i=start;i<=end;i++)h+='<button class="pager-btn'+(i===page?' active':'')+'" onclick="'+fnName+'('+i+')">'+i+'</button>';
  if(end<pages)h+='<span class="pager-dots">…</span>';
  h+='<button class="pager-btn" '+(page>=pages?'disabled':'')+' onclick="'+fnName+'('+(page+1)+')" title="下一页">›</button>';
  h+='<button class="pager-btn" '+(page>=pages?'disabled':'')+' onclick="'+fnName+'('+pages+')" title="末页">»</button>';
  h+='<span class="pager-info">共 '+total+' 条 · 第 '+page+'/'+pages+' 页</span>';
  return h;
}
function renderPagerInto(elId,total,size,page,pages,fnName){
  var el=document.getElementById(elId);if(!el)return;
  var html=buildPagerHtml(total,size,page,pages,fnName);
  var grid=document.getElementById(elId==='client-pager'?'client-grid':(elId==='order-pager'?'order-grid':''));
  if(grid)grid.classList.toggle('has-pager',!!html);
  if(!html){el.innerHTML='';el.classList.add('hidden');return}
  el.innerHTML=html;el.classList.remove('hidden');
}

// ── 客户列表批量多选 ──
function toggleBulkMode(){
  clientBulkMode=!clientBulkMode;
  var b=document.getElementById('client-bulk-toggle');
  if(b){b.classList.toggle('on',clientBulkMode);b.textContent=clientBulkMode?'✕ 退出多选':'☑ 多选';}
  if(!clientBulkMode){clientSel={};clientSelOnly=false;}
  renderList();
}
function clientToggleSel(id){
  if(!id)return;
  if(clientSel[id])delete clientSel[id];else clientSel[id]=true;
  // 复核视图里取消掉最后一项时自动退出，避免停在空白列表
  if(clientSelOnly&&!clientSelCount())clientSelOnly=false;
  renderList();
}
function clientSelCount(){return Object.keys(clientSel).length}
function clientSelAllPage(){
  var ps=clientPageSize(),start=(clientPage-1)*ps,end=Math.min(start+ps,_clientVisible.length);
  for(var i=start;i<end;i++){if(_clientVisible[i]&&_clientVisible[i].id)clientSel[_clientVisible[i].id]=true}
  renderList();
}
function clientSelAllFiltered(){
  for(var i=0;i<_clientFiltered.length;i++){if(_clientFiltered[i]&&_clientFiltered[i].id)clientSel[_clientFiltered[i].id]=true}
  renderList();
}
function clientSelClear(){clientSel={};clientSelOnly=false;renderList();}
// 「只看已选」：把列表收敛成已勾选的客户，下手前复核用（100 选 30 时尤其需要）
function clientToggleSelOnly(){
  clientSelOnly=!clientSelOnly;
  clientPage=1;
  renderList();
}
function renderClientSelBar(){
  var el=document.getElementById('client-selbar');if(!el)return;
  if(!clientBulkMode){el.classList.add('hidden');el.innerHTML='';return}
  el.classList.remove('hidden');
  var n=clientSelCount(),ps=clientPageSize();
  var pageCount=Math.max(0,Math.min(ps,_clientVisible.length-(clientPage-1)*ps));
  el.innerHTML='<span>已选 <span class="bs-count">'+n+'</span> 项 · 本页 '+pageCount+' 项 · 筛选结果 '+_clientFiltered.length+' 项</span>'
    +'<span class="bs-spacer"></span>'
    +'<button onclick="clientSelAllPage()">全选本页</button>'
    +'<button onclick="clientSelAllFiltered()">全选结果</button>'
    +'<button onclick="clientToggleSelOnly()" class="'+(clientSelOnly?'on':'')+'" '+((n||clientSelOnly)?'':'disabled')+'>'+(clientSelOnly?'显示全部':'只看已选')+'</button>'
    +'<button onclick="clientSelClear()" '+(n?'':'disabled')+'>清除</button>'
    +'<button onclick="bulkEditClientAttrs()" '+(n?'':'disabled')+'>批量改属性</button>'
    +'<button onclick="bulkExportClients()" '+(n?'':'disabled')+'>导出选中</button>'
    +'<button class="danger" onclick="bulkDeleteClients()" '+(n?'':'disabled')+'>批量删除</button>';
}

// 批量修改客户属性（勾选式弹窗）
// type 为数组型（追加/覆盖），其余为标量枚举；未勾选的属性一律保持原样。
var _bulkTypes=[];
var _BULK_ATTRS=[
  {key:'grade',label:'客户分级',opts:[['A','A 级'],['B','B 级'],['C','C 级']]},
  {key:'industry',label:'行业',opts:['信息技术','制造业','建筑业','金融','教育','医疗','政府','能源','零售','物流','房地产','其他']},
  {key:'scale',label:'规模',opts:['小微企业','中小企业','中型企业','大型企业','集团企业']},
  {key:'source',label:'来源',opts:['自主开发','客户介绍','展会','网络推广','电话营销','合作伙伴','线索转化','其他']},
  {key:'credit_rating',label:'信用等级',opts:['AAA','AA','A','BBB','BB','B','C']}
];
function bulkEditClientAttrs(preselect){
  var ids=Object.keys(clientSel);
  if(!ids.length){showToast('请先选择客户','error');return}
  _bulkTypes=[];
  var types=allTypes(),chips='';
  for(var i=0;i<types.length;i++){
    chips+='<div class="type-chk" id="bt-'+i+'" onclick="bulkToggleType('+i+')">'+escHtml(types[i])+'</div>';
  }
  var rows='';
  rows+='<div class="bulk-row" id="brow-type">'
    +'<label class="bulk-head"><input type="checkbox" id="bc-type" onchange="bulkRowToggle(\'type\')"> 客户类型</label>'
    +'<div class="bulk-val">'
    +'<div id="bulk-type-grid" class="bulk-chips disabled">'+chips+'</div>'
    +'<div class="bulk-mode disabled" id="bulk-type-mode-box">'
    +'<label><input type="radio" name="bulkTypeMode" value="append" checked disabled> 追加（保留原有）</label>'
    +'<label><input type="radio" name="bulkTypeMode" value="replace" disabled> 覆盖（替换为所选）</label>'
    +'<label><input type="radio" name="bulkTypeMode" value="remove" disabled> 移除（删掉所选类型）</label>'
    +'</div></div></div>';
  for(var a=0;a<_BULK_ATTRS.length;a++){
    var f=_BULK_ATTRS[a],oh='<option value="">（清空）</option>';
    for(var o=0;o<f.opts.length;o++){
      var it=f.opts[o],v=Array.isArray(it)?it[0]:it,t=Array.isArray(it)?it[1]:it;
      oh+='<option value="'+escHtml(v)+'">'+escHtml(t)+'</option>';
    }
    rows+='<div class="bulk-row" id="brow-'+f.key+'">'
      +'<label class="bulk-head"><input type="checkbox" id="bc-'+f.key+'" onchange="bulkRowToggle(\''+f.key+'\')"> '+f.label+'</label>'
      +'<div class="bulk-val"><select id="bv-'+f.key+'" disabled>'+oh+'</select></div>'
      +'</div>';
  }
  // 列表正按某属性筛选时自动带入：勾好类型行 + 预选该属性 + 默认「移除」
  // 用户流程：筛选「司法」→ 多选 → 批量改属性 → 确认，即可把错分的客户改回来
  var _at=allTypes();
  var fctx=(currentFilter&&currentFilter!=='all'&&_at.indexOf(currentFilter)>=0)?currentFilter:'';
  var hint=fctx?('<div class="bulk-hint">已按「'+escHtml(fctx)+'」筛选出 '+_clientFiltered.length+' 个客户，并默认「移除」该属性。</div>'):'';
  var old=document.getElementById('bulk-type-overlay');if(old)old.remove();
  var m=document.createElement('div');m.className='confirm-overlay';m.id='bulk-type-overlay';m.style.zIndex='11000';
  m.innerHTML='<div class="confirm-box bulk-box">'
    +'<div class="bulk-body">'
    +'<h3 style="margin:0 0 6px;font-size:16px">批量修改客户属性</h3>'
    +'<p style="font-size:12px;color:var(--text3);margin:0 0 14px">已选 '+ids.length+' 个客户。勾选要修改的属性并设置新值，未勾选的属性保持原样。</p>'
    +hint
    +'<div class="bulk-rows">'+rows+'</div>'
    +'</div>'
    +'<div class="btns bulk-actions">'
    +'<button style="flex:1;padding:11px;border:none;border-radius:var(--radius);font-size:14px;font-weight:600;cursor:pointer;background:var(--border);color:var(--text)" onclick="document.getElementById(\'bulk-type-overlay\').remove()">取消</button>'
    +'<button style="flex:2;padding:11px;border:none;border-radius:var(--radius);font-size:14px;font-weight:600;cursor:pointer;background:var(--primary);color:#fff" onclick="bulkApplyAttrs()">应用修改</button>'
    +'</div></div>';
  document.body.appendChild(m);
  if(fctx){
    var fi=_at.indexOf(fctx);
    if(fi>=0)bulkToggleType(fi);
    var fcb=document.getElementById('bc-type');if(fcb){fcb.checked=true;bulkRowToggle('type')}
    // 筛选进来的这批客户本就都带该属性，默认语义是剔除而非重复追加
    var frm=document.querySelector('input[name="bulkTypeMode"][value="remove"]');if(frm)frm.checked=true;
  }else if(preselect&&preselect.type){
    var cb=document.getElementById('bc-type');if(cb){cb.checked=true;bulkRowToggle('type')}
  }
}
// 兼容旧入口「批量改类型」：打开同一弹窗并预选类型行
function bulkSetClientType(){bulkEditClientAttrs({type:true})}
// 勾选/取消某一行属性，联动其值控件的可用状态
function bulkRowToggle(key){
  var cb=document.getElementById('bc-'+key);if(!cb)return;
  var on=cb.checked,row=document.getElementById('brow-'+key);
  if(row)row.classList.toggle('on',on);
  if(key==='type'){
    var grid=document.getElementById('bulk-type-grid');if(grid)grid.classList.toggle('disabled',!on);
    var box=document.getElementById('bulk-type-mode-box');if(box)box.classList.toggle('disabled',!on);
    var radios=document.getElementsByName('bulkTypeMode');
    for(var i=0;i<radios.length;i++)radios[i].disabled=!on;
  }else{
    var sel=document.getElementById('bv-'+key);if(sel)sel.disabled=!on;
  }
}
function bulkToggleType(i){
  var el=document.getElementById('bt-'+i);if(!el)return;
  var label=allTypes()[i];
  var idx=_bulkTypes.indexOf(label);
  if(idx>=0)_bulkTypes.splice(idx,1);else _bulkTypes.push(label);
  el.classList.toggle('checked',_bulkTypes.indexOf(label)>=0);
}
function bulkApplyAttrs(){
  var ids=Object.keys(clientSel);
  if(!ids.length){showToast('请先选择客户','error');return}
  var scalar={},desc=[],typeCfg=null;
  var tcb=document.getElementById('bc-type');
  if(tcb&&tcb.checked){
    if(!_bulkTypes.length){showToast('请至少选择一种客户类型','error');return}
    var mr=document.querySelector('input[name="bulkTypeMode"]:checked');
    var mode=mr?mr.value:'append';
    typeCfg={mode:mode,vals:_bulkTypes.slice()};
    var _MODE_TXT={append:'（追加）',replace:'（覆盖）',remove:'（移除）'};
    desc.push('客户类型'+(_MODE_TXT[mode]||'（追加）')+' → '+_bulkTypes.join('、'));
  }
  for(var a=0;a<_BULK_ATTRS.length;a++){
    var f=_BULK_ATTRS[a],cb=document.getElementById('bc-'+f.key);
    if(cb&&cb.checked){
      var sel=document.getElementById('bv-'+f.key);
      var v=sel?sel.value:'';
      scalar[f.key]=v;desc.push(f.label+' → '+(v||'（清空）'));
    }
  }
  if(!desc.length){showToast('请至少勾选一项要修改的属性','error');return}
  uiConfirm('将把 '+ids.length+' 个客户的以下属性改为：'+desc.join('；')+'？',{danger:false,okText:'应用'}).then(function(ok){
    if(!ok)return;
    var overlay=document.getElementById('bulk-type-overlay');if(overlay)overlay.remove();
    (async function(){
      showToast('正在更新 '+ids.length+' 个客户...');
      var failed=0,okCount=0,lastErr='';
      for(var i=0;i<ids.length;i++){
        var upd={};
        for(var k in scalar)upd[k]=scalar[k];
        if(typeCfg){
          var c=null;
          for(var ci=0;ci<allClients.length;ci++){if(allClients[ci]&&allClients[ci].id===ids[i]){c=allClients[ci];break}}
          var cur=parseTypes(c?c.type:'[]'),arr;
          if(typeCfg.mode==='replace'){
            arr=typeCfg.vals.slice();
          }else if(typeCfg.mode==='remove'){
            // 只剔除所选类型，客户原有的其它类型全部保留
            arr=cur.filter(function(t){return typeCfg.vals.indexOf(t)<0});
          }else{
            arr=cur.slice();
            for(var vi=0;vi<typeCfg.vals.length;vi++){if(arr.indexOf(typeCfg.vals[vi])<0)arr.push(typeCfg.vals[vi])}
          }
          upd.type=JSON.stringify(arr);
        }
        upd.updated_at=new Date().toISOString();
        // 统一写通道：直连写入受 RLS 行级策略约束，客户若非当前用户创建会命中 0 行
        // 且不报错。safeWriteById 会用 select('id') 取回真实行数，0 行时自动回退
        // 到与读取一致的代理通道（admin-proxy 自动追加 company_id 过滤）。
        var w=await safeWriteById('clients','update',upd,ids[i]);
        if(w.hit)okCount++;
        else{failed++;lastErr=(w.error&&w.error.message)||lastErr;}
      }
      clientSel={};clientSelOnly=false;
      await loadClients();
      if(failed)showToast('更新完成：成功 '+okCount+' / 失败 '+failed+(lastErr?'（'+lastErr+'）':''),'error');
      else showToast('已更新 '+ids.length+' 个客户');
      if(failed)console.error('[bulkApplyAttrs] failed '+failed+' of '+ids.length,lastErr);
    })();
  });
}
// 批量导出选中客户（含联系人）
async function bulkExportClients(){
  var ids=Object.keys(clientSel);
  if(!ids.length){showToast('请先选择客户','error');return}
  try{await ensureXlsx()}catch(e){showToast(e.message,'error');return}
  var clients=allClients.filter(function(c){return clientSel[c.id]});
  try{
    var wb=XLSX.utils.book_new();
    var crows=[["名称","属性","等级","生命周期","招标日期","地址","备注"]];
    for(var i=0;i<clients.length;i++){
      var c=clients[i];
      crows.push([c.name||'',parseTypes(c.type).join('、'),c.grade||'',c.lifecycle_stage||'',c.bidding_date||'',c.address||'',c.notes||'']);
    }
    var cs=XLSX.utils.aoa_to_sheet(crows);
    cs['!cols']=[{wch:30},{wch:22},{wch:8},{wch:12},{wch:12},{wch:30},{wch:30}];
    XLSX.utils.book_append_sheet(wb,cs,'客户');
    var prows=[["客户名称","姓名","部门","职务","电话","邮箱"]];
    for(var j=0;j<clients.length;j++){
      var cos=contactsOf(clients[j].id);
      for(var m=0;m<cos.length;m++){
        var co=cos[m],phs=[],ems=[];
        try{phs=JSON.parse(co.phone||'[]');if(!Array.isArray(phs))phs=[co.phone||'']}catch(e){phs=[co.phone||'']}
        try{ems=JSON.parse(co.email||'[]');if(!Array.isArray(ems))ems=[co.email||'']}catch(e){ems=[co.email||'']}
        prows.push([clients[j].name||'',co.name||'',co.dept||'',co.position||'',phs.filter(Boolean).join(' / '),ems.filter(Boolean).join(' / ')]);
      }
    }
    var ps=XLSX.utils.aoa_to_sheet(prows);
    ps['!cols']=[{wch:30},{wch:12},{wch:14},{wch:14},{wch:26},{wch:22}];
    XLSX.utils.book_append_sheet(wb,ps,'联系人');
    XLSX.writeFile(wb,'crm-selected-'+new Date().toISOString().slice(0,10)+'.xlsx');
    showToast('已导出 '+clients.length+' 个客户');
  }catch(e){console.error(e);showToast('导出失败: '+e.message,'error')}
}
// 批量删除客户
function bulkDeleteClients(){
  var ids=Object.keys(clientSel);
  if(!ids.length){showToast('请先选择客户','error');return}
  var msg=_softDeleteReady
    ? ('确定删除选中的 '+ids.length+' 个客户吗？删除后可到「设置 → 回收站」恢复。')
    : ('确定删除选中的 '+ids.length+' 个客户吗？该操作会同时删除其关联联系人，且不可恢复。');
  uiConfirm(msg,{danger:true,okText:'删除'}).then(function(ok){
    if(!ok)return;
    (async function(){
      showToast('正在删除...');
      var failed=0,soft=true,contactWarn=false;
      for(var i=0;i<ids.length;i+=10){
        var chunk=ids.slice(i,i+10);
        var r=await softDeleteClients(chunk);
        if(!r.ok)failed++;
        if(r.contactError)contactWarn=true;
        if(r.soft===false)soft=false;
      }
      clientSel={};clientSelOnly=false;
      await loadClients();
      if(failed)showToast('删除完成，但有 '+failed+' 批失败（可能无权限）','error');
      else if(contactWarn)showToast('客户已删除，但部分联系人未能同步（可能无权修改）','error');
      else showToast(soft?('已将 '+ids.length+' 个客户移入回收站'):('已删除 '+ids.length+' 个客户'));
    })();
  });
}

// ============================================================
// 全局搜索（Ctrl/Cmd+K）
// ============================================================
var _gsItems=[],_gsIdx=-1;
function openGlobalSearch(){
  var ov=document.getElementById('gs-overlay');if(!ov)return;
  ov.classList.remove('hidden');
  var inp=document.getElementById('gs-input');
  if(inp){inp.value='';inp.focus()}
  gsRun();
}
function closeGlobalSearch(){
  var ov=document.getElementById('gs-overlay');if(ov)ov.classList.add('hidden');
  _gsItems=[];_gsIdx=-1;
}
function gsCollect(q){
  var out=[],i;
  if(!q)return out;
  // 客户
  var n=0;
  for(i=0;i<allClients.length&&n<8;i++){
    var c=allClients[i],hay=(c.name||'')+' '+(c.address||'')+' '+(c.notes||'')+' '+parseTypes(c.type).join(' ');
    if(hay.toLowerCase().indexOf(q)>=0){out.push({group:'客户',icon:'🏢',title:c.name||'(未命名)',sub:[parseTypes(c.type).join('、'),c.address].filter(Boolean).join(' · '),type:'client',id:c.id});n++}
  }
  // 联系人
  n=0;
  for(i=0;i<allContacts.length&&n<8;i++){
    var co=allContacts[i];
    var cl=null;for(var k=0;k<allClients.length;k++){if(allClients[k].id===co.client_id){cl=allClients[k];break}}
    var hay2=(co.name||'')+' '+(co.dept||'')+' '+(co.position||'')+' '+(co.phone||'')+' '+(co.email||'')+' '+(cl?cl.name:'');
    if(hay2.toLowerCase().indexOf(q)>=0){out.push({group:'联系人',icon:'👤',title:co.name||'(未命名)',sub:[co.position,co.dept,cl?cl.name:''].filter(Boolean).join(' · '),type:'contact',id:co.id,clientId:co.client_id});n++}
  }
  // 订单
  n=0;
  for(i=0;i<allOrders.length&&n<8;i++){
    var o=allOrders[i],ocn='';
    for(var m=0;m<allClients.length;m++){if(allClients[m].id===o.client_id){ocn=allClients[m].name;break}}
    var hay3=(o.order_number||'')+' '+(o.project_name||'')+' '+(o.notes||'')+' '+ocn;
    if(hay3.toLowerCase().indexOf(q)>=0){out.push({group:'订单',icon:'📦',title:'#'+(o.order_number||'')+(o.project_name?' · '+o.project_name:''),sub:[ocn,formatMoney(o._amount||0)].filter(Boolean).join(' · '),type:'order',id:o.id});n++}
  }
  // 项目
  n=0;
  for(i=0;i<allProjects.length&&n<8;i++){
    var p=allProjects[i];
    if((p.name||'').toLowerCase().indexOf(q)>=0){out.push({group:'项目',icon:'📋',title:p.name||'(未命名)',sub:(p.status||p.stage||'')+'',type:'project',id:p.id,name:p.name});n++}
  }
  return out;
}
function gsRun(){
  var q=(document.getElementById('gs-input').value||'').trim().toLowerCase();
  var box=document.getElementById('gs-results');if(!box)return;
  if(!q){_gsItems=[];_gsIdx=-1;box.innerHTML='<div class="gs-empty">输入关键词，搜索客户 / 联系人 / 订单 / 项目</div>';return}
  _gsItems=gsCollect(q);_gsIdx=_gsItems.length?0:-1;
  if(!_gsItems.length){box.innerHTML='<div class="gs-empty">未找到与「'+escHtml(q)+'」相关的结果</div>';return}
  var html='',lastGroup='';
  for(var i=0;i<_gsItems.length;i++){
    var it=_gsItems[i];
    if(it.group!==lastGroup){html+='<div class="gs-group">'+it.group+'</div>';lastGroup=it.group}
    html+='<div class="gs-item'+(i===_gsIdx?' active':'')+'" data-i="'+i+'" onclick="gsOpen('+i+')">'
      +'<div class="gsi-icon">'+it.icon+'</div>'
      +'<div class="gsi-main"><div class="gsi-title">'+escHtml(it.title)+'</div>'+(it.sub?'<div class="gsi-sub">'+escHtml(it.sub)+'</div>':'')+'</div>'
      +'<div class="gsi-go">打开 ›</div></div>';
  }
  box.innerHTML=html;
}
function gsHighlight(){
  var items=document.querySelectorAll('#gs-results .gs-item');
  for(var i=0;i<items.length;i++)items[i].classList.toggle('active',parseInt(items[i].getAttribute('data-i'),10)===_gsIdx);
  var cur=document.querySelector('#gs-results .gs-item.active');
  if(cur&&cur.scrollIntoView)cur.scrollIntoView({block:'nearest'});
}
function gsMove(d){
  if(!_gsItems.length)return;
  _gsIdx+=d;
  if(_gsIdx<0)_gsIdx=_gsItems.length-1;
  if(_gsIdx>=_gsItems.length)_gsIdx=0;
  gsHighlight();
}
function gsOpen(i){
  var it=_gsItems[i];if(!it)return;
  if(it.type==='client'){closeGlobalSearch();openClient360(it.id);}
  else if(it.type==='contact'){
    closeGlobalSearch();
    if(it.clientId){switchTab('clients');setTimeout(function(){openClient360(it.clientId)},80)}
    else showToast('该联系人未关联客户','error');
  }
  else if(it.type==='order'){closeGlobalSearch();switchTab('orders');setTimeout(function(){openOrderForm(it.id)},80);}
  else if(it.type==='project'){
    closeGlobalSearch();switchTab('projects');
    var tries=0;
    (function tryOpen(){
      tries++;
      var listEl=document.getElementById('pm-project-list');
      var busy=listEl&&/查询中|加载中/.test(listEl.textContent||'');
      if(!busy||tries>20){try{openProjectWorkbench(it.id,it.name)}catch(e){console.error(e);showToast('打开项目失败','error')}return}
      setTimeout(tryOpen,120);
    })();
  }
}
document.addEventListener('keydown',function(e){
  var key=e.key||'';
  // Ctrl/Cmd+K 打开全局搜索
  if((e.ctrlKey||e.metaKey)&&(key==='k'||key==='K')){e.preventDefault();openGlobalSearch();return}
  var ov=document.getElementById('gs-overlay');
  var open=ov&&!ov.classList.contains('hidden');
  if(!open)return;
  if(key==='Escape'){e.preventDefault();closeGlobalSearch()}
  else if(key==='ArrowDown'){e.preventDefault();gsMove(1)}
  else if(key==='ArrowUp'){e.preventDefault();gsMove(-1)}
  else if(key==='Enter'){e.preventDefault();if(_gsIdx>=0)gsOpen(_gsIdx)}
});

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
    var contacts=contactsOf(c.id);
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

  // 完整筛选结果：供「全选结果」与批量弹窗的提示条/预选使用，不受复核视图影响
  _clientFiltered=list;
  // 「只看已选」复核视图：只渲染已勾选的客户，100 选 30 时用于下手前核对
  var visible=(clientBulkMode&&clientSelOnly)?list.filter(function(c){return !!clientSel[c.id]}):list;
  _clientVisible=visible;
  var _csize=clientPageSize();
  var _cpages=Math.max(1,Math.ceil(visible.length/_csize));
  if(clientPage<1)clientPage=1;
  if(clientPage>_cpages)clientPage=_cpages;
  var pageList=visible.slice((clientPage-1)*_csize,clientPage*_csize);

  // Stats
  var statsBar=document.getElementById('stats-bar');
  var totalContacts=allContacts.length;
  var hasFilter=(currentFilter!=='all')||q;
  statsBar.innerHTML=
    '<div class="stat-card"><div class="stat-num">'+visible.length+'</div><div class="stat-label">'+((clientBulkMode&&clientSelOnly)?'已选客户':(hasFilter?'筛选结果':'客户总数'))+'</div></div>'+(
    hasFilter?'<div class="stat-card"><div class="stat-num">'+allClients.length+'</div><div class="stat-label">全部客户</div></div>':'')+
    '<div class="stat-card"><div class="stat-num">'+totalContacts+'</div><div class="stat-label">联系人</div></div>';

  var grid=document.getElementById('client-grid'),empty=document.getElementById('empty-state');
  if(visible.length===0){grid.innerHTML='';empty.classList.remove('hidden');statsBar.innerHTML=allClients.length>0?'<div class="stat-card"><div class="stat-num">0</div><div class="stat-label">'+((clientBulkMode&&clientSelOnly)?'已选客户':'筛选结果')+'</div></div><div class="stat-card"><div class="stat-num">'+allClients.length+'</div><div class="stat-label">全部客户</div></div><div class="stat-card"><div class="stat-num">'+allContacts.length+'</div><div class="stat-label">联系人</div></div>':'<div class="stat-card"><div class="stat-num">0</div><div class="stat-label">客户总数</div></div><div class="stat-card"><div class="stat-num">0</div><div class="stat-label">联系人</div></div>'}
  else{
    empty.classList.add('hidden');
    var html='';
    for(var i=0;i<pageList.length;i++){
      var c=pageList[i],types=parseTypes(c.type);
      var date=c.bidding_date?new Date(c.bidding_date+'T00:00:00').toLocaleDateString('zh-CN'):'';
      var badges='',maxS=3;
      for(var j=0;j<types.length&&j<maxS;j++)badges+='<span class="card-type" style="background:'+tColor(types[j])+'">'+h(types[j])+'</span>';
      if(types.length>maxS)badges+='<span class="card-type-more">+'+(types.length-maxS)+'</span>';
      var contactHtml='';
      var contacts=contactsOf(c.id);
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
      var _sel=!!clientSel[c.id];
      html+='<div class="client-card'+(clientBulkMode?' bulk-mode':'')+(_sel?' selected':'')+'" onclick="'+(clientBulkMode?'clientToggleSel(\''+c.id+'\')':'openClient360(\''+c.id+'\')')+'">'+
        (clientBulkMode?'<div class="card-check'+(_sel?' on':'')+'">✓</div>':'')+
        (badges?'<div class="card-types">'+badges+'</div>':'')+
        '<div class="card-name">'+h(c.name)+(gradeBadge?' '+gradeBadge:'')+'</div>'+
        (c.address?'<div class="card-addr">📍 '+h(c.address)+'</div>':'')+
        (function(){
      var projs=[];
      try{projs=JSON.parse(c.projects||'[]');if(!Array.isArray(projs))projs=[];}catch(e){projs=[]}
      if(projs.length===0&&c.project)projs=[{project_name:c.project,bidding_date:c.bidding_date||''}];
      if(projs.length===0)return '';
      var tags='',_tagN=0;
      for(var pi=0;pi<projs.length;pi++){
        var p=projs[pi],pname=p.project_name||'',bd=p.bidder_name||'',co=p.client_owner||'';
        if(!pname&&!bd&&!co)continue; // 三项全空时跳过，避免渲染出只有图标的空白气泡
        tags+='<span class="card-project-tag" title="'+(bd?'中标人:'+h(bd):'')+(co?' / 甲方负责人:'+h(co):'')+'">📋 '+h(pname||'未命名项目')+(bd?' · '+h(bd):'')+(co?' · 👤'+h(co):'')+'</span>';
        _tagN++;
      }
      if(!_tagN)return '';
      return '<div class="card-projects">'+tags+'</div>';
    })()+
        (contactHtml?'<div class="card-contact">'+contactHtml+'</div>':'');
      var osum=getClientOrderSummary(c.id);
      if(osum.count>0)html+='<div class="card-contact" style="justify-content:space-between"><span style="font-size:11px;color:var(--text3)">📦 '+osum.count+'个订单</span><span style="font-size:12px;color:var(--primary);font-weight:600">'+formatMoney(osum.total)+'</span></div>';
      html+='</div>';
    }
    grid.innerHTML=html;
  }
  renderPagerInto('client-pager',visible.length,_csize,clientPage,_cpages,'goClientPage');
  renderClientSelBar();
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
      <div class="form-row">\
        <div class="form-group"><label>录入时间</label><input type="date" value="'+h(co.entered_date||'')+'" oninput="upCt('+i+',\'entered_date\',this.value)"></div>\
        <div class="form-group"></div>\
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
var addContact=function(){formContacts.push({id:'t'+Date.now()+Math.random().toString(36).slice(2,6),name:'',dept:'',position:'',phones:[''],landlines:[''],emails:[''],room:'',entered_date:todayLocalStr(),_new:true});refCt();scrollToLastContact()};
// 新增联系人后滚到该条并聚焦姓名，省去用户手动滑到列表最下方
function scrollToLastContact(){
  try{
    var items=document.querySelectorAll('#contacts-container .contact-item');
    var it=items[items.length-1];
    if(!it)return;
    it.scrollIntoView({block:'nearest',behavior:'smooth'});
    var f=it.querySelector('input');
    if(f)setTimeout(function(){try{f.focus({preventScroll:true})}catch(e){f.focus()}},60);
  }catch(e){}
}
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

async function openForm(id){
  editId=id||null;
  var _cfData={};
  document.getElementById('form-title').textContent=id?'编辑客户':'添加客户';
  document.getElementById('btn-delete').classList.toggle('hidden',!id);
  document.getElementById('type-err').textContent='';
  document.getElementById('f-name').value='';
  document.getElementById('f-address').value='';formProjects=[];document.getElementById('pm-project-list').innerHTML='';
  var _pl=document.getElementById('project-list');if(_pl)_pl.innerHTML='';
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
        projs=[{project_name:c.project||'',bidding_date:c.bidding_date||'',bidder_name:'',bidder_phone:'',bidder_company:'',bid_amount:'',client_owner:''}];
      }
      formProjects=projs;
      for(var pi=0;pi<projs.length;pi++)addProjectEntry(projs[pi]);
      sortProjectEntriesByBiddingDate();
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
      // Load company_directory_id FK
      if(c.company_directory_id){
        for(var dk3 in allCompaniesMap){if(allCompaniesMap[dk3].id===c.company_directory_id){fillCompanyInfo(allCompaniesMap[dk3]);break}}
      }
      // Load company_info
      var ciStr=c.company_info||'{}';
      try{var ci=JSON.parse(ciStr);displayCompanyInfo(ci);}
      catch(e){displayCompanyInfo({});}
      // 自定义字段值：jsonb 可能回传对象，也可能（历史数据）是字符串
      try{
        var _cd=c.custom_data;
        if(_cd&&typeof _cd==='string')_cfData=JSON.parse(_cd)||{};
        else if(_cd&&typeof _cd==='object')_cfData=_cd;
        else _cfData={};
      }catch(e){_cfData={};}
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
  vfClearAll(document.getElementById('form-modal'));
  loadConfigCenter().then(function(){
    renderClientCustomFields(_cfData);
    renderTagSuggestions();
  });
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
  var excludeId=editId||c360ClientId;
  var list=excludeId?allClients.filter(function(c){return c.id!==excludeId}):allClients;
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
  var co=moveContactObj;
  if(!co)return;
  if(!await uiConfirm('确认将联系人「'+(co.name||co.contact_name||'')+'」转移到「'+targetName+'」？')) return;
  if(!co._new&&co.id){
    // 联系人写入同样受行级策略约束：命中 0 行时 supabase-js 不报错，
    // 旧写法只判 error → 会照样提示「已转移到」，刷新后联系人却还在原客户下。
    var w=await safeWriteContacts('update',{client_id:targetId},co.id);
    if(w.hit===0){showToast('转移失败: '+((w.error&&w.error.message)||'未命中该联系人'),'error');return}
  }
  // Remove from current form if editing
  if(moveContactIdx>=0){formContacts.splice(moveContactIdx,1);refCt()}
  // Update contact counts
  await updateContactCount(targetId);
  if(editId) await updateContactCount(editId);
  showToast('已转移到「'+targetName+'」');
  closeMoveModal();
  loadClients();
  // Refresh 360 view if open
  if(c360ClientId&&moveContactIdx<0){setTimeout(function(){if(c360ClientId)openClient360(c360ClientId)},500)}
}
function openMoveFrom360(contactObj){moveContactIdx=-1;moveContactObj=contactObj;document.getElementById('move-modal').classList.remove('hidden');searchMoveTarget()}
function transferFrom360(id){var co=allContacts.find(function(x){return x.id===id});if(co)openMoveFrom360(co);else showToast('联系人未找到')}
async function updateContactCount(clientId){
  var {count,error}=await sb.from('contacts').select('*',{count:'exact',head:true}).eq('client_id',clientId);
  // 计数同步同样走统一写通道：直连被 RLS 过滤时至少还能落到代理通道，避免计数器长期偏旧
  if(!error) await safeWriteById('clients','update',{contact_count:count||0},clientId);
}

// === Save ===

var formProjects=[];
// toTop=true 时新条目插到列表最前（供「+ 添加项目」使用，插完即在视野内）；
// 回显已有项目时不传，保持顺序 append，避免编辑时顺序被反转。
function addProjectEntry(prefill,toTop){
  prefill=prefill||{};
  var list=document.getElementById('project-list');
  if(!list)return;
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
    '</div>'+
    '<div class="form-row">'+
      '<div class="form-group"><label>甲方负责人</label><input class="pe-client-owner" placeholder="甲方负责人姓名" value="'+h(prefill.client_owner||'')+'"></div>'+
      '<div class="form-group"><label>备注</label><input class="pe-notes" placeholder="项目备注" value="'+h(prefill.notes||'')+'"></div>'+
    '</div>';
  if(toTop&&list.firstChild)list.insertBefore(div,list.firstChild);else list.appendChild(div);
  renumberProjects();
  if(toTop){
    try{div.scrollIntoView({block:'nearest',behavior:'smooth'})}catch(e){}
    var _pf=div.querySelector('.pe-project');
    if(_pf)setTimeout(function(){try{_pf.focus({preventScroll:true})}catch(e){_pf.focus()}},60);
  }
}
function removeProjectEntry(btn){
  var entry=btn.closest(".project-entry");
  if(entry)entry.remove();
  renumberProjects();
}
function renumberProjects(){
  var entries=document.querySelectorAll('#project-list .project-entry');
  for(var i=0;i<entries.length;i++)entries[i].querySelector('.pe-num').textContent='项目 '+(i+1);
}
