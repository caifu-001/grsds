import sys
sys.stdout.reconfigure(encoding='utf-8')

h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

# 1. Find where admin-view actually closes
av = h.find('<div id="admin-view" class="hidden">')
if av < 0:
    av = h.find('id="admin-view"')
    # find the actual <div before it
    before = h.rfind('<div', 0, av)
    av = before

d = 0; s = False
for i in range(av, len(h)):
    t4 = h[i:i+4].lower(); t6 = h[i:i+6].lower()
    if t4 == '<div' and t6 != '</div': d += 1; s = True
    elif t6 == '</div>': d -= 1
    if s and d == 0:
        av_close = i + 6
        break

av_line = h[:av_close].count('\n') + 1
print(f'admin-view opens at byte {av}, closes at {av_close} (line {av_line})')

# Show around the close
ctx = h[max(0, av_close-200):min(len(h), av_close+200)]
print('\nAround admin-view close:')
for line in ctx.split('\n'):
    s = line.strip()
    if '</div>' in s or '<div' in s or '<!--' in s:
        print(f'  >>> {s[:140]}')
    elif s:
        print(f'      {s[:140]}')

# 2. Where is admin-workflows vs admin-view close
wf = h.find('id="admin-workflows"')
wf_line = h[:wf].count('\n') + 1
print(f'\nadmin-workflows at line {wf_line}, byte {wf}')
print(f'inside admin-view? {wf < av_close}')

# 3. Is admin-workflows hidden when not in admin tab?
# Find the JS that hides/shows admin-view
# The admin-view uses class="hidden" to hide
# When switchAdminTab is called, it removes hidden from admin-view
# But individual panels may also have class="hidden"
print(f'\n--- Checking admin-workflows class ---')
wf_open = h.find('<div id="admin-workflows"', wf)
wf_class = h[wf_open:wf_open+100]
has_hidden = 'hidden' in wf_class.split('>')[0] if '>' in wf_class else False
print(f'admin-workflows class: {wf_class[:90]}')
print(f'has "hidden" class: {has_hidden}')

# 4. Check switchAdminTab for 'workflows'
sat = h.find('function switchAdminTab')
if sat > 0:
    d = 0; s = False
    for i in range(sat, len(h)):
        if h[i] == '{': d += 1; s = True
        elif h[i] == '}': d -= 1
        if s and d == 0:
            sat_body = h[sat:i+1]
            break
    print(f'\n--- switchAdminTab ---')
    print(f'Contains "workflows": {"workflows" in sat_body}')
    print(f'Contains "admin-workflows": {"admin-workflows" in sat_body}')
    # Find the actual tab handling
    wf_tab = sat_body.find('workflows')
    if wf_tab >= 0:
        print(f'  Context: ...{sat_body[max(0,wf_tab-50):wf_tab+100]}...')
else:
    print('switchAdminTab not found')

# 5. Check renderWorkflowTemplates 
rwt = h.find('function renderWorkflowTemplates')
if rwt > 0:
    d = 0; s = False
    for i in range(rwt, len(h)):
        if h[i] == '{': d += 1; s = True
        elif h[i] == '}': d -= 1
        if s and d == 0:
            rwt_body = h[rwt:i+1]
            break
    print(f'\n--- renderWorkflowTemplates ---')
    print(f'First 500 chars: {rwt_body[:500]}')
