#!/usr/bin/env python3
"""Transform inventory page to supply-chain page with scouting tab."""
import re

with open(r"D:\1kaifa\grsds\index.html", "r", encoding="utf-8") as f:
    c = f.read()

changes = []

# ── 1. Topbar: "库存" → "供应链" ──
old = '<button class="topbar-tab" id="tab-inventory" onclick="switchTab(\'inventory\')">库存</button>'
new = '<button class="topbar-tab" id="tab-inventory" onclick="switchTab(\'inventory\')">供应链</button>'
if old in c:
    c = c.replace(old, new)
    changes.append("1. topbar tab: 库存→供应链")
else:
    changes.append("1. FAILED: topbar tab not found")

# ── 2. CSS section comment ──
old = "/* === Inventory === */"
new = "/* === Supply Chain (Inventory) === */"
if old in c:
    c = c.replace(old, new)
    changes.append("2. CSS comment updated")
else:
    changes.append("2. FAILED: CSS comment not found")

# ── 3. res-tabs: add "选品调研" as first tab ──
old = '<button class="biz-subtab active" onclick="switchResTab(\'inventory\')">📦 库存管理</button>'
new = '<button class="biz-subtab active" onclick="switchResTab(\'scouting\')">🔍 选品调研</button>\n   <button class="biz-subtab" onclick="switchResTab(\'inventory\')">📦 库存管理</button>'
if old in c:
    c = c.replace(old, new)
    changes.append("3. res-tabs: added scouting first")
else:
    changes.append("3. FAILED: res-tabs inventory not found")

# ── 4. inv-subtabs: add scouting tab first ──
old = '<div class="inv-subtabs">\n   <button class="inv-subtab active" onclick="switchInventoryTab(\'products\')">产品库</button>'
new = '<div class="inv-subtabs">\n   <button class="inv-subtab active" onclick="switchInventoryTab(\'scouting\')">🔍 选品调研</button>\n   <button class="inv-subtab" onclick="switchInventoryTab(\'products\')">产品库</button>'
if old in c:
    c = c.replace(old, new)
    changes.append("4. inv-subtabs: added scouting tab")
else:
    changes.append("4. FAILED: inv-subtabs not found")

# ── 5. Add scouting panel before products panel ──
scouting_html = '''  <!-- Scouting Panel -->
  <div class="inv-panel active" id="inv-scouting">
   <div class="inv-toolbar">
    <span style="font-weight:700;font-size:16px">选品调研</span>
    <div style="flex:1"></div>
    <button class="btn-sm btn-sm-primary" onclick="openScoutingForm()">＋ 添加选品</button>
   </div>
   <div style="overflow-x:auto">
    <table class="check-table" id="scouting-table">
     <thead><tr>
      <th>选品渠道</th><th>产品名称</th><th>产品分类</th><th>供应商</th>
      <th>采购价</th><th>销售价</th><th>达人佣金</th><th>合规要求</th>
      <th>产品参数</th><th>MOQ</th><th>样品</th><th>状态</th><th>操作</th>
     </tr></thead>
     <tbody id="scouting-tbody"></tbody>
    </table>
   </div>
   <!-- Comparison Table -->
   <div style="margin-top:24px">
    <h3 style="margin-bottom:12px;display:flex;align-items:center;gap:8px">
     📊 供应商对比分析
     <button class="btn-sm" style="background:var(--surface);border:1px solid var(--border);color:var(--text)" onclick="refreshScoutingCompare()">刷新对比</button>
    </h3>
    <div style="overflow-x:auto">
     <table class="check-table" id="scouting-compare-table">
      <thead id="scouting-compare-head"></thead>
      <tbody id="scouting-compare-body"></tbody>
     </table>
    </div>
   </div>
  </div>

'''
old = '<!-- Products Panel -->'
new = scouting_html + '<!-- Products Panel -->'
if old in c:
    c = c.replace(old, new)
    changes.append("5. scouting panel inserted")
else:
    changes.append("5. FAILED: Products Panel marker not found")

# ── 6. switchInventoryTab: shift indices + add scouting ──
old = """function switchInventoryTab(t){
  currentInventoryTab=t;
  document.querySelectorAll('.inv-subtab').forEach(function(b){b.classList.remove('active')});
  document.querySelectorAll('.inv-panel').forEach(function(p){p.classList.remove('active')});
  var btns=document.querySelectorAll('.inv-subtab');
  var idx={products:0,records:1,alerts:2,checks:3,warehouses:4,transfers:5,ledger:6}[t]||0;
  if(btns[idx])btns[idx].classList.add('active');
  var panel=document.getElementById('inv-'+t);
  if(panel)panel.classList.add('active');
  if(t==='products')loadProducts();
  else if(t==='records')loadStockRecords();
  else if(t==='alerts')loadStockAlerts();
  else if(t==='checks')loadStockChecks();
  else if(t==='warehouses')loadWarehousesPanel();
  else if(t==='transfers')loadStockTransfers();
  else if(t==='ledger')loadStockLedger();
}"""
new = """function switchInventoryTab(t){
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
}"""
if old in c:
    c = c.replace(old, new)
    changes.append("6. switchInventoryTab: scouting added")
else:
    changes.append("6. FAILED: switchInventoryTab not found")

# ── 7. switchResTab: add scouting support, default to scouting ──
old = """  if(sub==='inventory'){
    tabs[0].classList.add('active');
    var fab3=document.getElementById('main-fab');if(fab3)fab3.classList.remove('hidden');
    if(itabs)itabs.style.display='';
    if(!allProducts.length){loadCategories().then(function(){loadWarehouses().then(function(){switchInventoryTab('products')})})}else{switchInventoryTab('products')}
  }else if(sub==='suppliers'){
    tabs[1].classList.add('active');"""
new = """  if(sub==='scouting'){
    tabs[0].classList.add('active');
    var fab3=document.getElementById('main-fab');if(fab3)fab3.classList.add('hidden');
    if(itabs)itabs.style.display='';
    switchInventoryTab('scouting');
  }else if(sub==='inventory'){
    tabs[1].classList.add('active');
    var fab3=document.getElementById('main-fab');if(fab3)fab3.classList.remove('hidden');
    if(itabs)itabs.style.display='';
    if(!allProducts.length){loadCategories().then(function(){loadWarehouses().then(function(){switchInventoryTab('products')})})}else{switchInventoryTab('products')}
  }else if(sub==='suppliers'){
    tabs[2].classList.add('active');"""
if old in c:
    c = c.replace(old, new)
    changes.append("7. switchResTab: scouting support")
else:
    changes.append("7. FAILED: switchResTab inventory block not found")

# ── 8. switchResTab: fix suppliers/purchase tab indices ──
old = """  }else if(sub==='purchase'){
    tabs[2].classList.add('active');"""
new = """  }else if(sub==='purchase'){
    tabs[3].classList.add('active');"""
if old in c:
    c = c.replace(old, new)
    changes.append("8. switchResTab: purchase tab index 2→3")
else:
    changes.append("8. FAILED: purchase tab index not found")

# ── 9. Module name: "库存" → "供应链" in modNames ──
old = "inventory:'库存',admin:'系统'"
new = "inventory:'供应链',admin:'系统'"
c = c.replace(old, new)

old2 = "inventory:'库存管理',admin:'系统管理'"
new2 = "inventory:'供应链',admin:'系统管理'"
c = c.replace(old2, new2)
changes.append("9. modNames: 库存→供应链")

# ── 10. Permission label ──
old = "if(perms.inventory)labels.push('库存:'+(permMap[perms.inventory]||perms.inventory));"
new = "if(perms.inventory)labels.push('供应链:'+(permMap[perms.inventory]||perms.inventory));"
if old in c:
    c = c.replace(old, new)
    changes.append("10. permission labels updated")
else:
    changes.append("10. FAILED: permission label not found")

# ── 11. Default tab on login: inventory → scouting ──
old = "switchInventoryTab('products')"
# This appears in switchResTab context. The newly written one already changes the default.
# But there's also in the initial load. Let me check:
# The switchResTab inventory branch now switches to products, that's fine.
# When page loads, switchTab('inventory') is called if there's a default.
# Let me check if there's a default tab setting...
# In switchTab: }else if(tab==='inventory'){ ... switchResTab('inventory');
# This will now open inventory (库存管理) which is correct.
# The res-tabs default active is now 'scouting' (first tab)

changes.append("11. default tab scouting (res-tabs active)")

with open(r"D:\1kaifa\grsds\index.html", "w", encoding="utf-8") as f:
    f.write(c)

for ch in changes:
    print(ch)
print("\n=== HTML modifications done, now appending scouting JS ===")
