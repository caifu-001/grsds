import re

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# Fix 1: onLoginSuccess - sync currentUserRole after company role is determined
# Find the closing of the company assignment block before "document.getElementById('main-screen')"
old1 = "  document.getElementById('main-screen').classList.remove('hidden');\n  updateCompanyUIBadge();"
new1 = "  // Sync currentUserRole for code that still uses the old variable\n  currentUserRole=currentCompanyRole;\n  document.getElementById('main-screen').classList.remove('hidden');\n  updateCompanyUIBadge();"
if old1 in c:
    c = c.replace(old1, new1)
    changes += 1
    print('[1] onLoginSuccess: currentUserRole synced')
else:
    # Try regex
    m = re.search(r"document\.getElementById\('main-screen'\)\.classList\.remove\('hidden'\);\s*updateCompanyUIBadge\(\);", c)
    if m:
        orig = m.group(0)
        new = "currentUserRole=currentCompanyRole;\n  " + orig
        c = c[:m.start()] + new + c[m.end():]
        changes += 1
        print('[1b] onLoginSuccess: currentUserRole synced via regex')
    else:
        print('[1] Pattern not found')

# Fix 2: session-restore path (sb.auth.getSession) - also sync currentUserRole
old2 = "if(cur){currentCompanyRole=cur.role||currentUserRole;currentCompanyName=cur.company_name||'';}"
new2 = "if(cur){currentCompanyRole=cur.role||currentUserRole;currentCompanyName=cur.company_name||'';currentUserRole=currentCompanyRole;}"
if old2 in c:
    c = c.replace(old2, new2)
    changes += 1
    print('[2] session restore: currentUserRole synced')
else:
    print('[2] Pattern not found for session restore')
    # Fuzzy find
    idx = c.find("currentCompanyRole=cur.role||currentUserRole")
    if idx > 0:
        print(f'  Found at {idx}: ...{c[idx-20:idx+80]}...')
    else:
        idx = c.find("currentCompanyRole=cur.role||")
        if idx > 0:
            print(f'  Found variant at {idx}: ...{c[idx-20:idx+80]}...')

# Fix 3: switchActiveCompany - also sync
old3 = "currentCompanyRole=mem.role||'member';\n  currentCompanyName=mem.company_name||'';\n  updateCompanyUIBadge();"
new3 = "currentCompanyRole=mem.role||'member';\n  currentCompanyName=mem.company_name||'';\n  currentUserRole=currentCompanyRole;\n  updateCompanyUIBadge();"
if old3 in c:
    c = c.replace(old3, new3)
    changes += 1
    print('[3] switchActiveCompany: currentUserRole synced')
else:
    print('[3] switchActiveCompany pattern not found')

# Report
print(f'changes={changes}')
divs = c.count('<div') - c.count('</div>')
curls = c.count('{') - c.count('}')
print(f'balance: div={divs} curly={curls}')

with open(r'D:\1kaifa\grsds\index.html', 'w', encoding='utf-8') as f:
    f.write(c)
