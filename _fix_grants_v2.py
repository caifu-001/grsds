with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# Fix 1: renderGrantsPanel - u.id → u.user_id
old = "sel.innerHTML+='<option value=\"'+u.id+'\">'+h(u.name||u.email)+'</option>';"
new = "sel.innerHTML+='<option value=\"'+u.user_id+'\">'+h(u.name||u.email)+'</option>';"
if old in c:
    c = c.replace(old, new)
    changes += 1
    print('[1] Fixed u.id -> u.user_id in renderGrantsPanel')
else:
    print('[1] Pattern not found (searching)...')
    # Try regex
    import re
    m = re.search(r"u\.id", c[c.find('function renderGrantsPanel'):c.find('function loadMemberGrantsPanel')])
    if m:
        print(f'  Found u.id at offset {m.start()}')

# Fix 2: saveUserEdit - move targetUser declaration before its use
old2 = "  var data={\n    display_name:document.getElementById('uedit-name').value.trim(),\n    position:document.getElementById('uedit-position').value.trim(),\n    phone:document.getElementById('uedit-phone').value.trim(),\n    department_id:parseInt(document.getElementById('uedit-dept').value)||null,\n    role:role,role_id:roleId,\n    status:isSuperAdmin||(currentUserRole==='admin'&&targetUser&&targetUser.company_id===currentCompanyId)?document.getElementById('uedit-status').value:undefined,\n    company_id:companyId\n  };\n  var error=null;\n  var targetUser=adminUserList.find(function(u){return u.user_id===userId;});"

new2 = "  var targetUser=adminUserList.find(function(u){return u.user_id===userId;});\n  var data={\n    display_name:document.getElementById('uedit-name').value.trim(),\n    position:document.getElementById('uedit-position').value.trim(),\n    phone:document.getElementById('uedit-phone').value.trim(),\n    department_id:parseInt(document.getElementById('uedit-dept').value)||null,\n    role:role,role_id:roleId,\n    status:isSuperAdmin||(currentUserRole==='admin'&&targetUser&&targetUser.company_id===currentCompanyId)?document.getElementById('uedit-status').value:undefined,\n    company_id:companyId\n  };\n  var error=null;"

if old2 in c:
    c = c.replace(old2, new2)
    changes += 1
    print('[2] Fixed targetUser hoisting in saveUserEdit')
else:
    print('[2] Pattern not found for saveUserEdit fix')

# Fix 3: renderGrantsPanel - guard allUsers
old3 = "function renderGrantsPanel(){\n  var panel=document.getElementById('admin-grants');\n  panel.classList.remove('hidden');\n  // Load members\n  var sel=document.getElementById('grant-member-select');\n  sel.innerHTML='<option value=\"\">-- 选择成员 --</option>';\n  allUsers.forEach(function(u){\n    sel.innerHTML+='<option value=\"'+u.user_id+'\">'+h(u.name||u.email)+'</option>';\n  });"
new3 = "function renderGrantsPanel(){\n  var panel=document.getElementById('admin-grants');\n  panel.classList.remove('hidden');\n  // Load members\n  var sel=document.getElementById('grant-member-select');\n  sel.innerHTML='<option value=\"\">-- 选择成员 --</option>';\n  (allUsers||[]).forEach(function(u){\n    sel.innerHTML+='<option value=\"'+u.user_id+'\">'+h(u.name||u.email)+'</option>';\n  });"
if old3 in c:
    c = c.replace(old3, new3)
    changes += 1
    print('[3] Added allUsers guard')
else:
    print('[3] Pattern not found for allUsers guard')

# Also add loadGrants in login flow (check if already done by _add_grants.py)
load_mem_grants_count = c.count('loadMemberGrants()')
print(f'[4] loadMemberGrants calls: {load_mem_grants_count}')

divs = c.count('<div') - c.count('</div>')
curls = c.count('{') - c.count('}')
print(f'balance: div={divs} curly={curls} changes={changes}')

with open(r'D:\1kaifa\grsds\index.html', 'w', encoding='utf-8') as f:
    f.write(c)
