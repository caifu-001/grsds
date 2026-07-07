import re

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# === 1. Remove admin-users panel HTML ===
# Find <div id="admin-users" class="admin-panel"> ... </div>
users_start = c.find('<div id="admin-users"')
if users_start > 0:
    # Find matching closing </div> for this panel
    depth = 1
    i = c.find('>', users_start) + 1
    while depth > 0 and i < len(c):
        next_open = c.find('<div', i)
        next_close = c.find('</div>', i)
        if next_close >= 0 and (next_open < 0 or next_close < next_open):
            depth -= 1
            if depth == 0:
                # Found closing </div>, include the </div>
                end = next_close + 6
                break
            i = next_close + 6
        elif next_open >= 0:
            depth += 1
            i = next_open + 4
        else:
            break
    if depth == 0:
        print(f'[1] admin-users panel removed: {end - users_start} bytes')
        c = c[:users_start] + c[end:]
        changes += 1
    else:
        print('[1] Could not find end of admin-users panel')
else:
    print('[1] admin-users div not found')

# === 2. Remove admin-users search input row ===
# Find the row with admin-user-search
srch_start = c.find('id="admin-user-search"')
if srch_start > 0:
    # Find the containing div start
    row_start = srch_start
    while row_start > 0 and c[row_start:row_start+4] != '<div':
        row_start -= 1
    row_start = c.rfind('<div', 0, srch_start)
    # Find matching end
    depth = 1
    i = c.find('>', row_start) + 1
    while depth > 0:
        nxt_open = c.find('<div', i)
        nxt_close = c.find('</div>', i)
        if nxt_close >= 0 and (nxt_open < 0 or nxt_close < nxt_open):
            depth -= 1
            if depth == 0:
                end = nxt_close + 6
                break
            i = nxt_close + 6
        elif nxt_open >= 0:
            depth += 1
            i = nxt_open + 4
        else:
            break
    print(f'[2] admin-user-search row removed: {end - row_start} bytes')
    c = c[:row_start] + c[end:]
    changes += 1
else:
    print('[2] admin-user-search not found')

# === 3. Remove admin-tab-users button ===
m = re.search(r'<button[^>]*admin-tab-users[^>]*>.*?</button>', c)
if m:
    # Also remove the comma/whitespace after it
    c = c[:m.start()] + c[m.end():]
    print(f'[3] admin-tab-users button removed')
    changes += 1
else:
    print('[3] admin-tab-users button not found')

# === 4. Remove admin-user-list div ===
m = re.search(r'<div id="admin-user-list"[^>]*>.*?</div>\s*(?=</div>|<!--)', c, re.DOTALL)
if m:
    # Be more careful - just find the div and its closing
    ul_start = c.find('id="admin-user-list"')
    if ul_start > 0:
        div_start = c.rfind('<div', 0, ul_start)
        depth = 1
        i = c.find('>', div_start) + 1
        while depth > 0:
            nxt_open = c.find('<div', i)
            nxt_close = c.find('</div>', i)
            if nxt_close >= 0 and (nxt_open < 0 or nxt_close < nxt_open):
                depth -= 1
                if depth == 0:
                    end = nxt_close + 6
                    break
                i = nxt_close + 6
            elif nxt_open >= 0:
                depth += 1
                i = nxt_open + 4
            else:
                break
        c = c[:div_start] + c[end:]
        print(f'[4] admin-user-list div removed')
        changes += 1
else:
    print('[4] admin-user-list not found')

# ===== Now enhance admin-employees =====

# === 5. Change editEmployee button to openUserEditForm ===
old5 = "onclick=\"editEmployee(''+u.user_id+'')\""
new5 = "onclick=\"openUserEditForm(''+u.user_id+'')\""
if old5 in c:
    c = c.replace(old5, new5)
    print('[5] editEmployee -> openUserEditForm')
    changes += 1
else:
    print('[5] editEmployee onclick not found')

# === 6. Enhance employee table columns: add 手机, 公司, 岗位 ===
# Find the thead row and add columns
old_thead = '<th style="padding:10px 8px;text-align:left">姓名</th><th style="padding:10px 8px;text-align:left">邮箱</th><th style="padding:10px 8px;text-align:left">角色</th><th style="padding:10px 8px;text-align:left">部门</th><th style="padding:10px 8px;text-align:left">数据范围</th><th style="padding:10px 8px;text-align:left">状态</th><th style="padding:10px 8px;text-align:left">最后登录</th><th style="padding:10px 8px;text-align:center">操作</th>'
new_thead = '<th style="padding:10px 8px;text-align:left">姓名</th><th style="padding:10px 8px;text-align:left">邮箱</th><th style="padding:10px 8px;text-align:left">公司</th><th style="padding:10px 8px;text-align:left">手机</th><th style="padding:10px 8px;text-align:left">岗位</th><th style="padding:10px 8px;text-align:left">角色</th><th style="padding:10px 8px;text-align:left">部门</th><th style="padding:10px 8px;text-align:left">状态</th><th style="padding:10px 8px;text-align:left">最后登录</th><th style="padding:10px 8px;text-align:center">操作</th>'
if old_thead in c:
    c = c.replace(old_thead, new_thead)
    print('[6] thead enhanced with 公司/手机/岗位')
    changes += 1
else:
    print('[6] thead pattern not found')
    # fuzzy find
    idx = c.find('padding:10px 8px;text-align:left">数据范围</th>')
    if idx > 0:
        print(f'  data-scope th found at {idx}')

# === 7. Enhance employee table body: add 公司/手机/岗位 columns ===
# Current row template is very long. Let me find the pattern and replace.
# Pattern: escHtml(dn)+'</td><td>'+escHtml(em)+'</td><td>'+escHtml(rn)+'</td><td>'+escHtml(deptName)+'</td><td>...data_scope...
# I need to add company, phone, position after email, before role
# Actually let me just rewrite the row generation part

old_row = "escHtml(dn)+'</td><td>'+escHtml(em)+'</td><td>'+escHtml(rn)+'</td><td>'+escHtml(deptName)+'</td><td style=\"padding:8px;font-size:12px;color:var(--text3)\">'+dsLabel+'</td><td style=\"padding:8px\">'+statusLabel+'</td><td style=\"padding:8px;font-size:12px;color:var(--text3)\">'+escHtml(u.last_login_at?formatDateTime(u.last_login_at):'从未登录')+'</td><td style=\"padding:8px;text-align:center\">"
new_row = "escHtml(dn)+'</td><td>'+escHtml(em)+'</td><td>'+escHtml(companyName)+'</td><td>'+escHtml(u.phone||'-')+'</td><td>'+escHtml(u.position||'-')+'</td><td>'+escHtml(rn)+'</td><td>'+escHtml(deptName)+'</td><td style=\"padding:8px\">'+statusLabel+'</td><td style=\"padding:8px;font-size:12px;color:var(--text3)\">'+escHtml(u.last_login_at?formatDateTime(u.last_login_at):'从未登录')+'</td><td style=\"padding:8px;text-align:center\">"

if old_row in c:
    c = c.replace(old_row, new_row)
    print('[7] row template enhanced')
    changes += 1
else:
    print('[7] row template not found')
    # Find the employee row
    idx = c.find("escHtml(rn)+'</td><td>'+escHtml(deptName)")
    if idx > 0:
        print(f'  Found at {idx}: ...{c[idx-20:idx+120]}...')

# === 8. Add companyName, searchText search for company in employee render ===
# Need to make sure companyName is computed in the loop
# Currently the renderAdminEmployees loop computes deptName and dsLabel but NOT companyName
# Let me find the loop and add companyName computation

old_dept = "var deptName='';for(var k=0;k<(allDepartments||[]).length;k++){if(allDepartments[k].id==did){deptName=allDepartments[k].name;break;}}"
new_dept = "var deptName='';for(var k=0;k<(allDepartments||[]).length;k++){if(allDepartments[k].id==did){deptName=allDepartments[k].name;break;}}\n    var companyName='-';var cab2=typeof allAdminCompanies!=='undefined'?allAdminCompanies:allCompanies||[];for(var ci=0;ci<cab2.length;ci++){if(cab2[ci].id===u.company_id){companyName=cab2[ci].name;break}}"
if old_dept in c:
    c = c.replace(old_dept, new_dept)
    print('[8] companyName in employee loop added')
    changes += 1
else:
    print('[8] dept loop not found')

# === 9. Remove dead functions: editEmployee, saveEmployee, toggleEmpStatus ===
# These are no longer needed since edit goes to openUserEditForm/saveUserEdit

for func_name in ['editEmployee', 'saveEmployee', 'toggleEmpStatus']:
    m = re.search(rf'async function {func_name}\(.*?\)\{{', c)
    if m:
        fn_start = m.start()
        # Find matching } by counting braces
        depth = 1
        i = m.end()
        while depth > 0 and i < len(c):
            if c[i] == '{': depth += 1
            elif c[i] == '}': depth -= 1
            i += 1
        fn_end = i
        # Include trailing whitespace
        while fn_end < len(c) and c[fn_end] in '\r\n ':
            fn_end += 1
        c = c[:fn_start] + c[fn_end:]
        print(f'[9] {func_name} removed ({fn_end - fn_start} bytes)')
        changes += 1
    else:
        print(f'[9] {func_name} not found')

# === 10. Remove emp-form-modal HTML ===
emp_start = c.find('id="emp-form-modal"')
if emp_start > 0:
    div_start = c.rfind('<div', 0, emp_start)
    depth = 1
    i = c.find('>', div_start) + 1
    while depth > 0:
        nxt_open = c.find('<div', i)
        nxt_close = c.find('</div>', i)
        if nxt_close >= 0 and (nxt_open < 0 or nxt_close < nxt_open):
            depth -= 1
            if depth == 0:
                end = nxt_close + 6
                break
            i = nxt_close + 6
        elif nxt_open >= 0:
            depth += 1
            i = nxt_open + 4
        else:
            break
    c = c[:div_start] + c[end:]
    print(f'[10] emp-form-modal removed')
    changes += 1
else:
    print('[10] emp-form-modal not found')

# === 11. Remove toggleEmpStatus onclick from employee rows ===
# Change the status toggle to simpler or remove it since saveUserEdit handles it
old_toggle = ' <a href="javascript:void(0)" style="font-size:11px;margin-left:6px" onclick="toggleEmpStatus'
# Find the full anchor tag
m = re.search(r'<a href="javascript:void\(0\)" style="font-size:11px;margin-left:6px" onclick="toggleEmpStatus[^>]*>.*?</a>', c)
if m:
    c = c[:m.start()] + c[m.end():]
    print('[11] toggleEmpStatus link removed from rows')
    changes += 1
else:
    print('[11] toggleEmpStatus link not found')
    # Try simpler search
    tg_idx = c.find('toggleEmpStatus')
    if tg_idx > 0:
        # Find the containing <a> tag
        a_start = c.rfind('<a', 0, tg_idx)
        a_end = c.find('</a>', tg_idx) + 4
        c = c[:a_start] + c[a_end:]
        print(f'[11b] toggleEmpStatus link removed')
        changes += 1
    else:
        print('[11] No toggleEmpStatus found')

# === 12. Remove empEditId variable and closeEmployeeForm if dead ===
# empEditId is no longer used
m = re.search(r'let empEditId=null;', c)
if m:
    c = c[:m.start()] + c[m.end():]
    print('[12] empEditId removed')
    changes += 1
else:
    print('[12] empEditId not found')

# === 12b. Remove closeEmployeeForm ===
m = re.search(r'function closeEmployeeForm\(\)\{.*?\}', c)
if m:
    c = c[:m.start()] + c[m.end():]
    print('[12b] closeEmployeeForm removed')
    changes += 1

# === 13. Make employees the default by adjusting switchAdminTab ===
# Change the first case from users to employees
# Don't need to change tab numbers - just ensure employees is accessible

# === 14. Remove switchAdminTab 'users' case ===
m = re.search(r"if\(tab==='users'\)\{[^}]*\}", c)
if m:
    c = c[:m.start()] + c[m.end():]
    print('[14] users case in switchAdminTab removed')
    changes += 1
else:
    print('[14] users case not found')

# === 15. Update admin-tab-employees to be the first/always-visible tab ===
# Remove the "hidden" class from admin-tab-employees button
old_btn = 'id="admin-tab-employees" onclick'
new_btn = 'class="admin-subtab active" id="admin-tab-employees" onclick'
if old_btn in c:
    c = c.replace(old_btn, new_btn)
    print('[15] admin-tab-employees made active default')
    changes += 1
else:
    print('[15] admin-tab-employees button not found')

# === 16. Fix loadAdminData to load employees data ===
# Make sure loadAdminData still loads users for employee panel
# The employee panel uses allUsers and adminUserList - need to verify data loading

# === 17. Add employee search support for company name ===
# The employee search should also search by company
# Find the search filter and add company
old_srch = "return (u.display_name||'').toLowerCase().indexOf(q)>=0||(u.email||'').toLowerCase().indexOf(q)>=0;"
new_srch = "return (u.display_name||'').toLowerCase().indexOf(q)>=0||(u.email||'').toLowerCase().indexOf(q)>=0||(u.position||'').toLowerCase().indexOf(q)>=0;"
if old_srch in c:
    c = c.replace(old_srch, new_srch)
    print('[17] search enhanced with position')
    changes += 1
else:
    print('[17] search pattern not found')

# Verify
divs = c.count('<div') - c.count('</div>')
curls = c.count('{') - c.count('}')
print(f'balance: div={divs} curly={curls}')
print(f'total changes: {changes}')

# Check critical functions still exist
for fn in ['renderAdminEmployees', 'saveUserEdit', 'openUserEditForm', 'renderGrantsPanel']:
    count = c.count(f'function {fn}')
    print(f'  {fn}: {count}')

with open(r'D:\1kaifa\grsds\index.html', 'w', encoding='utf-8') as f:
    f.write(c)
print('done')
