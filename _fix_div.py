import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# ===== FIX 1: Move admin-workflows from INSIDE admin-security to AFTER it =====
# Step 1: Extract the WF block  
wf_comment = h.find('<!-- Workflow Templates -->')
# Find matching </div> for admin-workflows
d = 0; s = False
for i in range(h.find('id="admin-workflows"'), len(h)):
    t4 = h[i:i+4].lower(); t6 = h[i:i+6].lower()
    if t4 == '<div' and t6 != '</div': d += 1; s = True
    elif t6 == '</div>': d -= 1
    if s and d == 0: wf_end = i+6; break
# Extend past trailing whitespace/newlines
while wf_end < len(h) and h[wf_end] in '\r\n ': wf_end += 1

wf_block = h[wf_comment:wf_end]
# Clean up: remove leading newlines from wf_block
wf_block = wf_block.lstrip('\r\n')
print(f"WF block: {len(wf_block)} chars")

# Step 2: Remove WF block from current position
h2 = h[:wf_comment] + h[wf_end:]

# Step 3: Find admin-security's closing </div> in h2  
sec_div = h2.find('id="admin-security"')
d = 0; s = False
for i in range(sec_div, len(h2)):
    t4 = h2[i:i+4].lower(); t6 = h2[i:i+6].lower()
    if t4 == '<div' and t6 != '</div': d += 1; s = True
    elif t6 == '</div>': d -= 1
    if s and d == 0: sec_end = i+6; break

# Show context
print(f"admin-security ends at byte {sec_end}")
ctx_before = h2[max(0,sec_end-80):sec_end]
ctx_after = h2[sec_end:sec_end+80]
print(f"  before: ...{repr(ctx_before[-60:])}")
print(f"  after: {repr(ctx_after[:60])}...")

# Step 4: Insert WF block AFTER admin-security closing, BEFORE next element (main-fab)
h3 = h2[:sec_end] + '\n\n' + wf_block + '\n' + h2[sec_end:]

# Strip multiple blank lines near insertion
# (Just before main-fab, we don't want too much whitespace)
while '\n\n\n' in h3:
    h3 = h3.replace('\n\n\n', '\n\n')

# ===== VERIFY =====
sec_v = h3.find('id="admin-security"')
d = 0; s = False
for i in range(sec_v, len(h3)):
    t4 = h3[i:i+4].lower(); t6 = h3[i:i+6].lower()
    if t4 == '<div' and t6 != '</div': d += 1; s = True
    elif t6 == '</div>': d -= 1
    if s and d == 0: sec_close = i+6; break

wf_v = h3.find('id="admin-workflows"')
outside = wf_v > sec_close

# Show structure around the area
lines = h3.split('\n')
wf_line = 0
for i, line in enumerate(lines):
    if 'admin-workflows' in line: wf_line = i; break

print(f"\nadmin-workflows at line {wf_line+1}, {'OUTSIDE' if outside else 'INSIDE'} admin-security")
# Show lines ±5 around WF
for i in range(max(0,wf_line-3), min(len(lines), wf_line+8)):
    marker = '<--' if 'admin-workflows' in lines[i] or '</div>' in lines[i] or 'main-fab' in lines[i] else ''
    print(f"  {i+1}: {lines[i].rstrip()[:120]} {marker}")

if outside:
    with open(r'D:\1kaifa\grsds\index.html','w',encoding='utf-8') as f:
        f.write(h3)
    print("✅ FIX 1 SAVED: admin-workflows moved outside admin-security")
else:
    print("❌ FIX 1 FAILED: still inside")
