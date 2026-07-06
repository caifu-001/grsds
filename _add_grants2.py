import re

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# 1. admin sub-tab: 授权管理按钮（在流程模板之后）
old = '<button class="admin-subtab hidden" id="admin-tab-workflows" onclick="switchAdminTab(\'workflows\')">流程模板</button>'
new = old + '\n   <button class="admin-subtab hidden" id="admin-tab-grants" onclick="switchAdminTab(\'grants\')">🔐 授权管理</button>'
if old in c:
    c = c.replace(old, new)
    changes += 1
    print('[1] admin sub-tab grants added')
else:
    print('[1] NOT FOUND')

# 2. switchAdminTab 函数加 grants case（在 workflows case 后面）
old2 = "case'workflows':renderWFTemplatePanel();break;"
new2 = "case'workflows':renderWFTemplatePanel();break;\n    case'grants':renderGrantsPanel();break;"
if old2 in c:
    c = c.replace(old2, new2)
    changes += 1
    print('[2] switchAdminTab grants case added')
else:
    print('[2] NOT FOUND - switchAdminTab')

# 3. 在 grid-actions 旁边（admin-employees 面板内）加成员选择列表
# Or better: find the admin-grants div we inserted earlier and make sure it's clean
# The grants panel html was already inserted. Now add the JS functions.
# Check if grants div exists
if '<div id="admin-grants"' in c:
    print('[3] grants div already exists, skipping')
else:
    # Need to create the panel
    # Find the last </div> before admin-perms
    idx = c.find('<div id="admin-employees"')
    if idx > 0:
        perms_start = c.find('<div id="admin-perms"', idx)
        grants_html = '''
  <!-- Resource Grants -->
  <div id="admin-grants" class="admin-panel hidden">
   <div class="toolbar" style="margin-bottom:12px;flex-wrap:wrap;gap:8px">
    <select id="grant-member-select" onchange="loadMemberGrantsPanel()" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:13px;background:var(--card);color:var(--text)"><option value="">-- 选择成员 --</option></select>
    <select id="grant-type-select" onchange="loadMemberGrantsPanel()" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:13px;background:var(--card);color:var(--text)"><option value="clients">客户</option><option value="products">产品</option><option value="suppliers">供应商</option></select>
    <button class="btn-save" style="padding:8px 14px;font-size:13px" onclick="saveMemberGrants()">💾 保存授权</button>
   </div>
   <div id="admin-grants-list"></div>
  </div>
  '''
        c = c[:perms_start] + grants_html + c[perms_start:]
        changes += 1
        print('[3] grants panel html inserted')
    else:
        print('[3] admin-employees not found')

# 4. Add JS functions: showGrantsPanel, renderGrantsPanel, loadMemberGrantsPanel, saveMemberGrants
# Find a good place - after the admin-panel-toggling logic
# We'll insert after switchAdminTab or after employees panel JS
switch_func = 'function switchAdminTab(tab){'
idx4 = c.find(switch_func)
if idx4 > 0:
    # Find the closing } of this function
    brace_count = 0
    end4 = idx4
    for i in range(idx4, len(c)):
        if c[i] == '{': brace_count += 1
        elif c[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                end4 = i + 1
                break
    
    # Check if renderGrantsPanel already exists
    if 'function renderGrantsPanel' not in c:
        grants_js = '''
function renderGrantsPanel(){
  var panel=document.getElementById('admin-grants');
  panel.classList.remove('hidden');
  // Load members
  var sel=document.getElementById('grant-member-select');
  sel.innerHTML='<option value="">-- 选择成员 --</option>';
  allUsers.forEach(function(u){
    sel.innerHTML+='<option value="'+u.id+'">'+h(u.name||u.email)+'</option>';
  });
  loadMemberGrantsPanel();
}

async function loadMemberGrantsPanel(){
  var user_id=document.getElementById('grant-member-select').value;
  var type=document.getElementById('grant-type-select').value;
  var list=document.getElementById('admin-grants-list');
  if(!user_id){list.innerHTML='<div class="empty-state">请选择成员</div>';return}
  
  // Load all resources of this type
  var resources=[];
  if(type==='clients'){resources=allClients}
  else if(type==='products'){resources=allProducts}
  else if(type==='suppliers'){resources=allSuppliers}
  
  // Load existing grants for this member
  try{
    var rg=await callAdmin('select','resource_grants',{query:'*',filters:[
      {col:'user_id',op:'eq',val:user_id},{col:'resource_type',op:'eq',val:type}
    ]});
    var granted=(rg&&rg.data?rg.data.map(function(r){return r.resource_id}):[]);
  }catch(e){var granted=[]}
  
  if(resources.length===0){list.innerHTML='<div class="empty-state">暂无'+({'clients':'客户','products':'产品','suppliers':'供应商'}[type]||type)+'数据</div>';return}
  
  var htm='<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:var(--bg2)"><th style="padding:8px;text-align:left;border-bottom:1px solid var(--border)">名称</th><th style="padding:8px;text-align:center;border-bottom:1px solid var(--border);width:80px">授权</th></tr></thead><tbody>';
  resources.forEach(function(r){
    var name=h(r.name||r.title||'未命名');
    var checked=granted.indexOf(r.id)>=0?'checked':'';
    htm+='<tr><td style="padding:8px;border-bottom:1px solid var(--border2)">'+name+'</td><td style="padding:8px;text-align:center;border-bottom:1px solid var(--border2)"><input type="checkbox" value="'+r.id+'" '+checked+' onchange="onGrantCheck(this)" style="width:16px;height:16px;cursor:pointer"></td></tr>';
  });
  htm+='</tbody></table>';
  list.innerHTML=htm;
}

// Track checked grants
function onGrantCheck(cb){
  // Just track via the checkbox state
}

async function saveMemberGrants(){
  var user_id=document.getElementById('grant-member-select').value;
  var type=document.getElementById('grant-type-select').value;
  if(!user_id){showToast('请选择成员');return}
  
  var ids=[];
  document.querySelectorAll('#admin-grants-list input[type="checkbox"]:checked').forEach(function(cb){ids.push(parseInt(cb.value))});
  
  try{
    var r=await callAdmin('rpc','batch_grant_resources',{p_user_id:user_id,p_company_id:currentCompanyId,p_resource_type:type,p_resource_ids:ids});
    if(r.error){showToast('授权失败: '+r.error.message);return}
    showToast('✅ 授权已保存');
  }catch(e){showToast('授权失败: '+(e.message||e))}
}
'''
        c = c[:end4] + grants_js + c[end4:]
        changes += 1
        print('[4] grants JS functions added at', end4)
    else:
        print('[4] renderGrantsPanel already exists')
else:
    print('[4] switchAdminTab not found')

# 5. Ensure admin tab grants is visible for admin (hidden by default, show with js)
# Find the superadmin/admin logic that shows tabs
old5 = "document.getElementById('admin-tab-workflows').classList.remove('hidden');"
new5 = old5 + "\n    document.getElementById('admin-tab-grants').classList.remove('hidden');"
if old5 in c:
    c = c.replace(old5, new5)
    changes += 1
    print('[5] grants tab shown for admin')
else:
    print('[5] NOT FOUND - tab show')

# Also for superadmin
old5b = "document.getElementById('admin-tab-grants').classList.remove('hidden');"
if old5b not in c and 'tab-workflows' in c:
    # Force add
    c = c.replace(
        "document.getElementById('admin-tab-workflows').classList.remove('hidden');",
        "document.getElementById('admin-tab-workflows').classList.remove('hidden');\n    if(currentCompanyRole==='admin'||isSuperAdmin)document.getElementById('admin-tab-grants').classList.remove('hidden');"
    )
    changes += 1
    print('[5b] grants tab visibility fixed')

with open(r'D:\1kaifa\grsds\index.html', 'w', encoding='utf-8') as f:
    f.write(c)

divs = c.count('<div') - c.count('</div>')
curls = c.count('{') - c.count('}')
print(f'done. changes={changes} div={divs} curly={curls}')
