import re

f = open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8').read()

# Fix specific broken single-quote issues in the after-sales section
# The problem: h+='...' string includes unescaped single quotes

fixes = 0

# Fix 1: openVisitForm('+v.id+') → openVisitForm(\''+v.id+'\')
# But be careful not to double-escape already fixed ones
# Pattern: onclick="event.stopPropagation();openVisitForm('+v.id+')"
old = "onclick=\"event.stopPropagation();openVisitForm('+v.id+')\""
new = "onclick=\"event.stopPropagation();openVisitForm(\\''+v.id+'\\')\""
if old in f:
    f = f.replace(old, new)
    fixes += 1
    print('Fix openVisitForm OK')

# Fix 2: openKBForm('+k.id+')
old2 = "onclick=\"event.stopPropagation();openKBForm('+k.id+')\""
new2 = "onclick=\"event.stopPropagation();openKBForm(\\''+k.id+'\\')\""
if old2 in f:
    f = f.replace(old2, new2)
    fixes += 1
    print('Fix openKBForm OK')

# Fix 3: confirmDialog in ticket delete - the current state has mixed escaping
# Find the ticket confirmDialog line
idx = f.find("confirmDialog('确定删除该工单")
if idx > 0:
    # Find the full confirmDialog call
    end = f.find('})', idx) + 2
    problematic = f[idx:end]
    print(f'\nTicket confirmDialog: {problematic[:200]}')
    
    # Replace with a cleaner version: use a wrapper function call
    # Find the full button HTML
    btn_start = f.rfind('<button', 0, idx)
    btn_end = f.find('</button>', idx) + len('</button>')
    full_btn = f[btn_start:btn_end]
    print(f'Full button: {full_btn[:200]}')
    
    # Replace with: onclick="event.stopPropagation();confirmDeleteTicket(\''+t.id+'\')"
    # And add the helper function later
    replacement = '<button class="btn-lead-danger" onclick="event.stopPropagation();confirmDeleteTicket(\\''+t.id+'\\')">删除</button>'
    f = f.replace(full_btn, replacement)
    fixes += 1
    print('Replaced ticket confirmDialog with helper')

# Check for visit confirmDialog
idx = f.find("confirmDialog('确定删除")
while idx > 0:
    end = f.find('})', idx) + 2
    print(f'\nRemaining confirmDialog at {idx}: {f[idx:min(end,idx+200)]}')
    idx = f.find("confirmDialog('确定删除", end)

# Fix 4: Warranty and maintenance confirmDialogs - they use '+w.id+', '+m.id+' patterns
# These are inside h+='...' strings
for label, var in [('client_visits', 'v'), ('warranties', 'w'), ('maintenance_plans', 'm'), ('kb_articles', 'k')]:
    search = "confirmDialog('确定删除？',async function(){await sb.from('"+label+"').delete().eq('id','+"+var+".id+');"
    if search in f:
        print(f'Found confirmDialog for {label}')
        # Replace pattern
        repl = "confirmDialog(\\'确定删除？\\',async function(){await sb.from(\\'"+label+"\\').delete().eq(\\'id\\',\\''+"+var+".id+'\\');"
        f = f.replace(search, repl)
        fixes += 1

# Save
with open(r'D:\1kaifa\grsds\index.html', 'w', encoding='utf-8') as fh:
    fh.write(f)

# Re-extract and check
scripts = re.findall(r'<script[^>]*>(.*?)</script>', f, re.DOTALL)
with open(r'D:\1kaifa\grsds\_check_script3.js', 'w', encoding='utf-8') as fh:
    fh.write(scripts[3])

print(f'\n{fixes} fixes applied')
print(f'Lines: {len(f.splitlines())}')
