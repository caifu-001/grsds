import sys
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

ok = True

# 1. admin-workflows hidden?
wf = h.find('id="admin-workflows"')
chunk = h[wf:wf+80]
print(f'V1: admin-workflows: {chunk[:75].strip()}')
print(f'    has hidden: {"hidden" in chunk[:60]}')

# 2. renderWorkflowTemplates has async but not double
rwt = h.find('function renderWorkflowTemplates')
pre = h[max(0,rwt-20):rwt+35]
print(f'\nV2: renderWorkflowTemplates: {repr(pre)}')
has_async = 'async ' in h[max(0,rwt-15):rwt]
has_double = 'async async' in h[max(0,rwt-15):rwt+15]
print(f'    async={has_async}, double={has_double}')

# 3. loadTemplates
lt = h.find('function loadTemplates')
pre_lt = h[max(0,lt-15):lt+30]
print(f'\nV3: loadTemplates: {repr(pre_lt)}')
has_async_lt = 'async ' in h[max(0,lt-15):lt]
print(f'    async={has_async_lt}')

# 4. admin-view structure integrity
av = h.find('<div id="admin-view"')
# get admin-view class
av_class = h[av:av+80]
print(f'\nV4: admin-view open: {av_class[:70].strip()}')

# 5. main-fab
mf = h.find('id="main-fab"')
mf_ctx = h[max(0,mf-60):mf+60]
# show exact lines around main-fab
lines = h[max(0,mf-200):mf+80].split('\n')
print(f'\nV5: Around main-fab (byte {mf}):')
for line in lines:
    s = line.strip()
    if s: print(f'    {s[:130]}')

print(f'\nSummary:')
print(f'  WF hidden class: {"hidden" in h[wf:wf+60]}')
print(f'  rWT async correct: {has_async and not has_double}')
print(f'  loadTemplates async: {has_async_lt}')
