import sys, re
sys.stdout.reconfigure(encoding='utf-8')
h=open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8').read()

# 1. conclusion_notes in saveProject
idx=h.find('function saveProject')
if idx>0:
    s=h[idx:idx+1200]
    # find pf-conclusion-notes
    for m in re.finditer(r'pf-conclusion', s):
        ctx=s[m.start()-30:m.end()+60].replace('\n',' ')
        print(f'  saveProject: {ctx}')
    # find the proj={...} object
    obj_start=s.find('var proj={')
    obj_end=s.find('};', obj_start)
    print(f'\nproj object:\n{s[obj_start:obj_end+2]}')

# 2. conclusion in HTML form
for m in re.finditer(r'id="pf-conclusion', h):
    print(f'\nHTML pf-conclusion at {m.start()}: {h[m.start():m.end()+80]}')

# 3. openProjectFormFromLead - check client auto-fill
idx=h.find('function openProjectFormFromLead')
if idx>0:
    s=h[idx:idx+1500]
    print(f'\n=== openProjectFormFromLead ===')
    for line in s.split('\n'):
        if any(k in line for k in ['company_name','clientId','company','credit','contact']):
            print(line.strip())
