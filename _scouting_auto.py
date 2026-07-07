#!/usr/bin/env python3
"""Add company directory autocomplete to scouting supplier field."""
with open(r"D:\1kaifa\grsds\index.html", "r", encoding="utf-8") as f:
    c = f.read()

changes = []

# ── 1. Update scouting modal HTML: supplier field with autocomplete ──
old = '<div class="form-group"><label>供应商</label><input id="sc-supplier" placeholder="供应商名称"></div>'
new = '<div class="form-group"><label>供应商 <span style="font-size:11px;color:var(--text-secondary);font-weight:400">— 支持企业名录自动匹配</span></label><div style="position:relative"><input id="sc-supplier" placeholder="供应商名称" autocomplete="off" oninput="onScoutingSupplierInput()" onfocus="onScoutingSupplierInput()" onkeydown="onScoutingSupplierKeydown(event)"><div class="name-suggestions hidden" id="sc-supplier-suggestions"></div></div></div>'
if old in c:
    c = c.replace(old, new)
    changes.append("1. scouting modal supplier with autocomplete")
else:
    changes.append("1. FAILED: sc supplier old text not found")

# ── 2. Update scouting modal HTML: product category with datalist from scouting ──
old_cat = '<div class="form-group"><label>产品分类</label><input id="sc-product-category" placeholder="如：电子、服饰" list="sc-cat-list"><datalist id="sc-cat-list"></datalist></div>'
# No change needed, it already has datalist

# ── 3. Add channel as text input with datalist suggestions ──
old_chan = '<div class="form-group"><label>选品渠道 *</label><select id="sc-channel"><option value="">请选择</option><option value="1688">1688</option><option value="义乌">义乌</option><option value="亚马逊">亚马逊</option><option value="TikTok Shop">TikTok Shop</option><option value="拼多多">拼多多</option><option value="淘宝">淘宝</option><option value="京东">京东</option><option value="其他">其他</option></select></div>'
new_chan = '<div class="form-group"><label>选品渠道 *</label><input id="sc-channel" placeholder="如：1688、义乌..." list="sc-channel-list" autocomplete="off"><datalist id="sc-channel-list"><option value="1688"><option value="义乌"><option value="亚马逊"><option value="TikTok Shop"><option value="拼多多"><option value="淘宝"><option value="京东"><option value="其他"></datalist></div>'
if old_chan in c:
    c = c.replace(old_chan, new_chan)
    changes.append("2. scouting channel: select→input+datalist")
else:
    changes.append("2. FAILED: sc channel not found")

# ── 4. Add MOQ placeholder info ──
old_moq = '<div class="form-group"><label>MOQ</label><input id="sc-moq" type="number" min="1" placeholder="最小起订量"></div>'
# Already fine

# ── 5. Insert scouting autocomplete JS functions ──
# Find the inject point: after "// ═══════════ SCOUTING" and the existing loadScouting etc functions
# Find the approveScouting function and add before it
marker = "async function approveScouting(id){"
if marker in c:
    autocomplete_js = r"""
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

"""
    c = c.replace(marker, autocomplete_js + marker)
    changes.append("3. scouting supplier autocomplete JS inserted")
else:
    changes.append("3. FAILED: approveScouting marker not found")

# ── 6. Also fix product_name autocomplete from scouting data ──
# Add datalist population in openScoutingForm and editScouting
# Find the renderScParams call in openScoutingForm
old_of = "renderScParams();\n  document.getElementById('scouting-modal').classList.remove('hidden');\n  // Update categories datalist"
if old_of in c:
    new_of = "renderScParams();\n  // Update supplier autocomplete with existing scouting suppliers\n  updateScoutingDatalists();\n  document.getElementById('scouting-modal').classList.remove('hidden');\n  // Update categories datalist"
    c = c.replace(old_of, new_of)
    changes.append("4. openScoutingForm: added updateScoutingDatalists call")
else:
    changes.append("4. FAILED: openScoutingForm renderScParams not found")

# ── 7. Also add to editScouting ──
old_ef = "  renderScParams();\n  document.getElementById('scouting-modal').classList.remove('hidden');\n}"
if old_ef in c:
    new_ef = "  renderScParams();\n  updateScoutingDatalists();\n  document.getElementById('scouting-modal').classList.remove('hidden');\n}"
    c = c.replace(old_ef, new_ef)
    changes.append("5. editScouting: added updateScoutingDatalists call")
else:
    changes.append("5. FAILED: editScouting renderScParams not found")

# ── 8. Add updateScoutingDatalists function ──
# Insert before the approveScouting function
marker2 = "async function approveScouting(id){"
if marker2 in c:
    datalist_fn = r"""
function updateScoutingDatalists(){
  // Update product name datalist
  var names=[],cats=[],suppliers=[];
  for(var i=0;i<allScouting.length;i++){
    var s=allScouting[i];
    if(s.product_name&&names.indexOf(s.product_name)<0)names.push(s.product_name);
    if(s.product_category&&cats.indexOf(s.product_category)<0)cats.push(s.product_category);
    if(s.supplier_name&&suppliers.indexOf(s.supplier_name)<0)suppliers.push(s.supplier_name);
  }
  document.getElementById('sc-cat-list').innerHTML=cats.map(function(x){return '<option value="'+escHtml(x)+'">'}).join('');
}

"""
    c = c.replace(marker2, datalist_fn + marker2)
    changes.append("6. updateScoutingDatalists function inserted")
else:
    changes.append("6. FAILED: approveScouting (marker2) not found")

with open(r"D:\1kaifa\grsds\index.html", "w", encoding="utf-8") as f:
    f.write(c)

for ch in changes:
    print(ch)
print("=== Done ===")
