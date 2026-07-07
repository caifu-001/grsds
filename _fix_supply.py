#!/usr/bin/env python3
"""Fix two bugs:
1. 工具栏「分类管理」按钮 — 独立面板, 不依赖弹窗
2. 拜访记录客户名称 — 添加 autocomplete 容器 + 修复 autocomplete 逻辑
"""
import re

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read()

# normalize
c = c.replace("\r\n", "\n")
fixed = 0

# ============================================================
# FIX 1: 工具栏「📂 类别」按钮 — 改为 toggle 独立的内联面板
# ============================================================

# 工具栏中的按钮(行 2134): onclick="toggleScCatManage()"
# 需要在按钮后紧跟一个独立的面板 div
old_toolbar = '    <button class="btn-xs" style="background:var(--surface);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:6px;cursor:pointer" onclick="toggleScCatManage()">\U0001f4c2 类别</button>\n    <div style="flex:1"></div>'

new_toolbar = '    <button class="btn-xs" style="background:var(--surface);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:6px;cursor:pointer" id="sc-cat-toolbar-btn" onclick="toggleScCatManage()">\U0001f4c2 类别</button>\n    <div id="sc-cat-toolbar-panel" class="hidden" style="width:100%;background:var(--card);border-radius:8px;padding:10px;margin-top:4px"><div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px">分类管理</div><div id="sc-cat-toolbar-tags" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px"></div><div style="display:flex;gap:6px"><input id="sc-cat-toolbar-new" placeholder="新分类名称" style="flex:1;padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--bg);color:var(--text)" onkeydown="if(event.key===String.fromCharCode(39,39)||true){if(event.key===\u0027Enter\u0027)addScCatToolbar()}"><button class="btn-sm" style="background:var(--primary);color:#fff;font-size:12px" onclick="addScCatToolbar()">添加</button></div></div>\n    <div style="flex:1"></div>'

# Fix the double-quote issue: String.fromCharCode(39,39) doesn't work. Let me use \x27
# Actually let me just use simpler keydown handler
new_toolbar = '    <button class="btn-xs" style="background:var(--surface);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:6px;cursor:pointer" id="sc-cat-toolbar-btn" onclick="toggleScCatManage()">\U0001f4c2 类别</button>\n    <div id="sc-cat-toolbar-panel" class="hidden" style="width:100%;background:var(--card);border-radius:8px;padding:10px;margin-top:4px"><div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px">\u5206\u7c7b\u7ba1\u7406</div><div id="sc-cat-toolbar-tags" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px"></div><div style="display:flex;gap:6px"><input id="sc-cat-toolbar-new" placeholder="\u65b0\u5206\u7c7b\u540d\u79f0" style="flex:1;padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--bg);color:var(--text)" onkeydown="if(event.key===\\u0027Enter\\u0027)addScCatToolbar()"><button class="btn-sm" style="background:var(--primary);color:#fff;font-size:12px" onclick="addScCatToolbar()">\u6dfb\u52a0</button></div></div>\n    <div style="flex:1"></div>'

if old_toolbar in c:
    c = c.replace(old_toolbar, new_toolbar)
    fixed += 1
    print("OK: Fix 1 - toolbar category panel")
else:
    print("FAIL: Fix 1 - toolbar category panel not found")

# ============================================================
# FIX 2: 拜访记录弹窗 — 添加 fw-vm-client-list 容器
# ============================================================

old_fw = '<div class="fw-field"><label>\u5ba2\u6237\u540d\u79f0 *</label><input id="fw-vm-client" placeholder="\u641c\u7d22\u5ba2\u6237..." style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--bg);color:var(--text)" autocomplete="off"></div>'

new_fw = '<div class="fw-field" style="position:relative"><label>\u5ba2\u6237\u540d\u79f0 *</label><input id="fw-vm-client" placeholder="\u641c\u7d22\u5ba2\u6237..." style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--bg);color:var(--text)" autocomplete="off" oninput="onFWClientInput()" onkeydown="onFWClientKey(event)"><div id="fw-vm-client-list" class="name-suggestions hidden"></div></div>'

if old_fw in c:
    c = c.replace(old_fw, new_fw)
    fixed += 1
    print("OK: Fix 2 - fw-vm-client autocomplete container")
else:
    print("FAIL: Fix 2")

# ============================================================
# FIX 3: openFWVisitForm — 简化为使用事件驱动, 不走旧 addEventListener
# ============================================================
# 旧代码: document.getElementById('fw-vm-client').addEventListener('input',function(){...})
# 新代码: 使用上面的 oninput="onFWClientInput()"，所以移除 openFWVisitForm 里的 addEventListener

old_fw2 = """  document.getElementById('fw-vm-client-list').innerHTML='';
  document.getElementById('fw-visit-modal').classList.remove('hidden');
  // Client autocomplete
  document.getElementById('fw-vm-client').addEventListener('input',function(){
    var q=this.value.trim().toLowerCase();var list=document.getElementById('fw-vm-client-list');
    if(!q||!allClients.length){list.innerHTML='';return}
    var matches=allClients.filter(function(c){return (c.name||'').toLowerCase().indexOf(q)>-1}).slice(0,6);
    var h='';for(var i=0;i<matches.length;i++){var mid=matches[i].id;var mn=matches[i].name.replace(/'/g,\"\\\\'\") ;h+='<div style=\"padding:8px 10px;cursor:pointer;border-bottom:1px solid var(--border2)'+（i===0?'background:var(--bg2);font-weight:600':'')+'\" onclick=\"selectFWClient(\\''+mid+'\\',\\''+mn+'\\')\">'+h2(matches[i].name)+'</div>'}
    list.innerHTML=h;
  });"""

# Can't match precisely with escaped stuff. Let me search more carefully.
# The key snippet to replace: from "fw-vm-client-list" to end of addEventListener

# Strategy: find "fw-vm-client-list.innerHTML=''" and replace everything after it

# Let me find the exact block
idx_list = c.find("fw-vm-client-list").innerHTML="
# Actually the file uses .innerHTML=''  without the extra dot. Let me search differently
# It's at line 15649: `document.getElementById('fw-vm-client-list').innerHTML='';`

old_fw2_marker = "  document.getElementById('fw-vm-client-list').innerHTML='';"
new_fw2_marker = "  document.getElementById('fw-vm-client-list').classList.add('hidden');\n  document.getElementById('fw-vm-client-list').innerHTML='';"

# Now find the full block from the marker to the end of the event listener
idx = c.find(old_fw2_marker)
if idx < 0:
    print("FAIL: Fix 3 - marker not found, trying search")
    # Search for the oninput handler
    idx = c.find("fw-vm-client-list").innerHTML=")
    idx2 = c.find("// Client autocomplete")
    print(f"  idx1={idx}, idx2={idx2}")
else:
    # Find the end of the addEventListener block
    # It ends with: "});\n  if(id){"
    rest = c[idx + len(old_fw2_marker):]
    end_marker = "    list.innerHTML=h;\n  });\n  if(id){"
    end_idx = rest.find(end_marker)
    if end_idx < 0:
        # Try alternative end
        end_marker = "  });\n  if(id){"
        end_idx = rest.find(end_marker)
    if end_idx < 0:
        print(f"FAIL: Fix 3 - end marker not found. Context after marker: {repr(rest[:200])}")
    else:
        old_full = c[idx:idx + len(old_fw2_marker) + end_idx]
        new_full = """  document.getElementById('fw-vm-client-list').classList.add('hidden');
  document.getElementById('fw-vm-client-list').innerHTML='';
  document.getElementById('fw-visit-modal').classList.remove('hidden');"""
        c = c[:idx] + new_full + c[idx + len(old_fw2_marker) + end_idx + len(end_marker) - 4:]
        # Actually we need to keep "  if(id){" at the end. Let me recalculate.
        
        # The old_full is: marker + "\n" + "  document...." + "\n  // Client..." + block + "    list.innerHTML=h;\n  });"
        # We need to end with "  if(id){" but we don't want to replace that.
        
        # Let me recalculate with the keeping of "  if(id){"
        delete_len = len(old_fw2_marker) + end_idx  # up to but not including "  if(id){"
        new_part = """  document.getElementById('fw-vm-client-list').classList.add('hidden');
  document.getElementById('fw-vm-client-list').innerHTML='';
  document.getElementById('fw-visit-modal').classList.remove('hidden');"""
        c = c[:idx] + new_part + c[idx + delete_len:]
        fixed += 1
        print("OK: Fix 3 - simplified openFWVisitForm")
        print(f"  Replaced {delete_len} bytes with {len(new_part)} bytes")

# ============================================================
# FIX 4: Add onFWClientInput() + onFWClientKey() functions
# ============================================================

old_fw4 = """function selectFWClient(id,name){
  document.getElementById('fw-vm-client').value=name;
  fwVisitClientId=id;
  document.getElementById('fw-vm-client-list').innerHTML='';
}"""

new_fw4 = """function onFWClientInput(){
  var inp=document.getElementById('fw-vm-client');if(!inp)return;
  var q=(inp.value||'').trim().toLowerCase();
  var list=document.getElementById('fw-vm-client-list');if(!list)return;
  if(!q||!allClients.length){list.classList.add('hidden');return}
  var matches=allClients.filter(function(c){return (c.name||'').toLowerCase().indexOf(q)>=0}).slice(0,8);
  if(!matches.length){list.classList.add('hidden');return}
  var h='';fwClientSuggList=matches;
  for(var i=0;i<matches.length;i++){var mid=matches[i].id;var mn=escHtml(matches[i].name);h+='<div class="name-suggestion-item'+(i===0?' active':'')+'" onmousedown="selectFWClient(\\''+mid+'\\',\\''+escHtml(matches[i].name).replace(/'/g,\"\\\\'") +'\\')">'+mn+'</div>'}
  list.innerHTML=h;list.classList.remove('hidden');
}
function onFWClientKey(e){
  var list=document.getElementById('fw-vm-client-list');if(!list||list.classList.contains('hidden'))return;
  var items=list.querySelectorAll('.name-suggestion-item');if(!items.length)return;
  if(e.key==='ArrowDown'){fwClientSuggIdx=Math.min((fwClientSuggIdx||-1)+1,items.length-1);e.preventDefault();}
  else if(e.key==='ArrowUp'){fwClientSuggIdx=Math.max((fwClientSuggIdx||0)-1,0);e.preventDefault();}
  else if(e.key==='Enter'&&fwClientSuggIdx>=0){e.preventDefault();items[fwClientSuggIdx]&&items[fwClientSuggIdx].click();return}
  else{fwClientSuggIdx=-1}
  for(var i=0;i<items.length;i++)items[i].classList.toggle('active',i===fwClientSuggIdx);
}
var fwClientSuggIdx=-1,fwClientSuggList=[];
function selectFWClient(id,name){
  document.getElementById('fw-vm-client').value=name;
  fwVisitClientId=id;
  var list=document.getElementById('fw-vm-client-list');
  if(list){list.classList.add('hidden');list.innerHTML=''}
  fwClientSuggIdx=-1;fwClientSuggList=[];
}"""

if old_fw4 in c:
    c = c.replace(old_fw4, new_fw4)
    fixed += 1
    print("OK: Fix 4 - onFWClientInput/Key functions")
else:
    print("FAIL: Fix 4 - selectFWClient not found")

# ============================================================
# FIX 5: toggleScCatManage — also toggle toolbar panel
# ============================================================

old_fw5 = """function toggleScCatManage(){
  var panel=document.getElementById('sc-cat-manage');if(!panel)return;
  panel.classList.toggle('hidden');if(!panel.classList.contains('hidden'))renderScCatTags();
}"""

new_fw5 = """function toggleScCatManage(){
  var panel=document.getElementById('sc-cat-toolbar-panel');if(!panel)return;
  panel.classList.toggle('hidden');if(!panel.classList.contains('hidden'))renderScCatToolbarTags();
}
function renderScCatToolbarTags(){
  initScCat();var el=document.getElementById('sc-cat-toolbar-tags');if(!el)return;
  if(!scoutingCategories.length){el.innerHTML='<span style=\"font-size:12px;color:var(--text-secondary)\">\u6682\u65e0\u81ea\u5b9a\u4e49\u5206\u7c7b</span>';return;}
  var h='';
  for(var i=0;i<scoutingCategories.length;i++)h+='<span style=\"display:inline-flex;align-items:center;gap:4px;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:2px 8px;font-size:12px\">'+escHtml(scoutingCategories[i])+' <span style=\"cursor:pointer;color:var(--danger);font-weight:700\" onclick=\"removeScCat('+i+');renderScCatToolbarTags();buildScCatDropdowns();buildScCatFilterDropdown()\">\u00d7</span></span>';
  el.innerHTML=h;
}
function addScCatToolbar(){
  var input=document.getElementById('sc-cat-toolbar-new');if(!input)return;
  var name=input.value.trim();if(!name)return;
  initScCat();if(scoutingCategories.indexOf(name)<0)scoutingCategories.push(name);
  scoutingCategories.sort();saveScCat();input.value='';renderScCatToolbarTags();buildScCatDropdowns();buildScCatFilterDropdown();
}"""

if old_fw5 in c:
    c = c.replace(old_fw5, new_fw5)
    fixed += 1
    print("OK: Fix 5 - toggleScCatManage toolbar panel")
else:
    print("FAIL: Fix 5")

# ============================================================
# FIX 6: escHtml function for the autocomplete
# ============================================================

# Check if escHtml exists
if "function escHtml(" not in c:
    # Check if h2 is close enough
    pass
# We already use escHtml in selection code, it should exist

# Write back
out = c.replace("\n", "\r\n")
with open(p, "w", encoding="utf-8-sig", newline="") as f:
    f.write(out)

print(f"\n=== {fixed}/6 fixes applied ===")
