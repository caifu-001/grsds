import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r"D:\1kaifa\grsds\index.html","r",encoding='utf-8') as f:
    h=f.read()

# Find global var declarations
for kw in ['allProjects','allClients','allLeads','allContacts','allCompanies']:
    idx=h.find('let '+kw)
    if idx>=0:
        nl=h.index('\n',idx)
        print(f'{kw} at {idx}: {h[idx:nl][:120]}')

# Find function showAdmin / main init
for kw in ['function showAdmin','function initApp','async function initApp','adm-tab','adm-section']:
    idx=h.find(kw)
    if idx>=0:
        ctx=h[idx:idx+200]
        print(f'\n{kw} at {idx}: ...{ctx[:200]}...')

# Find where super admin tabs are rendered
for kw in ['超管','super_admin','isSuperAdmin','adm-goto','showTab','switchTab']:
    idxs=[m.start() for m in __import__('re').finditer(kw, h)]
    if idxs:
        print(f'\n{kw}: {len(idxs)} matches at {idxs[:5]}')
        if len(idxs)<=3:
            for i in idxs:
                print(f'  {i}: ...{h[max(0,i-40):i+80]}...')
