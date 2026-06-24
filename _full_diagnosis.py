import sys
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

# 1. Find main script block - check JS syntax
s1 = h.find('<script>')
s2 = h.rfind('</script>')
tg = h.find('>', s1)
js = h[tg+1:s2]

try:
    compile(js, 'index.html', 'exec')
    print('✅ JS syntax OK')
except SyntaxError as e:
    print(f'❌ JS SYNTAX ERROR: line {e.lineno} - {e.msg}')
    lines = js.split('\n')
    for i in range(max(0,e.lineno-3), min(len(lines), e.lineno+3)):
        print(f'  {i+1}: {lines[i][:120]}')

# 2. Check all async functions that use await
import re
funcs = []
for m in re.finditer(r'function (\w+)', js):
    name = m.group(1)
    start = m.start()
    # find body
    d = 0; s = False
    for i in range(m.end(), len(js)):
        if js[i] == '{': d += 1; s = True
        elif js[i] == '}': d -= 1
        if s and d == 0:
            body = js[m.start():i+1]
            break
    has_await = 'await ' in body
    has_async = js[max(0,m.start()-10):m.start()].strip().endswith('async')
    if has_await and not has_async:
        funcs.append(f'  ⚠️ {name}: await without async')

if funcs:
    print(f'\n❌ Functions with await but not async:')
    for f in funcs:
        print(f)
else:
    print('\n✅ All async functions correctly declared')

# 3. Check rendered POST-script HTML div balance
post_start = s2 + 9
post = h[post_start:]
o = 0; c = 0
# Simple count of <div (not </div) and </div>
# But avoid counting <div in JS context
for m in re.finditer(r'</div', post):
    c += 1
for m in re.finditer(r'<div(?:\s|>)', post):
    o += 1
print(f'\n=== Post-script HTML ===')
print(f'<div: {o}  </div>: {c}  net: {o-c}')
if o != c:
    print(f'⚠️ Imbalanced by {o-c}')

# 4. Check if the 3 specific problems exist
# Problem 1: admin-workflows outside admin-view
av = h.find('id="admin-view"')
av_close = None
d = 0; s = False
for i in range(av, len(h)):
    t4 = h[i:i+4].lower(); t6 = h[i:i+6].lower()
    if t4 == '<div' and t6 != '</div': d += 1; s = True
    elif t6 == '</div>': d -= 1
    if s and d == 0:
        av_close = i + 6
        break

wf = h.find('id="admin-workflows"')
print(f'\n=== Problem Diagnostics ===')
if av_close and wf >= 0:
    print(f'P1: admin-workflows inside admin-view? {wf < av_close}')
    print(f'    WF at byte {wf}, admin-view closes at {av_close}')

# Problem 2: credit_code in selectLeadCompany
slc = h.find('function selectLeadCompany')
if slc > 0:
    d = 0; s = False
    for i in range(slc, len(h)):
        if h[i] == '{': d += 1; s = True
        elif h[i] == '}': d -= 1
        if s and d == 0:
            body = h[slc:i+1]
            break
    has_cc = 'credit_code' in body
    has_otc = 'onLeadTypeChange' in body
    print(f'P2: selectLeadCompany - credit_code={has_cc}, onLeadTypeChange={has_otc} {"✅" if has_cc and has_otc else "⚠️"}')

# Problem 3: renderWorkflowTemplates
rwt = h.find('function renderWorkflowTemplates')
if rwt > 0:
    pre = h[max(0,rwt-15):rwt]
    print(f'P3: renderWorkflowTemplates declared as: ...{pre.strip()}')
    # Check if async
    has_async = 'async ' in h[max(0,rwt-15):rwt]
    print(f'    async={has_async}')

# 5. Check navigation/handleFab - does it switch views properly?
fab = h.find('function handleFab')
if fab > 0:
    d = 0; s = False
    for i in range(fab, len(h)):
        if h[i] == '{': d += 1; s = True
        elif h[i] == '}': d -= 1
        if s and d == 0:
            body = h[fab:i+1]
            break
    # Count switchTo calls
    for view in ['client-view', 'collab-view', 'reports-view', 'inventory-view', 'service-view', 'projects-view']:
        if view in body:
            print(f'  handleFab switches to {view} ✅')
        else:
            print(f'  handleFab: {view} NOT FOUND ⚠️')
