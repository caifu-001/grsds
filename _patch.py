#!/usr/bin/env python3
"""Patch index.html: 进销存/采购管理 模块"""
import re

with open('D:/1kaifa/grsds/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

patches = []

# === PATCH 1: 采购管理 res-tab ===
old1 = '<button class="biz-subtab" onclick="switchResTab(\'suppliers\')">🏭 供应商库</button>\n  </div>'
new1 = '<button class="biz-subtab" onclick="switchResTab(\'suppliers\')">🏭 供应商库</button>\n   <button class="biz-subtab" onclick="switchResTab(\'purchase\')">📋 采购管理</button>\n  </div>'
cnt1 = content.count(old1)
print(f"Patch 1 (res-tab purchase): found {cnt1} occurrences")
if cnt1 == 1:
    content = content.replace(old1, new1)
    patches.append(1)

# === PATCH 2: 调拨 + 台账 sub-tabs ===
old2 = '<button class="inv-subtab" onclick="switchInventoryTab(\'warehouses\')">仓库</button>\n  </div>\n\n  <!-- Products Panel -->'
new2 = '<button class="inv-subtab" onclick="switchInventoryTab(\'warehouses\')">仓库</button>\n   <button class="inv-subtab" onclick="switchInventoryTab(\'transfers\')">调拨</button>\n   <button class="inv-subtab" onclick="switchInventoryTab(\'ledger\')">台账</button>\n  </div>\n\n  <!-- Products Panel -->'
cnt2 = content.count(old2)
print(f"Patch 2 (transfer+ledger sub-tabs): found {cnt2} occurrences")
if cnt2 == 1:
    content = content.replace(old2, new2)
    patches.append(2)

# === PATCH 3: Transfers Panel + Ledger Panel (before Client 360 Modal) ===
old3 = ' </div>\n\n<!-- ====== Client 360 Modal ====== -->'
transfers_panel = ''' </div>

  <!-- Transfers Panel -->
  <div class="inv-panel" id="inv-transfers">
   <div class="inv-toolbar">
    <select id="inv-transfer-from" onchange="loadStockTransfers()"><option value="">调出仓库</option></select>
    <select id="inv-transfer-to" onchange="loadStockTransfers()"><option value="">调入仓库</option></select>
    <select id="inv-transfer-status" onchange="loadStockTransfers()"><option value="">全部状态</option><option value="draft">草稿</option><option value="confirmed">已确认</option><option value="completed">已完成</option></select>
    <button class="btn-sm btn-sm-primary" onclick="openTransferForm()">＋ 调拨</button>
   </div>
   <div id="transfer-list"></div>
  </div>

  <!-- Ledger Panel -->
  <div class="inv-panel" id="inv-ledger">
   <div class="inv-toolbar">
    <select id="inv-ledger-product" onchange="loadStockLedger()"><option value="">全部产品</option></select>
    <select id="inv-ledger-warehouse" onchange="loadStockLedger()"><option value="">全部仓库</option></select>
    <input id="inv-ledger-search" placeholder="搜索批次/备注..." oninput="loadStockLedger()">
    <button class="btn-sm" style="background:var(--surface);border:1px solid var(--border);color:var(--text)" onclick="exportLedgerCSV()">📥 导出</button>
   </div>
   <div id="ledger-summary" style="padding:8px 16px;font-size:13px;color:var(--text2)"></div>
   <div style="overflow-x:auto" id="ledger-table"></div>
  </div>

 </div>

<!-- Purchase View -->
 <div id="purchase-view" class="hidden">
  <div class="inv-toolbar">
   <select id="po-supplier-filter" onchange="loadPurchaseOrders()"><option value="">全部供应商</option></select>
   <select id="po-status-filter" onchange="loadPurchaseOrders()"><option value="">全部状态</option><option value="draft">草稿</option><option value="ordered">已下单</option><option value="partial">部分入库</option><option value="received">已入库</option><option value="cancelled">已取消</option></select>
   <input id="po-search" placeholder="搜索采购单号/备注..." oninput="loadPurchaseOrders()">
   <button class="btn-sm btn-sm-primary" onclick="openPurchaseOrderForm()">＋ 采购单</button>
  </div>
  <div id="po-stats" class="sup-stats"></div>
  <div id="po-list"></div>
 </div>

<!-- ====== Client 360 Modal ====== -->'''
cnt3 = content.count(old3)
print(f"Patch 3 (transfer+ledger+purchase panels): found {cnt3} occurrences")
if cnt3 == 1:
    content = content.replace(old3, transfers_panel)
    patches.append(3)
else:
    print("ERROR: old3 not unique!")

# === PATCH 4: Transfer Form Modal (before Lead Modal) ===
old4 = '</script>\n<!-- Lead Modal -->'
transfer_form = '''</script>

<!-- Transfer Form Modal -->
<div class="modal-overlay hidden" id="transfer-modal">
 <div class="modal-sheet">
  <h3 id="transfer-form-title">新增调拨</h3>
  <div class="form-row">
   <div class="form-group"><label>调出仓库 *</label><select id="tfm-from"></select></div>
   <div class="form-group"><label>调入仓库 *</label><select id="tfm-to"></select></div>
  </div>
  <div class="form-group"><label>调拨日期</label><input id="tfm-date" type="date"></div>
  <div class="form-group"><label>备注</label><textarea id="tfm-notes" rows="2" placeholder="备注..."></textarea></div>
  <div class="section-title">📦 调拨明细 <button class="add-btn" onclick="addTransferItem()">＋ 添加</button></div>
  <div id="tfm-items"></div>
  <div class="modal-actions">
   <button class="btn-cancel" onclick="closeTransferForm()">取消</button>
   <button class="btn-delete hidden" id="transfer-btn-delete" onclick="deleteTransfer()">删除</button>
   <button class="btn-save" onclick="saveTransfer()">保存</button>
   <button class="btn-convert" id="transfer-btn-confirm" style="background:var(--success);color:#fff" onclick="confirmTransfer()">确认调拨</button>
  </div>
 </div>
</div>

<!-- Purchase Order Form Modal -->
<div class="modal-overlay hidden" id="po-modal">
 <div class="modal-sheet" style="max-width:720px">
  <h3 id="po-form-title">新建采购单</h3>
  <div class="form-row">
   <div class="form-group"><label>供应商 *</label><select id="pof-supplier"><option value="">选择供应商</option></select></div>
   <div class="form-group"><label>采购单号 *</label><input id="pof-number" placeholder="自动生成或手动输入"></div>
  </div>
  <div class="form-row">
   <div class="form-group"><label>下单日期</label><input id="pof-order-date" type="date"></div>
   <div class="form-group"><label>预计到货</label><input id="pof-expected-date" type="date"></div>
  </div>
  <div class="form-row">
   <div class="form-group"><label>状态</label><select id="pof-status"><option value="draft">草稿</option><option value="ordered">已下单</option><option value="partial">部分入库</option><option value="received">已入库</option><option value="cancelled">已取消</option></select></div>
   <div class="form-group"><label>入库仓库</label><select id="pof-warehouse"><option value="">选择仓库</option></select></div>
  </div>
  <div class="section-title">📋 采购明细 <button class="add-btn" onclick="addPOItem()">＋ 添加行</button></div>
  <div id="pof-items" class="quote-items"></div>
  <div style="text-align:right;font-size:14px;font-weight:600;color:var(--primary);margin:8px 0">合计：<span id="pof-total">¥0.00</span></div>
  <div class="form-group"><label>备注</label><textarea id="pof-notes" rows="2" placeholder="备注..."></textarea></div>
  <div class="modal-actions">
   <button class="btn-cancel" onclick="closePOForm()">取消</button>
   <button class="btn-delete hidden" id="po-btn-delete" onclick="deletePurchaseOrder()">删除</button>
   <button class="btn-convert" id="po-btn-receive" style="background:var(--success);color:#fff" onclick="receivePO()">确认入库</button>
   <button class="btn-save" onclick="savePurchaseOrder()">保存</button>
  </div>
 </div>
</div>

<!-- Supplier Settlement Modal -->
<div class="modal-overlay hidden" id="settlement-modal">
 <div class="modal-sheet">
  <h3 id="settlement-form-title">供应商结算</h3>
  <div class="form-row">
   <div class="form-group"><label>供应商 *</label><select id="sf-supplier"><option value="">选择供应商</option></select></div>
   <div class="form-group"><label>关联采购单</label><select id="sf-po"><option value="">选择采购单</option></select></div>
  </div>
  <div class="form-row">
   <div class="form-group"><label>结算金额 *</label><input id="sf-amount" type="number" step="0.01" placeholder="0.00"></div>
   <div class="form-group"><label>结算日期</label><input id="sf-date" type="date"></div>
  </div>
  <div class="form-row">
   <div class="form-group"><label>结算方式</label><select id="sf-method"><option value="bank">银行转账</option><option value="cash">现金</option><option value="wechat">微信</option><option value="alipay">支付宝</option><option value="check">支票</option></select></div>
   <div class="form-group"><label>状态</label><select id="sf-status"><option value="pending">待结算</option><option value="paid">已结算</option><option value="cancelled">已取消</option></select></div>
  </div>
  <div class="form-group"><label>备注</label><textarea id="sf-notes" rows="2" placeholder="备注..."></textarea></div>
  <div class="modal-actions">
   <button class="btn-cancel" onclick="closeSettlementForm()">取消</button>
   <button class="btn-delete hidden" id="settlement-btn-delete" onclick="deleteSettlement()">删除</button>
   <button class="btn-save" onclick="saveSettlement()">保存</button>
  </div>
 </div>
</div>

<!-- Lead Modal -->'''
cnt4 = content.count(old4)
print(f"Patch 4 (transfer+PO+settlement modals): found {cnt4} occurrences")
if cnt4 == 1:
    content = content.replace(old4, transfer_form)
    patches.append(4)
else:
    print("ERROR: old4 not unique!")

# === PATCH 5: switchResTab add purchase handler ===
old5 = '''  }else if(sub==='suppliers'){
    tabs[1].classList.add('active');
    spv.classList.remove('hidden');
    loadSuppliers();
  }
}'''
new5 = '''  }else if(sub==='suppliers'){
    tabs[1].classList.add('active');
    spv.classList.remove('hidden');
    loadSuppliers();
  }else if(sub==='purchase'){
    tabs[2].classList.add('active');
    document.getElementById('purchase-view').classList.remove('hidden');
    loadPurchaseOrders();
  }
}'''
cnt5 = content.count(old5)
print(f"Patch 5 (switchResTab purchase): found {cnt5} occurrences")
if cnt5 == 1:
    content = content.replace(old5, new5)
    patches.append(5)
else:
    print("ERROR: old5 not unique!")

# === PATCH 6: switchInventoryTab add transfers + ledger ===
old6 = '''  if(t==='products')loadProducts();
  else if(t==='records')loadStockRecords();
  else if(t==='alerts')loadStockAlerts();
  else if(t==='checks')loadStockChecks();
  else if(t==='warehouses')loadWarehousesPanel();
}'''
new6 = '''  if(t==='products')loadProducts();
  else if(t==='records')loadStockRecords();
  else if(t==='alerts')loadStockAlerts();
  else if(t==='checks')loadStockChecks();
  else if(t==='warehouses')loadWarehousesPanel();
  else if(t==='transfers')loadStockTransfers();
  else if(t==='ledger')loadStockLedger();
}'''
cnt6 = content.count(old6)
print(f"Patch 6 (switchInventoryTab transfers+ledger): found {cnt6} occurrences")
if cnt6 == 1:
    content = content.replace(old6, new6)
    patches.append(6)
else:
    print("ERROR: old6 not unique!")

# === PATCH 7: Add JS functions for transfers, ledger, purchase orders ===
# Insert before the ending </script> tag (the one before Lead Modal)
# Find the right insertion point - after deleteCheckById function
old7 = '''async function deleteCheckById(id){
  if(!confirm('确定删除此盘点？'))return;
  await sb.from('stock_checks').delete().eq('id',id);
  showToast('已删除');
  await loadStockChecks();
}

</script>'''

js_functions = '''async function deleteCheckById(id){
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
  var pid=(document.getElementById('inv-ledger-product')||{}).value||'';
  var wid=(document.getElementById('inv-ledger-warehouse')||{}).value||'';
  var search=((document.getElementById('inv-ledger-search')||{}).value||'').toLowerCase();
  var q=sb.from('stock_records').select('*').eq('company_id',currentCompanyId).order('product_id',{ascending:false}).order('created_at',{ascending:true});
  if(pid)q=q.eq('product_id',pid);
  if(wid)q=q.eq('warehouse_id',wid);
  var r=await q.limit(500);
  if(r.error){console.error(r.error);return}
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
  var csv='\\uFEFF'+rows.join('\\n');
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

</script>
'''

cnt7 = content.count(old7)
print(f"Patch 7 (JS functions): found {cnt7} occurrences")
if cnt7 == 1:
    content = content.replace(old7, js_functions)
    patches.append(7)
else:
    print(f"ERROR: old7 not unique! Found {cnt7}")

# === PATCH 8: Add purchase-view to switchTab === 
old8 = '''  var spv=document.getElementById('suppliers-view');
  var pv=document.getElementById('performance-view');
  var tc=document.getElementById('tab-clients');'''
new8 = '''  var spv=document.getElementById('suppliers-view');
  var pv=document.getElementById('performance-view');
  var purchv=document.getElementById('purchase-view');
  var tc=document.getElementById('tab-clients');'''
cnt8 = content.count(old8)
print(f"Patch 8 (purchase-view var): found {cnt8} occurrences")
if cnt8 == 1:
    content = content.replace(old8, new8)
    patches.append(8)

# === PATCH 9: Add purchase-view to allViews array ===
old9 = '''var allViews=[hv_d,cv,ov,rv_r,av,sv,iv];if(spv)allViews.push(spv);if(pv)allViews.push(pv);if(lv)allViews.push(lv);'''
new9 = '''var allViews=[hv_d,cv,ov,rv_r,av,sv,iv];if(spv)allViews.push(spv);if(pv)allViews.push(pv);if(lv)allViews.push(lv);if(purchv)allViews.push(purchv);'''
cnt9 = content.count(old9)
print(f"Patch 9 (allViews push purchv): found {cnt9} occurrences")
if cnt9 == 1:
    content = content.replace(old9, new9)
    patches.append(9)

# === PATCH 10: switchTab inventory also hide purchase-view ===
old10 = '''if(spv)spv.classList.add('hidden');'''
# This appears multiple times - need unique context
old10 = '''var hv_d=document.getElementById('home-view');var rv_r=document.getElementById('reports-view');
  var lv=document.getElementById('leads-view');
  var allViews=[hv_d,cv,ov,rv_r,av,sv,iv];if(spv)allViews.push(spv);if(pv)allViews.push(pv);if(lv)allViews.push(lv);if(purchv)allViews.push(purchv);'''
# Skip this - the allViews change already handles it

# === PATCH 11: Add supplier settlement button to supplier view ===
# Find the supplier toolbar and add settlement button
old11 = '''<button class="btn-sm btn-sm-primary" onclick="openSupplierForm()">＋ 供应商</button>\n  </div>\n  <div class="sup-stats" id="sup-stats"></div>'''
new11 = '''<button class="btn-sm btn-sm-primary" onclick="openSupplierForm()">＋ 供应商</button>\n   <button class="btn-sm" style="background:var(--surface);border:1px solid var(--border);color:var(--text)" onclick="openSettlementForm()">💰 结算</button>\n  </div>\n  <div class="sup-stats" id="sup-stats"></div>'''
cnt11 = content.count(old11)
print(f"Patch 11 (supplier settlement button): found {cnt11} occurrences")
if cnt11 == 1:
    content = content.replace(old11, new11)
    patches.append(11)
else:
    print(f"WARNING: old11 not unique! Found {cnt11}")

# === PATCH 12: init function - load supplier dropdowns in purchase tabs ===
# Find the loadSuppliers call in switchResTab and preload
old12 = '''if(!allSuppliers||!allSuppliers.length){
      var supR=await sb.from('suppliers').select('id,name').eq('company_id',currentCompanyId);
      if(!supR.error)allSuppliers=supR.data||[];
    }'''
# This might not exist - let's find if allSuppliers is loaded somewhere
# Actually it's loaded in loadSuppliers(). We'll handle this in loadPurchaseOrders.

# Save
with open('D:/1kaifa/grsds/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nPatches applied: {patches}")
print(f"Total: {len(patches)} patches")
print("DONE")
