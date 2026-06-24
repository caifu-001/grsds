import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    local = f.read()
with open(r'D:\1kaifa\grsds\_online_raw.html','r',encoding='utf-8') as f:
    online = f.read()

print(f"Local: {len(local)}  Online: {len(online)}")
print(f"Diff: {len(online) - len(local)} bytes")

# Key checks on ONLINE version
ok = True

# 1. admin-workflows position relative to admin-security
sec = online.find('id="admin-security"')
d=0;s=False;sc=sec
for i in range(sec,len(online)):
    t4=online[i:i+4].lower();t6=online[i:i+6].lower()
    if t4=='<div' and t6!='</div':d+=1;s=True
    elif t6=='</div>':d-=1
    if s and d==0:sc=i+6;break
wf=online.find('id="admin-workflows"')
v1=wf>sc
print(f"\nV1: WF ({wf}) {'OUTSIDE' if v1 else 'INSIDE'} admin-security ({sc}): {'✅' if v1 else '❌'}")
if not v1: ok=False

# 2. credit_code in selectLeadCompany
slc=online.find('function selectLeadCompany')
d=0;s=False;se=slc
for i in range(slc,len(online)):
    if online[i]=='{':d+=1;s=True
    elif online[i]=='}':d-=1
    if s and d==0:se=i+1;break
fn=online[slc:se]
v2a='client.credit_code' in fn
v2b='onLeadTypeChange()' in fn
print(f"V2a: selectLeadCompany has credit_code: {'✅' if v2a else '❌'}")
print(f"V2b: onLeadTypeChange called: {'✅' if v2b else '❌'}")
if not v2a: ok=False

# 3. loadClients - select('*')
lcf=online.find('async function loadClients')
d=0;s=False;le=lcf
for i in range(lcf,len(online)):
    if online[i]=='{':d+=1;s=True
    elif online[i]=='}':d-=1
    if s and d==0:le=i+1;break
fn2=online[lcf:le]
v3="select('*')" in fn2
print(f"V3: loadClients uses select('*'): {'✅' if v3 else '❌'}")
if not v3: ok=False

# 4. renderWorkflowTemplates async
rwt=online.find('function renderWorkflowTemplates')
v4='async ' in online[max(0,rwt-15):rwt]
print(f"V4: renderWorkflowTemplates async: {'✅' if v4 else '❌'}")
if rwt<0: ok=False

# 5. switchAdminTab has 'workflows' case
sat=online.find("switchAdminTab('workflows')")
print(f"V5: switchAdminTab('workflows'): {'✅' if sat>0 else '❌'}")
if sat<0: ok=False

# 6. Show the admin-workflows HTML block
wf_block_start = online.find('<!-- Workflow Templates -->')
if wf_block_start>0:
    wf_block = online[wf_block_start:wf_block_start+500]
    # Show lines
    for i,line in enumerate(wf_block.split('\n')):
        print(f"  WF{i}: {line.rstrip()[:130]}")
else:
    print("❌ Workflow Templates not found in online!")

# 7. Show structure around admin-security in online
lines = online.split('\n')
wf_line = 0
for i, line in enumerate(lines):
    if 'admin-workflows' in line:
        wf_line = i
        print(f"\n=== Online: admin-workflows at line {i+1} ===")
        for j in range(max(0,i-3), min(len(lines), i+10)):
            mark = ' <<<' if 'admin-workflows' in lines[j] or 'main-fab' in lines[j] or '</div>' in lines[j] else ''
            print(f"  {j+1}: {lines[j].rstrip()[:120]}{mark}")
        break

print(f"\n{'✅ ONLINE OK' if ok else '❌ ONLINE HAS ISSUES'}")
