import sys, re
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

# Check main-screen initial visibility
ms = h.find('id="main-screen"')
# Find the tag
div_start = h.rfind('<div', 0, ms)
end_tag = h.find('>', ms)
tag = h[div_start:end_tag+1]
print('main-screen tag: ' + tag)

# Check login success handler - does it show main-screen?
# Find login function
login_pos = h.find('function doLogin')
if login_pos < 0:
    login_pos = h.find('function signIn')
if login_pos > 0:
    d = 0; s = False
    for i in range(login_pos, min(login_pos + 3000, len(h))):
        if h[i] == '{': d += 1; s = True
        elif h[i] == '}': d -= 1
        if s and d == 0: le = i+1; break
    login_body = h[login_pos:le]
    
    # Find main-screen references in login flow
    for line in login_body.split('\n'):
        s2 = line.strip()
        if 'main-screen' in s2 or 'hidden' in s2 or 'classList' in s2:
            print('LOGIN: ' + s2[:120])

# Check showLeads and showCompanies for async issues
for fn_name in ['showLeads', 'showCompanies', 'showProjects', 'showInventory', 'showReports', 'showService', 'showCollab']:
    pos = h.find('function ' + fn_name + '(')
    if pos > 0:
        d = 0; s = False
        for i in range(pos, min(pos+1000, len(h))):
            if h[i] == '{': d += 1; s = True
            elif h[i] == '}': d -= 1
            if s and d == 0: fn_end = i+1; break
        fn_body = h[pos:fn_end]
        has_await = 'await ' in fn_body
        is_async = 'async ' in h[pos:pos+30]
        print('\n%s: async=%s uses_await=%s' % (fn_name, is_async, has_await))
        if has_await and not is_async:
            print('  ** AWAIT WITHOUT ASYNC **')
            print('  ' + fn_body[:200])
