import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

fixes = 0

# === FIX 1: Remove orphan </div> after admin-workflows ===
# Line 1558 has an extra </div> — need to remove it
# Find the pattern: after admin-workflows </div>, there's \n\n  </div>\n\n  
# Target: the orphan </div> that sits between admin-workflows and main-fab

admin_wf = h.find('id="admin-workflows"')
# Find admin-workflows closing
d = 0; s = False
wf_close = admin_wf
for i in range(admin_wf, len(h)):
    t4 = h[i:i+4].lower(); t6 = h[i:i+6].lower()
    if t4 == '<div' and t6 != '</div': d += 1; s = True
    elif t6 == '</div>': d -= 1
    if s and d == 0: wf_close = i + 6; break

# Now find main-fab
main_fab = h.find('id="main-fab"', wf_close)
# Find the orphan </div> between wf_close and main_fab
between = h[wf_close:main_fab]
idx = between.rfind('</div>')
if idx >= 0:
    orphan_start = wf_close + idx
    orphan_end = orphan_start + 6
    # Strip trailing whitespace around it
    while orphan_start > 0 and h[orphan_start - 1] in ' \t\r\n':
        orphan_start -= 1
    while orphan_end < len(h) and h[orphan_end] in ' \t\r\n':
        orphan_end += 1
    
    print(f"FIX 1: Removing orphan </div> at byte {orphan_start}-{orphan_end}")
    print(f"  Content: {repr(h[max(0,orphan_start-30):orphan_end+30])}")
    h = h[:orphan_start] + h[orphan_end:]
    fixes += 1

# === FIX 2: Add async to renderWorkflowTemplates ===
rwt = h.find('function renderWorkflowTemplates')
prefix = h[max(0, rwt - 20):rwt]
if 'async ' not in prefix:
    # Check if it's preceded by something like 'async ' already
    # Insert async
    h = h[:rwt] + 'async ' + h[rwt:]
    print(f"FIX 2: Added async to renderWorkflowTemplates")
    fixes += 1
else:
    print("FIX 2: renderWorkflowTemplates already async")

# === FIX 3: Fix broken loadTemplates ===
lt = h.find('function loadTemplates')
if lt > 0:
    d = 0; s = False; le = lt
    for i in range(lt, len(h)):
        if h[i] == '{': d += 1; s = True
        elif h[i] == '}': d -= 1
        if s and d == 0: le = i + 1; break
    fn_lt = h[lt:le]
    if 'catch' in fn_lt[:50] and 'try' not in fn_lt[:50]:
        # Broken: replace with proper implementation
        new_lt = """async function loadTemplates(){
try{
var {data,error}=await sb.from('workflow_templates').select('*');
if(!error)allTemplates=data||[];
renderWorkflowTemplates();
}catch(e){console.error('loadTemplates',e)}
}"""
        h = h[:lt] + new_lt + h[le:]
        print(f"FIX 3: Replaced broken loadTemplates")
        fixes += 1
    else:
        print("FIX 3: loadTemplates looks OK")

# === FIX 4: Verify openMy has async keyword ===
omy = h.find('function openMy')
prefix_omy = h[max(0, omy - 20):omy]
if 'async ' not in prefix_omy:
    h = h[:omy] + 'async ' + h[omy:]
    print("FIX 4: Added async to openMy")
    fixes += 1
else:
    print("FIX 4: openMy already async")

print(f"\nTotal fixes: {fixes}")

if fixes > 0:
    with open(r'D:\1kaifa\grsds\index.html','w',encoding='utf-8') as f:
        f.write(h)
    print("Saved")
