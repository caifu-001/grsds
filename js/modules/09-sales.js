// ==========================================================================
// grsds · 09-sales.js  —  销售漏斗 · 报价 · 合同 · 回款 · 售后工单
// 源: js/app_v2.js 第 5099-6344 行（机械切片，未改一行代码）
// ==========================================================================
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
  if(tab==='leads'){if(!(allLeads||[]).length)loadLeads();else renderLeads()}
  else if(tab==='quotations'){if(!(allQuotations||[]).length)loadQuotations();else renderQuotations()}
  else if(tab==='contracts'){if(!(allContracts||[]).length)loadContracts();else renderContracts()}
  else if(tab==='payments'){if(!(allPayments||[]).length)loadPayments();else renderPayments()}
}


// ── Quotations ──
async function loadQuotations(){
  try{
    var r=await sb.from('quotations').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
    if(r.error){console.error('loadQuotations:',r.error);return}
    allQuotations=r.data||[];renderQuotations();
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
  try{
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
  for(var i=0;i<(allClients||[]).length;i++)csel.innerHTML+='<option value="'+allClients[i].id+'">'+escHtml(allClients[i].name)+'</option>';
  var tsel=document.getElementById('qf-template');
  tsel.innerHTML='<option value="">不使用模板</option>';
  for(var i=0;i<(allQfTemplates||[]).length;i++)tsel.innerHTML+='<option value="'+allQfTemplates[i].id+'">'+escHtml(allQfTemplates[i].name)+'</option>';
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
  var qm=document.getElementById('quote-modal');
  qm.classList.remove('hidden');
  qm.style.display='flex';qm.style.position='fixed';qm.style.zIndex='9999';qm.style.opacity='1';qm.style.visibility='visible';qm.style.top='0';qm.style.right='0';qm.style.bottom='0';qm.style.left='0';
  var cs=getComputedStyle(qm);
  var rect=qm.getBoundingClientRect();
  }catch(e){console.error('openQuoteForm error:',e.message,e.stack);showToast('报价表单加载失败: '+e.message)}
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
async function saveContractTemplate(){var n=await uiPrompt('模板名称:');if(!n)return;
  var items=[];for(var i=0;i<qfItems.length;i++)items.push({name:qfItems[i].name||'',spec:qfItems[i].spec||'',unit:qfItems[i].unit||'',qty:qfItems[i].qty||1,price:qfItems[i].price||0});
  var dr=parseFloat(document.getElementById('qf-discount-rate').value)||0;
  var tr=parseFloat(document.getElementById('qf-tax-rate').value)||0;
  sb.from('quote_templates').insert({company_id:currentCompanyId,name:n,items:items,discount_rate:dr,tax_rate:tr,created_at:new Date().toISOString()}).then(function(r){if(r.error)showToast('保存模板失败');else{loadQfTemplates();showToast('模板已保存')}});
}
function loadQfTemplates(){
  sb.from('quote_templates').select('*').eq('company_id',currentCompanyId).order('name').then(function(r){allQfTemplates=r.data||[]});
}
async function convertQuoteToOrder(){
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

function qfUpdateItem(i,field,val){qfItems[i][field]=val;var rows=document.querySelectorAll('#qf-items .quote-item-row');if(rows[i]){rows[i].querySelector('.qi-amount').textContent=formatMoney((qfItems[i].qty||0)*(qfItems[i].price||0))}var t=0;for(var j=0;j<qfItems.length;j++)t+=(qfItems[j].qty||0)*(qfItems[j].price||0);document.getElementById('qf-total').textContent=formatMoney(t)}
function qfDeleteItem(i){qfItems.splice(i,1);renderQfItems()}

async function saveQuote(){
  try{
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
  }catch(e){console.error('saveQuote error:',e);showToast('保存报价失败: '+e.message)}
}

async function confirmDeleteQuote(){if(qeditId)confirmDialog('确定删除该报价？',async function(){await sb.from('quotations').delete().eq('id',qeditId);closeQuoteForm();loadQuotations();showToast('报价已删除')})}

// ── Contracts ──
async function loadContracts(){
  var grid=document.getElementById('contract-grid');grid.innerHTML=skCards(4);
  var {data,error}=await sb.from('contracts').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
  if(error){grid.innerHTML='<div class="empty">加载失败</div>';return}
  allContracts=data||[];
  if(!allProjects||!allProjects.length){var {data:prjs}=await sb.from('projects').select('id,name').eq('company_id',currentCompanyId);allProjects=prjs||[]}
  renderContracts();
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
    var paid=0,total=ct.total_amount||1;
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
    if(ct.project_id){var pn='';var prj=(allProjects||[]).find(function(x){return x.id===ct.project_id});if(prj)pn=prj.name;if(pn)h+='<div class="pc-project" style="font-size:12px;color:var(--primary);margin-top:2px">📋 '+escHtml(pn)+'</div>'}
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
async function toggleContractArchive(id,archive){
  confirmDialog(archive?'确定归档该合同？':'确定取消归档？',async function(){
    var r=await sb.from('contracts').update({archive_status:archive?'archived':'active',updated_at:new Date().toISOString()}).eq('id',id);
    if(r.error){showToast('操作失败: '+r.error.message);return}
    await loadContracts();showToast(archive?'合同已归档':'合同已取消归档');
  });
}

function openContractForm(id){
  try{
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
  for(var i=0;i<(allClients||[]).length;i++)csel.innerHTML+='<option value="'+allClients[i].id+'">'+escHtml(allClients[i].name)+'</option>';
  var psel=document.getElementById('cf-project');
  psel.innerHTML='<option value="">选择项目...</option>';
  for(var i=0;i<(allProjects||[]).length;i++)psel.innerHTML+='<option value="'+allProjects[i].id+'">'+escHtml(allProjects[i].name)+'</option>';
  if(id){var ct=(allContracts||[]).find(function(x){return x.id===id});if(ct){
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
    psel.value=ct.project_id||'';
  }}
  var cm=document.getElementById('contract-modal');
  cm.classList.remove('hidden');
  cm.style.display='flex';cm.style.position='fixed';cm.style.zIndex='9999';cm.style.opacity='1';cm.style.visibility='visible';cm.style.top='0';cm.style.right='0';cm.style.bottom='0';cm.style.left='0';
  var cs=getComputedStyle(cm);
  var rect=cm.getBoundingClientRect();
  }catch(e){console.error('openContractForm error:',e.message,e.stack);showToast('合同表单加载失败: '+e.message)}
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
    try{var fresp=await sb.storage.from('contract_files').upload(fpath.replace('contract_files/',''),fl,{cacheControl:'3600',upsert:true});
    if(fresp.ok){fileUrl=SUPABASE_URL+'/storage/v1/object/public/'+fpath;fileName=fl.name}else{showToast('文件上传失败');return}}
    catch(e){showToast('文件上传失败: '+e.message);return}
  }else{
    if(ceditId){var ec=allContracts.find(function(x){return x.id===ceditId});if(ec&&ec.file_url){fileUrl=ec.file_url;fileName=ec.file_name||''}}
  }
  var data={
    company_id:currentCompanyId,user_id:currentUser.id,title:title,client_id:cid,
    project_id:document.getElementById('cf-project').value||null,
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
async function confirmDeleteContract(){if(ceditId)confirmDialog('确定删除该合同？',async function(){await sb.from('contracts').delete().eq('id',ceditId);closeContractForm();loadContracts();showToast('合同已删除')})}

// ── Payments ──
async function loadPayments(){
  var grid=document.getElementById('payment-grid');grid.innerHTML=skCards(4);
  var {data,error}=await sb.from('payments').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
  if(error){grid.innerHTML='<div class="empty">加载失败</div>';return}
  allPayments=data||[];
  if(!allProjects||!allProjects.length){var {data:prjs}=await sb.from('projects').select('id,name').eq('company_id',currentCompanyId);allProjects=prjs||[]}
  renderPayments();
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
    var pn='';if(p.project_id){var prj=(allProjects||[]).find(function(x){return x.id===p.project_id});if(prj)pn=prj.name;}
    h+='<div class="pipe-card" onclick="openPaymentForm(\''+p.id+'\')" style="--card-bar:'+({'received':'#10B981','planned':'#F59E0B','overdue':'#EF4444'}[p.status]||'#F59E0B')+'">';
    h+='<div class="pc-header"><span class="pc-name">'+escHtml(cn||'未知客户')+'</span><span class="pc-amount">'+formatMoney(p.amount||0)+'</span></div>';
    h+='<div class="pc-meta"><span class="status-badge '+sc+'">'+({received:'已收款',planned:'计划中',overdue:'逾期',cancelled:'已取消'}[p.status]||p.status)+'</span><span>'+methodMap[p.method||'other']+'</span>'+(p.payment_date?'<span>'+p.payment_date+'</span>':'')+(p.invoice_no?'<span>发票: '+escHtml(p.invoice_no)+'</span>':'')+'</div>';
    if(pn)h+='<div style="font-size:12px;color:var(--primary);margin-top:2px">📋 '+escHtml(pn)+'</div>';
    if(p.notes)h+='<div style="font-size:12px;color:var(--text2);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">💬 '+escHtml(p.notes)+'</div>';
    h+='</div>';
  }
  grid.innerHTML=h;
}

function openPaymentForm(id){
  try{
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
  var pprj=document.getElementById('pf-project');
  pprj.innerHTML='<option value="">选择项目...</option>';
  for(var i=0;i<(allProjects||[]).length;i++)pprj.innerHTML+='<option value="'+allProjects[i].id+'">'+escHtml(allProjects[i].name)+'</option>';
  for(var i=0;i<(allClients||[]).length;i++)cs.innerHTML+='<option value="'+allClients[i].id+'">'+escHtml(allClients[i].name)+'</option>';
  cs.onchange=function(){var cid=this.value;ct.innerHTML='<option value="">选择合同...</option>';if(cid){for(var j=0;j<(allContracts||[]).length;j++){if(allContracts[j].client_id===cid)ct.innerHTML+='<option value="'+allContracts[j].id+'">'+escHtml(allContracts[j].title||allContracts[j].contract_no||'合同')+'</option>'}}};
  if(id){var p=(allPayments||[]).find(function(x){return x.id===id});if(p){
    document.getElementById('pf-amount').value=p.amount||'';
    document.getElementById('pf-date').value=p.payment_date||'';
    document.getElementById('pf-method').value=p.method||'bank';
    document.getElementById('pf-status').value=p.status||'received';
    document.getElementById('pf-invoice').value=p.invoice_no||'';
    document.getElementById('pf-notes').value=p.notes||'';
    cs.value=p.client_id||'';cs.onchange();setTimeout(function(){document.getElementById('pf-contract').value=p.contract_id||''},200);
    pprj.value=p.project_id||'';
  }}
  var pm=document.getElementById('payment-modal');
  pm.classList.remove('hidden');
  pm.style.display='flex';pm.style.position='fixed';pm.style.zIndex='9999';pm.style.opacity='1';pm.style.visibility='visible';pm.style.top='0';pm.style.right='0';pm.style.bottom='0';pm.style.left='0';
  var cs=getComputedStyle(pm);
  }catch(e){console.error('openPaymentForm error:',e.message,e.stack);showToast('回款表单加载失败: '+e.message)}
}
function closePaymentForm(){document.getElementById('payment-modal').classList.add('hidden');peditId=null}

async function savePayment(){
  var amount=parseFloat(document.getElementById('pf-amount').value)||0;
  var cid=document.getElementById('pf-client').value;if(!cid){showToast('请选择关联客户');return}
  var data={
    company_id:currentCompanyId,user_id:currentUser.id,amount:amount,client_id:cid,
    project_id:document.getElementById('pf-project').value||null,
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
async function confirmDeletePayment(){if(peditId)confirmDialog('确定删除该回款记录？',async function(){await sb.from('payments').delete().eq('id',peditId);closePaymentForm();loadPayments();showToast('回款记录已删除')})}

// ── Common: openSalesForm (FAB) ──
function openSalesForm(){
  if(currentSalesTab==='leads'){leadFormSource='sales';openLeadForm();}
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
  var grid=document.getElementById('ticket-grid');grid.innerHTML=skCards(4);
  var{data,error}=await sb.from('service_tickets').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
  if(error){grid.innerHTML='<div class="empty">加载失败: '+h(error.message)+'</div>';return}
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
    h+='<div class="lead-name">'+escHtml(t.title)+' <span style="font-size:11px;color:var(--text3)">#'+(t.ticket_no||t.id)+'</span></div>';
    h+='<div class="lead-meta"><span class="lead-status-badge '+t.status+'">'+(sm[t.status]||t.status)+'</span>';
    h+='<span>'+escHtml(tm[t.type]||t.type)+'</span><span>'+escHtml(pm[t.priority]||'')+'</span>';
    if(t.engineer_name)h+='<span>🔧 '+escHtml(t.engineer_name)+'</span>';
    h+='</div>';
    if(t.description)h+='<div style="font-size:12px;color:var(--text2);margin-top:4px">'+escHtml(t.description).substring(0,80)+'</div>';
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
  var data={company_id:currentCompanyId,created_by:currentUser.id,title:title,
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
    h+='<div class="lead-name">'+escHtml(v.title||'回访记录')+' <span style="font-size:11px;color:var(--text3)">'+escHtml(cn)+'</span></div>';
    h+='<div class="lead-meta"><span class="lead-status-badge '+(ss[v.status]||'')+'">'+(v.status==='planned'?'计划中':v.status==='completed'?'已完成':'已取消')+'</span>';
    h+='<span>'+escHtml(vm[v.visit_type]||v.visit_type)+'</span><span>'+(mth[v.visit_method]||'📋')+' '+escHtml(v.visit_method||'')+'</span>';
    if(v.planned_date)h+='<span>📅 '+v.planned_date+'</span>';
    if(v.satisfaction)h+='<span>⭐ '+v.satisfaction+'</span>';
    h+='</div>';
    if(v.content)h+='<div style="font-size:12px;color:var(--text2);margin-top:4px">'+escHtml(v.content).substring(0,100)+'</div>';
    h+='<div class="lead-actions"><button onclick="event.stopPropagation();openSalesVisitForm(\''+v.id+'\')">编辑</button><button class="btn-lead-danger" onclick="event.stopPropagation();confirmDeleteVisit(\''+v.id+'\')">删除</button></div></div>';
  }
  grid.innerHTML=h;
}
function openSalesVisitForm(id){
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
async function saveVisit(){
  var title=document.getElementById('vf-title').value.trim();if(!title){showToast('请输入标题');return}
  var data={company_id:currentCompanyId,created_by:currentUser.id,title:title,
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
async function openVisitTaskForm(){var n=document.getElementById('vf-title').value||'';var c=await uiPrompt('回访任务标题:',n);if(!c)return;
  var date=await uiPrompt('计划日期 (YYYY-MM-DD):',new Date().toISOString().split('T')[0]);if(!date)return;
  sb.from('visit_tasks').insert([{company_id:currentCompanyId,title:c,task_type:'care',scheduled_date:date,status:'pending',created_at:new Date().toISOString()}]).then(function(r){
    if(r.error)showToast('创建失败: '+r.error.message);else{loadVisitTasks();showToast('回访任务已创建')}
  });
}
function showVisitTaskList(){
  var rows=visitTasks.map(function(t){return '• '+t.title+' ['+t.scheduled_date+'] '+(t.status==='pending'?'待处理':'已完成')}).join('\n');
  uiAlert('回访任务列表:\n\n'+rows);
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
    h+='<div class="lead-name">'+escHtml(w.product_name)+' <span style="font-size:11px;color:var(--text3)">'+escHtml(cn)+'</span></div>';
    h+='<div class="lead-meta"><span>'+escHtml(ss[w.status]||w.status)+'</span>';
    if(w.serial_no)h+='<span># '+escHtml(w.serial_no)+'</span>';
    h+='<span>📅 '+escHtml(w.warranty_start||'')+' → '+escHtml(endLabel)+'</span>';
    h+='<span>'+escHtml(w.warranty_type||'')+'</span>';
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
  var data={company_id:currentCompanyId,product_name:pn,
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
    h+='<div class="lead-name">🔧 '+escHtml(m.product_name||'维保计划')+' <span style="font-size:11px;color:var(--text3)">'+escHtml(cn)+'</span></div>';
    h+='<div class="lead-meta"><span class="lead-status-badge '+(sc[m.status]||'')+'">'+escHtml(ss[m.status]||m.status)+'</span>';
    h+='<span>'+escHtml(m.plan_type||'')+'</span><span>🔄 '+escHtml(m.schedule_interval||'')+'</span>';
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
  var data={company_id:currentCompanyId,product_name:pn,
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
    h+='<div class="lead-name">'+escHtml(k.title)+' <span style="font-size:11px;color:var(--text3)">'+escHtml(cm[k.category]||k.category)+'</span></div>';
    h+='<div class="lead-meta">';
    if(k.tags&&k.tags.length)h+='<span>'+k.tags.map(function(t){return '#'+escHtml(t)}).join(' ')+'</span>';
    if(k.related_products)h+='<span>📦 '+escHtml(k.related_products)+'</span>';
    h+='<span>👁 '+k.view_count+'</span>';
    h+='</div>';
    h+='<div id="kb-detail-'+k.id+'" style="display:none;padding:12px 0;font-size:13px;color:var(--text);line-height:1.7;white-space:pre-wrap;border-top:1px solid var(--border);margin-top:8px">'+escHtml(k.content||'')+'</div>';
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
  var data={company_id:currentCompanyId,created_by:currentUser.id,title:title,
    category:document.getElementById('kbf-category').value,
    content:document.getElementById('kbf-content').value.trim(),
        tags:tags,
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

// ═══════════ SCOUTING (选品调研) ═══════════
var allScouting=[],scoutingEditId=null;

(function(){
  var modals=document.createElement('div');
  modals.innerHTML='<div class="modal-overlay hidden" id="scouting-modal" onclick="closeScoutingForm()"><div class="modal" onclick="event.stopPropagation()"><div class="modal-box" style="max-width:640px"><div class="modal-head"><span id="scouting-modal-title">\u6dfb\u52a0\u9009\u54c1</span><span class="modal-close" onclick="closeScoutingForm()">\u00d7</span></div><div class="modal-body" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="form-group"><label>\u9009\u54c1\u6e20\u9053 *</label><input id="sc-channel" placeholder="\u5982\uff1a1688\u3001\u4e49\u4e4c..." list="sc-channel-list" autocomplete="off"><datalist id="sc-channel-list"><option value="1688"><option value="\u4e49\u4e4c"><option value="\u4e9a\u9a6c\u900a"><option value="TikTok Shop"><option value="\u62fc\u591a\u591a"><option value="\u6dd8\u5b9d"><option value="\u4eac\u4e1c"><option value="\u5176\u4ed6"></datalist></div><div class="form-group"><label>\u4ea7\u54c1\u540d\u79f0 *</label><input id="sc-product-name" placeholder="\u4ea7\u54c1\u540d\u79f0"></div><div class="form-group"><label>\u4ea7\u54c1\u5206\u7c7b <button class=\"btn-xs\" style=\"background:var(--surface);border:1px solid var(--border);color:var(--text);margin-left:4px;cursor:pointer;padding:2px 6px;border-radius:4px\" onclick=\"event.stopPropagation();toggleScCatManage()\" title=\"\u7ba1\u7406\u5206\u7c7b\">\ud83d\udcc2</button></label><select id=\"sc-product-category\"><option value=\"\">\u9009\u62e9\u5206\u7c7b</option></select><div id=\"sc-cat-manage\" class=\"hidden\" style=\"grid-column:1/-1;background:var(--surface);border-radius:8px;padding:10px\"><div style=\"font-size:12px;color:var(--text-secondary);margin-bottom:6px\">\u5206\u7c7b\u7ba1\u7406</div><div id=\"sc-cat-tags\" style=\"display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px\"></div><div style=\"display:flex;gap:6px\"><input id=\"sc-cat-new\" placeholder=\"\u65b0\u5206\u7c7b\u540d\u79f0\" style=\"flex:1\" onkeydown=\"if(event.key===\\\u0027Enter\\u0027)addScCat()\"><button class=\"btn-sm\" style=\"background:var(--primary);color:#fff\" onclick=\"addScCat()\">\u6dfb\u52a0</button></div></div></div><div class="form-group"><label>\u4f9b\u5e94\u5546 <span style="font-size:11px;color:var(--text-secondary);font-weight:400">\u2014 \u652f\u6301\u4f01\u4e1a\u540d\u5f55\u81ea\u52a8\u5339\u914d</span></label><div style="position:relative"><input id="sc-supplier" placeholder="\u4f9b\u5e94\u5546\u540d\u79f0" autocomplete="off" oninput="onScoutingSupplierInput()" onfocus="onScoutingSupplierInput()" onkeydown="onScoutingSupplierKeydown(event)"><div class="name-suggestions hidden" id="sc-supplier-suggestions"></div></div></div><div class="form-group"><label>\u91c7\u8d2d\u4ef7(\u5143)</label><input id="sc-purchase-price" type="number" step="0.01" placeholder="0"></div><div class="form-group"><label>\u9500\u552e\u4ef7(\u5143)</label><input id="sc-selling-price" type="number" step="0.01" placeholder="0"></div><div class="form-group"><label>\u8fbe\u4eba\u4f63\u91d1(%)</label><input id="sc-commission" type="number" step="0.01" min="0" max="100" placeholder="0"></div><div class="form-group"><label>MOQ</label><input id="sc-moq" type="number" min="1" placeholder="\u6700\u5c0f\u8d77\u8ba2\u91cf"></div><div class="form-group" style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="sc-has-sample" style="width:auto"><label style="margin:0">\u5df2\u62ff\u6837\u54c1</label></div><div class="form-group"><label>\u72b6\u6001</label><select id="sc-status"><option value="pending">\u5f85\u8bc4\u4f30</option><option value="approved">\u5df2\u901a\u8fc7</option><option value="rejected">\u5df2\u5426\u51b3</option><option value="ordered">\u5df2\u91c7\u8d2d</option></select></div><div class="form-group" style="grid-column:1/-1"><label>\u5408\u89c4\u8981\u6c42</label><textarea id="sc-compliance" rows="2" placeholder="\u8d44\u8d28\u8bc1\u4e66\u3001\u73af\u4fdd\u6807\u51c6\u3001ISO\u8ba4\u8bc1\u7b49..."></textarea></div><div class="form-group" style="grid-column:1/-1"><label>\u4ea7\u54c1\u53c2\u6570</label><div id="sc-params"></div><button class="btn-sm" style="background:var(--surface);border:1px solid var(--border);margin-top:4px" onclick="addScoutingParam()">\uff0b \u6dfb\u52a0\u53c2\u6570</button></div><div class="form-group" style="grid-column:1/-1"><label>\u5907\u6ce8</label><input id="sc-notes" placeholder="\u53ef\u9009"></div></div><div class="modal-actions"><button class="btn-cancel" onclick="closeScoutingForm()">\u53d6\u6d88</button><button class="btn-delete hidden" id="sc-btn-delete" onclick="deleteScouting(scoutingEditId)">\u5220\u9664</button><button class="btn-save" onclick="saveScouting()">\u4fdd\u5b58</button></div></div></div></div>';
  document.body.appendChild(modals);
})();

var scTempParams=[];

function addScoutingParam(){
  scTempParams.push({key:'',val:''});
  renderScParams();
}
function removeScoutingParam(i){
  scTempParams.splice(i,1);
  renderScParams();
}
function renderScParams(){
  var el=document.getElementById('sc-params');
  if(!el)return;
  var h='';
  for(var i=0;i<scTempParams.length;i++){
    h+='<div style="display:flex;gap:8px;margin-bottom:6px"><input placeholder="\u53c2\u6570\u540d" style="flex:1" value="'+escHtml(scTempParams[i].key)+'" oninput="scTempParams['+i+'].key=this.value"><input placeholder="\u53c2\u6570\u503c" style="flex:1" value="'+escHtml(scTempParams[i].val)+'" oninput="scTempParams['+i+'].val=this.value"><button class="btn-xs" style="color:var(--danger);cursor:pointer" onclick="removeScoutingParam('+i+')">\u00d7</button></div>';
  }
  el.innerHTML=h||'<div style="color:var(--text-secondary);font-size:13px">\u6682\u65e0\u53c2\u6570</div>';
}

async function loadScouting(){
  var r=await sb.from('product_scouting').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false});
  if(r.error){console.error(r.error);return}
  allScouting=r.data||[];
  renderScouting();
  buildScCatFilterDropdown();
}

function renderScouting(){
  var tbody=document.getElementById('scouting-tbody');
  if(!tbody)return;
  // Apply filters
  var fp=(document.getElementById('sc-filter-product')||{}).value||'';
  var fs=(document.getElementById('sc-filter-supplier')||{}).value||'';
  var fc=(document.getElementById('sc-filter-channel')||{}).value||'';
  var fst=(document.getElementById('sc-filter-status')||{}).value||'';
  var fct=(document.getElementById('sc-filter-category')||{}).value||'';
  fp=fp.trim().toLowerCase();fs=fs.trim().toLowerCase();
  var filtered=[];
  for(var i=0;i<allScouting.length;i++){
    var s=allScouting[i];
    if(fp&&(s.product_name||'').toLowerCase().indexOf(fp)<0)continue;
    if(fs&&(s.supplier_name||'').toLowerCase().indexOf(fs)<0)continue;
    if(fc&&s.channel!==fc)continue;
    if(fst&&s.status!==fst)continue;
    if(fct&&s.product_category!==fct)continue;
    filtered.push(s);
  }
  // Update stats bar
  var stats=document.getElementById('scouting-stats');
  if(stats){
    var total=allScouting.length;
    var approved=0,pending=0,rejected=0;
    var totalPrice=0,priceCount=0;
    for(var si=0;si<allScouting.length;si++){
      var ss=allScouting[si];
      if(ss.status==='approved')approved++;else if(ss.status==='rejected')rejected++;else if(ss.status==='pending')pending++;
      if(parseFloat(ss.purchase_price)>0){totalPrice+=parseFloat(ss.purchase_price);priceCount++;}
    }
    var avgPrice=priceCount>0?'￥'+fmtNum(totalPrice/priceCount):'-';
    stats.innerHTML='<span>📦 共<b>'+total+'</b>条选品</span><span class="tag tag-success">✅ 已通过 '+approved+'</span><span class="tag tag-warning">⏳ 待评估 '+pending+'</span><span class="tag tag-danger">❌ 已否决 '+rejected+'</span><span>💰 均价 '+avgPrice+'</span>';
    if(filtered.length!==total)stats.innerHTML+='<span style="color:var(--primary)">🔍 筛选: '+filtered.length+' 条</span>';
  }
  // Update category filter dropdown
  var ctSel=document.getElementById('sc-filter-category');
  if(ctSel){
    var cts={},ctprev=ctSel.value;
    for(var cti=0;cti<allScouting.length;cti++){var ct2=allScouting[cti].product_category;if(ct2&&!cts[ct2])cts[ct2]=1;}
    var ctOpt='<option value="">全部分类</option>';
    var ctKeys=Object.keys(cts).sort();
    for(var ctk=0;ctk<ctKeys.length;ctk++)ctOpt+='<option value="'+escHtml(ctKeys[ctk])+'">'+escHtml(ctKeys[ctk])+'</option>';
    ctSel.innerHTML=ctOpt;ctSel.value=ctprev;
  }
  // Update channel filter dropdown
  var chSel=document.getElementById('sc-filter-channel');
  if(chSel){
    var chs={},prev=chSel.value;
    for(var ci=0;ci<allScouting.length;ci++){var ch=allScouting[ci].channel;if(ch&&!chs[ch])chs[ch]=1;}
    var copt='<option value="">全部渠道</option>';
    var chkeys=Object.keys(chs).sort();
    for(var ck=0;ck<chkeys.length;ck++)copt+='<option value="'+escHtml(chkeys[ck])+'">'+escHtml(chkeys[ck])+'</option>';
    chSel.innerHTML=copt;chSel.value=prev;
  }
  // Render table
  if(!filtered.length){
    tbody.innerHTML='<tr><td colspan="14" style="text-align:center;padding:24px;color:var(--text-secondary)">暂无匹配数据</td></tr>';
    refreshScoutingCompare();
    return;
  }
  var h='';
  for(var fi=0;fi<filtered.length;fi++){
    var s=filtered[fi];
    var params=s.product_params;
    try{if(typeof params==='string')params=JSON.parse(params)}catch(e){params={}}
    var paramsStr='';
    if(params&&typeof params==='object'){
      var keys=Object.keys(params);
      for(var k=0;k<Math.min(keys.length,3);k++)paramsStr+=escHtml(keys[k])+':'+escHtml(params[keys[k]])+(k<Math.min(keys.length,3)-1?'<br>':'');
      if(keys.length>3)paramsStr+='<br><span style="color:var(--text-secondary)">...+'+(keys.length-3)+'\u9879</span>';
    }
    var statusMap={pending:'\u5f85\u8bc4\u4f30',approved:'\u5df2\u901a\u8fc7',rejected:'\u5df2\u5426\u51b3',ordered:'\u5df2\u91c7\u8d2d'};
    var statusCls={pending:'tag-warning',approved:'tag-success',rejected:'tag-danger',ordered:'tag-primary'};
    var status=s.status||'pending';
    h+='<tr><td><input type="checkbox" class="sc-compare-cb" data-id="'+s.id+'" onchange="refreshScoutingCompare()" title="加入对比"></td><td>'+escHtml(s.channel||'')+'</td><td><b>'+escHtml(s.product_name||'')+'</b></td><td>'+escHtml(s.product_category||'')+'</td><td>'+escHtml(s.supplier_name||'')+'</td><td>'+fmtNum(s.purchase_price)+'</td><td>'+fmtNum(s.selling_price)+'</td><td>'+(parseFloat(s.influencer_commission)||0)+'%</td><td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+escHtml(s.compliance_requirements||'')+'">'+escHtml(s.compliance_requirements||'-')+'</td><td style="font-size:12px">'+paramsStr+'</td><td>'+(s.moq||'-')+'</td><td>'+(s.has_sample?'\u2705':'\\u274c')+'</td><td><span class="tag '+statusCls[status]+'">'+statusMap[status]+'</span></td><td><button class="btn-xs" style="color:var(--primary);cursor:pointer" onclick="editScouting('+s.id+')">\u7f16\u8f91</button> <button class="btn-xs" style="color:var(--success);cursor:pointer" onclick="approveScouting('+s.id+')">\u5165\u5e93</button></td></tr>';
  }
  tbody.innerHTML=h;
  // Refresh analytics
  refreshScoutingCompare();
}

function refreshScoutingCompare(){
  // Restore saved tax rate
  var _tr=document.getElementById('sc-tax-rate');if(_tr&&!_tr.dataset.loaded){var _saved=localStorage.getItem('sc_tax_rate');if(_saved!==null)_tr.value=_saved;_tr.dataset.loaded='1';
    _tr.addEventListener('change',function(){localStorage.setItem('sc_tax_rate',this.value)});}

  // Apply filters
  var fp=(document.getElementById('sc-filter-product')||{}).value||'';
  var fs=(document.getElementById('sc-filter-supplier')||{}).value||'';
  var fc=(document.getElementById('sc-filter-channel')||{}).value||'';
  var fst=(document.getElementById('sc-filter-status')||{}).value||'';
  var fct=(document.getElementById('sc-filter-category')||{}).value||'';
  fp=fp.trim().toLowerCase();fs=fs.trim().toLowerCase();
  var filtered=[];
  for(var i=0;i<allScouting.length;i++){
    var s=allScouting[i];
    if(fp&&(s.product_name||'').toLowerCase().indexOf(fp)<0)continue;
    if(fs&&(s.supplier_name||'').toLowerCase().indexOf(fs)<0)continue;
    if(fc&&s.channel!==fc)continue;
    if(fst&&s.status!==fst)continue;
    if(fct&&s.product_category!==fct)continue;
    filtered.push(s);
  }
  // Compare-only mode: filter by checked boxes
  var compCb=document.getElementById('sc-filter-compare');
  var compOnly=compCb&&compCb.checked;
  if(compOnly){
    var checkedIds={};
    var cbs=document.querySelectorAll('.sc-compare-cb:checked');
    for(var cbi=0;cbi<cbs.length;cbi++){checkedIds[cbs[cbi].getAttribute('data-id')]=true;}
    var compFiltered=[];
    for(var fi2=0;fi2<filtered.length;fi2++){if(checkedIds[String(filtered[fi2].id)])compFiltered.push(filtered[fi2]);}
    if(compFiltered.length)filtered=compFiltered;
  }
  // ====== Summary Cards ======
  var cards=document.getElementById('scouting-summary-cards');
  if(cards){
    var total=filtered.length;var supSet=new Set();for(var vi=0;vi<filtered.length;vi++){if(filtered[vi].supplier_name)supSet.add(filtered[vi].supplier_name.trim().toLowerCase());}var supplierCount=supSet.size;
    if(!total){cards.innerHTML='';}else{
      var totalPrice=0,priceCount=0,minPrice=Infinity,maxPrice=-Infinity;
      var hasSample=0,totalMoq=0,moqCount=0;
      for(var ii=0;ii<filtered.length;ii++){
        var fi=filtered[ii];
        var pp=parseFloat(fi.purchase_price)||0;
        if(pp>0){totalPrice+=pp;priceCount++;if(pp<minPrice)minPrice=pp;if(pp>maxPrice)maxPrice=pp;}
        if(fi.has_sample)hasSample++;
        if(parseInt(fi.moq)>0){totalMoq+=parseInt(fi.moq);moqCount++;}
      }
      var avgP=priceCount>0?'\uffe5'+fmtNum(totalPrice/priceCount):'-';
      var minP=minPrice!==Infinity?'\uffe5'+fmtNum(minPrice):'-';
      var maxP=maxPrice!==-Infinity?'\uffe5'+fmtNum(maxPrice):'-';
      var avgMoq=moqCount>0?Math.round(totalMoq/moqCount)+'\u4ef6':'N/A';
      cards.innerHTML='<div style="background:var(--card);border-radius:10px;padding:14px;text-align:center"><div style="font-size:24px;font-weight:700;color:var(--primary)">'+total+'</div><div style="font-size:12px;color:var(--text-secondary);margin-top:4px">\ud83d\udce6 \u5339\u914d\u9009\u54c1\u6570</div></div>'+'<div style="background:var(--card);border-radius:10px;padding:14px;text-align:center"><div style="font-size:24px;font-weight:700;color:var(--success)">'+avgP+'</div><div style="font-size:12px;color:var(--text-secondary);margin-top:4px">\ud83d\udcb0 \u5e73\u5747\u91c7\u8d2d\u4ef7</div></div>'+'<div style="background:var(--card);border-radius:10px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:700">'+minP+' ~ '+maxP+'</div><div style="font-size:12px;color:var(--text-secondary);margin-top:4px">\ud83d\udcc9 \u4ef7\u683c\u533a\u95f4</div></div>'+'<div style="background:var(--card);border-radius:10px;padding:14px;text-align:center"><div style="font-size:24px;font-weight:700">'+hasSample+'/'+total+'</div><div style="font-size:12px;color:var(--text-secondary);margin-top:4px">\ud83d\udce6 \u5df2\u62ff\u6837\u54c1</div></div>'+'<div style="background:var(--card);border-radius:10px;padding:14px;text-align:center"><div style="font-size:24px;font-weight:700">'+avgMoq+'</div><div style="font-size:12px;color:var(--text-secondary);margin-top:4px">\ud83d\udccb \u5e73\u5747MOQ</div></div>';
    }
  }
  // ====== Channel & Status Charts ======
  var chCount={};
  for(var ci=0;ci<filtered.length;ci++){var ch=filtered[ci].channel||'\u5176\u4ed6';if(!chCount[ch])chCount[ch]=0;chCount[ch]++;}
  var chEl=document.getElementById('sc-channel-chart');
  if(chEl&&filtered.length){
    var maxCh=0;var chKeys=Object.keys(chCount);
    for(var cc=0;cc<chKeys.length;cc++)if(chCount[chKeys[cc]]>maxCh)maxCh=chCount[chKeys[cc]];
    chKeys.sort(function(a,b){return chCount[b]-chCount[a]});
    var chHtml='';
    for(var cd=0;cd<chKeys.length;cd++){
      var pct=Math.round(chCount[chKeys[cd]]/filtered.length*100);
      chHtml+='<div style="display:flex;align-items:center;gap:8px"><span style="width:80px;font-size:12px;text-align:right;flex-shrink:0">'+escHtml(chKeys[cd])+'</span><div style="flex:1;background:var(--border);border-radius:4px;height:20px;overflow:hidden"><div style="background:var(--primary);height:100%;width:'+pct+'%;border-radius:4px"></div></div><span style="font-size:12px;width:40px;font-weight:600">'+chCount[chKeys[cd]]+'</span></div>';
    }
    chEl.innerHTML=chHtml||'<div style="color:var(--text-secondary);font-size:13px">\u6682\u65e0\u6570\u636e</div>';
  }else if(chEl){chEl.innerHTML='<div style="color:var(--text-secondary);font-size:13px">\u6682\u65e0\u6570\u636e</div>';}
  var stCount={};
  for(var si=0;si<filtered.length;si++){var st=filtered[si].status||'pending';if(!stCount[st])stCount[st]=0;stCount[st]++;}
  var stEl=document.getElementById('sc-status-chart');
  if(stEl&&filtered.length){
    var stMap={pending:'\u23f3 \u5f85\u8bc4\u4f30',approved:'\u2705 \u5df2\u901a\u8fc7',rejected:'\u274c \u5df2\u5426\u51b3',ordered:'\ud83d\udce6 \u5df2\u91c7\u8d2d'};
    var stKeys=Object.keys(stCount);stKeys.sort(function(a,b){return stCount[b]-stCount[a]});
    var stHtml='';
    for(var sj=0;sj<stKeys.length;sj++){
      var spct=Math.round(stCount[stKeys[sj]]/filtered.length*100);
      var scolor=stKeys[sj]==='approved'?'var(--success)':stKeys[sj]==='rejected'?'var(--danger)':stKeys[sj]==='ordered'?'var(--primary)':'#f0ad4e';
      stHtml+='<div style="display:flex;align-items:center;gap:8px"><span style="width:90px;font-size:12px;text-align:right;flex-shrink:0">'+(stMap[stKeys[sj]]||stKeys[sj])+'</span><div style="flex:1;background:var(--border);border-radius:4px;height:20px;overflow:hidden"><div style="background:'+scolor+';height:100%;width:'+spct+'%;border-radius:4px"></div></div><span style="font-size:12px;width:40px;font-weight:600">'+stCount[stKeys[sj]]+'</span></div>';
    }
    stEl.innerHTML=stHtml||'<div style="color:var(--text-secondary);font-size:13px">\u6682\u65e0\u6570\u636e</div>';
  }else if(stEl){stEl.innerHTML='<div style="color:var(--text-secondary);font-size:13px">\u6682\u65e0\u6570\u636e</div>';}
  // ====== Canvas Charts ======
  drawScoutingCategoryCharts(filtered);
  // ====== Compare Table (Horizontal: suppliers as rows per product) ======
  var cmpContainer=document.getElementById('scouting-compare-container');
  if(!cmpContainer)return;
  
  // Populate compare filter dropdowns from all scouting data
  (function(){
    var catSel=document.getElementById('sc-cmp-filter-cat');
    if(catSel&&!catSel.dataset.built){
      var cats={};for(var ci=0;ci<allScouting.length;ci++){var cc=allScouting[ci].product_category;if(cc)cats[cc]=1;}
      var opts='<option value="">全部分类</option>';
      var cks=Object.keys(cats).sort();for(var ck=0;ck<cks.length;ck++)opts+='<option value="'+escHtml(cks[ck])+'">'+escHtml(cks[ck])+'</option>';
      catSel.innerHTML=opts;catSel.dataset.built='1';
    }
  })();
  
  // Apply compare filters
  var cfName=(document.getElementById('sc-cmp-filter-name')||{}).value||'';
  var cfCat=(document.getElementById('sc-cmp-filter-cat')||{}).value||'';
  var cfStatus=(document.getElementById('sc-cmp-filter-status')||{}).value||'';
  var cfNoPrice=document.getElementById('sc-cmp-ignore-noprice')&&document.getElementById('sc-cmp-ignore-noprice').checked;
  cfName=cfName.trim().toLowerCase();
  
  var cmpFiltered=[];
  for(var fi=0;fi<filtered.length;fi++){
    var f=filtered[fi];
    if(cfName&&(f.product_name||'').toLowerCase().indexOf(cfName)<0)continue;
    if(cfCat&&f.product_category!==cfCat)continue;
    if(cfStatus&&f.status!==cfStatus)continue;
    if(cfNoPrice&&parseFloat(f.purchase_price)<=0)continue;
    cmpFiltered.push(f);
  }
  
  if(!cmpFiltered.length){
    cmpContainer.innerHTML='<div style="text-align:center;padding:32px;color:var(--text-secondary);background:var(--card);border-radius:12px">📭 无匹配的对比数据</div>';
    return;
  }
  
  // Group by product name
  var prodGroups={};
  for(var gi=0;gi<cmpFiltered.length;gi++){
    var s=cmpFiltered[gi];
    var key=(s.product_name||'未命名').trim().toLowerCase();
    if(!prodGroups[key])prodGroups[key]={name:s.product_name||'未命名',category:s.product_category||'未分类',items:[]};
    prodGroups[key].items.push(s);
  }
  var pkeys=Object.keys(prodGroups).sort();
  
  // Get tax rate
  var taxEl=document.getElementById('sc-tax-rate');
  var taxRate=parseFloat((taxEl&&taxEl.value)||13)||0;
  
  var containerHtml='';
  for(var pi=0;pi<pkeys.length;pi++){
    var grp=prodGroups[pkeys[pi]];
    var items=grp.items;
    // Sort by purchase price ascending
    items.sort(function(a,b){return parseFloat(a.purchase_price||0)-parseFloat(b.purchase_price||0)});
    var minPrice=parseFloat(items[0].purchase_price)||Infinity;
    
    // Product header
    var prodTitle=escHtml(grp.name);
    if(grp.category&&grp.category!=='未分类')prodTitle+=' <span style="font-size:11px;color:var(--text-secondary);font-weight:400">['+escHtml(grp.category)+']</span>';
    prodTitle+=' <span style="font-size:11px;color:var(--text-secondary);font-weight:400">('+items.length+'家供应商)</span>';
    
    containerHtml+='<div style="background:var(--card);border-radius:12px;padding:16px"><h4 style="margin:0 0 10px;font-size:14px;border-bottom:1px solid var(--border);padding-bottom:8px">📦 '+prodTitle+'</h4><div style="overflow-x:auto"><table class="check-table" style="width:100%;min-width:800px"><thead><tr><th>供应商</th><th>渠道</th><th>采购价(¥)</th><th>销售价(¥)</th><th>税后毛利率</th><th>达人佣金</th><th>MOQ</th><th>样品</th><th>合规要求</th><th>产品参数</th><th>状态</th></tr></thead><tbody>';
    
    for(var si=0;si<items.length;si++){
      var it=items[si];
      var itPp=parseFloat(it.purchase_price)||0;
      var itSp=parseFloat(it.selling_price)||0;
      var itNetPrice=itSp>0?itSp/(1+taxRate/100):0;
      var itMargin=itNetPrice>0?Math.round((itNetPrice-itPp)/itNetPrice*100):0;
      var cheapest=itPp===minPrice&&minPrice>0&&items.length>1;
      var bg=cheapest?' style="background:#e8f5e9"':'';
      
      // Parse params
      var params=it.product_params;
      try{if(typeof params==='string')params=JSON.parse(params)}catch(e){params={}}
      if(!params||typeof params!=='object')params={};
      var pstr='';
      var pks=Object.keys(params);
      for(var pk=0;pk<Math.min(pks.length,3);pk++){
        var kv=String(params[pks[pk]]||'');
        // Skip internal fields
        if(pks[pk]==='MOQ'||pks[pk]==='有无样品'||pks[pk]==='渠道'||pks[pk]==='合规要求'||pks[pk]==='产品分类'||pks[pk]==='moq')continue;
        pstr+=escHtml(pks[pk])+':'+escHtml(kv.substring(0,20))+(pk<Math.min(pks.length,3)-1?'<br>':'');
      }
      
      var statusMap={pending:'⏳待评估',approved:'✅已通过',rejected:'❌已否决',ordered:'📦已采购'};
      var stCls={pending:'#f0ad4e',approved:'var(--success)',rejected:'var(--danger)',ordered:'var(--primary)'};
      var st=it.status||'pending';
      
      containerHtml+='<tr>'+
        '<td'+bg+'><b>'+escHtml(it.supplier_name||'-')+'</b></td>'+
        '<td'+bg+'>'+escHtml(it.channel||'-')+'</td>'+
        '<td'+(cheapest?' style="background:#e8f5e9;font-weight:700;color:var(--success)"':'')+'>'+(itPp>0?'¥'+fmtNum(itPp):'-')+'</td>'+
        '<td'+bg+'>'+(itSp>0?'¥'+fmtNum(itSp):'-')+'</td>'+
        '<td style="font-weight:600;color:'+(itMargin>=0?'var(--success)':'var(--danger)')+''+bg+'">'+(itSp>0?itMargin+'%':'N/A')+'</td>'+
        '<td'+bg+'>'+(parseFloat(it.influencer_commission)||0)+'%</td>'+
        '<td'+bg+'>'+(it.moq||'-')+'</td>'+
        '<td'+bg+'>'+(it.has_sample?'✅':'❌')+'</td>'+
        '<td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'+bg+'" title="'+escHtml(it.compliance_requirements||'')+'">'+escHtml((it.compliance_requirements||'-').substring(0,30))+'</td>'+
        '<td style="font-size:11px'+bg+'">'+(pstr||'-')+'</td>'+
        '<td'+bg+'><span style="font-size:11px;padding:2px 6px;border-radius:4px;background:'+(stCls[st]||'#999')+';color:#fff;white-space:nowrap">'+statusMap[st]+'</span></td>'+
        '</tr>';
    }
    containerHtml+='</tbody></table></div></div>';
  }
  cmpContainer.innerHTML=containerHtml;
}

function openScoutingForm(){
  scoutingEditId=null;scTempParams=[];
  document.getElementById('scouting-modal-title').textContent='\u6dfb\u52a0\u9009\u54c1';
  document.getElementById('sc-channel').value='';
  document.getElementById('sc-product-name').value='';
  document.getElementById('sc-product-category').value='';
  document.getElementById('sc-supplier').value='';
  document.getElementById('sc-status').value='pending';
  document.getElementById('sc-purchase-price').value='';
  document.getElementById('sc-selling-price').value='';
  document.getElementById('sc-commission').value='';
  document.getElementById('sc-moq').value='';
  document.getElementById('sc-has-sample').checked=false;
  document.getElementById('sc-compliance').value='';
  document.getElementById('sc-notes').value='';
  document.getElementById('sc-btn-delete').classList.add('hidden');
  renderScParams();
  // Update supplier autocomplete with existing scouting suppliers
  updateScoutingDatalists();
  buildScCatDropdowns();
  buildScCatFilterDropdown();
  document.getElementById('scouting-modal').classList.remove('hidden');
}

function editScouting(id){
  var s=allScouting.find(function(x){return x.id===id});if(!s)return;
  scoutingEditId=id;
  document.getElementById('scouting-modal-title').textContent='\u7f16\u8f91\u9009\u54c1';
  document.getElementById('sc-channel').value=s.channel||'';
  document.getElementById('sc-product-name').value=s.product_name||'';
  document.getElementById('sc-product-category').value=s.product_category||'';
  document.getElementById('sc-supplier').value=s.supplier_name||'';
  document.getElementById('sc-supplier').dataset.supplierId=s.supplier_id||'';
  document.getElementById('sc-status').value=s.status||'pending';
  document.getElementById('sc-purchase-price').value=s.purchase_price||'';
  document.getElementById('sc-selling-price').value=s.selling_price||'';
  document.getElementById('sc-commission').value=s.influencer_commission||'';
  document.getElementById('sc-moq').value=s.moq||'';
  document.getElementById('sc-has-sample').checked=!!s.has_sample;
  document.getElementById('sc-compliance').value=s.compliance_requirements||'';
  document.getElementById('sc-notes').value=s.notes||'';
  document.getElementById('sc-btn-delete').classList.remove('hidden');
  var params=s.product_params;
  try{if(typeof params==='string')params=JSON.parse(params)}catch(e){params={}}
  scTempParams=[];
  if(params&&typeof params==='object'){var ks=Object.keys(params);for(var k=0;k<ks.length;k++)scTempParams.push({key:ks[k],val:params[ks[k]]});}
  renderScParams();
  updateScoutingDatalists();
  buildScCatDropdowns();
  buildScCatFilterDropdown();
  document.getElementById('sc-product-category').value=s.product_category||'';
  document.getElementById('scouting-modal').classList.remove('hidden');
}

function closeScoutingForm(){
  document.getElementById('scouting-modal').classList.add('hidden');
}

async function saveScouting(){
  var name=document.getElementById('sc-product-name').value.trim();
  if(!name){showToast('\u8bf7\u8f93\u5165\u4ea7\u54c1\u540d\u79f0');return}
  var params={};
  for(var i=0;i<scTempParams.length;i++)if(scTempParams[i].key)params[scTempParams[i].key]=scTempParams[i].val||'';
  var obj={
    company_id:currentCompanyId,
    channel:document.getElementById('sc-channel').value.trim()||null,
    product_name:name,
    product_category:document.getElementById('sc-product-category').value.trim()||null,
    supplier_name:document.getElementById('sc-supplier').value.trim()||null,
    supplier_id:function(){var sn=document.getElementById('sc-supplier').value.trim().toLowerCase();for(var i=0;i<allSuppliers.length;i++){if((allSuppliers[i].name||'').toLowerCase()===sn)return allSuppliers[i].id}return null}(),
    purchase_price:parseFloat(document.getElementById('sc-purchase-price').value)||0,
    selling_price:parseFloat(document.getElementById('sc-selling-price').value)||0,
    influencer_commission:parseFloat(document.getElementById('sc-commission').value)||0,
    moq:parseInt(document.getElementById('sc-moq').value)||null,
    has_sample:document.getElementById('sc-has-sample').checked,
    compliance_requirements:document.getElementById('sc-compliance').value.trim()||null,
    product_params:JSON.stringify(params),
    notes:document.getElementById('sc-notes').value.trim()||null,
    status:document.getElementById('sc-status').value||'pending',
    updated_at:new Date().toISOString()
  };
  var r;
  if(scoutingEditId){r=await sb.from('product_scouting').update(obj).eq('id',scoutingEditId)}
  else {r=await sb.from('product_scouting').insert([obj])}
  if(r.error){showToast('\u4fdd\u5b58\u5931\u8d25:'+r.error.message);return}
  showToast(scoutingEditId?'\u5df2\u66f4\u65b0':'\u5df2\u6dfb\u52a0');
  closeScoutingForm();
  await loadScouting();
}

function toggleAllCompare(){
  var cbs=document.querySelectorAll('.sc-compare-cb');
  if(!cbs.length)return;
  var allChecked=cbs.length===document.querySelectorAll('.sc-compare-cb:checked').length;
  var newState=!allChecked;
  for(var i=0;i<cbs.length;i++)cbs[i].checked=newState;
  refreshScoutingCompare();
}

async function deleteScouting(id){
  if(!await uiConfirm('\u786e\u5b9a\u5220\u9664\u6b64\u9009\u54c1\u9879\uff1f'))return;
  var _delErr=(await sb.from('product_scouting').delete().eq('id',id)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
  showToast('\u5df2\u5220\u9664');
  closeScoutingForm();
  await loadScouting();
}


