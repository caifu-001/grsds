import re

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# 1. Find the actual tab markup and add grants button
# Search for tab-workflows without worrying about exact whitespace
m = re.search(r'(<button[^>]*id="admin-tab-workflows"[^>]*>流程模板</button>)', c)
if m:
    orig = m.group(1)
    new = orig + '\n   <button class="admin-subtab hidden" id="admin-tab-grants" onclick="switchAdminTab(\'grants\')">🔐 授权管理</button>'
    c = c.replace(orig, new)
    changes += 1
    print(f'[1] grants tab button added at {m.start()}')
else:
    # Try looser search
    m2 = re.search(r'流程模板</button>', c)
    if m2:
        end = m2.end()
        c = c[:end] + '\n   <button class="admin-subtab hidden" id="admin-tab-grants" onclick="switchAdminTab(\'grants\')">🔐 授权管理</button>' + c[end:]
        changes += 1
        print(f'[1b] grants tab button added at {m2.end()}')
    else:
        print('[1] process template tab not found')

# 2. Find switchAdminTab and add grants case
# Search for 'workflows' and 'renderWFTemplatePanel' within switchAdminTab
m = re.search(r"(case\s*'workflows':\s*renderWFTemplatePanel\(\);\s*break;)", c)
if m:
    orig = m.group(1)
    new = orig + "\n    case'grants':renderGrantsPanel();break;"
    c = c.replace(orig, new)
    changes += 1
    print('[2] grants case in switchAdminTab added')
else:
    # Try with just the string part
    m2 = re.search(r'(renderWFTemplatePanel\(\);\s*break;)(\s*case)', c)
    if m2:
        c = c[:m2.start(1)] + m2.group(1) + "\n    case'grants':renderGrantsPanel();break;" + c[m2.start(1)+len(m2.group(1)):]
        changes += 1
        print('[2b] grants case added after workflows')
    else:
        # Find the function
        idx = c.find("switchAdminTab(tab){")
        if idx > 0:
            # Find the section around workflows case
            wf_idx = c.find("workflows", idx)
            if wf_idx > 0 and wf_idx < idx + 3000:
                # Find the break; after workflows
                br = c.find("break;", wf_idx)
                if br > 0:
                    c = c[:br+6] + "\n    case'grants':renderGrantsPanel();break;" + c[br+6:]
                    changes += 1
                    print(f'[2c] grants case added at {br+6}')
                else:
                    print('[2] break not found after workflows')
            else:
                print('[2] workflows not found near switchAdminTab')
        else:
            print('[2] switchAdminTab not found')

# 3. Verify admin-grants div content is ok
grants_idx = c.find('id="admin-grants"')
print(f'[3] admin-grants found at {grants_idx}')

# 4. Check div/curly balance
divs = c.count('<div') - c.count('</div>')
curls = c.count('{') - c.count('}')
print(f'[4] balance: div={divs} curly={curls}')

# 5. Check all key functions exist
for fn in ['renderGrantsPanel', 'loadMemberGrantsPanel', 'saveMemberGrants', 'onGrantCheck']:
    count = c.count(f'function {fn}')
    print(f'[5] {fn}: {count} occurrence(s)')

with open(r'D:\1kaifa\grsds\index.html', 'w', encoding='utf-8') as f:
    f.write(c)

print(f'done. changes={changes}')
