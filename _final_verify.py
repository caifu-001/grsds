import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

ok=True

# V1: admin-workflows outside admin-security
sec = h.find('id="admin-security"')
d=0;s=False;sc=sec
for i in range(sec,len(h)):
    t4=h[i:i+4].lower();t6=h[i:i+6].lower()
    if t4=='<div' and t6!='</div':d+=1;s=True
    elif t6=='</div>':d-=1
    if s and d==0:sc=i+6;break
wf=h.find('id="admin-workflows"')
v1=wf>sc
print(f"✅ V1: admin-workflows OUTSIDE admin-security: {v1}")

# V2: credit_code in selectLeadCompany
slc=h.find('function selectLeadCompany')
d=0;s=False;se=slc
for i in range(slc,len(h)):
    if h[i]=='{':d+=1;s=True
    elif h[i]=='}':d-=1
    if s and d==0:se=i+1;break
fn=h[slc:se]
v2a='client.credit_code' in fn
v2b='onLeadTypeChange()' in fn
print(f"✅ V2: credit_code in selectLeadCompany: {v2a}")
print(f"✅ V2: onLeadTypeChange called: {v2b}")

# V3: loadClients uses select('*') (has all fields including credit_code)
lcf=h.find('async function loadClients')
d=0;s=False;le=lcf
for i in range(lcf,len(h)):
    if h[i]=='{':d+=1;s=True
    elif h[i]=='}':d-=1
    if s and d==0:le=i+1;break
fn2=h[lcf:le]
v3a="select('*')" in fn2
v3b="allClients=data" in fn2
print(f"✅ V3: loadClients selects *: {v3a}")
print(f"✅ V3: allClients=data: {v3b}")

# V4: renderWorkflowTemplates async
rwt=h.find('function renderWorkflowTemplates')
v4='async ' in h[max(0,rwt-15):rwt]
print(f"✅ V4: renderWorkflowTemplates async: {v4}")

# V5: No double async
v5='async async' not in h
print(f"✅ V5: No double async: {v5}")

# V6: switchAdminTab has 'workflows' case
sat=h.find("switchAdminTab('workflows')")
v6=sat>0
print(f"✅ V6: switchAdminTab('workflows') call exists: {v6}")

# V7: No non-async functions with await
import re;bad=[]
for m in re.finditer(r'(async\s+)?function\s+(\w+)\s*\(',h):
    nm=m.group(2);ia=m.group(1)is not None
    d=0;s=False;je=m.start()
    for i in range(m.start(),len(h)):
        if h[i]=='{':d+=1;s=True
        elif h[i]=='}':d-=1
        if s and d==0:je=i+1;break
    if 'await ' in h[m.start():je] and not ia:bad.append(nm)
v7=len(bad)==0
print(f"✅ V7: No non-async await functions: {v7}  {'(bad: '+', '.join(bad)+')' if bad else ''}")

# Overall
all_ok=v1 and v2a and v2b and v3a and v3b and v4 and v5 and v6 and v7
print(f"\n{'✅ ALL PASSED' if all_ok else '❌ SOME FAILED'}")
