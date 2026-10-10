// ==========================================================================
// grsds · 10-charts.js  —  图表工具 · 目录级联 · 供应商自动完成
// 源: js/app_v2.js 第 6345-7296 行（机械切片，未改一行代码）
// ==========================================================================
// === Canvas Chart Helpers ===
function initScCat(){
  try{scoutingCategories=JSON.parse(localStorage.getItem('custom_scouting_cats')||'[]')}catch(e){scoutingCategories=[]}
}
function saveScCat(){localStorage.setItem('custom_scouting_cats',JSON.stringify(scoutingCategories));}
function toggleScCatManage(){
  var panel=document.getElementById('sc-cat-toolbar-panel');if(!panel)return;
  panel.classList.toggle('hidden');if(!panel.classList.contains('hidden'))renderScCatToolbarTags();
}
function renderScCatToolbarTags(){
  initScCat();var el=document.getElementById('sc-cat-toolbar-tags');if(!el)return;
  if(!scoutingCategories.length){el.innerHTML='<span style="font-size:12px;color:var(--text-secondary)">暂无自定义分类</span>';return;}
  var h='';
  for(var i=0;i<scoutingCategories.length;i++)h+='<span style="display:inline-flex;align-items:center;gap:4px;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:2px 8px;font-size:12px">'+escHtml(scoutingCategories[i])+' <span style="cursor:pointer;color:var(--danger);font-weight:700" onclick="removeScCat('+i+');renderScCatToolbarTags();buildScCatDropdowns();buildScCatFilterDropdown()">×</span></span>';
  el.innerHTML=h;
}
function addScCatToolbar(){
  var input=document.getElementById('sc-cat-toolbar-new');if(!input)return;
  var name=input.value.trim();if(!name)return;
  initScCat();if(scoutingCategories.indexOf(name)<0)scoutingCategories.push(name);
  scoutingCategories.sort();saveScCat();input.value='';renderScCatToolbarTags();buildScCatDropdowns();buildScCatFilterDropdown();
}
function renderScCatTags(){
  initScCat();var el=document.getElementById('sc-cat-tags');if(!el)return;
  if(!scoutingCategories.length){el.innerHTML='<span style="font-size:12px;color:var(--text-secondary)">暂无自定义分类</span>';return;}
  var h='';
  for(var i=0;i<scoutingCategories.length;i++)h+='<span style="display:inline-flex;align-items:center;gap:4px;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:2px 8px;font-size:12px">'+escHtml(scoutingCategories[i])+' <span style="cursor:pointer;color:var(--danger);font-weight:700" onclick="removeScCat('+i+')">\u00d7</span></span>';
  el.innerHTML=h;
}
function addScCat(){
  var input=document.getElementById('sc-cat-new');if(!input)return;
  var name=input.value.trim();if(!name)return;
  initScCat();if(scoutingCategories.indexOf(name)<0)scoutingCategories.push(name);
  scoutingCategories.sort();saveScCat();input.value='';renderScCatTags();buildScCatDropdowns();
}
function removeScCat(idx){initScCat();scoutingCategories.splice(idx,1);saveScCat();renderScCatTags();buildScCatDropdowns();}
function buildScCatDropdowns(){
  var sel=document.getElementById('sc-product-category');if(!sel)return;
  initScCat();var existing={};
  for(var i=0;i<allScouting.length;i++){var c2=allScouting[i].product_category;if(c2)existing[c2]=1;}
  for(var j=0;j<scoutingCategories.length;j++){if(!existing[scoutingCategories[j]])existing[scoutingCategories[j]]=1;}
  var sorted=Object.keys(existing).sort();
  var prev=sel.value;sel.innerHTML='<option value="">选择分类</option>';
  for(var k=0;k<sorted.length;k++)sel.innerHTML+='<option value="'+escHtml(sorted[k])+'">'+escHtml(sorted[k])+'</option>';
  sel.value=prev;
}
function buildScCatFilterDropdown(){
  var sel=document.getElementById('sc-filter-category');if(!sel)return;
  initScCat();var existing={};
  for(var i=0;i<allScouting.length;i++){var c2=allScouting[i].product_category;if(c2)existing[c2]=1;}
  var sorted=Object.keys(existing).sort();
  var prev=sel.value;sel.innerHTML='<option value="">全部分类</option>';
  for(var k=0;k<sorted.length;k++)sel.innerHTML+='<option value="'+escHtml(sorted[k])+'">'+escHtml(sorted[k])+'</option>';
  sel.value=prev;
}

function drawBarChart(canvasId,data,cfg){
  var cvs=document.getElementById(canvasId);if(!cvs)return;
  var ctx=cvs.getContext('2d');var dpr=window.devicePixelRatio||1;
  var rect=cvs.getBoundingClientRect();var w=rect.width,h=cvs.height||240;
  cvs.width=w*dpr;cvs.height=h*dpr;cvs.style.width=w+'px';cvs.style.height=h+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  if(!data.length){ctx.fillStyle='#999';ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText('暂无数据',w/2,h/2);return;}
  var barH=Math.min(32,Math.max(18,(h-20)/data.length)),gap=4,totalH=barH*data.length,startY=Math.max(0,(h-totalH)/2);
  var maxV=cfg&&cfg.maxValue?cfg.maxValue:0;
  for(var i=0;i<data.length;i++){if(data[i].value>maxV)maxV=data[i].value;}
  if(maxV===0)maxV=1;
  var barX=cfg&&cfg.labelWidth||80,barW=w-barX-60;
  ctx.font='12px sans-serif';ctx.textAlign='right';
  for(var d=0;d<data.length;d++){
    var y=startY+d*barH,pct=Math.min(1,data[d].value/maxV),bw=barW*pct;
    ctx.fillStyle='#666';ctx.textBaseline='middle';
    var lbl=data[d].label.length>8?data[d].label.substring(0,7)+'\u2026':data[d].label;
    ctx.fillText(lbl,barX-6,y+barH/2);
    ctx.fillStyle=data[d].color||'#4a90d9';
    ctx.beginPath();ctx.roundRect(barX,y,bw,barH-gap,4);ctx.fill();
    ctx.fillStyle='#333';ctx.textAlign='left';
    var vText=cfg&&cfg.valueFormatter?cfg.valueFormatter(data[d].value):String(data[d].value);
    ctx.fillText(vText,barX+bw+6,y+barH/2);
  }
}

function drawGroupedBarChart(canvasId,data,cfg){
  var cvs=document.getElementById(canvasId);if(!cvs)return;
  var ctx=cvs.getContext('2d');var dpr=window.devicePixelRatio||1;
  var rect=cvs.getBoundingClientRect();var w=rect.width,h=cvs.height||240;
  cvs.width=w*dpr;cvs.height=h*dpr;cvs.style.width=w+'px';cvs.style.height=h+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  if(!data.length){ctx.fillStyle='#999';ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText('暂无数据',w/2,h/2);return;}
  var groups=data[0].groups?data[0].groups.length:1;
  var barH=Math.min(28,Math.max(20,(h-40)/data.length/groups)),totalH=barH*data.length*groups,startY=Math.max(10,(h-totalH)/2);
  var maxV=cfg&&cfg.maxValue?cfg.maxValue:0;
  for(var i=0;i<data.length;i++){for(var j=0;j<data[i].groups.length;j++){if(data[i].groups[j].value>maxV)maxV=data[i].groups[j].value;}}
  if(maxV===0)maxV=1;
  var gclr=cfg&&cfg.groupColors?cfg.groupColors:['#4a90d9','#e74c3c','#27ae60','#f39c12'];
  var lblW=cfg&&cfg.labelWidth||80,barArea=w-lblW-50;
  if(cfg&&cfg.groupLabels){
    ctx.font='10px sans-serif';ctx.textAlign='left';var lx=lblW,ly=startY-6;
    for(var gl=0;gl<cfg.groupLabels.length;gl++){
      ctx.fillStyle=gclr[gl]||'#666';ctx.fillRect(lx,ly-10,10,10);
      ctx.fillStyle='#666';ctx.fillText(cfg.groupLabels[gl],lx+14,ly-1);
      lx+=ctx.measureText(cfg.groupLabels[gl]).width+30;
    }
    startY+=8;
  }
  var gap=2;ctx.font='11px sans-serif';ctx.textAlign='right';
  for(var d=0;d<data.length;d++){
    var label=data[d].label,grps=data[d].groups;
    for(var g=0;g<grps.length;g++){
      var y=startY+d*barH*groups+g*barH/groups,pct=Math.min(1,grps[g].value/maxV),bw=(barArea/groups)*pct,bx=lblW+g*(barArea/groups);
      if(g===0){ctx.fillStyle='#666';ctx.textBaseline='middle';var clbl=label.length>8?label.substring(0,7)+'\u2026':label;ctx.fillText(clbl,lblW-6,y+barH/3);}
      ctx.fillStyle=gclr[g]||'#4a90d9';
      ctx.beginPath();ctx.roundRect(bx,y,bw,(barH/groups)-gap,3);ctx.fill();
      if(bw>18){ctx.fillStyle='#fff';ctx.textAlign='left';ctx.font='9px sans-serif';ctx.fillText(grps[g].value,bx+3,y+barH/(groups*2)+3);}
    }
  }
}

function drawScoutingCategoryCharts(data){
  var taxEl=document.getElementById("sc-tax-rate");
  var taxRate=parseFloat((taxEl&&taxEl.value)||13)||0;
  var byProd={};
  for(var i=0;i<data.length;i++){
    var d=data[i];var key=(d.product_name||"未命名").substring(0,12);
    if(!byProd[key])byProd[key]={count:0,prices:[],sellPrices:[],margins:[],commissions:[],moqs:[],channels:new Set()};
    byProd[key].count++;
    var pp=parseFloat(d.purchase_price)||0;
    var sp=parseFloat(d.selling_price)||0;
    if(pp>0)byProd[key].prices.push(pp);
    if(sp>0){byProd[key].sellPrices.push(sp);}
    // Post-tax margin: (selling/(1+taxRate/100) - purchase) / (selling/(1+taxRate/100)) * 100
    if(sp>0&&pp>0){
      var netPrice=sp/(1+taxRate/100);
      var margin=Math.round((netPrice-pp)/netPrice*100);
      byProd[key].margins.push(margin);
    }
    var cm=parseFloat(d.influencer_commission)||0;if(cm>0)byProd[key].commissions.push(cm);
    var mq=parseInt(d.moq)||0;if(mq>0)byProd[key].moqs.push(mq);
    if(d.channel)byProd[key].channels.add(d.channel);
  }
  var keys=Object.keys(byProd).sort();if(!keys.length)return;
  function avg(arr){return arr.length?Math.round(arr.reduce(function(a,b){return a+b},0)/arr.length):0;}

  // Price comparison chart (grouped: purchase vs selling per product)
  var priceData=[];var pmax=0;
  for(var p=0;p<keys.length;p++){var prod=byProd[keys[p]];var avp=avg(prod.prices),avs=avg(prod.sellPrices);pmax=Math.max(pmax,avp,avs);
    priceData.push({label:keys[p],groups:[{value:avp,color:"#e74c3c"},{value:avs,color:"#27ae60"}]});}
  drawGroupedBarChart("sc-price-chart",priceData,{maxValue:pmax,groupLabels:["平均采购价","平均销售价"],groupColors:["#e74c3c","#27ae60"],labelWidth:80});

  // Post-tax margin chart per product
  var marginData=[];var mxmax=0;
  for(var m0=0;m0<keys.length;m0++){var mv=avg(byProd[keys[m0]].margins);mxmax=Math.max(mxmax,Math.abs(mv));marginData.push({label:keys[m0],value:mv,color:mv>=0?"#27ae60":"#e74c3c"});}
  drawBarChart("sc-margin-chart",marginData,{maxValue:mxmax||10,valueFormatter:function(v){return v+"%"},labelWidth:80});

  // Commission chart per product
  var commData=[];var cmax=0;
  for(var c2=0;c2<keys.length;c2++){var cv=avg(byProd[keys[c2]].commissions);cmax=Math.max(cmax,cv);commData.push({label:keys[c2],value:cv,color:"#e67e22"});}
  drawBarChart("sc-commission-chart",commData,{maxValue:cmax||10,valueFormatter:function(v){return v+"%"},labelWidth:80});

  // MOQ chart per product
  var moqData=[];var mmax=0;
  for(var m=0;m<keys.length;m++){var mqv=avg(byProd[keys[m]].moqs);mmax=Math.max(mmax,mqv);moqData.push({label:keys[m],value:mqv,color:"#8e44ad"});}
  drawBarChart("sc-moq-chart",moqData,{maxValue:mmax||100,valueFormatter:function(v){return v+"件"},labelWidth:80});
}

// === Company Directory Cascade Sync ===
async function syncCompanyDirectoryRefs(){
  // When a company name/record is updated, refresh FK-linked records
  // Called after company directory save/edit
  if(!allCompaniesMap)return;
  // Rebuild allCompaniesMap
  for(var sk=0;sk<allCompanies.length;sk++){
    var cc=allCompanies[sk];var ck=(cc.name||'').toLowerCase();if(ck)allCompaniesMap[ck]=cc;
  }
  await loadSuppliers();loadClients();
}

// === Scouting Supplier Autocomplete (from company directory) ===
var scSuppSuggList=[],scSuppSuggIdx=-1;

function onScoutingSupplierInput(){
  var inp=document.getElementById('sc-supplier');
  var val=(inp.value||'').trim().toLowerCase();
  var dd=document.getElementById('sc-supplier-suggestions');
  if(!val||val.length<1){dd.classList.add('hidden');scSuppSuggList=[];scSuppSuggIdx=-1;return}
  var matches=[],seen={};
  // Search allCompanies (company directory)
  for(var i=0;i<allCompanies.length;i++){
    var co=allCompanies[i];
    var con=(co.name||'').toLowerCase();
    if(con&&con.indexOf(val)>=0&&!seen[con]){
      seen[con]=1;
      var detail='';
      if(co.legal_person)detail+=co.legal_person;
      if(co.reg_capital){if(detail)detail+=' · ';detail+='注册资本'+co.reg_capital;}
      if(co.business_scope){if(detail)detail+=' · ';var bs=co.business_scope;if(bs.length>40)bs=bs.substring(0,40)+'...';detail+=bs;}
      matches.push({name:co.name,detail:detail,comp:co});
    }
  }
  // Search existing suppliers
  for(var j=0;j<allSuppliers.length;j++){
    var s=allSuppliers[j];
    var sn=(s.name||'').toLowerCase();
    if(sn&&sn.indexOf(val)>=0&&!seen[sn]){seen[sn]=1;matches.push({name:s.name,source:'已存供应商',exists:true,id:s.id})}
  }
  matches.sort(function(a,b){
    var ae=a.name.toLowerCase()===val,be=b.name.toLowerCase()===val;
    if(ae&&!be)return -1;if(!ae&&be)return 1;
    if(a.exists&&!b.exists)return -1;if(!a.exists&&b.exists)return 1;
    return (a.name||'').length-(b.name||'').length;
  });
  matches=matches.slice(0,20);
  if(!matches.length){dd.classList.add('hidden');scSuppSuggList=[];scSuppSuggIdx=-1;return}
  scSuppSuggList=matches;scSuppSuggIdx=-1;
  var h='';
  for(var m=0;m<matches.length;m++){
    var mt=matches[m];
    h+='<div class="name-suggestion" data-idx="'+m+'" onmousedown="selectScoutingSupplier('+m+')"><div><div class="ns-name">'+escHtml(mt.name)+'</div>'+(mt.detail?'<div class="ns-detail">'+escHtml(mt.detail)+'</div>':'')+'</div>'+(mt.exists?'<span class="ns-exists">⚠ 已存</span>':'<span class="ns-source">点击填充</span>')+'</div>';
  }
  dd.innerHTML=h;dd.classList.remove('hidden');
}
function onScoutingSupplierKeydown(e){
  var dd=document.getElementById('sc-supplier-suggestions');
  if(dd.classList.contains('hidden'))return;
  if(e.key==='ArrowDown'){e.preventDefault();scSuppSuggIdx=Math.min(scSuppSuggIdx+1,scSuppSuggList.length-1);updateScSuppActive()}
  else if(e.key==='ArrowUp'){e.preventDefault();scSuppSuggIdx=Math.max(scSuppSuggIdx-1,0);updateScSuppActive()}
  else if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();if(scSuppSuggIdx>=0)selectScoutingSupplier(scSuppSuggIdx)}
  else if(e.key==='Escape'){dd.classList.add('hidden');scSuppSuggIdx=-1}
}
function updateScSuppActive(){
  var items=document.querySelectorAll('#sc-supplier-suggestions .name-suggestion');
  for(var i=0;i<items.length;i++)items[i].classList.toggle('active',i===scSuppSuggIdx);
  if(scSuppSuggIdx>=0&&items[scSuppSuggIdx])items[scSuppSuggIdx].scrollIntoView({block:'nearest'});
}
function selectScoutingSupplier(idx){
  var m=scSuppSuggList[idx];if(!m)return;
  document.getElementById('sc-supplier').value=m.name;
  document.getElementById('sc-supplier-suggestions').classList.add('hidden');
  scSuppSuggList=[];scSuppSuggIdx=-1;
  if(m.comp){
    // Auto-fill from company directory
    var comp=m.comp;
    if(comp.legal_person)document.getElementById('sc-compliance').value=document.getElementById('sc-compliance').value||('法人:'+(comp.legal_person||''));
    if(comp.reg_capital&&!document.getElementById('sc-notes').value)document.getElementById('sc-notes').value='注册资本:'+comp.reg_capital;
    // Post-fill note: company info attached
    showToast('已关联企业名录: '+comp.name+(comp.legal_person?' (法人:'+comp.legal_person+')':''));
  }
}


function updateScoutingDatalists(){
  // Update product name datalist
  var names=[],cats=[],suppliers=[];
  for(var i=0;i<allScouting.length;i++){
    var s=allScouting[i];
    if(s.product_name&&names.indexOf(s.product_name)<0)names.push(s.product_name);
    if(s.product_category&&cats.indexOf(s.product_category)<0)cats.push(s.product_category);
    if(s.supplier_name&&suppliers.indexOf(s.supplier_name)<0)suppliers.push(s.supplier_name);
  }
  buildScCatDropdowns();
}

async function approveScouting(id){
  var s=allScouting.find(function(x){return x.id===id});if(!s)return;
  await sb.from('product_scouting').update({status:'approved',updated_at:new Date().toISOString()}).eq('id',id);
  showToast('\u9009\u54c1\u5df2\u901a\u8fc7');
  await loadScouting();
  if(!await uiConfirm('\u662f\u5426\u4e00\u952e\u5165\u5e93\uff1f\n\n\u8fd9\u5c06\uff1a\n1. \u6dfb\u52a0\u4ea7\u54c1\u5230\u4ea7\u54c1\u5e93\n2. \u6dfb\u52a0\u4f9b\u5e94\u5546\u5230\u4f9b\u5e94\u5546\u5e93\n3. \u521b\u5efa\u91c7\u8d2d\u5355'))return;
  var hasError=false;
  // 1. Add product
  var prodExists=null;
  for(var j=0;j<allProducts.length;j++){if((allProducts[j].name||'').trim().toLowerCase()===s.product_name.trim().toLowerCase()){prodExists=allProducts[j];break;}}
  if(!prodExists){
    var catId=null;if(s.product_category){for(var ci=0;ci<allCategories.length;ci++){if(allCategories[ci].name===s.product_category){catId=allCategories[ci].id;break;}}}
    var specs={};if(s.product_params)try{specs=typeof s.product_params==='string'?JSON.parse(s.product_params):(s.product_params||{})}catch(e){specs={};var pp=s.product_params||'';var pl=pp.split('\n');for(var pi=0;pi<pl.length;pi++){var pc=pl[pi].split(':');if(pc.length>=2){specs[pc[0].trim()]=pc.slice(1).join(':').trim()}}}
    if(s.moq!=null){specs['MOQ']=s.moq}
    if(s.has_sample!=null){specs['有无样品']=s.has_sample?'有':'无'}
    if(s.compliance_requirements){specs['合规要求']=s.compliance_requirements}
    if(s.product_category){specs['产品分类']=s.product_category}
    var desc='';if(s.supplier_name)desc+='供应商:'+s.supplier_name+' | ';if(s.moq!=null)desc+='MOQ:'+s.moq+' | ';if(s.channel)desc+='渠道:'+s.channel;if(s.notes){if(desc)desc+=' | ';desc+='备注:'+s.notes}
    var prodObj={company_id:currentCompanyId,name:s.product_name||'',code:null,category_id:catId,cost_price:parseFloat(s.purchase_price)||0,selling_price:parseFloat(s.selling_price)||0,description:desc,specs:JSON.stringify(specs),images:'[]',commission_rate:parseFloat(s.influencer_commission)||0,updated_at:new Date().toISOString()};
    var pr=await sb.from('products').insert([prodObj]);
    if(pr.error){showToast('添加产品失败:'+pr.error.message);hasError=true;}else{showToast('✅ 产品已入库: '+s.product_name);}
  }else{showToast('✅ 产品已存在: '+s.product_name);}
// 2. Add supplier
  var supExists=null;
  if(s.supplier_name){for(var kk=0;kk<allSuppliers.length;kk++){if((allSuppliers[kk].name||'').trim().toLowerCase()===s.supplier_name.trim().toLowerCase()){supExists=allSuppliers[kk];break;}}}
  if(s.supplier_name&&!supExists){
    var supObj={company_id:currentCompanyId,name:s.supplier_name,contact_name:null,contact_phone:'[]',products:'[]',category:s.product_category||null,cooperation_count:1,cooperation_level:'C',defect_rate:0,notes:'\u6765\u81ea\u9009\u54c1\u8c03\u7814 | \u4ea7\u54c1:'+s.product_name,compliance_requirements:s.compliance_requirements||null,updated_at:new Date().toISOString()};
    var sr=await sb.from('suppliers').insert([supObj]);
    if(sr.error){showToast('\u6dfb\u52a0\u4f9b\u5e94\u5546\u5931\u8d25:'+sr.error.message);hasError=true;}else{showToast('\u2705 \u4f9b\u5e94\u5546\u5df2\u5165\u5e93: '+s.supplier_name);}
  }else if(supExists){showToast('\u2705 \u4f9b\u5e94\u5546\u5df2\u5b58\u5728: '+s.supplier_name);}
  // 3. Mark as ordered
  await sb.from('product_scouting').update({status:'ordered',updated_at:new Date().toISOString()}).eq('id',id);
  showToast('\u2705 \u91c7\u8d2d\u6d41\u7a0b\u5df2\u542f\u52a8: '+s.product_name);
  await loadScouting();
  if(!hasError){await loadSuppliers();await loadProducts();}
}


// ═══════════ INVENTORY ═══════════
var currentInventoryTab='products';
var allProducts=[],allCategories=[],allWarehouses=[],allStockRecords=[],allAlerts=[],allChecks=[];
var productEditId=null,warehouseEditId=null,categoryEditId=null,alertEditId=null,checkEditId=null;
var tempSpecs=[],tempImages=[],checkItems=[];

function switchInventoryTab(t){
  currentInventoryTab=t;
  document.querySelectorAll('.inv-subtab').forEach(function(b){b.classList.remove('active')});
  document.querySelectorAll('.inv-panel').forEach(function(p){p.classList.remove('active')});
  var btns=document.querySelectorAll('.inv-subtab');
  var idx={scouting:0,products:1,records:2,alerts:3,checks:4,warehouses:5,transfers:6,ledger:7}[t]||0;
  if(btns[idx])btns[idx].classList.add('active');
  var panel=document.getElementById('inv-'+t);
  if(panel)panel.classList.add('active');
  if(t==='scouting')loadScouting();
  else if(t==='products')loadProducts();
  else if(t==='records')loadStockRecords();
  else if(t==='alerts')loadStockAlerts();
  else if(t==='checks')loadStockChecks();
  else if(t==='warehouses')loadWarehousesPanel();
  else if(t==='transfers')loadStockTransfers();
  else if(t==='ledger')loadStockLedger();
}

async function loadCategories(){
  var r=await sb.from('product_categories').select('*').eq('company_id',currentCompanyId).order('name');
  if(r.error){console.error(r.error);return}
  allCategories=r.data||[];
  var sel=document.getElementById('inv-product-cat-filter');
  if(!sel)return;
  var v=sel.value;
  sel.innerHTML='<option value="">全部分类</option>';
  for(var i=0;i<allCategories.length;i++)sel.innerHTML+='<option value="'+allCategories[i].id+'">'+escHtml(allCategories[i].name)+'</option>';
  sel.value=v;
  var psel=document.getElementById('pfm-category');
  if(psel){psel.innerHTML='<option value="">选择分类</option>';for(var j=0;j<allCategories.length;j++)psel.innerHTML+='<option value="'+allCategories[j].id+'">'+escHtml(allCategories[j].name)+'</option>'}
}

function openCategoryForm(){
  categoryEditId=null;
  document.getElementById('cat-name').value='';
  document.getElementById('cat-desc').value='';
  document.getElementById('category-form-title').textContent='产品分类';
  renderCategoryList();
  document.getElementById('category-modal').classList.remove('hidden');
}

function closeCategoryForm(){document.getElementById('category-modal').classList.add('hidden')}

function renderCategoryList(){
  var el=document.getElementById('cat-list');
  if(!el)return;
  if(allCategories.length===0){el.innerHTML='<div class="empty-state">暂无分类</div>';return}
  el.innerHTML='';
  for(var i=0;i<allCategories.length;i++){
    var c=allCategories[i];
    el.innerHTML+='<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px"><span>'+escHtml(c.name)+'</span><button class="btn-sm btn-sm-danger" onclick="deleteCategory('+c.id+')" style="font-size:11px;padding:2px 8px">删除</button></div>';
  }
}

async function saveCategory(){
  var name=document.getElementById('cat-name').value.trim();
  if(!name){showToast('请输入分类名称');return}
  var r=await sb.from('product_categories').insert({company_id:currentCompanyId,name:name,description:document.getElementById('cat-desc').value.trim()}).select().single();
  if(r.error){showToast('保存失败:'+r.error.message);return}
  showToast('分类已添加');
  document.getElementById('cat-name').value='';
  document.getElementById('cat-desc').value='';
  await loadCategories();
  renderCategoryList();
}

async function deleteCategory(id){
  if(!await uiConfirm('确定删除此分类？'))return;
  var _delErr=(await sb.from('product_categories').delete().eq('id',id)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
  showToast('已删除');
  await loadCategories();
  renderCategoryList();
}

async function loadProducts(){
  var cat=document.getElementById('inv-product-cat-filter');
  var catId=cat?cat.value:'';
  var search=(document.getElementById('inv-product-search')||{}).value||'';
  var q=sb.from('products').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
  if(catId)q=q.eq('category_id',catId);
  if(search)q=q.or('name.ilike.%'+search+'%,code.ilike.%'+search+'%');
  var r;
  if(!isAdmin()){
    r=await callAdmin('select','products',{query:'*',filters:[{col:'company_id',op:'eq',val:currentCompanyId},{col:'',op:'order',val:'updated_at.desc'},{col:'',op:'limit',val:'50000'}]});
    allProducts=(r&&r.data?r.data:[]);
  }else{
    r=await q;
    if(r.error){console.error(r.error);return}
    allProducts=r.data||[];
  }
  if(!isAdmin()){allProducts=allProducts.filter(function(p){return canAccess('products',p.id)})}
  await loadStockBalances();
  renderProducts();
}

async function loadStockBalances(){
  if(allProducts.length===0)return;
  var r=await sb.from('stock_records').select('product_id,warehouse_id,type,quantity').eq('company_id',currentCompanyId);
  if(r.error)return;
  var bal={};
  for(var i=0;i<r.data.length;i++){
    var d=r.data[i],k=d.product_id+'_'+(d.warehouse_id||'');
    if(!bal[k])bal[k]=0;
    bal[k]+=d.type==='in'?d.quantity:-d.quantity;
  }
  for(var j=0;j<allProducts.length;j++){
    var total=0;for(var k in bal){if(k.startsWith(allProducts[j].id+'_'))total+=bal[k]}
    allProducts[j]._balance=Math.round(total*100)/100;
  }
}

function renderProducts(){
  var el=document.getElementById('product-list');
  if(!el)return;
  if(allProducts.length===0){el.innerHTML='<div class="empty-state">暂无产品，点击"＋ 产品"添加</div>';return}
  el.innerHTML='';
  var html='';
  for(var i=0;i<allProducts.length;i++){
    var p=allProducts[i];
    var catName='';
    for(var j=0;j<allCategories.length;j++)if(allCategories[j].id===p.category_id){catName=allCategories[j].name;break}
    html+='<div class="product-card" onclick="editProduct('+p.id+')">'+
      '<div class="pc-code">'+escHtml(p.code||'-')+'</div>'+
      '<div class="pc-name">'+escHtml(p.name)+'</div>'+
      (catName?'<div class="pc-cat">'+escHtml(catName)+'</div>':'')+
      '<div class="pc-prices"><span class="pc-cost">成本 ¥'+(p.cost_price||0)+'</span><span class="pc-sell">售价 ¥'+(p.selling_price||0)+'</span></div>'+
      '<div class="pc-stock">库存: '+(p._balance||0)+' '+escHtml(p.unit||'个')+'</div>'+
      '</div>';
  }
  el.innerHTML=html;
}

function openProductForm(){
  productEditId=null;tempSpecs=[];tempImages=[];
  document.getElementById('product-form-title').textContent='添加产品';
  document.getElementById('pfm-name').value='';
  document.getElementById('pfm-code').value='';
  document.getElementById('pfm-category').value='';
  document.getElementById('pfm-unit').value='个';
  document.getElementById('pfm-cost').value='';
  document.getElementById('pfm-price').value='';
  document.getElementById('pfm-commission-rate').value='';
  document.getElementById('pfm-moq').value='';
  document.getElementById('pfm-sample').value='';
  document.getElementById('pfm-channel').value='';
  document.getElementById('pfm-compliance').value='';
  document.getElementById('pfm-desc').value='';
  document.getElementById('pfm-image-url').value='';
  document.getElementById('product-btn-delete').classList.add('hidden');
  renderSpecs();
  renderProductImages();
  document.getElementById('product-modal').classList.remove('hidden');
}

function editProduct(id){
  var p=allProducts.find(function(x){return x.id===id});if(!p)return;
  productEditId=id;
  document.getElementById('product-form-title').textContent='编辑产品';
  document.getElementById('pfm-name').value=p.name||'';
  document.getElementById('pfm-code').value=p.code||'';
  document.getElementById('pfm-category').value=p.category_id||'';
  document.getElementById('pfm-unit').value=p.unit||'个';
  document.getElementById('pfm-cost').value=p.cost_price||'';
  document.getElementById('pfm-price').value=p.selling_price||'';
  document.getElementById('pfm-commission-rate').value=p.commission_rate||'';
  var _sp={};try{_sp=typeof p.specs==='string'?JSON.parse(p.specs):(p.specs||{})}catch(e){_sp={}}
  document.getElementById('pfm-moq').value=_sp['MOQ']||_sp['moq']||'';
  document.getElementById('pfm-sample').value=_sp['有无样品']==='有'?'1':(_sp['有无样品']==='无'?'0':'');
  document.getElementById('pfm-channel').value=_sp['渠道']||_sp['供货渠道']||'';
  document.getElementById('pfm-compliance').value=_sp['合规要求']||'';
  document.getElementById('pfm-desc').value=p.description||'';
  tempSpecs=(p.specs&&typeof p.specs==='object'&&!Array.isArray(p.specs))?Object.entries(p.specs).map(function(e){return{key:e[0],val:e[1]}}):[];
  tempImages=(p.images&&Array.isArray(p.images))?p.images:[];
  document.getElementById('pfm-image-url').value='';
  document.getElementById('product-btn-delete').classList.remove('hidden');
  renderSpecs();
  renderProductImages();
  document.getElementById('product-modal').classList.remove('hidden');
}

function closeProductForm(){document.getElementById('product-modal').classList.add('hidden')}

function addSpecRow(){tempSpecs.push({key:'',val:''});renderSpecs()}
function removeSpecRow(i){tempSpecs.splice(i,1);renderSpecs()}
function renderSpecs(){
  var el=document.getElementById('pfm-specs');if(!el)return;
  el.innerHTML='';
  for(var i=0;i<tempSpecs.length;i++)el.innerHTML+='<div class="spec-row"><input placeholder="参数名" value="'+escHtml(tempSpecs[i].key||'')+'" oninput="tempSpecs['+i+'].key=this.value"><input placeholder="参数值" value="'+escHtml(tempSpecs[i].val||'')+'" oninput="tempSpecs['+i+'].val=this.value"><button class="btn-sm btn-sm-danger" onclick="removeSpecRow('+i+')" style="font-size:11px;padding:2px 6px">✕</button></div>';
}

function addProductImage(){
  var url=document.getElementById('pfm-image-url').value.trim();
  if(!url)return;
  tempImages.push(url);
  document.getElementById('pfm-image-url').value='';
  renderProductImages();
}
function removeProductImage(i){tempImages.splice(i,1);renderProductImages()}
function renderProductImages(){
  var el=document.getElementById('pfm-images');if(!el)return;
  el.innerHTML='';
  for(var i=0;i<tempImages.length;i++)el.innerHTML+='<div style="position:relative;display:inline-block"><img class="img-item" src="'+escHtml(tempImages[i])+'" onerror="this.style.display=\'none\'"><button style="position:absolute;top:-4px;right:-4px;background:var(--danger);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer;line-height:18px" onclick="removeProductImage('+i+')">✕</button></div>';
}

async function saveProduct(){
  var name=document.getElementById('pfm-name').value.trim();
  if(!name){showToast('请输入产品名称');return}
  var specs={};
  for(var i=0;i<tempSpecs.length;i++)if(tempSpecs[i].key)specs[tempSpecs[i].key]=tempSpecs[i].val||'';
  var _moq=document.getElementById('pfm-moq').value.trim();if(_moq)specs['MOQ']=_moq;
  var _sample=document.getElementById('pfm-sample').value;if(_sample==='1')specs['有无样品']='有';else if(_sample==='0')specs['有无样品']='无';
  var _channel=document.getElementById('pfm-channel').value.trim();if(_channel)specs['渠道']=_channel;
  var _compliance=document.getElementById('pfm-compliance').value.trim();if(_compliance)specs['合规要求']=_compliance;
  var data={
    company_id:currentCompanyId,
    name:name,
    code:document.getElementById('pfm-code').value.trim(),
    category_id:document.getElementById('pfm-category').value||null,
    unit:document.getElementById('pfm-unit').value.trim()||'个',
    cost_price:parseFloat(document.getElementById('pfm-cost').value)||0,
    selling_price:parseFloat(document.getElementById('pfm-price').value)||0,
    commission_rate:parseFloat(document.getElementById('pfm-commission-rate').value)||0,
    description:document.getElementById('pfm-desc').value.trim(),
    specs:JSON.stringify(specs),
    images:JSON.stringify(tempImages),
    updated_at:new Date().toISOString()
  };
  var r;
  if(productEditId){r=await sb.from('products').update(data).eq('id',productEditId)}else{r=await sb.from('products').insert(data).select('id')}
  if(r.error){showToast('保存失败:'+r.error.message);return}
  // 非管理员自动给自己授权
  if(!productEditId&&!isAdmin()&&r.data&&r.data[0]){
    var newPid=r.data[0].id;
    var grRes=await callAdmin('insert','resource_grants',{payload:{user_id:currentUser.id,company_id:currentCompanyId,resource_type:'products',resource_id:newPid,granted_by:currentUser.id}});
    dbg('[saveProduct] self-grant result:',grRes);
    if(!memberGrants.products||memberGrants.products==='all')memberGrants.products=[];
    memberGrants.products.push(String(newPid).toLowerCase());
  }
  showToast(productEditId?'已更新':'已添加');
  closeProductForm();
  await loadProducts();
}

async function deleteProduct(){
  if(!await uiConfirm('确定删除此产品？'))return;
  var r=await sb.from('products').delete().eq('id',productEditId);
  if(r.error){showToast('删除失败: '+r.error.message);return}
  showToast('已删除');
  closeProductForm();
  await loadProducts();
}

async function loadWarehouses(){
  var r=await sb.from('warehouses').select('*').eq('company_id',currentCompanyId).order('name');
  if(r.error){console.error(r.error);return}
  allWarehouses=r.data||[];
  var sels=['srm-warehouse','inv-record-warehouse','inv-alert-warehouse','inv-check-warehouse','alm-warehouse','chm-warehouse'];
  for(var s=0;s<sels.length;s++){
    var sel=document.getElementById(sels[s]);if(!sel)continue;
    var v=sel.value;
    sel.innerHTML=(sels[s]==='alm-warehouse'?'<option value="">全部仓库</option>':(sels[s].startsWith('inv-')?'<option value="">全部仓库</option>':'<option value="">选择仓库</option>'));
    for(var i=0;i<allWarehouses.length;i++)sel.innerHTML+='<option value="'+allWarehouses[i].id+'">'+escHtml(allWarehouses[i].name)+'</option>';
    sel.value=v;
  }
}

function loadWarehousesPanel(){
  var el=document.getElementById('warehouse-list');if(!el)return;
  if(allWarehouses.length===0){el.innerHTML='<div class="empty-state">暂无仓库</div>';return}
  el.innerHTML='';
  for(var i=0;i<allWarehouses.length;i++){
    var w=allWarehouses[i];
    el.innerHTML+='<div class="alert-card"><div class="ac-info"><div class="ac-name">'+escHtml(w.name)+'</div><div class="ac-stock">'+escHtml(w.address||'')+' '+escHtml(w.description||'')+'</div></div><div class="ac-action"><button class="btn-sm" onclick="editWarehouse('+w.id+')">编辑</button><button class="btn-sm btn-sm-danger" onclick="deleteWarehouseById('+w.id+')">删除</button></div></div>';
  }
}

function openWarehouseForm(){
  warehouseEditId=null;
  document.getElementById('warehouse-form-title').textContent='添加仓库';
  document.getElementById('wh-name').value='';
  document.getElementById('wh-addr').value='';
  document.getElementById('wh-desc').value='';
  document.getElementById('warehouse-btn-delete').classList.add('hidden');
  document.getElementById('warehouse-modal').classList.remove('hidden');
}

function editWarehouse(id){
  var w=allWarehouses.find(function(x){return x.id===id});if(!w)return;
  warehouseEditId=id;
  document.getElementById('warehouse-form-title').textContent='编辑仓库';
  document.getElementById('wh-name').value=w.name||'';
  document.getElementById('wh-addr').value=w.address||'';
  document.getElementById('wh-desc').value=w.description||'';
  document.getElementById('warehouse-btn-delete').classList.remove('hidden');
  document.getElementById('warehouse-modal').classList.remove('hidden');
}

function closeWarehouseForm(){document.getElementById('warehouse-modal').classList.add('hidden')}

async function saveWarehouse(){
  var name=document.getElementById('wh-name').value.trim();
  if(!name){showToast('请输入仓库名称');return}
  var data={company_id:currentCompanyId,name:name,address:document.getElementById('wh-addr').value.trim(),description:document.getElementById('wh-desc').value.trim()};
  if(warehouseEditId){await sb.from('warehouses').update(data).eq('id',warehouseEditId)}else{await sb.from('warehouses').insert(data)}
  showToast(warehouseEditId?'已更新':'已添加');
  closeWarehouseForm();
  await loadWarehouses();
  loadWarehousesPanel();
}

async function deleteWarehouse(){await deleteWarehouseById(warehouseEditId);closeWarehouseForm()}
async function deleteWarehouseById(id){
  if(!await uiConfirm('确定删除此仓库？'))return;
  var _delErr=(await sb.from('warehouses').delete().eq('id',id)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
  showToast('已删除');
  await loadWarehouses();
  loadWarehousesPanel();
}

async function loadStockRecords(){
  var wh=document.getElementById('inv-record-warehouse');
  var whId=wh?wh.value:'';
  var tp=(document.getElementById('inv-record-type')||{}).value||'';
  var search=(document.getElementById('inv-record-search')||{}).value||'';
  var q=sb.from('stock_records').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false}).limit(200);
  if(whId)q=q.eq('warehouse_id',whId);
  if(tp)q=q.eq('type',tp);
  var r=await q;
  if(r.error){console.error(r.error);return}
  allStockRecords=r.data||[];
  if(search){allStockRecords=allStockRecords.filter(function(sr){
    var pn=findProductName(sr.product_id).toLowerCase();
    var bn=(sr.batch_no||'').toLowerCase();
    var s=search.toLowerCase();
    return pn.indexOf(s)>=0||bn.indexOf(s)>=0;
  })}
  renderStockRecords();
}

function findProductName(id){
  var p=allProducts.find(function(x){return x.id===id});
  return p?p.name:'';
}
function findWarehouseName(id){
  var w=allWarehouses.find(function(x){return x.id===id});
  return w?w.name:'';
}

function renderStockRecords(){
  var el=document.getElementById('stock-records-table');
  if(!el)return;
  if(allStockRecords.length===0){el.innerHTML='<div class="empty-state">暂无出入库记录</div>';return}
  var h='<table class="stock-table"><tr><th>时间</th><th>类型</th><th>产品</th><th>仓库</th><th>数量</th><th>单价</th><th>金额</th><th>批次</th><th>备注</th></tr>';
  for(var i=0;i<allStockRecords.length;i++){
    var sr=allStockRecords[i];
    h+='<tr><td>'+new Date(sr.created_at).toLocaleString('zh-CN')+'</td>'+
      '<td class="type-'+(sr.type||'')+'">'+(sr.type==='in'?'入库':'出库')+'</td>'+
      '<td>'+escHtml(findProductName(sr.product_id))+'</td>'+
      '<td>'+escHtml(findWarehouseName(sr.warehouse_id))+'</td>'+
      '<td>'+sr.quantity+'</td><td>¥'+(sr.unit_price||0)+'</td><td>¥'+(sr.quantity*sr.unit_price).toFixed(2)+'</td>'+
      '<td>'+escHtml(sr.batch_no||'')+'</td><td class="text-wrap">'+escHtml(sr.remark||'')+'</td></tr>';
  }
  el.innerHTML=h+'</table>';
}

function openStockRecordForm(){
  document.getElementById('stock-record-title').textContent='出入库';
  document.getElementById('srm-type').value='in';
  document.getElementById('srm-product').value='';
  document.getElementById('srm-qty').value='';
  document.getElementById('srm-price').value='';
  document.getElementById('srm-batch').value='';
  document.getElementById('srm-remark').value='';
  document.getElementById('stock-record-modal').classList.remove('hidden');
  var psel=document.getElementById('srm-product');
  psel.innerHTML='<option value="">选择产品</option>';
  for(var i=0;i<allProducts.length;i++)psel.innerHTML+='<option value="'+allProducts[i].id+'">'+escHtml(allProducts[i].name)+'</option>';
}

function closeStockRecordForm(){document.getElementById('stock-record-modal').classList.add('hidden')}

async function saveStockRecord(){
  var pid=document.getElementById('srm-product').value;
  var wid=document.getElementById('srm-warehouse').value;
  if(!pid||!wid){showToast('请选择产品和仓库');return}
  var qty=parseFloat(document.getElementById('srm-qty').value)||0;
  if(qty<=0){showToast('请输入有效数量');return}
  var type=document.getElementById('srm-type').value;
  if(type==='out'){
    var balance=await getProductStock(pid,wid);
    if(qty>balance){showToast('库存不足！当前库存:'+balance);return}
  }
  var data={
    company_id:currentCompanyId,product_id:pid,warehouse_id:wid,type:type,
    quantity:qty,unit_price:parseFloat(document.getElementById('srm-price').value)||0,
    batch_no:document.getElementById('srm-batch').value.trim(),
    remark:document.getElementById('srm-remark').value.trim(),
    recorded_by:currentUser.id
  };
  var r=await sb.from('stock_records').insert(data);
  if(r.error){showToast('保存失败:'+r.error.message);return}
  showToast('记录已保存');
  closeStockRecordForm();
  await loadStockRecords();
  await loadProducts();
}

async function getProductStock(pid,wid){
  var r=await sb.from('stock_records').select('type,quantity').eq('company_id',currentCompanyId).eq('product_id',pid).eq('warehouse_id',wid);
  if(r.error)return 0;
  var bal=0;
  for(var i=0;i<r.data.length;i++)bal+=r.data[i].type==='in'?r.data[i].quantity:-r.data[i].quantity;
  return Math.round(bal*100)/100;
}

async function loadStockAlerts(){
  var wh=document.getElementById('inv-alert-warehouse');
  var whId=wh?wh.value:'';
  var q=sb.from('stock_alerts').select('*').eq('company_id',currentCompanyId).eq('enabled',true);
  if(whId)q=q.eq('warehouse_id',whId);
  var r=await q;
  if(r.error){console.error(r.error);return}
  allAlerts=r.data||[];
  renderAlerts();
}

async function renderAlerts(){
  var el=document.getElementById('alert-list');if(!el)return;
  if(allAlerts.length===0){el.innerHTML='<div class="empty-state">暂无预警设置</div>';return}
  el.innerHTML=skRows(5);
  // 一次性取全部库存流水，取代「逐条预警 × 逐个仓库」的 N+1 查询
  var balMap={};
  try{
    var sr=await sb.from('stock_records').select('product_id,warehouse_id,type,quantity').eq('company_id',currentCompanyId);
    var rows=(sr&&sr.data)||[];
    for(var si=0;si<rows.length;si++){
      var d=rows[si],k=d.product_id+'_'+(d.warehouse_id||'');
      balMap[k]=(balMap[k]||0)+(d.type==='in'?d.quantity:-d.quantity);
    }
  }catch(e){console.error('库存预警加载失败',e)}
  function balOf(pid,wid){
    if(wid)return Math.round((balMap[pid+'_'+wid]||0)*100)/100;
    var t=0,pre=pid+'_';
    for(var k in balMap){if(k.indexOf(pre)===0)t+=balMap[k]}
    return Math.round(t*100)/100;
  }
  var html='';
  for(var i=0;i<allAlerts.length;i++){
    var a=allAlerts[i];
    var bal=balOf(a.product_id,a.warehouse_id);
    var cls='';
    if(a.min_stock>0&&bal<=a.min_stock)cls='danger';
    else if(a.max_stock>0&&bal>=a.max_stock)cls='warning';
    html+='<div class="alert-card '+(cls?cls:'')+'"><div class="ac-info"><div class="ac-name">'+escHtml(findProductName(a.product_id))+'</div><div class="ac-stock">当前库存: '+bal+' | 最低: '+(a.min_stock||'-')+' 最高: '+(a.max_stock||'-')+' | '+escHtml(a.warehouse_id?findWarehouseName(a.warehouse_id):'全部仓库')+'</div></div><div class="ac-action"><button class="btn-sm" onclick="editAlert('+a.id+')">编辑</button><button class="btn-sm btn-sm-danger" onclick="deleteAlertById('+a.id+')">删除</button></div></div>';
  }
  el.innerHTML=html;
}

function openAlertForm(){
  alertEditId=null;
  document.getElementById('alert-form-title').textContent='库存预警设置';
  document.getElementById('alm-product').value='';
  document.getElementById('alm-warehouse').value='';
  document.getElementById('alm-min').value='';
  document.getElementById('alm-max').value='';
  document.getElementById('alm-enabled').checked=true;
  document.getElementById('alert-btn-delete').classList.add('hidden');
  var psel=document.getElementById('alm-product');
  psel.innerHTML='<option value="">选择产品</option>';
  for(var i=0;i<allProducts.length;i++)psel.innerHTML+='<option value="'+allProducts[i].id+'">'+escHtml(allProducts[i].name)+'</option>';
  document.getElementById('alert-modal').classList.remove('hidden');
}

function editAlert(id){
  var a=allAlerts.find(function(x){return x.id===id});if(!a)return;
  alertEditId=id;
  document.getElementById('alert-form-title').textContent='编辑预警';
  document.getElementById('alm-product').value=a.product_id;
  document.getElementById('alm-warehouse').value=a.warehouse_id||'';
  document.getElementById('alm-min').value=a.min_stock||'';
  document.getElementById('alm-max').value=a.max_stock||'';
  document.getElementById('alm-enabled').checked=a.enabled!==false;
  document.getElementById('alert-btn-delete').classList.remove('hidden');
  document.getElementById('alert-modal').classList.remove('hidden');
}

function closeAlertForm(){document.getElementById('alert-modal').classList.add('hidden')}

async function saveAlert(){
  var pid=document.getElementById('alm-product').value;
  if(!pid){showToast('请选择产品');return}
  var wid=document.getElementById('alm-warehouse').value||null;
  var data={company_id:currentCompanyId,product_id:pid,warehouse_id:wid,min_stock:parseFloat(document.getElementById('alm-min').value)||0,max_stock:parseFloat(document.getElementById('alm-max').value)||0,enabled:document.getElementById('alm-enabled').checked};
  if(alertEditId){await sb.from('stock_alerts').update(data).eq('id',alertEditId)}else{await sb.from('stock_alerts').insert(data)}
  showToast(alertEditId?'已更新':'已添加');
  closeAlertForm();
  await loadStockAlerts();
}

async function deleteAlert(){await deleteAlertById(alertEditId);closeAlertForm()}
async function deleteAlertById(id){
  if(!await uiConfirm('确定删除此预警？'))return;
  var _delErr=(await sb.from('stock_alerts').delete().eq('id',id)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
  showToast('已删除');
  await loadStockAlerts();
}

async function loadStockChecks(){
  var wh=document.getElementById('inv-check-warehouse');
  var whId=wh?wh.value:'';
  var q=sb.from('stock_checks').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false});
  if(whId)q=q.eq('warehouse_id',whId);
  var r=await q;
  if(r.error){console.error(r.error);return}
  allChecks=r.data||[];
  renderChecks();
}

function renderChecks(){
  var el=document.getElementById('check-list');if(!el)return;
  if(allChecks.length===0){el.innerHTML='<div class="empty-state">暂无盘点记录</div>';return}
  el.innerHTML='';
  for(var i=0;i<allChecks.length;i++){
    var ch=allChecks[i];
    var statusBadge=ch.status==='done'?'<span style="color:var(--success);font-weight:600">已完成</span>':(ch.status==='cancelled'?'<span style="color:var(--text-secondary)">已取消</span>':'<span style="color:var(--warning);font-weight:600">草稿</span>');
    el.innerHTML+='<div class="alert-card"><div class="ac-info"><div class="ac-name">'+escHtml(findWarehouseName(ch.warehouse_id))+' - '+new Date(ch.check_date).toLocaleDateString('zh-CN')+'</div><div class="ac-stock">'+statusBadge+' | '+escHtml(ch.remark||'')+'</div></div><div class="ac-action"><button class="btn-sm" onclick="viewCheck('+ch.id+')">查看</button><button class="btn-sm btn-sm-danger" onclick="deleteCheckById('+ch.id+')">删除</button></div></div>';
  }
}

function openCheckForm(){
  checkEditId=null;checkItems=[];
  document.getElementById('check-form-title').textContent='新增盘点';
  document.getElementById('chm-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('chm-remark').value='';
  document.getElementById('check-btn-delete').classList.add('hidden');
  document.getElementById('chm-items-title').style.display='none';
  document.getElementById('chm-summary').style.display='none';
  document.getElementById('chm-items').innerHTML='';
  document.getElementById('chm-add-btn').innerHTML='<button class="btn-sm btn-sm-primary" onclick="initCheckItems()">加载盘点明细</button>';
  document.getElementById('check-modal').classList.remove('hidden');
}

async function initCheckItems(){
  var wid=document.getElementById('chm-warehouse').value;
  if(!wid){showToast('请先选择仓库');return}
  checkItems=[];
  for(var i=0;i<allProducts.length;i++){
    var bal=await getProductStock(allProducts[i].id,wid);
    checkItems.push({product_id:allProducts[i].id,book_qty:bal,actual_qty:0,diff_qty:0,remark:''});
  }
  renderCheckItems();
  document.getElementById('chm-items-title').style.display='block';
  document.getElementById('chm-summary').style.display='flex';
  document.getElementById('chm-add-btn').innerHTML='';
  updateCheckSummary();
}

function renderCheckItems(){
  var el=document.getElementById('chm-items');if(!el)return;
  el.innerHTML='<table class="check-table"><tr><th>产品</th><th>账面库存</th><th>实盘数量</th><th>差异</th><th>备注</th></tr>';
  for(var i=0;i<checkItems.length;i++){
    var ci=checkItems[i];
    el.innerHTML+='<tr><td>'+escHtml(findProductName(ci.product_id))+'</td><td>'+ci.book_qty+'</td><td><input type="number" step="0.01" value="'+ci.actual_qty+'" oninput="updateCheckItem('+i+',this.value)"></td><td style="color:'+(ci.actual_qty!==ci.book_qty?'var(--danger)':'var(--text)')+'">'+(ci.actual_qty-ci.book_qty).toFixed(2)+'</td><td><input style="width:100%" placeholder="备注" value="'+escHtml(ci.remark||'')+'" oninput="checkItems['+i+'].remark=this.value"></td></tr>';
  }
  el.innerHTML+='</table>';
}

function updateCheckItem(i,val){
  checkItems[i].actual_qty=parseFloat(val)||0;
  checkItems[i].diff_qty=checkItems[i].actual_qty-checkItems[i].book_qty;
  updateCheckSummary();
}

function updateCheckSummary(){
  document.getElementById('chm-total-items').textContent=checkItems.length;
  var match=0,diff=0;
  for(var i=0;i<checkItems.length;i++){if(checkItems[i].actual_qty===checkItems[i].book_qty)match++;else diff++}
  document.getElementById('chm-match').textContent=match;
  document.getElementById('chm-diff').textContent=diff;
}

async function viewCheck(id){
  var ch=allChecks.find(function(x){return x.id===id});if(!ch)return;
  checkEditId=id;
  document.getElementById('check-form-title').textContent='盘点详情';
  document.getElementById('chm-warehouse').value=ch.warehouse_id;
  document.getElementById('chm-date').value=ch.check_date||'';
  document.getElementById('chm-remark').value=ch.remark||'';
  document.getElementById('check-btn-delete').classList.remove('hidden');
  var r=await sb.from('stock_check_items').select('*').eq('check_id',id);
  checkItems=r.data||[];
  renderCheckItems();
  document.getElementById('chm-items-title').style.display='block';
  document.getElementById('chm-summary').style.display='flex';
  document.getElementById('chm-add-btn').innerHTML='';
  updateCheckSummary();
  document.getElementById('check-modal').classList.remove('hidden');
  document.getElementById('chm-warehouse').disabled=true;
}

function closeCheckForm(){
  document.getElementById('check-modal').classList.add('hidden');
  document.getElementById('chm-warehouse').disabled=false;
}

async function saveCheck(){
  var wid=document.getElementById('chm-warehouse').value;
  if(!wid){showToast('请选择仓库');return}
  if(checkItems.length===0){showToast('请先加载盘点明细');return}
  var data={
    company_id:currentCompanyId,warehouse_id:wid,
    check_date:document.getElementById('chm-date').value,
    remark:document.getElementById('chm-remark').value.trim(),
    checked_by:currentUser.id
  };
  var r;
  if(checkEditId){
    data.status=document.getElementById('check-btn-delete').classList.contains('hidden')?'draft':'done';
    r=await sb.from('stock_checks').update(data).eq('id',checkEditId);
  }else{
    data.status='done';
    r=await sb.from('stock_checks').insert(data).select().single();
  }
  if(r.error){showToast('保存失败:'+r.error.message);return}
  var checkId=checkEditId||r.data.id;
  var _delErr=(await sb.from('stock_check_items').delete().eq('check_id',checkId)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
  var items=[];
  for(var i=0;i<checkItems.length;i++){
    items.push({check_id:checkId,product_id:checkItems[i].product_id,book_qty:checkItems[i].book_qty,actual_qty:checkItems[i].actual_qty,remark:checkItems[i].remark||''});
  }
  if(items.length>0)await sb.from('stock_check_items').insert(items);
  showToast('盘点已保存');
  closeCheckForm();
  document.getElementById('chm-warehouse').disabled=false;
  await loadStockChecks();
}

async function deleteCheck(){await deleteCheckById(checkEditId);closeCheckForm();document.getElementById('chm-warehouse').disabled=false}
async function deleteCheckById(id){
  if(!await uiConfirm('确定删除此盘点？'))return;
  var _delErr=(await sb.from('stock_checks').delete().eq('id',id)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
  showToast('已删除');
  await loadStockChecks();
}

