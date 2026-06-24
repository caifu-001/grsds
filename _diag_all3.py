import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# === FIND ALL THREE ISSUES ===

# ISSUE 1: admin-workflows position
wf_start = h.find('<!-- Workflow Templates -->')
# Find the admin-workflows block end
d = 0; s = False
for i in range(h.find('id="admin-workflows"'), len(h)):
    t4 = h[i:i+4].lower(); t6 = h[i:i+6].lower()
    if t4 == '<div' and t6 != '</div': d += 1; s = True
    elif t6 == '</div>': d -= 1
    if s and d == 0: wf_end = i+6; break
while wf_end < len(h) and h[wf_end] in '\r\n': wf_end += 1

wf_block = h[wf_start:wf_end]
print(f"ISSUE 1: WF block at {wf_start}-{wf_end}, first 80: {repr(wf_block[:80])}")

# ISSUE 2: allClients lazy load in openProjectFormFromLead
opf = h.find('function openProjectFormFromLead')
snippet = h[opf:opf+2500]
# Find lines with allClients and select
ac_idx = snippet.find('allClients')
while ac_idx >= 0:
    line_start = snippet.rfind('\n', 0, ac_idx) + 1
    line_end = snippet.find('\n', ac_idx)
    line = snippet[line_start:line_end].strip()
    if 'select' in line or '=' in line or 'http' in line:
        print(f"\nISSUE 2 - allClients line: {line[:200]}")
    ac_idx = snippet.find('allClients', ac_idx+1)

# ISSUE 3: renderWorkflowTemplates async check
rwt = h.find('function renderWorkflowTemplates')
prefix = h[max(0,rwt-15):rwt]
print(f"\nISSUE 3: renderWorkflowTemplates prefix: {repr(prefix)}")
print(f"ISSUE 3: is async: {'async' in prefix}")

# Show admin-security structure around line 1545-1565
lines = h.split('\n')
print("\n=== Lines 1545-1562 ===")
for i in range(1544, min(len(lines), 1562)):
    print(f"{i+1}: {lines[i].rstrip()}")
