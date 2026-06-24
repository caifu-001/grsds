import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# admin-workflows block (from <!-- Workflow Templates --> to its closing </div>)
wf_start = h.find('<!-- Workflow Templates -->')
# Find the matching </div> for admin-workflows
j = h.find('id="admin-workflows"', wf_start)
d = 0; s = False
while j < len(h):
    if h[j:j+4].lower() == '<div': d += 1; s = True
    elif h[j:j+6].lower() == '</div>': d -= 1
    if s and d == 0: break
    j += 1
wf_end = j + 6

wf_block = h[wf_start:wf_end]
print(f"WF block: {wf_start} to {wf_end} ({len(wf_block)} chars)")

# admin-security closing
sec = h.find('id="admin-security"')
j2 = sec
d = 0; s = False
while j2 < len(h):
    if h[j2:j2+4].lower() == '<div': d += 1; s = True
    elif h[j2:j2+6].lower() == '</div>': d -= 1
    if s and d == 0: break
    j2 += 1
sec_end = j2 + 6
print(f"admin-security ends at: {sec_end}")

# Remove wf_block from current position
# And insert it right after admin-security closing
h = h[:wf_start] + h[wf_end:]  # remove
# Re-find admin-security end (positions shifted)
sec = h.find('id="admin-security"')
j2 = sec
d = 0; s = False
while j2 < len(h):
    if h[j2:j2+4].lower() == '<div': d += 1; s = True
    elif h[j2:j2+6].lower() == '</div>': d -= 1
    if s and d == 0: break
    j2 += 1
sec_end = j2 + 6

h = h[:sec_end] + '\n' + wf_block + h[sec_end:]
print(f"Inserted at {sec_end}")

with open(r'D:\1kaifa\grsds\index.html','w',encoding='utf-8') as f:
    f.write(h)

# Verify
wf_new = h.find('<!-- Workflow Templates -->')
sec_new = h.find('id="admin-security"')
j3 = sec_new
d = 0; s = False
while j3 < len(h):
    if h[j3:j3+4].lower() == '<div': d += 1; s = True
    elif h[j3:j3+6].lower() == '</div>': d -= 1
    if s and d == 0: break
    j3 += 1
print(f"admin-security ends: {j3+6}")
print(f"WF starts: {wf_new}")
print(f"Gap: {wf_new - (j3+6)} chars")
print(f"After WF: {repr(h[wf_new+len(wf_block):wf_new+len(wf_block)+100])}")
