import sys, re
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

# Check sidebar navigation - how do users switch views
nav_funcs = ['showCompanies', 'showLeads', 'showProjects', 'showInventory', 
             'showReports', 'showService', 'showCollab', 'showDashboard',
             'switchView', 'navigateToView']

for fn in nav_funcs:
    # Find exact function definition
    pattern = r'function ' + fn + r'\s*\('
    m = re.search(pattern, h)
    if m:
        d = 0; s = False
        for i in range(m.end(), min(m.end()+2000, len(h))):
            if h[i] == '{': d += 1; s = True
            elif h[i] == '}': d -= 1
            if s and d == 0: fn_end = i+1; break
        fn_body = h[m.start():fn_end]
        print('=== %s ===' % fn)
        print(fn_body[:400])
        print()
