#!/usr/bin/env python3
"""Append scouting JS logic before INVENTORY section."""
with open(r"D:\1kaifa\grsds\index.html", "r", encoding="utf-8") as f:
    c = f.read()

scouting_js = r"""
// ═══════════ SCOUTING (选品调研) ═══════════
var allScouting=[],scoutingEditId=null;

(function(){
  var modals=document.createElement('div');
  modals.innerHTML='<div class="modal-overlay hidden" id="scouting-modal" onclick="closeScoutingForm()"><div class="modal" onclick="event.stopPropagation()"><div class="modal-box" style="max-width:640px"><div class="modal-head"><span id="scouting-modal-title">\u6dfb\u52a0\u9009\u54c1</span><span class="modal-close" onclick="closeScoutingForm()">\u00d7</span></div><div class="modal-body" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="form-group"><label>\u9009\u54c1\u6e20\u9053 *</label><select id="sc-channel"><option value="">\u8bf7\u9009\u62e9</option><option value="1688">1688</option><option value="\u4e49\u4e4c">\u4e49\u4e4c</option><option value="\u4e9a\u9a6c\u900a">\u4e9a\u9a6c\u900a</option><option value="TikTok Shop">TikTok Shop</option><option value="\u62fc\u591a\u591a">\u62fc\u591a\u591a</option><option value="\u6dd8\u5b9d">\u6dd8\u5b9d</option><option value="\u4eac\u4e1c">\u4eac\u4e1c</option><option value="\u5176\u4ed6">\u5176\u4ed6</option></select></div><div class="form-group"><label>\u4ea7\u54c1\u540d\u79f0 *</label><input id="sc-product-name" placeholder="\u4ea7\u54c1\u540d\u79f0"></div><div class="form-group"><label>\u4ea7\u54c1\u5206\u7c7b</label><input id="sc-product-category" placeholder="\u5982\uff1a\u7535\u5b50\u3001\u670d\u9970" list="sc-cat-list"><datalist id="sc-cat-list"></datalist></div><div class="form-group"><label>\u4f9b\u5e94\u5546</label><input id="sc-supplier" placeholder="\u4f9b\u5e94\u5546\u540d\u79f0"></div><div class="form-group"><label>\u91c7\u8d2d\u4ef7(\u5143)</label><input id="sc-purchase-price" type="number" step="0.01" placeholder="0"></div><div class="form-group"><label>\u9500\u552e\u4ef7(\u5143)</label><input id="sc-selling-price" type="number" step="0.01" placeholder="0"></div><div class="form-group"><label>\u8fbe\u4eba\u4f63\u91d1(%)</label><input id="sc-commission" type="number" step="0.01" min="0" max="100" placeholder="0"></div><div class="form-group"><label>MOQ</label><input id="sc-moq" type="number" min="1" placeholder="\u6700\u5c0f\u8d77\u8ba2\u91cf"></div><div class="form-group" style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="sc-has-sample" style="width:auto"><label style="margin:0">\u5df2\u62ff\u6837\u54c1</label></div><div class="form-group" style="grid-column:1/-1"><label>\u5408\u89c4\u8981\u6c42</label><textarea id="sc-compliance" rows="2" placeholder="\u8d44\u8d28\u8bc1\u4e66\u3001\u73af\u4fdd\u6807\u51c6\u3001ISO\u8ba4\u8bc1\u7b49..."></textarea></div><div class="form-group" style="grid-column:1/-1"><label>\u4ea7\u54c1\u53c2\u6570</label><div id="sc-params"></div><button class="btn-sm" style="background:var(--surface);border:1px solid var(--border);margin-top:4px" onclick="addScoutingParam()">\uff0b \u6dfb\u52a0\u53c2\u6570</button></div><div class="form-group" style="grid-column:1/-1"><label>\u5907\u6ce8</label><input id="sc-notes" placeholder="\u53ef\u9009"></div></div><div class="modal-actions"><button class="btn-cancel" onclick="closeScoutingForm()">\u53d6\u6d88</button><button class="btn-delete hidden" id="sc-btn-delete" onclick="deleteScouting(scoutingEditId)">\u5220\u9664</button><button class="btn-save" onclick="saveScouting()">\u4fdd\u5b58</button></div></div></div></div>';
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
  refreshScoutingCompare();
}

function renderScouting(){
  var tbody=document.getElementById('scouting-tbody');
  if(!tbody)return;
  if(!allScouting.length){
    tbody.innerHTML='<tr><td colspan="13" style="text-align:center;padding:24px;color:var(--text-secondary)">\u6682\u65e0\u9009\u54c1\u6570\u636e\uff0c\u70b9\u51fb\u201c\uff0b \u6dfb\u52a0\u9009\u54c1\u201d\u5f00\u59cb</td></tr>';
    return;
  }
  var h='';
  for(var i=0;i<allScouting.length;i++){
    var s=allScouting[i];
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
    h+='<tr><td>'+escHtml(s.channel||'')+'</td><td><b>'+escHtml(s.product_name||'')+'</b></td><td>'+escHtml(s.product_category||'')+'</td><td>'+escHtml(s.supplier_name||'')+'</td><td>'+fmtNum(s.purchase_price)+'</td><td>'+fmtNum(s.selling_price)+'</td><td>'+(parseFloat(s.influencer_commission)||0)+'%</td><td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+escHtml(s.compliance_requirements||'')+'">'+escHtml(s.compliance_requirements||'-')+'</td><td style="font-size:12px">'+paramsStr+'</td><td>'+(s.moq||'-')+'</td><td>'+(s.has_sample?'\u2705':'\\u274c')+'</td><td><span class="tag '+statusCls[status]+'">'+statusMap[status]+'</span></td><td><button class="btn-xs" style="color:var(--primary);cursor:pointer" onclick="editScouting('+s.id+')">\u7f16\u8f91</button> <button class="btn-xs" style="color:var(--success);cursor:pointer" onclick="approveScouting('+s.id+')">\u901a\u8fc7</button></td></tr>';
  }
  tbody.innerHTML=h;
}

function refreshScoutingCompare(){
  var head=document.getElementById('scouting-compare-head');
  var body=document.getElementById('scouting-compare-body');
  if(!head||!body)return;
  if(!allScouting.length){
    head.innerHTML='';body.innerHTML='<tr><td style="text-align:center;padding:24px;color:var(--text-secondary)">\u6682\u65e0\u9009\u54c1\u53ef\u5bf9\u6bd4</td></tr>';
    return;
  }
  // Group by product_name
  var groups={};
  for(var i=0;i<allScouting.length;i++){
    var s=allScouting[i];
    var key=(s.product_name||'').trim().toLowerCase();
    if(!key)key='__unnamed__';
    if(!groups[key])groups[key]={name:s.product_name||'\u672a\u547d\u540d',items:[]};
    groups[key].items.push(s);
  }
  var gkeys=Object.keys(groups);
  // Build header: 产品名 | 供应商1 | 供应商2 | ...
  var maxSuppliers=0;
  for(var g=0;g<gkeys.length;g++){
    if(groups[gkeys[g]].items.length>maxSuppliers)maxSuppliers=groups[gkeys[g]].items.length;
  }
  var headHtml='<tr><th>\u4ea7\u54c1</th>';
  for(var s=0;s<maxSuppliers;s++){
    if(s===0)headHtml+='<th>\u4f9b\u5e94\u5546\uff06\u6e20\u9053</th><th>\u91c7\u8d2d\u4ef7</th><th>MOQ</th><th>\u53c2\u6570</th><th>\u5408\u89c4</th><th>\u4f63\u91d1</th><th>\u6837\u54c1</th>';
    else headHtml+='<th colspan="6" style="text-align:center;background:var(--primary-light)">\u5bf9\u6bd4\u4f9b\u5e94\u5546 '+(s+1)+'</th>';
  }
  headHtml+='</tr>';
  // For the first supplier row, show product name; for others, show supplier details
  // Actually better: one row per product, with columns for each supplier
  // Redesign: rows = products, columns = suppliers (with sub-columns)
  head.innerHTML=headHtml;

  var bodyHtml='';
  for(var g=0;g<gkeys.length;g++){
    var prod=groups[gkeys[g]].items;
    // Sort by purchase_price ascending
    prod.sort(function(a,b){return parseFloat(a.purchase_price||0)-parseFloat(b.purchase_price||0)});
    bodyHtml+='<tr><td><b>'+escHtml(groups[gkeys[g]].name)+'</b></td>';
    for(var p=0;p<maxSuppliers;p++){
      if(p<prod.length){
        var it=prod[p];
        var params=it.product_params;
        try{if(typeof params==='string')params=JSON.parse(params)}catch(e){params={}}
        var pstr='';
        if(params&&typeof params==='object'){var ks=Object.keys(params);for(var k=0;k<Math.min(ks.length,2);k++)pstr+=escHtml(ks[k])+':'+escHtml(params[ks[k]])+'; ';}
        // Highlight cheapest
        var cheapest=p===0&&prod.length>1;
        bodyHtml+='<td'+(cheapest?' style="background:#e8f5e9"':'')+'><b>'+escHtml(it.supplier_name||'-')+'</b><br><span style="font-size:11px;color:var(--text-secondary)">'+escHtml(it.channel||'')+'</span></td>';
        bodyHtml+='<td'+(cheapest?' style="background:#e8f5e9;font-weight:700;color:var(--success)"':'')+'>'+fmtNum(it.purchase_price)+'</td>';
        bodyHtml+='<td'+(cheapest?' style="background:#e8f5e9"':'')+'>'+(it.moq||'-')+'</td>';
        bodyHtml+='<td style="font-size:12px'+(cheapest?';background:#e8f5e9"':'')+'">'+pstr+'</td>';
        bodyHtml+='<td style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'+(cheapest?';background:#e8f5e9"':'')+'">'+escHtml((it.compliance_requirements||'-').substring(0,30))+'</td>';
        bodyHtml+='<td'+(cheapest?' style="background:#e8f5e9"':'')+'>'+(parseFloat(it.influencer_commission)||0)+'%</td>';
        bodyHtml+='<td'+(cheapest?' style="background:#e8f5e9"':'')+'>'+(it.has_sample?'\u2705':'\\u274c')+'</td>';
      }else{
        bodyHtml+='<td colspan="6" style="color:var(--text-secondary);text-align:center">-</td>';
      }
    }
    bodyHtml+='</tr>';
  }
  body.innerHTML=bodyHtml;
}

function openScoutingForm(){
  scoutingEditId=null;scTempParams=[];
  document.getElementById('scouting-modal-title').textContent='\u6dfb\u52a0\u9009\u54c1';
  document.getElementById('sc-channel').value='';
  document.getElementById('sc-product-name').value='';
  document.getElementById('sc-product-category').value='';
  document.getElementById('sc-supplier').value='';
  document.getElementById('sc-purchase-price').value='';
  document.getElementById('sc-selling-price').value='';
  document.getElementById('sc-commission').value='';
  document.getElementById('sc-moq').value='';
  document.getElementById('sc-has-sample').checked=false;
  document.getElementById('sc-compliance').value='';
  document.getElementById('sc-notes').value='';
  document.getElementById('sc-btn-delete').classList.add('hidden');
  renderScParams();
  document.getElementById('scouting-modal').classList.remove('hidden');
  // Update categories datalist
  var cats=[];
  for(var i=0;i<allScouting.length;i++){var c2=allScouting[i].product_category;if(c2&&cats.indexOf(c2)<0)cats.push(c2);}
  document.getElementById('sc-cat-list').innerHTML=cats.map(function(x){return '<option value="'+escHtml(x)+'">'}).join('');
}

function editScouting(id){
  var s=allScouting.find(function(x){return x.id===id});if(!s)return;
  scoutingEditId=id;
  document.getElementById('scouting-modal-title').textContent='\u7f16\u8f91\u9009\u54c1';
  document.getElementById('sc-channel').value=s.channel||'';
  document.getElementById('sc-product-name').value=s.product_name||'';
  document.getElementById('sc-product-category').value=s.product_category||'';
  document.getElementById('sc-supplier').value=s.supplier_name||'';
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
  // Categories
  var cats=[];
  for(var i=0;i<allScouting.length;i++){var c2=allScouting[i].product_category;if(c2&&cats.indexOf(c2)<0)cats.push(c2);}
  document.getElementById('sc-cat-list').innerHTML=cats.map(function(x){return '<option value="'+escHtml(x)+'">'}).join('');
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
    purchase_price:parseFloat(document.getElementById('sc-purchase-price').value)||0,
    selling_price:parseFloat(document.getElementById('sc-selling-price').value)||0,
    influencer_commission:parseFloat(document.getElementById('sc-commission').value)||0,
    moq:parseInt(document.getElementById('sc-moq').value)||null,
    has_sample:document.getElementById('sc-has-sample').checked,
    compliance_requirements:document.getElementById('sc-compliance').value.trim()||null,
    product_params:JSON.stringify(params),
    notes:document.getElementById('sc-notes').value.trim()||null,
    status:'pending',
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

async function deleteScouting(id){
  if(!confirm('\u786e\u5b9a\u5220\u9664\u6b64\u9009\u54c1\u9879\uff1f'))return;
  await sb.from('product_scouting').delete().eq('id',id);
  showToast('\u5df2\u5220\u9664');
  closeScoutingForm();
  await loadScouting();
}

async function approveScouting(id){
  var s=allScouting.find(function(x){return x.id===id});if(!s)return;
  // Set status to approved
  await sb.from('product_scouting').update({status:'approved',updated_at:new Date().toISOString()}).eq('id',id);
  showToast('\u9009\u54c1\u5df2\u901a\u8fc7\uff0c\u53ef\u8f6c\u5165\u4ea7\u54c1\u5e93');
  await loadScouting();
  // Offer to add to products
  if(confirm('\u662f\u5426\u5c06\u201c'+s.product_name+'\u201d\u6dfb\u52a0\u5230\u4ea7\u54c1\u5e93\uff1f')){
    openProductForm();
    document.getElementById('pfm-name').value=s.product_name||'';
    document.getElementById('pfm-cost').value=s.purchase_price||'';
    document.getElementById('pfm-price').value=s.selling_price||'';
    document.getElementById('pfm-desc').value='\u4f9b\u5e94\u5546:'+(s.supplier_name||'')+' | MOQ:'+(s.moq||'-')+' | \u6e20\u9053:'+(s.channel||'');
    document.getElementById('pfm-commission-rate').value=s.influencer_commission||'';
  }
}
"""

# Insert before INVENTORY marker
marker = "\n\n// ═══════════ INVENTORY ═══════════"
if marker in c:
    c = c.replace(marker, scouting_js + marker)
    print("scouting JS inserted before INVENTORY section")
else:
    print("FAILED: INVENTORY marker not found")

with open(r"D:\1kaifa\grsds\index.html", "w", encoding="utf-8") as f:
    f.write(c)

print("all done")
