import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

ok = True

# 1. Div balance from admin-tabs to main-fab
at = h.find('class="admin-tabs"')
mf = h.find('id="main-fab"')
opens = 0; closes = 0
depth = 0; first_bad = None
for i in range(at, mf):
    if h[i:i+4].lower() == '<div' and h[i:i+5].lower() != '</div':
        depth += 1; opens += 1
    elif h[i:i+6].lower() == '</div>':
        depth -= 1; closes += 1
    if depth < 0 and first_bad is None:
        first_bad = i
print(f"V0 div balance: <div={opens} </div>={closes} net={opens-closes}")

# 2. admin-workflows position
sec = h.find('id="admin-security"')
d=0;s=False;sc=sec
for i in range(sec,len(h)):
    t4=h[i:i+4].lower();t6=h[i:i+6].lower()
    if t4=='<div' and t6!='</div':d+=1;s=True
    elif t6=='</div>':d-=1
    if s and d==0:sc=i+6;break
wf=h.find('id="admin-workflows"')
v1=wf>sc
print(f"V1: WF outside admin-security: {v1}")

# 3. credit_code in selectLeadCompany  
slc=h.find('function selectLeadCompany')
d=0;s=False;se=slc
for i in range(slc,len(h)):
    if h[i]=='{':d+=1;s=True
    elif h[i]=='}':d-=1
    if s and d==0:se=i+1;break
fn=h[slc:se]
v2='client.credit_code' in fn
v2b='onLeadTypeChange()' in fn
print(f"V2: credit_code: {v2}, onLeadTypeChange: {v2b}")

# 4. renderWorkflowTemplates
rwt=h.find('function renderWorkflowTemplates')
v3='async ' in h[max(0,rwt-15):rwt]
print(f"V3: rWT async: {v3}")

# 5. No double async
v4='async async' not in h
print(f"V4: no double async: {v4}")

# 6. No non-async await
bad=[]
for m in re.finditer(r'(async\s+)?function\s+(\w+)\s*\(',h):
    nm=m.group(2);ia=m.group(1)is not None
    d=0;s=False;je=m.start()
    for i in range(m.start(),len(h)):
        if h[i]=='{':d+=1;s=True
        elif h[i]=='}':d-=1
        if s and d==0:je=i+1;break
    if 'await ' in h[m.start():je] and not ia:bad.append(nm)
v5=len(bad)==0
print(f"V5: no non-async await: {v5} ({bad})")

# 7. allClients load with credit_code
lcf=h.find('function loadClients')
if 'select(\'*\')' in h[lcf:lcf+500]:
    print(f"V6: loadClients select(*): True")
else:
    # Find actual select
    sel_idx=h.find('.select(', lcf)
    if sel_idx>0:
        sel_end=h.index(')', sel_idx)
        print(f"V6: loadClients: {h[sel_idx:sel_end+1]}")
    else:
        print("V6: loadClients select not found")

print(f"\n{'✅ BASELINE OK' if opens==closes and v1 and v2 and v2b and v3 and v4 and v5 else '❌ BASELINE ISSUES'}")
