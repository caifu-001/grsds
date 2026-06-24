import os

path = r"D:\1kaifa\grsds\index.html"
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

changes = 0

# ============================================================
# 1. Bind panel to step 6 + markStepDone auto-advance
# ============================================================
old_step6 = "{seq:6,phase:'内部赋能',key:'training',name:'学习培训',icon:'🎓'},"
new_step6 = "{seq:6,phase:'内部赋能',key:'training',name:'学习培训',icon:'🎓',panel:'training',tip:'完成培训后自动跳转步骤7'},"
if old_step6 in html:
    html = html.replace(old_step6, new_step6, 1)
    changes += 1
    print("[OK] Step 6 panel binding added")

# ============================================================
# 2. Add training panel HTML (before wb-panel-basic)
# ============================================================
training_panel = '''    <!-- Step 6: Training -->
    <div id="wb-panel-training" class="hidden" style="max-width:700px">
     <h3 style="margin:0 0 4px">🎓 学习培训</h3>
     <p style="font-size:12px;color:var(--text3);margin:0 0 12px">完成培训后点击"完成培训"自动跳转步骤7</p>
     <div style="display:flex;gap:8px;margin-bottom:4px;position:relative">
      <input id="wb-training-org" placeholder="培训机构名称（搜索客户库）..." autocomplete="off" oninput="onTrainingOrgInput()" onkeydown="onTrainingOrgKey(event)" style="flex:1;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)">
      <div class="name-suggestions hidden" id="wb-training-suggestions" style="position:absolute;top:42px;left:0;right:0;z-index:50"></div>
     </div>
     <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div>
       <label style="font-size:11px;color:var(--text3)">培训导师</label>
       <input id="wb-training-tutor" placeholder="可选" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)">
      </div>
      <div>
       <label style="font-size:11px;color:var(--text3)">导师电话</label>
       <input id="wb-training-tutor-phone" placeholder="可选" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)">
      </div>
     </div>
     <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div>
       <label style="font-size:11px;color:var(--text3)">产品培训内容</label>
       <input id="wb-training-product" placeholder="可选" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)">
      </div>
      <div>
       <label style="font-size:11px;color:var(--text3)">方案培训内容</label>
       <input id="wb-training-solution" placeholder="可选" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)">
      </div>
     </div>
     <div style="margin-bottom:12px">
      <label style="font-size:11px;color:var(--text3)">参与培训人员</label>
      <input id="wb-training-participants" placeholder="可选，多人用逗号分隔" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)">
     </div>
     <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn-sm" style="background:var(--bg);border:1px solid var(--border);color:var(--text2);padding:8px 16px;border-radius:8px;cursor:pointer;font-size:14px" onclick="saveTrainingData()">💾 保存</button>
      <button class="btn-save" onclick="completeTraining()">✅ 完成培训，进入步骤7</button>
     </div>
    </div>
'''

old_marker = "<!-- Step 3: Get Competitor List"
if old_marker in html:
    html = html.replace(old_marker, training_panel + "\n    " + old_marker, 1)
    changes += 1
    print("[OK] Training panel HTML inserted")
else:
    print("[ERR] Marker not found for training panel insertion")

# ============================================================
# 3. Add training JS functions + update showStepPanel / saveStepNote
# ============================================================
# Find saveStepNote's save button handler area
old_save_step = "  if(panel==='competitor'){\n    data.competitor_note=(document.getElementById('wb-competitor-note')?document.getElementById('wb-competitor-note').value:'');\n    return\n  }"

new_save_step = "  if(panel==='competitor'){\n    data.competitor_note=(document.getElementById('wb-competitor-note')?document.getElementById('wb-competitor-note').value:'');\n    return\n  }\n  if(panel==='training'){\n    var td={};\n    td.training_org=(document.getElementById('wb-training-org')?document.getElementById('wb-training-org').value.trim():'');\n    td.training_tutor=(document.getElementById('wb-training-tutor')?document.getElementById('wb-training-tutor').value.trim():'');\n    td.training_tutor_phone=(document.getElementById('wb-training-tutor-phone')?document.getElementById('wb-training-tutor-phone').value.trim():'');\n    td.training_product=(document.getElementById('wb-training-product')?document.getElementById('wb-training-product').value.trim():'');\n    td.training_solution=(document.getElementById('wb-training-solution')?document.getElementById('wb-training-solution').value.trim():'');\n    td.training_participants=(document.getElementById('wb-training-participants')?document.getElementById('wb-training-participants').value.trim():'');\n    curWorkflow[6].data=(curWorkflow[6].data||{});\n    Object.assign(curWorkflow[6].data,td);\n    saveWorkflow();\n    showToast('培训数据已保存');\n    return\n  }"

if old_save_step in html:
    html = html.replace(old_save_step, new_save_step, 1)
    changes += 1
    print("[OK] saveStepNote training case added")

# ============================================================
# 4. Update showStepPanel to load training data
# ============================================================
# Find the competitor case in showStepPanel
old_show_step_comp = "case 'competitor':\n      if(document.getElementById('wb-competitor-note'))document.getElementById('wb-competitor-note').value=(curWorkflow[4]?(curWorkflow[4].data||{}).competitor_note||'':'');\n      renderCompetitorCards();\n      if(panelEl)panelEl.classList.remove('hidden');\n      break;"

new_show_step_comp = "case 'competitor':\n      if(document.getElementById('wb-competitor-note'))document.getElementById('wb-competitor-note').value=(curWorkflow[4]?(curWorkflow[4].data||{}).competitor_note||'':'');\n      renderCompetitorCards();\n      if(panelEl)panelEl.classList.remove('hidden');\n      break;\n    case 'training':\n      var td6=(curWorkflow[6]?(curWorkflow[6].data||{}):{});\n      if(document.getElementById('wb-training-org'))document.getElementById('wb-training-org').value=td6.training_org||'';\n      if(document.getElementById('wb-training-tutor'))document.getElementById('wb-training-tutor').value=td6.training_tutor||'';\n      if(document.getElementById('wb-training-tutor-phone'))document.getElementById('wb-training-tutor-phone').value=td6.training_tutor_phone||'';\n      if(document.getElementById('wb-training-product'))document.getElementById('wb-training-product').value=td6.training_product||'';\n      if(document.getElementById('wb-training-solution'))document.getElementById('wb-training-solution').value=td6.training_solution||'';\n      if(document.getElementById('wb-training-participants'))document.getElementById('wb-training-participants').value=td6.training_participants||'';\n      if(panelEl)panelEl.classList.remove('hidden');\n      break;"

if old_show_step_comp in html:
    html = html.replace(old_show_step_comp, new_show_step_comp, 1)
    changes += 1
    print("[OK] showStepPanel training case added")

# ============================================================
# 5. Add saveTrainingData / completeTraining / training org search functions
# ============================================================
old_func_marker = "function saveCompetitorAnalysis(){"
if old_func_marker in html:
    training_js = '''// ---- Training (step 6) ----
function saveTrainingData(){
  if(!curProjectId)return;
  curWorkflow[6]=curWorkflow[6]||{done:false,note:'',data:{}};
  curWorkflow[6].data=(curWorkflow[6].data||{});
  curWorkflow[6].data.training_org=document.getElementById('wb-training-org').value.trim();
  curWorkflow[6].data.training_tutor=document.getElementById('wb-training-tutor').value.trim();
  curWorkflow[6].data.training_tutor_phone=document.getElementById('wb-training-tutor-phone').value.trim();
  curWorkflow[6].data.training_product=document.getElementById('wb-training-product').value.trim();
  curWorkflow[6].data.training_solution=document.getElementById('wb-training-solution').value.trim();
  curWorkflow[6].data.training_participants=document.getElementById('wb-training-participants').value.trim();
  saveWorkflow();
  showToast('培训数据已保存');
}
function completeTraining(){
  saveTrainingData();
  curWorkflow[6].done=true;
  curWorkflow[6].note='培训完成';
  curWorkflow[6].completed_at=new Date().toISOString();
  saveWorkflow();
  // Auto-advance to step 7
  var step7Idx=WORKFLOW_STEPS.findIndex(function(s){return s.key==='identity_decision'});
  if(step7Idx>=0){
    curProject.current_step=step7Idx+1;
    updateProjectCurrentStep();
  }
  currentWorkflowStep=6;
  markStepDone();
}
function onTrainingOrgInput(){
  var val=document.getElementById('wb-training-org').value.trim();
  var sug=document.getElementById('wb-training-suggestions');
  if(!sug)return;
  if(val.length<1){sug.classList.add('hidden');return}
  var matches=allClients.filter(function(c){return c.name&&c.name.toLowerCase().indexOf(val.toLowerCase())>=0}).slice(0,8);
  if(!matches.length){sug.classList.add('hidden');return}
  var s='';
  for(var i=0;i<matches.length;i++){
    s+='<div class="name-suggestion-item" onclick="selectTrainingOrg('+JSON.stringify(matches[i].id)+','+JSON.stringify(matches[i].name)+')">'+h(matches[i].name)+'</div>';
  }
  sug.innerHTML=s;sug.classList.remove('hidden');
}
function onTrainingOrgKey(e){
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){navigateSuggestions('wb-training-suggestions',e)}
  else if(e.key==='Enter'){e.preventDefault();selectSuggestion('wb-training-suggestions','wb-training-org')}
  else if(e.key==='Escape'){document.getElementById('wb-training-suggestions').classList.add('hidden')}
}
function selectTrainingOrg(clientId,clientName){
  document.getElementById('wb-training-org').value=clientName;
  document.getElementById('wb-training-suggestions').classList.add('hidden');
  // Auto-fill tutor from client's first contact
  var client=allClients.find(function(c){return c.id===clientId});
  if(client&&(client.contacts||[]).length){
    var ct=client.contacts[0];
    if(!document.getElementById('wb-training-tutor').value)document.getElementById('wb-training-tutor').value=ct.name||'';
    if(!document.getElementById('wb-training-tutor-phone').value)document.getElementById('wb-training-tutor-phone').value=ct.phone||'';
  }
}

'''
    html = html.replace(old_func_marker, training_js + old_func_marker, 1)
    changes += 1
    print("[OK] Training JS functions added")

# ============================================================
# 6. Add wb-panel-training to switchProjectTab panel list
# ============================================================
old_panel_list = "var panels=['wb-panel-basic','wb-panel-editor','wb-panel-competitor','wb-panel-decision-chain',"
new_panel_list = "var panels=['wb-panel-basic','wb-panel-editor','wb-panel-competitor','wb-panel-decision-chain','wb-panel-training',"
if old_panel_list in html:
    html = html.replace(old_panel_list, new_panel_list, 1)
    changes += 1
    print("[OK] wb-panel-training added to panel list")

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\nTotal changes: {changes}")
print(f"File size: {os.path.getsize(path)}")
