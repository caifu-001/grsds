import re
f=open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8').read()
lines=f.splitlines()
for i,l in enumerate(lines):
    # Find patterns where single quotes appear inside a single-quote JS string
    # The broken pattern: h+='...'THING''+... -> the '' breaks the string
    if "''+" in l and ('onclick=' in l or 'confirmDialog' in l):
        print('L{}: {}'.format(i+1, l.strip()[:200]))
