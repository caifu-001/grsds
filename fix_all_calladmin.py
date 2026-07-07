import re

path = r'D:\1kaifa\grsds\index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# ──── 按精确字符串替换 ────

replacements = [
    # === 数据加载类 (if(ur.ok){...await ur.json()...}) ===
    
    # loadAdminData super_admin
    ("if(ur.ok){adminUserList=await ur.json();allUsers=adminUserList;populatePerfSelects();}",
     "if(ur&&ur.data){adminUserList=ur.data;allUsers=adminUserList;populatePerfSelects();}else{console.warn('callAdmin no data:',ur)}"),
    
    # loadAdminData admin (already fixed but ensure)
    ("if(ur.ok){adminUserList=await ur.json();allUsers=adminUserList.slice();populatePerfSelects();}",
     "if(ur&&ur.data){adminUserList=ur.data;allUsers=adminUserList.slice();populatePerfSelects();}else{console.warn('callAdmin no data:',ur)}"),
    
    # loadAdminCompanies
    ("if(r.ok){allAdminCompanies=await r.json();}",
     "if(r&&r.data){allAdminCompanies=r.data;}else{console.warn('callAdmin companies no data:',r)}"),
    
    # === 公司 CRUD (companyForm / _companyForm) ===
    # 这些已经在 admin_enhance_v2 中，但用的变量名是 r
    
    # === select 类调用返回值消费 ===
    
    # select operation_logs
    ("if(resp.ok){var ol=await resp.json();",
     "if(resp&&resp.data){var ol=resp.data;"),
    
    # select invitations
    ("if(check.ok){var ci=await check.json();",
     "if(check&&check.data){var ci=check.data;"),
    ("if(userCheck.ok){var uci=await userCheck.json();",
     "if(userCheck&&userCheck.data){var uci=userCheck.data;"),
    ("if(r.ok){var invs=await r.json();",
     "if(r&&r.data){var invs=r.data;"),
    ("if(r.ok){adminUserList=await r.json();",
     "if(r&&r.data){adminUserList=r.data;"),
    
    # select profiles (resignation list)
    ("if(r.ok){adminResignUserList=await r.json();",
     "if(r&&r.data){adminResignUserList=r.data;"),
    
    # === update 类调用返回值消费 ===
    # ur=await callAdmin('update',...);if(!ur.ok){var j=await ur.json();...}
    ("if(!ur.ok){var j=await ur.json().catch(function(){});error={message:j&&j.message||ur.statusText}}",
     "if(ur&&ur.error){error={message:ur.error.message||'Update failed'}}"),
    
    # if(!r.ok){var j=await r.json()... 模式
    ("if(!r.ok){var j=await r.json()",
     "if(r&&r.error){var j=r.error"),
    
    # === .then 模式 ===
    # callAdmin('select','companies',...).then(function(d){if(d&&d.length...})  — 这个是正确处理的
    # callAdmin('insert','custom_forms',...).then(function(r){if(r.data){...}}  — 正确的
    
    # === 其他通用 await var.json() 剩余 ===
]

# Apply known replacements
for old, new in replacements:
    n = content.count(old)
    if n > 0:
        content = content.replace(old, new)
        fixes += n
        short = old[:70].replace('\n', '\\n')
        print(f'FIXED ({n}x): {short}...')

# ──── 正则修复剩余通用模式 ────

# Pattern A: await VAR.json() where VAR is from callAdmin (ur, r, dr, resp, check, userCheck)
# Only fix if preceded by callAdmin in same statement context
for var in ['ur', 'r', 'dr', 'resp', 'check', 'userCheck']:
    old_pat = f'await {var}.json()'
    new_pat = f'{var}.data'
    n = content.count(old_pat)
    if n > 0:
        content = content.replace(old_pat, new_pat)
        fixes += n
        print(f'FIXED ({n}x): await {var}.json() -> {var}.data')

# Pattern B: if(VAR.ok) where VAR is from callAdmin
for var in ['ur', 'r', 'dr', 'resp', 'check', 'userCheck']:
    old_pat = f'if({var}.ok)'
    new_pat = f'if({var}&&{var}.data)'
    n = content.count(old_pat)
    if n > 0:
        content = content.replace(old_pat, new_pat)
        fixes += n
        print(f'FIXED ({n}x): if({var}.ok)\n        -> {new_pat}')

# Pattern C: if(!VAR.ok)
for var in ['ur', 'r', 'dr', 'resp']:
    old_pat = f'if(!{var}.ok)'
    new_pat = f'if({var}&&{var}.error)'
    n = content.count(old_pat)
    if n > 0:
        content = content.replace(old_pat, new_pat)
        fixes += n
        print(f'FIXED ({n}x): if(!{var}.ok)\n        -> {new_pat}')

# ──── 验证 ────
remaining_json = content.count('await ur.json()') + content.count('await r.json()') + content.count('await resp.json()') + content.count('await dr.json()')
print(f'\nRemaining await *.json() patterns: {remaining_json}')

remaining_ok = len(re.findall(r'if\([a-z]+\.ok\)', content)) + len(re.findall(r'if\(![a-z]+\.ok\)', content))
print(f'Remaining if(var.ok) patterns: {remaining_ok}')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nTotal fixes: {fixes}')
