import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r"D:\1kaifa\grsds\index.html","r",encoding='utf-8') as f:
    h=f.read()

# Where should loadTemplates/getTemplateSteps be?
# They should be near other load* functions, right before loadWorkflow

idx = h.find("async function loadBiddings(")
if idx>0:
    # Find function end
    depth=0;j=idx;started=False
    while j<len(h):
        if h[j]=='{':depth+=1;started=True
        elif h[j]=='}':depth-=1
        if started and depth==0:
            end=j+1
            break
        j+=1
    print(f"loadBiddings: {idx}-{end}")
    print(f"After loadBiddings: {h[end:end+200]}")
else:
    print("loadBiddings NOT FOUND")

# Find where loadProjects is
idx = h.find("async function loadProjects(")
if idx>0:
    depth=0;j=idx;started=False
    while j<len(h):
        if h[j]=='{':depth+=1;started=True
        elif h[j]=='}':depth-=1
        if started and depth==0:
            end=j+1
            break
        j+=1
    print(f"\nloadProjects: {idx}-{end}")
    print(f"After loadProjects: {h[end:end+200]}")
else:
    print("loadProjects NOT FOUND")
