#!/usr/bin/env python3
"""
FK cascade: clients/suppliers → companies, scouting → suppliers.
Strategy: 
1. saveClient saves company_directory_id
2. saveSupplier saves company_directory_id
3. saveScouting saves supplier_id
4. loadSuppliers resolves company names from directory
5. openForm/openSupplierForm/editScouting load FK values
6. add syncCompanyDirectoryRefs() for batch sync
7. display code resolves names via FK chain
"""
import os, re

base = r"D:\1kaifa\grsds"
with open(os.path.join(base, "index.html"), "r", encoding="utf-8") as f:
    c = f.read()

changes = []

def replace(old, new, label):
    global c
    if old in c:
        c = c.replace(old, new)
        changes.append(f"OK: {label}")
    else:
        changes.append(f"FAIL: {label}")

# ── 1. saveClient: add company_directory_id lookup ──
# Find the line after name extraction, before uniqueness check
old1 = "  var name=document.getElementById('f-name').value.trim();\n  if(!name){showToast('\\u8bf7\\u8f93\\u5165\\u5ba2\\u6237\\u540d\\u79f0');return}"
new1 = "  var name=document.getElementById('f-name').value.trim();\n  if(!name){showToast('\\u8bf7\\u8f93\\u5165\\u5ba2\\u6237\\u540d\\u79f0');return}\n  // FK: match company directory\n  var dirId=null;var dk=name.toLowerCase();if(allCompaniesMap&&allCompaniesMap[dk])dirId=allCompaniesMap[dk].id;"
replace(old1, new1, "1a. saveClient dirId lookup")

# ── 2. saveClient: insert company_directory_id into client object ──
# Find before project:fp
old2 = "    project:fp,\n    bidding_date:projectsArr.length>0?projectsArr[0].bidding_date:null,"
new2 = "    project:fp,\n    company_directory_id:dirId,\n    bidding_date:projectsArr.length>0?projectsArr[0].bidding_date:null,"
replace(old2, new2, "1b. saveClient dirId in obj")

# ── 3. saveSupplier: add company_directory_id ──
old3 = "  var name=document.getElementById('sup-name').value.trim();\n  if(!name){showToast('\\u8bf7\\u8f93\\u5165\\u4f9b\\u5e94\\u5546\\u540d\\u79f0');return}"
new3 = "  var name=document.getElementById('sup-name').value.trim();\n  if(!name){showToast('\\u8bf7\\u8f93\\u5165\\u4f9b\\u5e94\\u5546\\u540d\\u79f0');return}\n  var dirId=null;var dk=name.toLowerCase();if(allCompaniesMap&&allCompaniesMap[dk])dirId=allCompaniesMap[dk].id;"
replace(old3, new3, "2a. saveSupplier dirId lookup")

# ── 4. saveSupplier: insert company_directory_id into obj ──
old4 = "  var obj={\n    company_id:currentCompanyId,\n    name:name,"
new4 = "  var obj={\n    company_id:currentCompanyId,\n    company_directory_id:dirId,\n    name:name,"
replace(old4, new4, "2b. saveSupplier dirId in obj")

# ── 5. saveScouting: add supplier_id lookup ──
old5 = "    supplier_name:document.getElementById('sc-supplier').value.trim()||null,"
new5 = "    supplier_name:document.getElementById('sc-supplier').value.trim()||null,\n    supplier_id:function(){var sn=document.getElementById('sc-supplier').value.trim().toLowerCase();for(var i=0;i<allSuppliers.length;i++){if((allSuppliers[i].name||'').toLowerCase()===sn)return allSuppliers[i].id}return null}(),"
replace(old5, new5, "3. saveScouting supplier_id")

# ── 6. loadSuppliers: resolve company names from directory ──
old6 = "  allSuppliers=r.data||[];\n  var clientMap={};\n  for(var i=0;i<allClients.length;i++)clientMap[allClients[i].id]=allClients[i].name;\n  for(var j=0;j<allSuppliers.length;j++)allSuppliers[j].linked_client_name=clientMap[allSuppliers[j].linked_client_id]||'';"
new6 = "  allSuppliers=r.data||[];\n  var clientMap={};\n  for(var i=0;i<allClients.length;i++)clientMap[allClients[i].id]=allClients[i].name;\n  // Resolve company directory names for suppliers\n  for(var j=0;j<allSuppliers.length;j++){\n    allSuppliers[j].linked_client_name=clientMap[allSuppliers[j].linked_client_id]||'';\n    if(allSuppliers[j].company_directory_id&&allCompaniesMap){\n      var co=allSuppliers[j];var dco=null;\n      for(var dk2 in allCompaniesMap){if(allCompaniesMap[dk2].id===co.company_directory_id){dco=allCompaniesMap[dk2];break}}\n      if(dco)co._dir_name=dco.name;\n    }\n  }"
replace(old6, new6, "4. loadSuppliers dir name resolution")

# ── 7. openForm: load company_directory_id ──
old7 = "      // Load company_info\n      var ciStr=c.company_info||'{}';"
new7 = "      // Load company_directory_id FK\n      if(c.company_directory_id){\n        for(var dk3 in allCompaniesMap){if(allCompaniesMap[dk3].id===c.company_directory_id){fillCompanyInfo(allCompaniesMap[dk3]);break}}\n      }\n      // Load company_info\n      var ciStr=c.company_info||'{}';"
replace(old7, new7, "5. openForm load dir FK")

# ── 8. openSupplierForm: load company_directory_id ──
old8 = "  document.getElementById('sup-compliance').value=sp?(sp.compliance_requirements||''):'';\n  document.getElementById('sup-compliance').value=sp?(sp.compliance_requirements||''):'';"
new8 = "  document.getElementById('sup-compliance').value=sp?(sp.compliance_requirements||''):'';\n  // FK: if has company_directory_id, show linked company\n  if(sp&&sp.company_directory_id&&allCompaniesMap){\n    for(var dk4 in allCompaniesMap){if(allCompaniesMap[dk4].id===sp.company_directory_id){document.getElementById('sup-name').dataset.dirId=sp.company_directory_id;document.getElementById('sup-name').title='\\u5173\\u8054\\u4f01\\u4e1a\\u540d\\u5f55: '+allCompaniesMap[dk4].name;break}}\n  }"
replace(old8, new8, "6. openSupplierForm load dir FK")

# ── 9. editScouting: load supplier_id ──
old9 = "  document.getElementById('sc-supplier').value=s.supplier_name||'';"
new9 = "  document.getElementById('sc-supplier').value=s.supplier_name||'';\n  document.getElementById('sc-supplier').dataset.supplierId=s.supplier_id||'';"
replace(old9, new9, "7. editScouting load supplier_id")

# ── 10. renderScouting: show resolved supplier info when FK exists ──
# Already handles this via supplier_name; the new FK enables cascade on update.

# ── 11. Add global sync function ──
# Insert before the // === Scouting block
old11 = "// === Scouting Supplier Autocomplete"
new11 = "// === Company Directory Cascade Sync ===\nasync function syncCompanyDirectoryRefs(){\n  // When a company name/record is updated, refresh FK-linked records\n  // Called after company directory save/edit\n  if(!allCompaniesMap)return;\n  // Rebuild allCompaniesMap\n  for(var sk=0;sk<allCompanies.length;sk++){\n    var cc=allCompanies[sk];var ck=(cc.name||'').toLowerCase();if(ck)allCompaniesMap[ck]=cc;\n  }\n  await loadSuppliers();loadClients();\n}\n\n// === Scouting Supplier Autocomplete"
replace(old11, new11, "8. syncCompanyDirectoryRefs function")

# ── 12. renderSuppliers: show linked company directory info ──
old12 = "    h+='<div class=\"sup-card\"><div class=\"sc-header\"><div><div class=\"sc-name\">'+escHtml(sp.name||'')+'</div><div class=\"sc-cat\">'+(sp.category||'\\u672a\\u5206\\u7c7b')+'</div></div><span class=\"level-badge level-'+sp.cooperation_level+'\">'+(sp.cooperation_level||'C')+'\\u7ea7</span></div>';"
new12 = "    h+='<div class=\"sup-card\"><div class=\"sc-header\"><div><div class=\"sc-name\">'+escHtml(sp.name||'')+'</div><div class=\"sc-cat\">'+(sp.category||'\\u672a\\u5206\\u7c7b')+'</div>'+(sp._dir_name&&sp._dir_name!==sp.name?'<div class=\"sc-dir-link\" style=\"font-size:11px;color:var(--primary)\">\\ud83d\\udcc2 \\u4f01\\u4e1a\\u540d\\u5f55: '+escHtml(sp._dir_name)+'</div>':'')+'</div><span class=\"level-badge level-'+sp.cooperation_level+'\">'+(sp.cooperation_level||'C')+'\\u7ea7</span></div>';"
replace(old12, new12, "9. renderSuppliers dir link display")

with open(os.path.join(base, "index.html"), "w", encoding="utf-8") as f:
    f.write(c)

for ch in changes:
    print(ch)
print("=== Done ===")
