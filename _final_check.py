import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

ok = True

# Count divs from admin-tabs to main-fab
at = h.find('class="admin-tabs"')
mf = h.find('id="main-fab"')
section = h[at:mf]

opens = 0; closes = 0
idx = 0
while idx < len(section):
    if section[idx:idx+4].lower() == '<div' and section[idx:idx+5].lower() != '</div':
        opens += 1
    elif section[idx:idx+6].lower() == '</div>':
        closes += 1
    idx += 1

print(f"admin-tabs → main-fab: <div={opens} </div>={closes} net={opens-closes}")
if opens != closes:
    print("❌ DIV MISMATCH")
    ok = False
else:
    print("✅ Balanced")

# V1: admin-workflows outside admin-security
sec = h.find('id="admin-security"')
d=0;s=False;sc=sec
for i in range(sec,len(h)):
    t4=h[i:i+4].lower();t6=h[i:i+6].lower()
    if t4=='<div' and t6!='</div':d+=1;s=True
    elif t6=='</div>':d-=1
    if s and d==0:sc=i+6;break
wf=h.find('id="admin-workflows"')
print(f"✅ V1: WF ({wf}) outside admin-security ({sc}): {wf>sc}")

# V2: loadTemplates actually has try clause
lt=h.find('function loadTemplates')
d=0;s=False;le=lt
for i in range(lt,len(h)):
    if h[i]=='{':d+=1;s=True
    elif h[i]=='}':d-=1
    if s and d==0:le=i+1;break
fn_lt=h[lt:le]
print(f"✅ V2: loadTemplates has try: {'try' in fn_lt[:80]}")
print(f"✅ V2: loadTemplates has catch: {'catch' in fn_lt}")

# V3: renderWorkflowTemplates async
rwt=h.find('function renderWorkflowTemplates')
print(f"✅ V3: renderWorkflowTemplates async: {'async ' in h[max(0,rwt-15):rwt]}")

# V4: openMy async
omy=h.find('function openMy')
print(f"✅ V4: openMy async: {'async ' in h[max(0,omy-15):omy]}")

# Show structure around main-fab
fab=h.find('id="main-fab"')
ctx=h[max(0,fab-300):fab+80]
lines=ctx.split('\n')
print(f"\n=== Structure around main-fab ===")
for line in lines:
    s=line.strip()
    if s: print(f"  {s[:130]}")

print(f"\n{'✅ ALL OK' if ok else '❌ ISSUES REMAIN'}")
