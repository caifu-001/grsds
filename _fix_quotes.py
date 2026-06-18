import re

f=open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8').read()
fixes=0

# Pattern: onclick="someFunction(''+id+'')" inside h+='...' strings
# The '' breaks the outer string. Need to escape as \'

# Fix 1: openTicketForm('' → openTicketForm(\'
old1 = "onclick=\"openTicketForm(''+t.id+'')\""
new1 = "onclick=\"openTicketForm(\\''+t.id+'\\')\""
if old1 in f:
    f = f.replace(old1, new1, 1)
    fixes += 1
    print('Fix openTicketForm OK')

# Fix 2: openTicketForm('' in edit URL  
old2 = "onclick=\"openTicketForm(''+t.id+'')\""
# Check for remaining
cnt = f.count("onclick=\"openTicketForm(''+")
if cnt > 0:
    print(f'{cnt} more openTicketForm issues remain')
    # Use regex to fix all
    f = re.sub(r"onclick=\"openTicketForm\(''\+([^)]+)\+''\)\"", r"onclick=\"openTicketForm(\\''+\1+'\\')\"", f)
    fixes += 1

# Fix 3: changeTicketStatus  
old3 = "changeTicketStatus(''+t.id+'','+(t.status==='pending'?'dispatched'"
if old3 in f:
    print('changeTicketStatus found')
    f = f.replace("changeTicketStatus(''+t.id+'','", "changeTicketStatus(\\''+t.id+'\\','")
    fixes += 1

# General fix: find all ''+ in onclick handlers within h+='...'
# Pattern: onclick="funcName(''+id+'')" in h+='...' strings
# Let me search for all patterns
import re
pattern = re.compile(r"onclick=\"(?!event)[a-zA-Z]+(?:Form|Detail|Status)?\('[^']*'\+([^+]+)\+''")
matches = pattern.findall(f)
print(f'Remaining onclick quotes issues: {len(matches)}')

# Also check for issues in template literals
# Actually, let me run node check again
fix_count = 0
lines = f.splitlines()
for i, line in enumerate(lines[:]):
    # Fix patterns like: onclick="funcName(''+var+'')"
    m = re.search(r"onclick=\"(\w+)\((''\+[^)]+\+'')\"", line)
    if m:
        old = m.group(0)
        fixed = old.replace("''+", "\\''+").replace("+''", "+'\\'")
        # don't double-escape
        if "\\\\'" not in fixed:
            f = f.replace(old, fixed)
            fix_count += 1
            if fix_count <= 10:
                print(f'L{i+1}: {old[:80]} -> {fixed[:80]}')

print(f'\nTotal inline fixes: {fix_count}')

with open(r'D:\1kaifa\grsds\index.html','w',encoding='utf-8') as fh:
    fh.write(f)

# Verify with node
# Write script 3 to temp file
scripts = re.findall(r'<script[^>]*>(.*?)</script>', f, re.DOTALL)
with open(r'D:\1kaifa\grsds\_check_script3.js','w',encoding='utf-8') as fh:
    fh.write(scripts[3])
