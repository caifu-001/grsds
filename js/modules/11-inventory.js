// ==========================================================================
// grsds · 11-inventory.js  —  库存调拨 / 台账 / 采购管理 / 供应商结算
// 源: js/app_v2.js 第 7297-7764 行（机械切片，未改一行代码）
// ==========================================================================
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
  var _delErr=(await sb.from('stock_transfer_items').delete().eq('transfer_id',tfId)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
  var items=[];
  for(var i=0;i<transferItems.length;i++){
    if(!transferItems[i].product_id||transferItems[i].quantity<=0)continue;
    items.push({transfer_id:tfId,product_id:transferItems[i].product_id,quantity:transferItems[i].quantity,remark:transferItems[i].remark||''});
  }
  if(items.length>0){var ri=await sb.from('stock_transfer_items').insert(items);if(ri.error){showToast('明细保存失败: '+ri.error.message);return}}
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
  var doneIds=[];
  for(var j=0;j<transferItems.length;j++){
    var ti2=transferItems[j];
    if(!ti2.product_id||ti2.quantity<=0)continue;
    var r1=await sb.from('stock_records').insert({company_id:currentCompanyId,product_id:ti2.product_id,warehouse_id:tf.from_warehouse_id,type:'out',quantity:ti2.quantity,remark:'调拨出库 #'+transferEditId,recorded_by:currentUser.id}).select('id').single();
    if(r1.error){await rollbackStockRecords(doneIds);showToast('调拨失败（已回滚，库存未变动）: '+r1.error.message);return}
    if(r1.data&&r1.data.id)doneIds.push(r1.data.id);
    var r2=await sb.from('stock_records').insert({company_id:currentCompanyId,product_id:ti2.product_id,warehouse_id:tf.to_warehouse_id,type:'in',quantity:ti2.quantity,remark:'调拨入库 #'+transferEditId,recorded_by:currentUser.id}).select('id').single();
    if(r2.error){await rollbackStockRecords(doneIds);showToast('调拨失败（已回滚，库存未变动）: '+r2.error.message);return}
    if(r2.data&&r2.data.id)doneIds.push(r2.data.id);
  }
  var r3=await sb.from('stock_transfers').update({status:'completed'}).eq('id',transferEditId);
  if(r3.error){await rollbackStockRecords(doneIds);showToast('调拨失败（已回滚，库存未变动）: '+r3.error.message);return}
  showToast('调拨完成');
  closeTransferForm();
  await loadStockTransfers();
  await loadProducts();
}
// 调拨中途失败时回滚已写入的出入库记录，避免库存账实不符
async function rollbackStockRecords(ids){
  for(var i=0;i<ids.length;i++){
    try{await sb.from('stock_records').delete().eq('id',ids[i]);}catch(e){console.error('调拨回滚失败 record id='+ids[i],e);}
  }
  if(ids.length)console.warn('[调拨] 已回滚 '+ids.length+' 条库存记录');
}
async function deleteTransfer(){await deleteTransferById(transferEditId);closeTransferForm()}
async function deleteTransferById(id){
  if(!await uiConfirm('确定删除此调拨单？'))return;
  var r1=await sb.from('stock_transfer_items').delete().eq('transfer_id',id);
  if(r1.error){showToast('删除失败: '+r1.error.message);return}
  var r2=await sb.from('stock_transfers').delete().eq('id',id);
  if(r2.error){showToast('删除失败: '+r2.error.message);return}
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
  var _delErr=(await sb.from('purchase_order_items').delete().eq('po_id',poId)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
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
    var ri1=await sb.from('stock_records').insert({company_id:currentCompanyId,product_id:it.product_id,warehouse_id:it.warehouse_id,type:'in',quantity:toReceive,unit_price:it.unit_price,remark:'采购入库 #'+poEditId,recorded_by:currentUser.id});
    if(ri1.error){showToast('入库失败: '+ri1.error.message);return}
    var ri2=await sb.from('purchase_order_items').update({received_qty:it.quantity}).eq('id',it.id);
    if(ri2.error){showToast('入库明细更新失败: '+ri2.error.message);return}
  }
  var ro=await sb.from('purchase_orders').update({status:'received',received_date:new Date().toISOString().split('T')[0]}).eq('id',poEditId);
  if(ro.error){showToast('订单状态更新失败: '+ro.error.message);return}
  showToast('入库完成');
  closePOForm();
  await loadPurchaseOrders();
  await loadProducts();
}
async function deletePurchaseOrder(){await deletePOById(poEditId);closePOForm()}
async function deletePOById(id){
  if(!await uiConfirm('确定删除此采购单？'))return;
  var _delErr=(await sb.from('purchase_order_items').delete().eq('po_id',id)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
  var _delErr2=(await sb.from('purchase_orders').delete().eq('id',id)).error;if(_delErr2){showToast('删除失败: '+_delErr2.message);return}
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
  if(!await uiConfirm('确定删除此结算记录？'))return;
  var _delErr=(await sb.from('supplier_settlements').delete().eq('id',settlementEditId)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
  showToast('已删除');
  closeSettlementForm();
}



