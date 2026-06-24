import sys, re
sys.stdout.reconfigure(encoding='utf-8')
with open(r"D:\1kaifa\grsds\index.html","r",encoding='utf-8') as f:
    h=f.read()

# Count remaining raw WORKFLOW_STEPS (excluding getTemplateSteps context)
all_refs = [(m.start(), h[max(0,m.start()-30):m.end()+40].replace('\n',' ')) for m in re.finditer(r'WORKFLOW_STEPS', h)]
raw = [(pos,ctx) for pos,ctx in all_refs if 'getTemplateSteps' not in ctx[:40]]
print(f"Remaining raw WORKFLOW_STEPS: {len(raw)}")
for pos,ctx in raw:
    print(f"  {pos}: ...{ctx}...")

# Fix stepDone
idx=h.find("function stepDone(seq)")
if idx>0:
    old="WORKFLOW_STEPS.findIndex(function(s){return s.seq===seq})"
    new="getTemplateSteps(curProject?curProject.template_id:null).findIndex(function(s){return s.seq===seq})"
    if old in h:
        h=h.replace(old,new)
        print("Fixed: stepDone")

# Fix markStepDone
idx=h.find("function markStepDone")
if idx>0:
    old="WORKFLOW_STEPS.find(function(s){return s.seq===curStep})"
    new="getTemplateSteps(curProject?curProject.template_id:null).find(function(s){return s.seq===curStep})"
    if old in h:
        h=h.replace(old,new)
        print("Fixed: markStepDone")

# Fix updateProjectCurrentStep
idx=h.find("function updateProjectCurrentStep(")
if idx>0:
    old="total_steps:WORKFLOW_STEPS.length"
    new="total_steps:getTemplateSteps(curProject?curProject.template_id:null).length"
    if old in h:
        h=h.replace(old,new)
        print("Fixed: updateProjectCurrentStep")

# Fix any remaining in showStepPanel / renderWorkbench already done
# Fix remaining raw refs
for pos,ctx in raw:
    if 'WORKFLOW_STEPS[' in ctx:
        old_pat = re.search(r'WORKFLOW_STEPS\[[^\]]+\]', ctx)
        if old_pat:
            old_exact = old_pat.group(0)
            new_exact = old_exact.replace('WORKFLOW_STEPS','getTemplateSteps(curProject?curProject.template_id:null)')
            h=h.replace(old_exact, new_exact)
            print(f"Fixed: {old_exact} -> ...")

# Final count
remaining_final = [pos for pos,_ in [(m.start(),'') for m in re.finditer(r'WORKFLOW_STEPS', h)] if 'getTemplateSteps' not in h[max(0,m.start()-40):m.start()+40]]
print(f"\nFinal remaining: {len(remaining_final)}")
if remaining_final:
    for pos in remaining_final[:5]:
        print(f"  {pos}: ...{h[max(0,pos-40):pos+60].replace(chr(10),' ')}...")

with open(r"D:\1kaifa\grsds\index.html","w",encoding="utf-8") as f:
    f.write(h)
print(f"Size: {len(h)} bytes")
