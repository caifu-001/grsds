import os

path = r"D:\1kaifa\grsds\index.html"
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

changes = 0

# ============================================================
# 1. REPLACE wb-panel-competitor with proper competitor picker
# ============================================================
old_competitor_panel = '''    <div id="wb-panel-competitor" class="hidden" style="max-width:640px">
     <h3 style="margin:0 0 12px">📊 竞争分析</h3>
     <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:12px">
      <label style="font-size:12px;font-weight:600">竞争对手名单（每行一个）</label>
      <textarea id="wb-competitor-list" rows="5" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text);margin-bottom:12px" placeholder="公司A&#10;公司B&#10;公司C"></textarea>
      <label style="font-size:12px;font-weight:600">竞争分析笔记</label>
      <textarea id="wb-competitor-note" rows="5" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text)" placeholder="优劣势分析、市场份额、关键人..."></textarea>
      <button class="btn-save" style="margin-top:8px" onclick="saveStepNote()">💾 保存</button>
     </div>
    </div>'''

new_competitor_panel = '''    <!-- Step 3: Get Competitor List (linked to clients) -->
    <div id="wb-panel-competitor" class="hidden" style="max-width:720px">
     <h3 style="margin:0 0 4px">📋 获取竞争对手名单</h3>
     <p style="font-size:12px;color:var(--text3);margin:0 0 12px">从客户库中搜索并选择竞争对手公司，支持添加多个公司</p>
     <!-- Search / Add bar -->
     <div style="display:flex;gap:8px;margin-bottom:4px;position:relative">
      <input id="wb-competitor-search" placeholder="搜索客户库中的公司名称..." autocomplete="off" oninput="onCompSearchInput()" onkeydown="onCompSearchKey(event)" style="flex:1;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)">
      <button class="btn-sm btn-sm-primary" onclick="addCompetitorFromSearch()">+ 添加</button>
      <div class="name-suggestions hidden" id="wb-comp-suggestions" style="position:absolute;top:42px;left:0;right:0;z-index:50"></div>
     </div>
     <!-- Competitor cards -->
     <div id="wb-competitor-cards" style="display:flex;flex-direction:column;gap:8px;margin:0 0 12px"></div>
     <!-- Step 4: Competition analysis notes -->
     <h3 style="margin:16px 0 4px">📊 竞争与分析</h3>
     <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:16px">
      <label style="font-size:12px;font-weight:600">竞争分析笔记</label>
      <textarea id="wb-competitor-note" rows="5" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text);margin-top:8px" placeholder="优劣势分析、市场份额、关键人..."></textarea>
      <button class="btn-save" style="margin-top:8px" onclick="saveCompetitorAnalysis()">💾 保存分析</button>
     </div>
     <div style="text-align:right;margin-top:12px">
      <button class="btn-save" onclick="markStepDone()">✓ 完成当前步骤，进入下一步</button>
     </div>
    </div>'''

if old_competitor_panel in html:
    html = html.replace(old_competitor_panel, new_competitor_panel, 1)
    changes += 1
    print("[OK] Competitor panel replaced")
else:
    print("[ERR] Competitor panel not found")

# ============================================================
# 2. ADD competitor JS functions
# ============================================================
old_onOppKey = "function onOppCompanyKey(e){\n  if(e.key==='ArrowDown'||e.key==='ArrowUp'){navigateSuggestions('opp-company-suggestions',e)}\n  else if(e.key==='Enter'){selectSuggestion('opp-company-suggestions','pf-company-name')}\n  else if(e.key==='Escape'){document.getElementById('opp-company-suggestions').classList.add('hidden')}\n}"

new_onOppKey = '''function onOppCompanyKey(e){
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){navigateSuggestions('opp-company-suggestions',e)}
  else if(e.key==='Enter'){selectSuggestion('opp-company-suggestions','pf-company-name')}
  else if(e.key==='Escape'){document.getElementById('opp-company-suggestions').classList.add('hidden')}
}

// ---- Competitor Picker (step 3) ----
function getCompList(){
  if(!curProjectId||!curWorkflow[3])return[];
  return (curWorkflow[3].data||{}).comp_list||[];
}
function setCompList(list){
  if(!curProjectId)return;
  curWorkflow[3]=curWorkflow[3]||{done:false,note:'',data:{}};
  curWorkflow[3].data=(curWorkflow[3].data||{});
  curWorkflow[3].data.comp_list=list||[];
  renderCompetitorCards();
  saveWorkflow();
}

function renderCompetitorCards(){
  var container=document.getElementById('wb-competitor-cards');
  if(!container)return;
  var list=getCompList();
  if(!list.length){container.innerHTML='<div style="color:var(--text3);font-size:13px;padding:8px 0">暂无竞争对手，请从上方搜索添加</div>';return}
  var s='';
  for(var i=0;i<list.length;i++){
    var c=list[i];var idx=i;
    s+='<div class="comp-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px;position:relative">';
    s+='<button style="position:absolute;top:8px;right:10px;background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px" onclick="removeCompetitor('+idx+')" title="移除">×</button>';
    s+='<div style="font-weight:700;font-size:15px;margin-bottom:8px;padding-right:24px">'+h(c.company_name||'未命名')+'</div>';
    s+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 12px">';
    s+='<div><span style="font-size:11px;color:var(--text3)">项目负责人</span><div style="font-size:13px">'+h(c.project_manager||'-')+'</div></div>';
    s+='<div><span style="font-size:11px;color:var(--text3)">手机</span><div style="font-size:13px">'+h(c.phone||'-')+'</div></div>';
    s+='<div><span style="font-size:11px;color:var(--text3)">座机</span><div style="font-size:13px">'+h(c.landline||'-')+'</div></div>';
    s+='<div><span style="font-size:11px;color:var(--text3)">邮箱</span><div style="font-size:13px">'+h(c.email||'-')+'</div></div>';
    s+='</div>';
    s+='<button class="btn-sm" style="margin-top:8px;background:var(--bg);border:1px solid var(--border);color:var(--text2);font-size:12px;padding:4px 10px;border-radius:6px;cursor:pointer" onclick="editCompetitor('+idx+')">✎ 编辑</button>';
    s+='</div>';
  }
  container.innerHTML=s;
}

function onCompSearchInput(){
  var val=document.getElementById('wb-competitor-search').value.trim();
  var sug=document.getElementById('wb-comp-suggestions');
  if(!sug)return;
  if(val.length<1){sug.classList.add('hidden');return}
  var matches=allClients.filter(function(c){return c.name&&c.name.toLowerCase().indexOf(val.toLowerCase())>=0}).slice(0,8);
  if(!matches.length){sug.classList.add('hidden');return}
  var s='';
  for(var i=0;i<matches.length;i++){
    s+='<div class="name-suggestion-item" onclick="selectCompClient(\''+h(matches[i].id)+'\',\''+h(matches[i].name).replace(/'/g,"\\\\'")+'\')">'+h(matches[i].name)+'</div>';
  }
  sug.innerHTML=s;sug.classList.remove('hidden');
}
function onCompSearchKey(e){
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){navigateSuggestions('wb-comp-suggestions',e)}
  else if(e.key==='Enter'){e.preventDefault();selectSuggestion('wb-comp-suggestions','wb-competitor-search')}
  else if(e.key==='Escape'){document.getElementById('wb-comp-suggestions').classList.add('hidden')}
}
function selectCompClient(clientId,clientName){
  document.getElementById('wb-competitor-search').value=clientName;
  document.getElementById('wb-comp-suggestions').classList.add('hidden');
  _compSelectClientId=clientId;
}
var _compSelectClientId=null,_compEditIdx=-1;

function addCompetitorFromSearch(){
  var name=document.getElementById('wb-competitor-search').value.trim();
  if(!name){showToast('请输入公司名称');return}
  var client=allClients.find(function(c){return c.id===_compSelectClientId});
  if(_compEditIdx>=0){
    // Edit mode
    var list=getCompList();
    var existing=list[_compEditIdx]||{};
    existing.company_name=name;
    existing.client_id=_compSelectClientId||'';
    if(client){
      // Try to get first contact
      if(!existing.project_manager&&(client.contacts||[]).length)existing.project_manager=(client.contacts[0].name||'');
      if(!existing.phone&&(client.contacts||[]).length)existing.phone=(client.contacts[0].phone||'');
    }
    setCompList(list);
    _compEditIdx=-1;
    document.getElementById('wb-competitor-search').value='';
    _compSelectClientId=null;
    return;
  }
  // Check duplicate
  var list=getCompList();
  if(list.some(function(c){return c.company_name===name})){
    showToast('该公司已在列表中');return;
  }
  var entry={company_name:name,client_id:_compSelectClientId||'',project_manager:'',phone:'',landline:'',email:''};
  if(client){
    var contacts=client.contacts||[];
    if(contacts.length){
      entry.project_manager=contacts[0].name||'';
      entry.phone=contacts[0].phone||'';
      entry.email=contacts[0].email||'';
    }
  }
  list.push(entry);
  setCompList(list);
  document.getElementById('wb-competitor-search').value='';
  _compSelectClientId=null;
}

function removeCompetitor(idx){
  var list=getCompList();
  list.splice(idx,1);
  setCompList(list);
}

function editCompetitor(idx){
  var list=getCompList();
  var c=list[idx];
  if(!c)return;
  document.getElementById('wb-competitor-search').value=c.company_name||'';
  _compSelectClientId=c.client_id||'';
  _compEditIdx=idx;
  // Show the detail editor
  showCompetitorDetailEditor(c,idx);
}

function showCompetitorDetailEditor(c,idx){
  var old=document.getElementById('wb-comp-detail-editor');
  if(old)old.remove();
  var div=document.createElement('div');
  div.id='wb-comp-detail-editor';
  div.style.cssText='background:var(--card-bg);border:1px solid var(--primary);border-radius:10px;padding:16px;margin:12px 0';
  div.innerHTML=''+
    '<h4 style="margin:0 0 12px">✎ 编辑：'+h(c.company_name||'')+'</h4>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+
    '<div><label style="font-size:11px">项目负责人</label><input id="comp-ed-pm" value="'+h(c.project_manager||'')+'" style="width:100%" placeholder="对手公司该项目的销售"></div>'+
    '<div><label style="font-size:11px">手机</label><input id="comp-ed-phone" value="'+h(c.phone||'')+'" style="width:100%" placeholder="不能有空格"></div>'+
    '<div><label style="font-size:11px">座机</label><input id="comp-ed-landline" value="'+h(c.landline||'')+'" style="width:100%" placeholder="不能有空格"></div>'+
    '<div><label style="font-size:11px">邮箱</label><input id="comp-ed-email" value="'+h(c.email||'')+'" style="width:100%" placeholder="邮箱"></div>'+
    '</div>'+
    '<div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">'+
    '<button class="btn-cancel" onclick="cancelCompEdit()">取消</button>'+
    '<button class="btn-save" onclick="saveCompDetail('+idx+')">保存</button></div>';
  var cards=document.getElementById('wb-competitor-cards');
  if(cards)cards.insertAdjacentElement('afterend',div);
}

function saveCompDetail(idx){
  var list=getCompList();
  list[idx].project_manager=document.getElementById('comp-ed-pm').value.trim();
  list[idx].phone=document.getElementById('comp-ed-phone').value.replace(/\s/g,'');
  list[idx].landline=document.getElementById('comp-ed-landline').value.replace(/\s/g,'');
  list[idx].email=document.getElementById('comp-ed-email').value.trim();
  setCompList(list);
  cancelCompEdit();
  _compEditIdx=-1;
  document.getElementById('wb-competitor-search').value='';
}
function cancelCompEdit(){
  var el=document.getElementById('wb-comp-detail-editor');
  if(el)el.remove();
  _compEditIdx=-1;
}

function saveCompetitorAnalysis(){
  if(!curProjectId)return;
  curWorkflow[4]=curWorkflow[4]||{done:false,note:'',data:{}};
  curWorkflow[4].data=(curWorkflow[4].data||{});
  curWorkflow[4].data.competitor_note=document.getElementById('wb-competitor-note').value;
  saveWorkflow();
  showToast('分析已保存');
}'''

if old_onOppKey in html:
    html = html.replace(old_onOppKey, new_onOppKey, 1)
    changes += 1
    print("[OK] Competitor JS functions added")
else:
    print("[ERR] onOppCompanyKey not found")

# ============================================================
# 3. UPDATE saveStepNote to handle competitor panel properly
# ============================================================
old_comp_save = "data.competitors=(document.getElementById('wb-competitor-list')?document.getElementById('wb-competitor-list').value:'');\n    data.competitor_note=(document.getElementById('wb-competitor-note')?document.getElementById('wb-competitor-note').value:'');"

new_comp_save = "data.competitor_note=(document.getElementById('wb-competitor-note')?document.getElementById('wb-competitor-note').value:'');"

if old_comp_save in html:
    html = html.replace(old_comp_save, new_comp_save, 1)
    changes += 1
    print("[OK] saveStepNote competitor simplified")
else:
    print("[ERR] competitor save not found")

# ============================================================
# 4. UPDATE showStepPanel to load competitor cards and notes
# ============================================================
old_comp_panel_load = "case 'competitor':\n      if(document.getElementById('wb-competitor-list'))document.getElementById('wb-competitor-list').value=data.competitors||'';\n      if(document.getElementById('wb-competitor-note'))document.getElementById('wb-competitor-note').value=data.competitor_note||'';\n      if(panelEl)panelEl.classList.remove('hidden');\n      break;"

new_comp_panel_load = "case 'competitor':\n      if(document.getElementById('wb-competitor-note'))document.getElementById('wb-competitor-note').value=(curWorkflow[4]?(curWorkflow[4].data||{}).competitor_note||'':'');\n      renderCompetitorCards();\n      if(panelEl)panelEl.classList.remove('hidden');\n      break;"

if old_comp_panel_load in html:
    html = html.replace(old_comp_panel_load, new_comp_panel_load, 1)
    changes += 1
    print("[OK] showStepPanel competitor updated")
else:
    print("[ERR] showStepPanel competitor not found")

# ============================================================
# 5. Fix Steps 3 and 4 in WORKFLOW_STEPS - link both to competitor panel
# ============================================================
old_step3 = "{seq:3,phase:'分析与策略',key:'competitors',name:'获取竞争对手名单',icon:'📋',panel:'competitor'},"

new_step3 = "{seq:3,phase:'分析与策略',key:'competitors',name:'获取竞争对手名单',icon:'📋',panel:'competitor',tip:'从客户库搜索添加'},"
old_step4 = "{seq:4,phase:'分析与策略',key:'compete_analysis',name:'竞争与分析',icon:'📊',panel:'competitor'},"

new_step4 = "{seq:4,phase:'分析与策略',key:'compete_analysis',name:'竞争与分析',icon:'📊',panel:'competitor',tip:'填写竞争分析笔记'},"

if old_step3 in html:
    html = html.replace(old_step3, new_step3, 1)
    changes += 1
    print("[OK] Step 3 tooltip added")
if old_step4 in html:
    html = html.replace(old_step4, new_step4, 1)
    changes += 1
    print("[OK] Step 4 tooltip added")

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\nTotal changes: {changes}")
print(f"File size: {os.path.getsize(path)}")
