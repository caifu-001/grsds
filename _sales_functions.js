
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
    if(cn)h+='<div class="pc-company">\ud83c\udfe2 '+cn+'</div>';
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
  document.getElementById('qf-total').textContent=String.fromCharCode(165)+'0.00';
  document.getElementById('qf-discount-amount').textContent='-'+String.fromCharCode(165)+'0.00';
  document.getElementById('qf-tax-amount').textContent=String.fromCharCode(165)+'0.00';
  document.getElementById('qf-grand-total').textContent=String.fromCharCode(165)+'0.00';
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
  document.getElementById('qf-total').textContent=String.fromCharCode(165)+gt.toFixed(2);
  document.getElementById('qf-discount-amount').textContent='-'+String.fromCharCode(165)+da.toFixed(2);
  document.getElementById('qf-tax-amount').textContent=String.fromCharCode(165)+ta.toFixed(2);
  document.getElementById('qf-grand-total').textContent=String.fromCharCode(165)+gt.toFixed(2);
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
    h+='<div class="quote-item-row"><input class="qi-name" placeholder="名称" value="'+escHtml(it.name||'')+'" oninput="qfUpdateItem('+i+','+"'name'"+',this.value)"><input class="qi-num" type="number" placeholder="数量" value="'+(it.qty||1)+'" oninput="qfUpdateItem('+i+','+"'qty'"+',parseFloat(this.value)||0)"><input class="qi-price" type="number" step="0.01" placeholder="单价" value="'+(it.price||0)+'" oninput="qfUpdateItem('+i+','+"'price'"+',parseFloat(this.value)||0)"><span class="qi-amount">'+formatMoney(amt)+'</span><button class="qi-del" onclick="qfDeleteItem('+i+')">×</button></div>';
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
    // Handle file upload
  var fileUrl='',fileName='';
  var fileEl=document.getElementById('cf-file');
  if(fileEl&&fileEl.files&&fileEl.files.length>0){
    var fl=fileEl.files[0];
    var ext=fl.name.split('.').pop();
    var fpath='contract_files/'+currentCompanyId+'/'+Date.now()+'.'+ext;
    var fresp=await fetch(SUPABASE_URL+'/storage/v1/object/'+fpath,{method:'POST',headers:{'Authorization':'Bearer '+SUPABASE_SERVICE_KEY},body:fl});
    if(fresp.ok){fileUrl=SUPABASE_URL+'/storage/v1/object/public/'+fpath;fileName=fl.name}else{showToast('文件上传失败');return}
  }else{
    if(ceditId){var ec=allContracts.find(function(x){return x.id===ceditId});if(ec&&ec.file_url){fileUrl=ec.file_url;fileName=ec.file_name||''}}
  }
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
    var archiveIcon=ct.archive_status==='archived'?' \ud83d\udce6':'';
    h+='<div class="pipe-card" onclick="openContractForm(\''+ct.id+'\')"><div class="pc-header"><span class="pc-name">'+escHtml(ct.title)+archiveIcon+'</span><span class="pc-amount">'+formatMoney(ct.total_amount||ct.amount||0)+'</span></div>';
    if(ct.file_url&&ct.file_url.indexOf('object/public')>0){var fn=ct.file_name||'下载文件';h+='<div class="pc-file" style="font-size:11px;margin-top:2px"><a href="'+ct.file_url+'" target="_blank" rel="noopener" style="color:var(--primary);text-decoration:none">\ud83d\udcce '+escHtml(fn)+'</a></div>'}
    if(cn)h+='<div class="pc-company">\ud83c\udfe2 '+escHtml(cn)+'</div>';
    h+='<div class="pc-meta">'+(ct.contract_no?'<span>\ud83d\udccb '+escHtml(ct.contract_no)+'</span>':'')+'<span class="status-badge '+sc+'">'+({draft:'草稿',signed:'已签署',executing:'执行中',completed:'已完成',terminated:'已终止'}[ct.status]||ct.status)+'</span>'+expiryHtml+'</div>';
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
    document.getElementById('cf-notes').value=(ct.notes||'').replace(/^\\u5f3f\\u0046\\u0049\\u004c\\u0045__:.*?\\n*/,'');if(ct.file_url){document.getElementById('cf-file-info').classList.remove('hidden');document.getElementById('cf-file-name').textContent=ct.file_name||'已上传';document.getElementById('cf-file-link').href=ct.file_url};
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
