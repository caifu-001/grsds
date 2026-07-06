with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. loadClients 后加授权过滤
old1 = "allClients=(data||[]);\n    await loadOrders();"
new1 = "allClients=(data||[]);\n    if(currentCompanyRole==='member'&&!isSuperAdmin){allClients=allClients.filter(function(cl){return canAccess('clients',cl.id)})}\n    await loadOrders();"
if old1 in c:
    c = c.replace(old1, new1)
    print('[1] loadClients filter added')
else:
    print('[1] NOT FOUND - loadClients filter')

# 2. loadProducts 后加过滤（约9017行）
old2 = ".eq('company_id',currentCompanyId).order('updated_at',{ascending:false});\n  allProducts=(data||[]);"
new2 = ".eq('company_id',currentCompanyId).order('updated_at',{ascending:false});\n  allProducts=(data||{});\n  if(currentCompanyRole==='member'&&!isSuperAdmin){allProducts=allProducts.filter(function(p){return canAccess('products',p.id)})}"
if old2 in c:
    c = c.replace(old2, new2)
    print('[2] loadProducts filter added')
else:
    print('[2] NOT FOUND - loadProducts')

# 3. loadSuppliers 后加过滤（约10402行）
old3 = ".eq('company_id',currentCompanyId).order('updated_at',{ascending:false});"
# 找 suppliers 那行，前面有 'suppliers' 的上下文
idx3 = c.find("sb.from('suppliers').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});")
if idx3 > 0:
    # 找下一个 = 赋值
    suffix = c[idx3:]
    end_of_line = suffix.find('\n')
    line = suffix[:end_of_line]
    after_line = suffix[end_of_line:]
    # 找 allSuppliers=
    assign_idx = after_line.find('allSuppliers')
    if assign_idx >= 0 and assign_idx < 60:
        assign_end = after_line.find(';', assign_idx) + 1
        assign_stmt = after_line[:assign_end]
        new_assign = after_line[:assign_end] + '\n  if(currentCompanyRole===\'member\'&&!isSuperAdmin){allSuppliers=allSuppliers.filter(function(s){return canAccess(\'suppliers\',s.id)})}'
        c = c[:idx3+end_of_line] + new_assign + after_line[assign_end:]
        print('[3] loadSuppliers filter added')
    else:
        print('[3] assign not found:', after_line[:assign_idx+100] if assign_idx>=0 else after_line[:200])
else:
    print('[3] NOT FOUND - loadSuppliers')

# 4. 登录后调用 loadMemberGrants
old4 = "loadCompanies();\n    loadNotifs();"
new4 = "loadCompanies();\n    loadMemberGrants();\n    loadNotifs();"
if old4 in c:
    c = c.replace(old4, new4)
    print('[4] loadMemberGrants on login added')
else:
    print('[4] NOT FOUND')

# 5. 加授权管理面板 HTML（在设置面板附近）
# 先找到成员管理面板，在后面加授权管理
member_panel = '<div id="admin-employees" class="admin-panel hidden">'
idx = c.find(member_panel)
if idx > 0:
    # 找到这个 div 的结束位置
    # 找 admin-perms
    perms_start = c.find('<div id="admin-perms"', idx)
    grants_html = '''
  <!-- Resource Grants -->
  <div id="admin-grants" class="admin-panel hidden">
   <div class="toolbar" style="margin-bottom:10px;flex-wrap:wrap;gap:8px">
    <select id="grant-member-select" onchange="loadMemberGrantsPanel()" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:13px;background:var(--card);color:var(--text)"><option value="">-- 选择成员 --</option></select>
    <select id="grant-type-select" onchange="loadMemberGrantsPanel()" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:13px;background:var(--card);color:var(--text)"><option value="clients">客户</option><option value="products">产品</option><option value="suppliers">供应商</option></select>
    <button class="btn-save" style="padding:8px 14px;font-size:13px" onclick="saveMemberGrants()">💾 保存授权</button>
   </div>
   <div id="admin-grants-list"></div>
  </div>
  '''
    c = c[:perms_start] + grants_html + c[perms_start:]
    print('[5] grants panel HTML added')
else:
    print('[5] member_panel not found')

# 6. 加管理 tab 入口
old6 = '文档管理</button>'
new6 = '文档管理</button>\n    <button onclick="showGrantsPanel()" style="padding:8px 14px;border-radius:8px;border:none;background:var(--card);color:var(--text);cursor:pointer;font-size:13px;margin-right:4px;margin-bottom:4px">🔐 授权管理</button>'
if old6 in c:
    c = c.replace(old6, new6)
    print('[6] grants tab button added')
else:
    print('[6] NOT FOUND - grants tab')

with open(r'D:\1kaifa\grsds\index.html', 'w', encoding='utf-8') as f:
    f.write(c)

divs = c.count('<div') - c.count('</div>')
curls = c.count('{') - c.count('}')
print('balance: div', divs, 'curly', curls)
