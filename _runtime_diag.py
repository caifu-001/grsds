import sys
sys.stdout.reconfigure(encoding='utf-8')

h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

# 1. Find switchAdminTab - does it actually call renderWorkflowTemplates?
sat = h.find('function switchAdminTab')
d=0;s=False
for i in range(sat, len(h)):
    if h[i]=='{': d+=1; s=True
    elif h[i]=='}': d-=1
    if s and d==0: sat_end=i+1; break
sat_body = h[sat:sat_end]

# Find the workflows branch
wf_idx = sat_body.find('workflows')
if wf_idx >= 0:
    branch_start = max(0, wf_idx - 100)
    branch_end = min(len(sat_body), wf_idx + 300)
    print("=== switchAdminTab workflows branch ===")
    print(sat_body[branch_start:branch_end])

# 2. Check: does the branch call renderWorkflowTemplates?
print(f"\nCalls renderWorkflowTemplates: {'renderWorkflowTemplates' in sat_body}")
print(f"Calls renderSecurityPanel: {'renderSecurityPanel' in sat_body}")

# 3. Find renderWorkflowTemplates function body - full
rwt = h.find('function renderWorkflowTemplates')
d=0;s=False
for i in range(rwt-10 if rwt>10 else 0, len(h)):
    if h[i]=='{': d+=1; s=True
    elif h[i]=='}': d-=1
    if s and d==0: rwt_end=i+1; break
rwt_body = h[max(0,rwt-10):rwt_end]
print(f"\n=== renderWorkflowTemplates full function ===")
print(rwt_body[:2000])

# 4. Check allTemplates usage
print(f"\nallTemplates referenced {h.count('allTemplates')} times")
# Show contexts
at_refs = []
idx = 0
while True:
    idx = h.find('allTemplates', idx)
    if idx < 0: break
    ctx = h[max(0,idx-20):idx+40].replace('\n',' ')
    at_refs.append(f'  byte {idx}: ...{ctx}...')
    idx += 1
for ref in at_refs[:15]:
    print(ref)
