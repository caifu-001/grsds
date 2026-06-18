
// === Supplier Functions ===

async function loadSuppliers(){
  var q=sb.from('suppliers').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
  var r=await q;
  allSuppliers=r.data||[];
  var clientMap={};
  for(var i=0;i<allClients.length;i++)clientMap[allClients[i].id]=allClients[i].name;
  for(var j=0;j<allSuppliers.length;j++)allSuppliers[j].linked_client_name=clientMap[allSuppliers[j].linked_client_id]||'';
  buildSupCategories();
  renderSuppliers();
}

function buildSupCategories(){
  var cats=new Set();
  for(var i=0;i<allSuppliers.length;i++){
    var c=allSuppliers[i].category;
    if(c)cats.add(c);
  }
  allSupCategories=Array.from(cats).sort();
  var sel=document.getElementById('sup-cat-filter');
  var v=sel?sel.value:'';
  var h='<option value="">全部类别</option>';
  for(var j=0;j<allSupCategories.length;j++)h+='<option value="'+escHtml(allSupCategories[j])+'"'+(v===allSupCategories[j]?' selected':'')+'>'+escHtml(allSupCategories[j])+'</option>';
  if(sel)sel.innerHTML=h;
  // Populate modal datalist
  var dl=document.getElementById('sup-cat-list');
  if(dl)dl.innerHTML=allSupCategories.map(function(c){return '<option value="'+escHtml(c)+'">'}).join('');
}

function renderSuppliers(){
  var search=(document.getElementById('sup-search')||{}).value||'';
  var cat=(document.getElementById('sup-cat-filter')||{}).value||'';
  var lv=(document.getElementById('sup-level-filter')||{}).value||'';
  var list=allSuppliers;
  if(search){
    var s=search.toLowerCase();
    list=list.filter(function(sp){
      var prods=[];
      try{prods=JSON.parse(sp.products||'[]')}catch(e){}
      var pn=prods.map(function(p){return p.name||''}).join(' ');
      return (sp.name||'').toLowerCase().indexOf(s)>=0||(sp.contact_name||'').toLowerCase().indexOf(s)>=0||(sp.contact_phone||'').toLowerCase().indexOf(s)>=0||pn.toLowerCase().indexOf(s)>=0||(sp.notes||'').toLowerCase().indexOf(s)>=0;
    });
  }
  if(cat)list=list.filter(function(sp){return sp.category===cat});
  if(lv)list=list.filter(function(sp){return sp.cooperation_level===lv});
  // Stats
  var st=document.getElementById('sup-stats');
  if(st){
    var lvCount={A:0,B:0,C:0,D:0,E:0};
    for(var i=0;i<list.length;i++){var l=list[i].cooperation_level||'C';lvCount[l]=(lvCount[l]||0)+1}
    var catCount={};var sortedCats=[];
    for(var ci=0;ci<list.length;ci++){var cc=list[ci].category||'\u672a\u5206\u7c7b';catCount[cc]=(catCount[cc]||0)+1}
    sortedCats=Object.keys(catCount).sort(function(a,b){return catCount[b]-catCount[a]});
    var catHtml='<div class="sup-stat" style="background:var(--primary-light)"><div class="ss-val">'+list.length+'</div><div class="ss-label">\u603b\u8ba1</div></div>'+
      '<div class="sup-stat"><div class="ss-val" style="color:var(--success)">'+lvCount.A+'</div><div class="ss-label">A\u7ea7</div></div>'+
      '<div class="sup-stat"><div class="ss-val" style="color:var(--primary)">'+lvCount.B+'</div><div class="ss-label">B\u7ea7</div></div>'+
      '<div class="sup-stat"><div class="ss-val" style="color:var(--warning)">'+lvCount.C+'</div><div class="ss-label">C\u7ea7</div></div>'+
      '<div class="sup-stat"><div class="ss-val" style="color:var(--danger)">'+lvCount.D+'</div><div class="ss-label">D\u7ea7</div></div>'+
      '<div class="sup-stat"><div class="ss-val" style="color:var(--danger)">'+lvCount.E+'</div><div class="ss-label">E\u7ea7</div></div>';
    st.innerHTML=catHtml+'<div style="width:100%;height:1px;background:var(--border);margin:4px 0"></div>'+
      sortedCats.map(function(cc){return '<div class="sup-stat sup-cat-stat" onclick="document.getElementById(\'sup-cat-filter\').value=\''+escHtml(cc)+'\';loadSuppliers()"><div class="ss-val" style="font-size:16px">'+catCount[cc]+'</div><div class="ss-label" style="max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+escHtml(cc)+'">'+escHtml(cc)+'</div></div>'}).join('');
  }
  // List
  var el=document.getElementById('sup-list');
  if(!list.length){el.innerHTML='<div style="text-align:center;padding:40px;color:var(--text-secondary)">\u6682\u65e0\u4f9b\u5e94\u5546\uff0c\u70b9\u51fb\u53f3\u4e0a\u89d2\u6dfb\u52a0</div>';return}
  var h='';
  for(var i=0;i<list.length;i++){
    var sp=list[i];
    var prods=[];
    try{prods=JSON.parse(sp.products||'[]')}catch(e){}
    var phones=[];
    try{phones=JSON.parse(sp.contact_phone||'[]')}catch(e){}
    var phoneStr=phones.join(', ');
    var dr=parseFloat(sp.defect_rate)||0;
    var drCls=dr<=1?'defect-ok':dr<=3?'defect-warn':'defect-bad';
    var prodRows='';
    for(var pj=0;pj<prods.length;pj++){
      var pr=prods[pj];
      prodRows+='<tr><td>'+(pr.name||'')+'</td><td>'+(pr.moq||'')+'</td><td style="font-weight:600;color:var(--primary)">'+(pr.unit_price?'\u00a5'+fmtNum(pr.unit_price):'')+'</td></tr>';
    }
    h+='<div class="sup-card"><div class="sc-header"><div><div class="sc-name">'+escHtml(sp.name||'')+'</div><div class="sc-cat">'+(sp.category||'\u672a\u5206\u7c7b')+'</div></div><span class="level-badge level-'+sp.cooperation_level+'">'+(sp.cooperation_level||'C')+'\u7ea7</span></div>';
    if(sp.contact_name||phoneStr)h+='<div class="sc-contact">\U0001f464 '+escHtml(sp.contact_name||'\u672a\u77e5')+(phoneStr?' &nbsp; <a href="tel:'+phones[0]+'">'+escHtml(phoneStr)+'</a>':'')+'</div>';
    if(sp.linked_client_name)h+='<div class="sc-linked"><span style="opacity:0.6">\u2192 \u5173\u8054\u5ba2\u6237:</span> '+escHtml(sp.linked_client_name)+'</div>';
    if(prodRows)h+='<table class="sup-products"><thead><tr><th>\u4ea7\u54c1</th><th>MOQ</th><th>\u5355\u4ef7</th></tr></thead><tbody>'+prodRows+'</tbody></table>';
    h+='<div class="sc-footer"><div class="sc-meta"><span>\U0001f4cd \u5408\u4f5c '+(sp.cooperation_count||0)+' \u6b21</span><span class="'+drCls+'">\u26a0\ufe0f \u6b21\u54c1\u7387 '+(sp.defect_rate||0)+'%</span></div><div class="sc-actions"><button class="btn-sm" style="background:var(--surface);border:1px solid var(--border)" onclick="openSupplierForm('+sp.id+')">\u7f16\u8f91</button><button class="btn-sm" style="background:#fff;color:var(--danger);border:1px solid var(--danger)" onclick="deleteSupplier('+sp.id+')">\u5220\u9664</button></div></div></div>';
  }
  el.innerHTML=h;
}

function openSupplierForm(id){
  supplierEditId=id||null;
  var sp=id?allSuppliers.find(function(x){return x.id===id}):null;
  document.getElementById('sup-modal-title').textContent=sp?'\u7f16\u8f91\u4f9b\u5e94\u5546':'\u65b0\u5efa\u4f9b\u5e94\u5546';
  document.getElementById('sup-name').value=sp?(sp.name||''):'';
  document.getElementById('sup-contact-name').value=sp?(sp.contact_name||''):'';
  document.getElementById('sup-category').value=sp?(sp.category||''):'';
  document.getElementById('sup-cooperation-count').value=sp?(sp.cooperation_count||0):0;
  document.getElementById('sup-cooperation-level').value=sp?(sp.cooperation_level||'C'):'C';
  document.getElementById('sup-defect-rate').value=sp?(sp.defect_rate||0):0;
  document.getElementById('sup-notes').value=sp?(sp.notes||''):'';
  // Linked client
  supLinkedClientId=sp?(sp.linked_client_id||null):null;
  supLinkedClientName=sp?(sp.linked_client_name||''):'';
  var lcs=document.getElementById('sup-link-selected');
  if(supLinkedClientId){lcs.style.display='block';document.getElementById('sup-link-client-name').textContent=supLinkedClientName;document.getElementById('sup-link-client').value='';}else{lcs.style.display='none';document.getElementById('sup-link-client').value='';document.getElementById('sup-link-list').classList.add('hidden');}
  // Phones
  var supPhones=[];
  try{supPhones=JSON.parse(sp?(sp.contact_phone||'[]'):'[]')}catch(e){supPhones=[]}
  if(!supPhones.length)supPhones=[''];
  var phEl=document.getElementById('sup-phones');
  phEl.innerHTML='';
  for(var i=0;i<supPhones.length;i++){
    var row=document.createElement('div');
    row.className='sup-prod-row';
    row.style.marginBottom='6px';
    row.innerHTML='<input value="'+escHtml(supPhones[i])+'" oninput="syncSupPhones()" placeholder="\u8054\u7cfb\u7535\u8bdd '+ (i+1) +'" style="flex:2">'+(supPhones.length>1?'<button class="btn-sm" style="background:#fff;color:var(--danger);border:1px solid var(--danger)" onclick="this.parentElement.remove();syncSupPhones()">\u00d7</button>':'');
    phEl.appendChild(row);
  }
  // Products
  var supProds=[];
  try{supProds=JSON.parse(sp?(sp.products||'[]'):'[]')}catch(e){supProds=[]}
  if(!supProds.length)supProds=[{name:'',moq:'',unit_price:''}];
  var prEl=document.getElementById('sup-products');
  prEl.innerHTML='';
  for(var j=0;j<supProds.length;j++){
    var pr=supProds[j];
    var row2=document.createElement('div');
    row2.className='sup-prod-row';
    row2.innerHTML='<input class="prod-name" value="'+escHtml(pr.name||'')+'" oninput="syncSupProducts()" placeholder="\u4ea7\u54c1\u540d\u79f0"><input class="prod-moq" value="'+escHtml(pr.moq||'')+'" oninput="syncSupProducts()" placeholder="MOQ"><input class="prod-price" value="'+escHtml(pr.unit_price||'')+'" oninput="syncSupProducts()" type="number" step="0.01" placeholder="\u5355\u4ef7">'+(supProds.length>1?'<button class="btn-sm" style="background:#fff;color:var(--danger);border:1px solid var(--danger)" onclick="this.parentElement.remove();syncSupProducts()">\u00d7</button>':'');
    prEl.appendChild(row2);
  }
  document.getElementById('sup-btn-delete').classList.toggle('hidden',!sp);
  document.getElementById('supplier-modal').classList.remove('hidden');
}

function syncSupPhones(){
  var inp=document.querySelectorAll('#sup-phones input');
  var arr=[];
  for(var i=0;i<inp.length;i++){var v=inp[i].value.trim();if(v)arr.push(v)}
}

function syncSupProducts(){
  var rows=document.querySelectorAll('#sup-products .sup-prod-row');
  var arr=[];
  for(var i=0;i<rows.length;i++){
    var r=rows[i];
    var nm=r.querySelector('.prod-name');
    var moq=r.querySelector('.prod-moq');
    var pr=r.querySelector('.prod-price');
    if(nm&&nm.value.trim())arr.push({name:nm.value.trim(),moq:moq?moq.value.trim():'',unit_price:pr?parseFloat(pr.value)||0:0});
  }
}

function addSupPhone(){var el=document.getElementById('sup-phones');var row=document.createElement('div');row.className='sup-prod-row';row.style.marginBottom='6px';row.innerHTML='<input oninput="syncSupPhones()" placeholder="\u8054\u7cfb\u7535\u8bdd" style="flex:2"><button class="btn-sm" style="background:#fff;color:var(--danger);border:1px solid var(--danger)" onclick="this.parentElement.remove();syncSupPhones()">\u00d7</button>';el.appendChild(row)}
function addSupProduct(){var el=document.getElementById('sup-products');var row=document.createElement('div');row.className='sup-prod-row';row.innerHTML='<input class="prod-name" oninput="syncSupProducts()" placeholder="\u4ea7\u54c1\u540d\u79f0"><input class="prod-moq" oninput="syncSupProducts()" placeholder="MOQ"><input class="prod-price" oninput="syncSupProducts()" type="number" step="0.01" placeholder="\u5355\u4ef7"><button class="btn-sm" style="background:#fff;color:var(--danger);border:1px solid var(--danger)" onclick="this.parentElement.remove();syncSupProducts()">\u00d7</button>';el.appendChild(row)}


function searchSupplierLinkClient(){
  var q=document.getElementById('sup-link-client').value.trim().toLowerCase();
  var list=document.getElementById('sup-link-list');
  if(q.length<1){list.classList.add('hidden');return}
  if(!allClients.length){list.innerHTML='<div class="search-list-item" style="color:var(--text3)">\u52a0\u8f7d\u5ba2\u6237\u4e2d...</div>';list.classList.remove('hidden');loadClients().then(function(){searchSupplierLinkClient()});return}
  var matches=allClients.filter(function(c){var cn=(c.name||'').toLowerCase();return cn.indexOf(q)>=0}).slice(0,8);
  if(!matches.length){list.innerHTML='<div class="search-list-item" style="color:var(--text3)">\u65e0\u5339\u914d\u5ba2\u6237</div>';list.classList.remove('hidden');return}
  var h='';
  for(var i=0;i<matches.length;i++){h+='<div class="search-list-item" onclick="selectSupLinkClient(\''+matches[i].id+'\',\''+escHtml(matches[i].name)+'\')"><div class="name">'+escHtml(matches[i].name)+'</div></div>'}
  list.innerHTML=h;list.classList.remove('hidden');
}

function supLinkClientKeydown(e){
  if(e.key==='Escape'){document.getElementById('sup-link-list').classList.add('hidden')}
}

function selectSupLinkClient(id,name){
  supLinkedClientId=id;supLinkedClientName=name;
  document.getElementById('sup-link-client').value='';
  document.getElementById('sup-link-list').classList.add('hidden');
  var lcs=document.getElementById('sup-link-selected');lcs.style.display='block';
  document.getElementById('sup-link-client-name').textContent=name;
}

function clearSupLinkClient(){
  supLinkedClientId=null;supLinkedClientName='';
  document.getElementById('sup-link-selected').style.display='none';
  document.getElementById('sup-link-client').value='';
  var cp=document.getElementById('sup-contact-picker');if(cp)cp.classList.add('hidden');
}

function importClientContacts(){
  if(!supLinkedClientId)return;
  var cl=allClients.find(function(x){return x.id===supLinkedClientId});
  if(!cl){showToast('\u5ba2\u6237\u4e0d\u5b58\u5728');return}
  sb.from('contacts').select('*').eq('client_id',supLinkedClientId).then(function(r){
    if(r.error){showToast('\u52a0\u8f7d\u8054\u7cfb\u4eba\u5931\u8d25');return}
    var contacts=r.data||[];
    if(!contacts.length){showToast('\u8be5\u5ba2\u6237\u6ca1\u6709\u8054\u7cfb\u4eba');return}
    if(contacts.length===1){doImportContact(contacts[0]);return}
    window._supContactCache=contacts;
    var picker=document.getElementById('sup-contact-picker');
    var h='';
    for(var i=0;i<contacts.length;i++){
      var ct=contacts[i];
      var roleLabel=ct.role||'';
      var phones=[];
      try{phones=JSON.parse(ct.phone||'[]')}catch(e){}
      var phonePreview=phones.slice(0,2).join(', ');
      h+='<div class="search-list-item" onclick="doImportContact(window._supContactCache['+i+'])"><div class="name">'+escHtml(ct.name||'\u672a\u547d\u540d')+'</div><div class="sub">'+(roleLabel?escHtml(roleLabel)+' \u00b7 ':'')+(phonePreview||'\u65e0\u7535\u8bdd')+'</div></div>';
    }
    picker.innerHTML=h;picker.classList.remove('hidden');
  })
}

function doImportContact(ct){
  if(!ct)return;
  var nameInp=document.getElementById('sup-contact-name');
  if(!nameInp.value.trim()&&ct.name)nameInp.value=ct.name;
  var phones=[];
  try{phones=JSON.parse(ct.phone||'[]')}catch(e){phones=[]}
  if(phones.length){
    var phEl=document.getElementById('sup-phones');
    phEl.innerHTML='';
    for(var j=0;j<phones.length;j++){
      var row=document.createElement('div');
      row.className='sup-prod-row';
      row.style.marginBottom='6px';
      row.innerHTML='<input value="'+escHtml(phones[j])+'" oninput="syncSupPhones()" placeholder="\u8054\u7cfb\u7535\u8bdd '+(j+1)+'" style="flex:2">'+(phones.length>1?'<button class="btn-sm" style="background:#fff;color:var(--danger);border:1px solid var(--danger)" onclick="this.parentElement.remove();syncSupPhones()">\u00d7</button>':'');
      phEl.appendChild(row);
    }
  }
  document.getElementById('sup-contact-picker').classList.add('hidden');
  showToast('\u5df2\u5bfc\u5165\u8054\u7cfb\u4eba\u4fe1\u606f');
}


function closeSupplierForm(){
  document.getElementById('supplier-modal').classList.add('hidden');
  supplierEditId=null;
  supLinkedClientId=null;supLinkedClientName='';
}

async function saveSupplier(){
  var name=document.getElementById('sup-name').value.trim();
  if(!name){showToast('\u8bf7\u8f93\u5165\u4f9b\u5e94\u5546\u540d\u79f0');return}
  var phInputs=document.querySelectorAll('#sup-phones input');
  var phones=[];
  for(var i=0;i<phInputs.length;i++){var v=phInputs[i].value.trim();if(v)phones.push(v)}
  var prows=document.querySelectorAll('#sup-products .sup-prod-row');
  var prods=[];
  for(var j=0;j<prows.length;j++){
    var r=prows[j];
    var nm=r.querySelector('.prod-name');
    var moq=r.querySelector('.prod-moq');
    var pr=r.querySelector('.prod-price');
    if(nm&&nm.value.trim())prods.push({name:nm.value.trim(),moq:moq?moq.value.trim():'',unit_price:pr?parseFloat(pr.value)||0:0});
  }
  var obj={
    company_id:currentCompanyId,
    name:name,
    contact_name:document.getElementById('sup-contact-name').value.trim()||null,
    contact_phone:JSON.stringify(phones),
    products:JSON.stringify(prods),
    category:document.getElementById('sup-category').value.trim()||null,
    cooperation_count:parseInt(document.getElementById('sup-cooperation-count').value)||0,
    cooperation_level:document.getElementById('sup-cooperation-level').value,
    defect_rate:parseFloat(document.getElementById('sup-defect-rate').value)||0,
    notes:document.getElementById('sup-notes').value.trim()||null,
    linked_client_id:supLinkedClientId||null,
    updated_at:new Date().toISOString()
  };
  if(supplierEditId){await sb.from('suppliers').update(obj).eq('id',supplierEditId)}
  else {await sb.from('suppliers').insert([obj])}
  closeSupplierForm();
  await loadSuppliers();
}

async function deleteSupplier(id){
  var sp=allSuppliers.find(function(x){return x.id===id});
  if(!await confirmDialog('\u786e\u5b9a\u5220\u9664\u4f9b\u5e94\u5546 "'+escHtml(sp?sp.name:'')+'"\uff1f'))return;
  await sb.from('suppliers').delete().eq('id',id);
  await loadSuppliers();
}

var supplierEditId=null;
var supLinkedClientId=null;var supLinkedClientName='';

// Modal injection
(function(){
  var modals=document.createElement('div');
  modals.innerHTML='<div id="supplier-modal" class="modal hidden"><div class="modal-box" style="max-width:560px"><div class="modal-head"><span id="sup-modal-title">\u65b0\u5efa\u4f9b\u5e94\u5546</span><span class="modal-close" onclick="closeSupplierForm()">\u00d7</span></div><div class="modal-body"><div class="form-group"><label>\u4f9b\u5e94\u5546\u540d\u79f0 <span style="font-size:11px;color:var(--text-secondary);font-weight:400">\u2014 \u652f\u6301\u4f01\u4e1a\u540d\u5f55\u81ea\u52a8\u5339\u914d</span></label><div style="position:relative"><input id="sup-name" placeholder="\u5fc5\u586b" autocomplete="off" oninput="onSupNameInput()" onfocus="onSupNameInput()" onkeydown="onSupNameKeydown(event)"><div class="name-suggestions hidden" id="sup-name-suggestions"></div></div></div><div class="form-group"><label>\u8054\u7cfb\u4eba</label><input id="sup-contact-name" placeholder="\u8054\u7cfb\u4eba\u59d3\u540d"></div></div><div class="form-group"><label>\u5173\u8054\u5ba2\u6237</label><div style="position:relative"><input id="sup-link-client" placeholder="\u641c\u7d22\u5173\u8054\u5ba2\u6237..." autocomplete="off" oninput="searchSupplierLinkClient()" onkeydown="supLinkClientKeydown(event)"><div class="search-list hidden" id="sup-link-list"></div></div><div id="sup-link-selected" style="display:none;margin-top:4px;padding:6px 10px;background:var(--primary-light);border-radius:6px;font-size:13px"><span id="sup-link-client-name"></span><button class="btn-xs" style="color:var(--text-secondary);margin-left:8px;cursor:pointer" onclick="clearSupLinkClient()">\u00d7</button><button class="btn-xs" style="color:var(--primary);margin-left:8px;cursor:pointer" onclick="importClientContacts()">\u5bfc\u5165\u8054\u7cfb\u4eba</button><div class="search-list hidden" id="sup-contact-picker" style="margin-top:6px;max-height:160px;overflow-y:auto"></div></div><div class="form-group"><label>\u8054\u7cfb\u7535\u8bdd</label><div id="sup-phones"></div><button class="btn-sm" style="background:var(--surface);border:1px solid var(--border);margin-top:4px" onclick="addSupPhone()">\uff0b \u6dfb\u52a0\u7535\u8bdd</button></div><div class="form-group"><label>\u4ea7\u54c1\u6e05\u5355</label><div id="sup-products"></div><button class="btn-sm" style="background:var(--surface);border:1px solid var(--border);margin-top:4px" onclick="addSupProduct()">\uff0b \u6dfb\u52a0\u4ea7\u54c1</button></div><div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><label>\u7c7b\u522b</label><input id="sup-category" placeholder="\u5982\uff1a\u7535\u5b50\u5143\u4ef6" list="sup-cat-list"><datalist id="sup-cat-list"></datalist></div><div><label>\u5408\u4f5c\u6b21\u6570</label><input id="sup-cooperation-count" type="number" min="0"></div></div><div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><label>\u5408\u4f5c\u7ea7\u522b</label><select id="sup-cooperation-level"><option value="A">A\u7ea7</option><option value="B">B\u7ea7</option><option value="C" selected>C\u7ea7</option><option value="D">D\u7ea7</option><option value="E">E\u7ea7</option></select></div><div><label>\u6b21\u54c1\u7387 (%)</label><input id="sup-defect-rate" type="number" step="0.01" min="0" max="100" value="0"></div></div><div class="form-group"><label>\u5907\u6ce8</label><input id="sup-notes" placeholder="\u53ef\u9009"></div></div><div class="modal-actions"><button class="btn-cancel" onclick="closeSupplierForm()">\u53d6\u6d88</button><button class="btn-delete hidden" id="sup-btn-delete" onclick="deleteSupplier(supplierEditId)">\u5220\u9664</button><button class="btn-save" onclick="saveSupplier()">\u4fdd\u5b58</button></div></div></div>';
  document.body.appendChild(modals);
})();
